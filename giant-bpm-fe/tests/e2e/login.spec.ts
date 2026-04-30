import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login form elements', async ({ page }) => {
    // Check if the login form elements are visible
    await expect(page.locator('h2')).toContainText('Login')

    // Test custom Input components
    const emailInput = page.getByLabel('Email address')
    const passwordInput = page.getByLabel('Password')
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()

    // Test custom Button component
    const signInButton = page.getByRole('button', { name: 'Sign in' })
    await expect(signInButton).toBeVisible()

    // Verify custom UI styling is applied
    await expect(emailInput).toHaveClass(/border|rounded/)
    await expect(signInButton).toHaveClass(/bg-|border|rounded/)

    // Check for demo credentials section
    await expect(page.getByText('Demo Credentials:')).toBeVisible()
    await expect(page.getByText('admin@example.com')).toBeVisible()
    await expect(page.getByText('user@example.com')).toBeVisible()
  })

  test('should login successfully with admin credentials', async ({ page }) => {
    // Fill in admin credentials
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')

    // Click login button
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL('/dashboard')

    // Check if dashboard elements are visible
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Welcome,')).toBeVisible()
    await expect(page.getByText('admin')).toBeVisible()
  })

  test('should login successfully with user credentials', async ({ page }) => {
    // Fill in user credentials
    await page.getByLabel('Email address').fill('user@example.com')
    await page.getByLabel('Password').fill('password123')

    // Click login button
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL('/dashboard')

    // Check if dashboard elements are visible
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Welcome,')).toBeVisible()
    await expect(page.getByText('user')).toBeVisible()
  })

  test('should show loading state during login', async ({ page }) => {
    // Fill in valid credentials
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')

    // Click login button and immediately check for loading state
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Should show "Signing in..." text during loading
    await expect(page.getByText('Signing in...')).toBeVisible()
  })

  test('should handle invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.getByLabel('Email address').fill('invalid@example.com')
    await page.getByLabel('Password').fill('wrongpassword')

    // Click login button
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Should show error message
    await expect(page.getByText('Invalid email or password')).toBeVisible()

    // Should remain on login page
    await expect(page).toHaveURL('/login')
  })

  test('should handle empty credentials', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Should show HTML5 validation messages (required field)
    const emailInput = page.getByLabel('Email address')
    const passwordInput = page.getByLabel('Password')

    await expect(emailInput).toHaveAttribute('required', '')
    await expect(passwordInput).toHaveAttribute('required', '')
  })

  test('should validate email format', async ({ page }) => {
    // Fill in invalid email format
    await page.getByLabel('Email address').fill('invalid-email')
    await page.getByLabel('Password').fill('password123')

    // Try to submit
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Should show HTML5 email validation
    const emailInput = page.getByLabel('Email address')
    await expect(emailInput).toHaveAttribute('type', 'email')
  })

  test('should redirect authenticated users to dashboard', async ({ page }) => {
    // First login
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/dashboard')

    // Try to go back to login page
    await page.goto('/login')

    // Should redirect to dashboard automatically
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display app title and branding', async ({ page }) => {
    // Check for app branding
    await expect(page.getByText('Powered by Giant BPM')).toBeVisible()
    await expect(page.getByText('This is a demo application')).toBeVisible()
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')

    // Check if form is still visible and usable on mobile
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

    // Test mobile login flow
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL('/dashboard')
  })
})
