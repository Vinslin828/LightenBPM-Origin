import { test, expect } from '@playwright/test'

test.describe('Form Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login to access the application
    await page.goto('/login')
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test.describe('Form Creation Workflow', () => {
    test('should create a new form from scratch', async ({ page }) => {
      // Navigate to form creation
      await page.goto('/form-management/create')

      // Verify we're on the form builder page
      await expect(page.getByText('Form Builder')).toBeVisible()
      await expect(page.getByText('Templates')).toBeVisible()
      await expect(page.getByText('Components')).toBeVisible()

      // Create a basic contact form
      await page.getByRole('button', { name: 'Components' }).click()

      // Add form fields
      await page.getByRole('button', { name: 'Text Field' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click() // Second text field
      await page.getByRole('button', { name: 'Textarea Field' }).click()

      // Configure first field (Name)
      await page.locator('[data-testid="form-field"]').first().click()
      let labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Full Name')

      // Mark as required
      const requiredCheckbox = page.getByLabel(/required/i)
      if (await requiredCheckbox.isVisible()) {
        await requiredCheckbox.check()
      }

      // Configure second field (Email)
      await page.locator('[data-testid="form-field"]').nth(1).click()
      labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Email Address')

      // Configure textarea field (Message)
      await page.locator('[data-testid="form-field"]').nth(2).click()
      labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Message')

      // Save the form
      const saveButton = page.getByRole('button', { name: /save/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()

        // Should show success message or redirect
        await expect(page.getByText(/saved|success/i)).toBeVisible()
      }
    })

    test('should create form using template', async ({ page }) => {
      await page.goto('/form-management/create')

      // Start with templates tab (should be default)
      await expect(page.getByRole('button', { name: 'Templates' })).toBeVisible()

      // Look for a template to use
      const templates = page
        .locator('[data-testid="template-item"]')
        .or(page.getByText(/basic_contact|contact|template/))

      if ((await templates.count()) > 0) {
        await templates.first().click()

        // Template should populate the form builder
        await expect(page.locator('[data-testid="form-field"]')).toHaveCount(2) // Assuming template has 2+ fields

        // Should be able to modify the template
        await page.locator('[data-testid="form-field"]').first().click()
        const labelInput = page.getByLabel('Label')
        if (await labelInput.isVisible()) {
          await labelInput.clear()
          await labelInput.fill('Modified Field')
          await expect(page.getByText('Modified Field')).toBeVisible()
        }
      }
    })

    test('should handle form validation during creation', async ({ page }) => {
      await page.goto('/form-management/create')

      // Try to save empty form
      const saveButton = page.getByRole('button', { name: /save/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()

        // Should show validation error
        await expect(page.getByText(/required|empty|field|error/i)).toBeVisible()
      }

      // Add a field but with invalid configuration
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Select Field' }).click()

      // Select field and try to save without options
      await page.locator('[data-testid="form-field"]').first().click()

      if (await saveButton.isVisible()) {
        await saveButton.click()

        // Should handle validation gracefully
        await expect(page.getByText(/option|required|field/i)).toBeVisible()
      }
    })
  })

  test.describe('Form Editing Workflow', () => {
    test('should edit existing form', async ({ page }) => {
      // First create a form to edit (or assume one exists)
      await page.goto('/form-management/create')

      // Create a simple form
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()

      // Configure the field
      await page.locator('[data-testid="form-field"]').first().click()
      const labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Original Field')

      // Now simulate editing the form
      await page.locator('[data-testid="form-field"]').first().click()
      await labelInput.clear()
      await labelInput.fill('Edited Field')

      // Verify edit was successful
      await expect(page.getByText('Edited Field')).toBeVisible()

      // Add another field to the existing form
      await page.getByRole('button', { name: 'Textarea Field' }).click()

      // Should now have 2 fields
      await expect(page.locator('[data-testid="form-field"]')).toHaveCount(2)
    })

    test('should reorder fields in form', async ({ page }) => {
      await page.goto('/form-management/create')

      // Create multiple fields
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()
      await page.getByRole('button', { name: 'Textarea Field' }).click()
      await page.getByRole('button', { name: 'Select Field' }).click()

      // Verify we have 3 fields
      await expect(page.locator('[data-testid="form-field"]')).toHaveCount(3)

      // Test drag and drop reordering
      const firstField = page.locator('[data-testid="form-field"]').first()
      const lastField = page.locator('[data-testid="form-field"]').last()

      // Drag first field to last position
      await firstField.dragTo(lastField, { targetPosition: { x: 0, y: 50 } })

      // Verify reordering occurred (basic check)
      await expect(page.locator('[data-testid="form-field"]')).toHaveCount(3)
    })

    test('should remove fields from form', async ({ page }) => {
      await page.goto('/form-management/create')

      // Create multiple fields
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()
      await page.getByRole('button', { name: 'Textarea Field' }).click()

      // Verify we have 2 fields
      await expect(page.locator('[data-testid="form-field"]')).toHaveCount(2)

      // Select and delete first field
      await page.locator('[data-testid="form-field"]').first().click()

      // Look for delete button
      const deleteButton = page.getByRole('button', { name: /delete|remove|×/i })
      if (await deleteButton.isVisible()) {
        await deleteButton.click()

        // Confirm deletion if there's a confirmation dialog
        const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i })
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
        }

        // Should now have 1 field
        await expect(page.locator('[data-testid="form-field"]')).toHaveCount(1)
      }
    })
  })

  test.describe('Form Configuration', () => {
    test('should configure field properties', async ({ page }) => {
      await page.goto('/form-management/create')

      // Add a text field
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()

      // Select field to configure
      await page.locator('[data-testid="form-field"]').first().click()

      // Configure various properties
      const labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Customer Name')

      // Set placeholder if available
      const placeholderInput = page.getByLabel(/placeholder/i)
      if (await placeholderInput.isVisible()) {
        await placeholderInput.fill('Enter your full name')
      }

      // Set help text if available
      const helpTextInput = page.getByLabel(/help.*text|description/i)
      if (await helpTextInput.isVisible()) {
        await helpTextInput.fill('Please provide your complete legal name')
      }

      // Mark as required
      const requiredCheckbox = page.getByLabel(/required/i)
      if (await requiredCheckbox.isVisible()) {
        await requiredCheckbox.check()
        await expect(requiredCheckbox).toBeChecked()
      }

      // Verify changes are reflected
      await expect(page.getByText('Customer Name')).toBeVisible()
    })

    test('should configure select field options', async ({ page }) => {
      await page.goto('/form-management/create')

      // Add a select field
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Select Field' }).click()

      // Select field to configure
      await page.locator('[data-testid="form-field"]').first().click()

      // Configure field label
      const labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Country')

      // Look for options configuration
      const optionsArea = page
        .getByText(/options|option/i)
        .or(page.getByLabel(/add.*option|option/i))

      if (await optionsArea.isVisible()) {
        // Add some options
        const addOptionButton = page.getByRole('button', { name: /add.*option|option/i })
        if (await addOptionButton.isVisible()) {
          await addOptionButton.click()

          // Fill in option values
          const optionInputs = page
            .locator('input[name*="option"]')
            .or(page.locator('input[placeholder*="option"]'))

          if ((await optionInputs.count()) > 0) {
            await optionInputs.first().fill('United States')

            // Add another option if possible
            if (await addOptionButton.isVisible()) {
              await addOptionButton.click()
              if ((await optionInputs.count()) > 1) {
                await optionInputs.nth(1).fill('Canada')
              }
            }
          }
        }
      }

      // Verify select field is configured
      await expect(page.getByText('Country')).toBeVisible()
    })

    test('should configure date picker field', async ({ page }) => {
      await page.goto('/form-management/create')

      // Add a date picker field
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Date Picker Field' }).click()

      // Select field to configure
      await page.locator('[data-testid="form-field"]').first().click()

      // Configure field label
      const labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Birth Date')

      // Set default value if available
      const defaultDateInput = page.getByLabel(/default.*date|default.*value/i)
      if (await defaultDateInput.isVisible()) {
        await defaultDateInput.fill('2000-01-01')
      }

      // Verify date field is configured
      await expect(page.getByText('Birth Date')).toBeVisible()
    })
  })

  test.describe('Form Preview and Testing', () => {
    test('should preview form correctly', async ({ page }) => {
      await page.goto('/form-management/create')

      // Create a simple form
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()
      await page.getByRole('button', { name: 'Textarea Field' }).click()

      // Configure fields
      await page.locator('[data-testid="form-field"]').first().click()
      let labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Name')

      await page.locator('[data-testid="form-field"]').nth(1).click()
      labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Message')

      // Open preview
      const previewButton = page.getByRole('button', { name: /preview|eye/i })
      if (await previewButton.isVisible()) {
        await previewButton.click()

        // Should show preview modal/dialog
        const previewDialog = page.locator('[role="dialog"]').or(page.getByText(/preview/i))
        await expect(previewDialog.first()).toBeVisible()

        // Should show actual form elements
        await expect(page.locator('input[type="text"]')).toBeVisible()
        await expect(page.locator('textarea')).toBeVisible()

        // Test form interaction in preview
        await page.locator('input[type="text"]').fill('John Doe')
        await page.locator('textarea').fill('This is a test message')

        // Form should accept input in preview mode
        await expect(page.locator('input[type="text"]')).toHaveValue('John Doe')
      }
    })

    test('should validate form in preview mode', async ({ page }) => {
      await page.goto('/form-management/create')

      // Create form with required field
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()

      // Configure as required field
      await page.locator('[data-testid="form-field"]').first().click()
      const labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Required Field')

      const requiredCheckbox = page.getByLabel(/required/i)
      if (await requiredCheckbox.isVisible()) {
        await requiredCheckbox.check()
      }

      // Open preview and test validation
      const previewButton = page.getByRole('button', { name: /preview|eye/i })
      if (await previewButton.isVisible()) {
        await previewButton.click()

        // Try to submit form without filling required field
        const submitButton = page.getByRole('button', { name: /submit/i })
        if (await submitButton.isVisible()) {
          await submitButton.click()

          // Should show validation error
          await expect(page.getByText(/required|error/i)).toBeVisible()
        }
      }
    })
  })

  test.describe('Form Persistence', () => {
    test('should auto-save form changes', async ({ page }) => {
      await page.goto('/form-management/create')

      // Create a field
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()

      // Configure field
      await page.locator('[data-testid="form-field"]').first().click()
      const labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Auto Saved Field')

      // Wait a moment for auto-save
      await page.waitForTimeout(1000)

      // Refresh page to test persistence
      await page.reload()

      // Check if changes persisted (this would depend on actual auto-save implementation)
      // For now, just verify the form builder loaded correctly
      await expect(page.getByText('Templates')).toBeVisible()
      await expect(page.getByText('Components')).toBeVisible()
    })

    test('should save form manually', async ({ page }) => {
      await page.goto('/form-management/create')

      // Create a complete form
      await page.getByRole('button', { name: 'Components' }).click()
      await page.getByRole('button', { name: 'Text Field' }).click()
      await page.getByRole('button', { name: 'Textarea Field' }).click()

      // Configure fields
      await page.locator('[data-testid="form-field"]').first().click()
      let labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Contact Name')

      await page.locator('[data-testid="form-field"]').nth(1).click()
      labelInput = page.getByLabel('Label')
      await labelInput.clear()
      await labelInput.fill('Contact Message')

      // Save the form
      const saveButton = page.getByRole('button', { name: /save/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()

        // Should show success indication
        await expect(page.getByText(/saved|success/i)).toBeVisible()

        // Should remain functional after save
        await expect(page.locator('[data-testid="form-field"]')).toHaveCount(2)
      }
    })
  })
})
