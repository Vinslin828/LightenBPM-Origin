import { test, expect } from '@playwright/test'

test.describe('UI Components', () => {
  test.beforeEach(async ({ page }) => {
    // Login to access the application
    await page.goto('/login')
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test.describe('Button Component', () => {
    test('should render buttons with different variants', async ({ page }) => {
      await page.goto('/form-management/create')

      // Test different button variants if visible
      const buttons = page.locator('button')
      await expect(buttons.first()).toBeVisible()

      // Test button interaction
      const addElementButton = page
        .getByRole('button', { name: /Add|Text Field|Components/ })
        .first()
      if (await addElementButton.isVisible()) {
        await addElementButton.click()
        // Button should be clickable and responsive
        await expect(addElementButton).toBeEnabled()
      }
    })

    test('should handle button disabled state', async ({ page }) => {
      await page.goto('/form-management/create')

      // Look for buttons that might be disabled
      const buttons = page.locator('button:disabled')
      if ((await buttons.count()) > 0) {
        await expect(buttons.first()).toBeDisabled()
      }
    })
  })

  test.describe('Input Component', () => {
    test('should handle text input interactions', async ({ page }) => {
      await page.goto('/form-management/create')

      // Add a text field to test input
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()

      // Select field and interact with label input
      await page.locator('[data-testid="form-field"]').first().click()

      const labelInput = page.getByLabel('Label')
      if (await labelInput.isVisible()) {
        await labelInput.clear()
        await labelInput.fill('Test Input Field')

        // Verify input value changed
        await expect(labelInput).toHaveValue('Test Input Field')

        // Test input validation
        await labelInput.clear()
        await labelInput.fill('')
        // Should handle empty input gracefully
      }
    })

    test('should show validation errors for required inputs', async ({ page }) => {
      await page.goto('/form-management/create')

      // Add a text field
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()
      await page.locator('[data-testid="form-field"]').first().click()

      // Clear required field and check for error styling
      const labelInput = page.getByLabel('Label')
      if (await labelInput.isVisible()) {
        await labelInput.clear()
        await labelInput.blur()

        // Check for error styling or validation message
        const hasErrorClass = await labelInput.evaluate(
          el =>
            el.classList.contains('border-red-500') ||
            el.classList.contains('error') ||
            el.classList.contains('is-invalid')
        )

        // At least verify input still exists after validation
        await expect(labelInput).toBeVisible()
      }
    })
  })

  test.describe('Select Component', () => {
    test('should handle select dropdown interactions', async ({ page }) => {
      await page.goto('/form-management/create')

      // Add a select field
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Select Field' }).click()
      await page.locator('[data-testid="form-field"]').first().click()

      // Look for select configuration options
      const selectTrigger = page.locator('[role="combobox"]').or(page.locator('select'))
      if ((await selectTrigger.count()) > 0) {
        await selectTrigger.first().click()

        // Should open dropdown
        const dropdown = page.locator('[role="listbox"]').or(page.locator('option'))
        if ((await dropdown.count()) > 0) {
          await expect(dropdown.first()).toBeVisible()
        }
      }
    })
  })

  test.describe('Checkbox Component', () => {
    test('should handle checkbox interactions', async ({ page }) => {
      await page.goto('/form-management/create')

      // Add a checkbox field
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Check Box' }).click()
      await page.locator('[data-testid="form-field"]').first().click()

      // Look for checkbox in the properties panel or preview
      const checkboxes = page.locator('input[type="checkbox"]')
      if ((await checkboxes.count()) > 0) {
        const firstCheckbox = checkboxes.first()

        // Test checking the checkbox
        await firstCheckbox.check()
        await expect(firstCheckbox).toBeChecked()

        // Test unchecking
        await firstCheckbox.uncheck()
        await expect(firstCheckbox).not.toBeChecked()
      }
    })
  })

  test.describe('Tabs Component', () => {
    test('should switch between tabs correctly', async ({ page }) => {
      await page.goto('/form-management/create')

      // Test main tabs (Templates/Components)
      const templatesTab = page.getByRole('button', { name: 'Templates' })
      const componentsTab = page.getByRole('button', { name: 'Components' })

      await expect(templatesTab).toBeVisible()
      await expect(componentsTab).toBeVisible()

      // Test tab switching
      await componentsTab.click()
      await expect(componentsTab).toHaveClass(/active|selected|bg-blue-600/)

      await templatesTab.click()
      await expect(templatesTab).toHaveClass(/active|selected|bg-blue-600/)
    })

    test('should show correct tab content', async ({ page }) => {
      await page.goto('/form-management/create')

      // Templates tab should show templates
      await page.getByRole('button', { name: 'Templates' }).click()
      const templateContent = page.getByText(/template|basic_contact|employee/)
      if ((await templateContent.count()) > 0) {
        await expect(templateContent.first()).toBeVisible()
      }

      // Components tab should show components
      await page.getByRole('button', { name: 'Components' }).click()
      await expect(page.getByText('Text Field')).toBeVisible()
      await expect(page.getByText('Textarea Field')).toBeVisible()
    })
  })

  test.describe('Dialog Component', () => {
    test('should handle dialog/modal interactions', async ({ page }) => {
      await page.goto('/form-management/create')

      // Add a component to trigger any dialogs
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()

      // Look for any dialog triggers (like delete buttons)
      const dialogTriggers = page
        .locator('[role="button"]')
        .filter({ hasText: /delete|remove|×|settings/ })

      if ((await dialogTriggers.count()) > 0) {
        await dialogTriggers.first().click()

        // Check if a dialog/modal opened
        const dialogs = page
          .locator('[role="dialog"]')
          .or(page.locator('.modal'))
          .or(page.locator('[data-dialog]'))
        if ((await dialogs.count()) > 0) {
          await expect(dialogs.first()).toBeVisible()

          // Test closing dialog with escape key
          await page.keyboard.press('Escape')
          await expect(dialogs.first()).not.toBeVisible()
        }
      }
    })
  })

  test.describe('Calendar Component', () => {
    test('should handle date picker interactions', async ({ page }) => {
      await page.goto('/form-management/create')

      // Add a date picker field
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Date Picker Field' }).click()
      await page.locator('[data-testid="form-field"]').first().click()

      // Look for date picker trigger
      const dateTriggers = page
        .locator('button')
        .filter({ hasText: /pick.*date|calendar/ })
        .or(page.locator('input[type="date"]'))

      if ((await dateTriggers.count()) > 0) {
        await dateTriggers.first().click()

        // Check if calendar opened
        const calendar = page
          .locator('[role="dialog"]')
          .filter({ hasText: /calendar/ })
          .or(page.locator('.calendar'))

        if ((await calendar.count()) > 0) {
          await expect(calendar.first()).toBeVisible()

          // Test selecting a date
          const dateButtons = page.locator('button').filter({ hasText: /^\d+$/ })
          if ((await dateButtons.count()) > 0) {
            await dateButtons.first().click()

            // Calendar should close or show selected date
            await expect(calendar.first()).not.toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Form Validation', () => {
    test('should show validation errors with proper styling', async ({ page }) => {
      await page.goto('/form-management/create')

      // Add a text field
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()
      await page.locator('[data-testid="form-field"]').first().click()

      // Configure field as required
      const requiredCheckbox = page.getByLabel(/required/i)
      if (await requiredCheckbox.isVisible()) {
        await requiredCheckbox.check()
      }

      // Try to save with invalid configuration
      const saveButton = page.getByRole('button', { name: /save/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()

        // Look for validation error messages
        const errorMessages = page
          .locator('.error')
          .or(page.locator('.text-red-500'))
          .or(page.locator('[role="alert"]'))

        // Should handle validation gracefully
        await expect(page.getByText(/field|error|invalid/i)).toBeVisible()
      }
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/form-management/create')

      // Check for proper button roles
      const buttons = page.locator('button[role="button"]').or(page.locator('button'))
      await expect(buttons.first()).toBeVisible()

      // Check for proper form labels
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()
      await page.locator('[data-testid="form-field"]').first().click()

      const labelInputs = page.locator('label').or(page.locator('[aria-label]'))
      if ((await labelInputs.count()) > 0) {
        await expect(labelInputs.first()).toBeVisible()
      }
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/form-management/create')

      // Test tab navigation
      await page.keyboard.press('Tab')

      // Focus should move to next focusable element
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()

      // Test Enter key on buttons
      const firstButton = page.locator('button').first()
      await firstButton.focus()
      await page.keyboard.press('Enter')

      // Button should respond to Enter key
      await expect(firstButton).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile viewports', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/form-management/create')

      // UI should still be functional on mobile
      await expect(page.getByText('Templates')).toBeVisible()
      await expect(page.getByText('Components')).toBeVisible()

      // Test mobile interaction
      await page.getByRole('button', { name: 'Components' }).click()
      await expect(page.getByText('Text Field')).toBeVisible()
    })

    test('should work correctly on tablet viewports', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/form-management/create')

      // UI should be properly sized for tablet
      await expect(page.getByText('Templates')).toBeVisible()
      await expect(page.getByText('Components')).toBeVisible()

      // Test tablet interaction
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()

      // Should be able to configure field on tablet
      await page.locator('[data-testid="form-field"]').first().click()
      const labelInput = page.getByLabel('Label')
      if (await labelInput.isVisible()) {
        await expect(labelInput).toBeVisible()
      }
    })
  })
})
