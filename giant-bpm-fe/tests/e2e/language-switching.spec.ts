import { test, expect } from '@playwright/test'

test.describe('Language Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Login first to access the dashboard with language switcher
    await page.goto('/login')
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test('should switch to Traditional Chinese', async ({ page }) => {
    // Open settings section (assuming it's visible in dashboard)
    await expect(page.getByText('Settings')).toBeVisible()

    // Find and change language to Traditional Chinese - now using custom Select component
    const languageSelect = page
      .locator('select[id="language-select"]')
      .or(page.locator('[role="combobox"]'))
    await expect(languageSelect.first()).toBeVisible()

    // Handle both native select and custom Select component
    if ((await page.locator('select[id="language-select"]').count()) > 0) {
      await page.locator('select[id="language-select"]').selectOption('zh-TW')
    } else {
      // Handle custom Select component
      await languageSelect.first().click()
      await page.getByRole('option', { name: /Chinese.*Traditional|zh-TW/ }).click()
    }

    // Verify that text has changed to Traditional Chinese
    await expect(page.getByText('儀表板')).toBeVisible() // Dashboard in Traditional Chinese
    await expect(page.getByText('設定')).toBeVisible() // Settings in Traditional Chinese
  })

  test('should switch to Simplified Chinese', async ({ page }) => {
    // Find and change language to Simplified Chinese - handle custom Select component
    const languageSelect = page
      .locator('select[id="language-select"]')
      .or(page.locator('[role="combobox"]'))
    await expect(languageSelect.first()).toBeVisible()

    // Handle both native select and custom Select component
    if ((await page.locator('select[id="language-select"]').count()) > 0) {
      await page.locator('select[id="language-select"]').selectOption('zh-CN')
    } else {
      // Handle custom Select component
      await languageSelect.first().click()
      await page.getByRole('option', { name: /Chinese.*Simplified|zh-CN/ }).click()
    }

    // Verify that text has changed to Simplified Chinese
    await expect(page.getByText('仪表板')).toBeVisible() // Dashboard in Simplified Chinese
    await expect(page.getByText('设置')).toBeVisible() // Settings in Simplified Chinese
  })

  test('should switch back to English', async ({ page }) => {
    // First switch to Chinese
    const languageSelect = page.locator('select[id="language-select"]')
    await languageSelect.selectOption('zh-TW')
    await expect(page.getByText('儀表板')).toBeVisible()

    // Switch back to English
    await languageSelect.selectOption('en')

    // Verify that text is back to English
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Settings')).toBeVisible()
  })

  test('should persist language selection after page refresh', async ({ page }) => {
    // Change language to Traditional Chinese
    const languageSelect = page.locator('select[id="language-select"]')
    await languageSelect.selectOption('zh-TW')
    await expect(page.getByText('儀表板')).toBeVisible()

    // Refresh the page
    await page.reload()

    // Verify language is still Traditional Chinese
    await expect(page.getByText('儀表板')).toBeVisible()

    // Verify the language selector shows the correct selection
    await expect(languageSelect).toHaveValue('zh-TW')
  })

  test('should show correct language options', async ({ page }) => {
    const languageSelect = page.locator('select[id="language-select"]')
    await expect(languageSelect).toBeVisible()

    // Check all language options are available
    const options = languageSelect.locator('option')
    await expect(options).toHaveCount(3)

    // Verify the options contain the expected values
    await expect(options.nth(0)).toHaveValue('en')
    await expect(options.nth(1)).toHaveValue('zh-TW')
    await expect(options.nth(2)).toHaveValue('zh-CN')
  })

  test('should translate counter demo section', async ({ page }) => {
    // Switch to Traditional Chinese
    const languageSelect = page.locator('select[id="language-select"]')
    await languageSelect.selectOption('zh-TW')

    // Verify counter demo translations
    await expect(page.getByText('計數器示範')).toBeVisible() // Counter Demo
    await expect(page.getByText('增加')).toBeVisible() // Increment
    await expect(page.getByText('重設')).toBeVisible() // Reset

    // Test counter functionality in Chinese
    await page.getByText('增加').click()
    await expect(page.getByText(/計數：\d+/)).toBeVisible() // Count: X
  })

  test('should translate logout functionality', async ({ page }) => {
    // Switch to Traditional Chinese
    const languageSelect = page.locator('select[id="language-select"]')
    await languageSelect.selectOption('zh-TW')

    // Verify logout button is translated
    await expect(page.getByText('登出')).toBeVisible() // Logout in Traditional Chinese

    // Test logout functionality
    await page.getByText('登出').click()

    // Should redirect to login page and show Chinese text
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('登入')).toBeVisible() // Login in Traditional Chinese
  })
})
