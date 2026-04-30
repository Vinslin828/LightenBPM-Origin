import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should complete full authentication flow', async ({ page }) => {
    // 1. Start from root - should redirect to dashboard, then to login
    await page.goto('/')
    await expect(page).toHaveURL('/login')

    // 2. Login with admin credentials
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // 3. Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')

    // 4. Verify user is logged in
    await expect(page.getByText('Welcome,')).toBeVisible()
    await expect(page.getByText('admin')).toBeVisible()

    // 5. Test logout
    await page.getByText('Logout').click()

    // 6. Should redirect back to login
    await expect(page).toHaveURL('/login')

    // 7. Verify can't access protected routes after logout
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('should remember return path after login', async ({ page }) => {
    // Try to access a protected route directly
    await page.goto('/form-management')

    // Should redirect to login
    await expect(page).toHaveURL('/login')

    // Login
    await page.getByLabel('Email address').fill('user@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Should redirect back to the originally requested page
    await expect(page).toHaveURL('/form-management')
  })

  test('should handle session persistence across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL('/dashboard')

    // Reload the page
    await page.reload()

    // Should still be logged in
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Welcome,')).toBeVisible()
  })

  test('should handle multiple login attempts', async ({ page }) => {
    await page.goto('/login')

    // First failed attempt
    await page.getByLabel('Email address').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Invalid email or password')).toBeVisible()

    // Clear form and try again with correct credentials
    await page.getByLabel('Email address').clear()
    await page.getByLabel('Password').clear()

    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Should succeed
    await expect(page).toHaveURL('/dashboard')
  })

  test('should test different user roles', async ({ page }) => {
    // Test admin role
    await page.goto('/login')
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('admin')).toBeVisible()

    // Logout
    await page.getByText('Logout').click()

    // Test user role
    await page.getByLabel('Email address').fill('user@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('user')).toBeVisible()
  })
})
