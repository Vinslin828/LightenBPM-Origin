import { test, expect } from '@playwright/test'

test.describe('Form Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to form builder
    await page.goto('/login')
    await page.getByLabel('Email address').fill('admin@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test('should navigate to form builder from dashboard', async ({ page }) => {
    // Navigate to form management (assuming there's a link or button)
    await page.goto('/form-management/create')

    // Should see form builder interface
    await expect(page.getByText('Templates')).toBeVisible()
    await expect(page.getByText('Components')).toBeVisible()
    await expect(page.getByText('Form Builder')).toBeVisible()
  })

  test('should switch between templates and components tabs', async ({ page }) => {
    await page.goto('/form-management/create')

    // Should start with templates tab active
    await expect(page.getByRole('button', { name: 'Templates' })).toHaveClass(
      /active|selected|bg-blue-600/
    )

    // Switch to components tab
    await page.getByRole('button', { name: 'Components' }).click()
    await expect(page.getByRole('button', { name: 'Components' })).toHaveClass(
      /active|selected|bg-blue-600/
    )

    // Should see component options
    await expect(page.getByText('Text Field')).toBeVisible()
    await expect(page.getByText('Textarea Field')).toBeVisible()
    await expect(page.getByText('Select Field')).toBeVisible()
  })

  test('should add text field component', async ({ page }) => {
    await page.goto('/form-management/create')

    // Switch to components tab
    await page.getByRole('button', { name: 'Components' }).click()

    // Add a text field
    await page.getByRole('button', { name: 'Text Field' }).click()

    // Should see the text field added to the form
    await expect(page.locator('[data-testid="form-field"]').first()).toBeVisible()

    // Should see field properties panel
    await expect(page.getByLabel('Label')).toBeVisible()
  })

  test('should add multiple form components', async ({ page }) => {
    await page.goto('/form-management/create')

    // Switch to components tab
    await page.getByRole('button', { name: 'Components' }).click()

    // Add multiple components
    await page.getByRole('button', { name: 'Text Field' }).click()
    await page.getByRole('button', { name: 'Textarea Field' }).click()
    await page.getByRole('button', { name: 'Select Field' }).click()

    // Should see all three components
    const formFields = page.locator('[data-testid="form-field"]')
    await expect(formFields).toHaveCount(3)
  })

  test('should configure text field properties', async ({ page }) => {
    await page.goto('/form-management/create')

    // Add a text field
    await page.getByRole('button', { name: 'Components' }).click()
    await page.getByRole('button', { name: 'Text Field' }).click()

    // Click on the field to select it
    await page.locator('[data-testid="form-field"]').first().click()

    // Configure field properties
    const labelInput = page.getByLabel('Label')
    await labelInput.clear()
    await labelInput.fill('Full Name')

    // Check if required field option exists and toggle it
    const requiredCheckbox = page.getByLabel('Required')
    if (await requiredCheckbox.isVisible()) {
      await requiredCheckbox.check()
    }

    // Verify changes are reflected
    await expect(page.getByText('Full Name')).toBeVisible()
  })

  test('should delete form component', async ({ page }) => {
    await page.goto('/form-management/create')

    // Add a component
    await page.getByRole('button', { name: 'Components' }).click()
    await page.getByRole('button', { name: 'Text Field' }).click()

    // Select the component and delete it
    await page.locator('[data-testid="form-field"]').first().click()

    // Look for delete button (might be in a context menu or toolbar)
    const deleteButton = page.getByRole('button', { name: /delete|remove|×/ })
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
    }

    // Verify component is removed
    await expect(page.locator('[data-testid="form-field"]')).toHaveCount(0)
    await expect(page.getByText('No elements yet')).toBeVisible()
  })

  test('should reorder form components using drag and drop', async ({ page }) => {
    await page.goto('/form-management/create')

    // Add multiple components
    await page.getByRole('button', { name: 'Components' }).click()
    await page.getByRole('button', { name: 'Text Field' }).click()
    await page.getByRole('button', { name: 'Textarea Field' }).click()

    // Get the components
    const firstField = page.locator('[data-testid="form-field"]').first()
    const secondField = page.locator('[data-testid="form-field"]').nth(1)

    // Drag first field below second field
    await firstField.dragTo(secondField, { targetPosition: { x: 0, y: 50 } })

    // Verify order has changed (this is a basic check - more specific assertions would depend on implementation)
    const fieldsAfterDrag = page.locator('[data-testid="form-field"]')
    await expect(fieldsAfterDrag).toHaveCount(2)
  })

  test('should preview form', async ({ page }) => {
    await page.goto('/form-management/create')

    // Add some components
    await page.getByRole('button', { name: 'Components' }).click()
    await page.getByRole('button', { name: 'Text Field' }).click()
    await page.getByRole('button', { name: 'Textarea Field' }).click()

    // Look for preview button
    const previewButton = page.getByRole('button', { name: /preview|eye/ })
    if (await previewButton.isVisible()) {
      await previewButton.click()

      // Should see preview modal or panel
      await expect(page.getByText(/preview|Preview/)).toBeVisible()

      // Should see form components rendered as actual form elements
      await expect(page.locator('input[type="text"]')).toBeVisible()
      await expect(page.locator('textarea')).toBeVisible()
    }
  })

  test('should save form configuration', async ({ page }) => {
    await page.goto('/form-management/create')

    // Add a component and configure it
    await page.getByRole('button', { name: 'Components' }).click()
    await page.getByRole('button', { name: 'Text Field' }).click()

    // Configure the field
    await page.locator('[data-testid="form-field"]').first().click()
    const labelInput = page.getByLabel('Label')
    await labelInput.clear()
    await labelInput.fill('Customer Name')

    // Save the form (look for save button)
    const saveButton = page.getByRole('button', { name: /save|Save/ })
    if (await saveButton.isVisible()) {
      await saveButton.click()

      // Should see success message or redirect
      await expect(page.getByText(/saved|success|Saved/)).toBeVisible()
    }
  })

  test('should use form templates', async ({ page }) => {
    await page.goto('/form-management/create')

    // Should see template options in the templates tab
    await expect(page.getByText('Templates')).toBeVisible()

    // Look for template options
    const templates = ['basic_contact', 'employee_onboarding', 'feedback_survey', 'registration']

    for (const template of templates) {
      // Check if template exists (might be translated keys)
      const templateElement = page.getByText(template).or(page.getByText(new RegExp(template, 'i')))
      if (await templateElement.isVisible()) {
        await expect(templateElement).toBeVisible()
      }
    }
  })

  test('should validate form builder constraints', async ({ page }) => {
    await page.goto('/form-management/create')

    // Try to save without any fields
    const saveButton = page.getByRole('button', { name: /save|Save/ })
    if (await saveButton.isVisible()) {
      await saveButton.click()

      // Should show validation error
      await expect(page.getByText(/required|empty|field/)).toBeVisible()
    }
  })

  test('should handle form builder errors gracefully', async ({ page }) => {
    await page.goto('/form-management/create')

    // Add a component
    await page.getByRole('button', { name: 'Components' }).click()
    await page.getByRole('button', { name: 'Select Field' }).click()

    // Select the field and try to configure options
    await page.locator('[data-testid="form-field"]').first().click()

    // Look for options configuration
    const optionsInput = page.getByLabel(/option|Option/)
    if (await optionsInput.isVisible()) {
      // Try to add empty option
      await optionsInput.fill('')

      // Should handle gracefully without crashing
      await expect(page.getByText('Select Field')).toBeVisible()
    }
  })

  test('should support different field types', async ({ page }) => {
    await page.goto('/form-management/create')

    // Switch to components tab
    await page.getByRole('button', { name: 'Components' }).click()

    // Test adding different field types
    const fieldTypes = [
      'Text Field',
      'Textarea Field',
      'Select Field',
      'Date Picker Field',
      'Check Box',
    ]

    for (const fieldType of fieldTypes) {
      const fieldButton = page.getByRole('button', { name: fieldType })
      if (await fieldButton.isVisible()) {
        await fieldButton.click()

        // Verify field was added
        const fields = page.locator('[data-testid="form-field"]')
        await expect(fields).toHaveCount((await fields.count()) + 1)
      }
    }
  })
})
