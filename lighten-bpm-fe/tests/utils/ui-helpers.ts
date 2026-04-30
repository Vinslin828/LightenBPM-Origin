import { Page, Locator, expect } from '@playwright/test'

/**
 * Utility functions for testing custom UI components
 */

export class UIHelpers {
  constructor(private page: Page) {}

  /**
   * Interact with custom Select component
   */
  async selectOption(selectLocator: Locator, optionValue: string) {
    // Handle both native select and custom Select component
    const isNativeSelect = (await selectLocator.getAttribute('tagName')) === 'SELECT'

    if (isNativeSelect) {
      await selectLocator.selectOption(optionValue)
    } else {
      // Custom Select component - click trigger and select option
      await selectLocator.click()
      await this.page.getByRole('option', { name: new RegExp(optionValue, 'i') }).click()
    }
  }

  /**
   * Interact with custom Button component
   */
  async clickButton(buttonText: string) {
    const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') })
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
    await button.click()
  }

  /**
   * Fill custom Input component
   */
  async fillInput(labelText: string, value: string) {
    const input = this.page.getByLabel(labelText)
    await expect(input).toBeVisible()
    await input.clear()
    await input.fill(value)
    await expect(input).toHaveValue(value)
  }

  /**
   * Interact with custom Checkbox component
   */
  async toggleCheckbox(labelText: string, checked: boolean = true) {
    const checkbox = this.page
      .getByRole('checkbox', { name: new RegExp(labelText, 'i') })
      .or(this.page.getByLabel(labelText))

    await expect(checkbox).toBeVisible()

    if (checked) {
      await checkbox.check()
      await expect(checkbox).toBeChecked()
    } else {
      await checkbox.uncheck()
      await expect(checkbox).not.toBeChecked()
    }
  }

  /**
   * Interact with custom Tabs component
   */
  async selectTab(tabName: string) {
    const tab = this.page
      .getByRole('tab', { name: new RegExp(tabName, 'i') })
      .or(this.page.getByRole('button', { name: new RegExp(tabName, 'i') }))

    await expect(tab).toBeVisible()
    await tab.click()

    // Verify tab is active
    const isActive = await tab.evaluate(
      el =>
        el.classList.contains('active') ||
        el.classList.contains('selected') ||
        el.classList.contains('bg-blue-600') ||
        el.getAttribute('aria-selected') === 'true'
    )

    expect(isActive).toBeTruthy()
  }

  /**
   * Interact with custom Dialog/Modal component
   */
  async openDialog(triggerText: string) {
    await this.clickButton(triggerText)

    // Wait for dialog to appear
    const dialog = this.page
      .locator('[role="dialog"]')
      .or(this.page.locator('.modal'))
      .or(this.page.locator('[data-dialog]'))

    await expect(dialog.first()).toBeVisible()
    return dialog.first()
  }

  /**
   * Close dialog with Escape key
   */
  async closeDialogWithEscape() {
    await this.page.keyboard.press('Escape')

    // Verify dialog is closed
    const dialogs = this.page.locator('[role="dialog"]')
    if ((await dialogs.count()) > 0) {
      await expect(dialogs.first()).not.toBeVisible()
    }
  }

  /**
   * Interact with custom Calendar/DatePicker component
   */
  async selectDate(triggerLocator: Locator, date: string) {
    // Open calendar
    await triggerLocator.click()

    // Wait for calendar to appear
    const calendar = this.page
      .locator('[role="dialog"]')
      .filter({ hasText: /calendar/ })
      .or(this.page.locator('.calendar'))
      .or(this.page.locator('[data-calendar]'))

    if ((await calendar.count()) > 0) {
      await expect(calendar.first()).toBeVisible()

      // Select date (simplified - click on date button)
      const dateButton = this.page.getByRole('button', { name: new RegExp(date) })
      if ((await dateButton.count()) > 0) {
        await dateButton.first().click()
      }
    }
  }

  /**
   * Verify custom form validation
   */
  async expectValidationError(fieldLabel: string) {
    // Check for various error indicators
    const field = this.page.getByLabel(fieldLabel)

    // Check for error styling
    const hasErrorStyling = await field.evaluate(
      el =>
        el.classList.contains('border-red-500') ||
        el.classList.contains('error') ||
        el.classList.contains('is-invalid') ||
        el.getAttribute('aria-invalid') === 'true'
    )

    // Check for error message
    const errorMessage = this.page
      .locator('.error-message')
      .or(this.page.locator('.text-red-500'))
      .or(this.page.locator('[role="alert"]'))

    // At least one error indicator should be present
    const hasError = hasErrorStyling || (await errorMessage.count()) > 0
    expect(hasError).toBeTruthy()
  }

  /**
   * Drag and drop for form builder
   */
  async dragAndDrop(sourceLocator: Locator, targetLocator: Locator) {
    await sourceLocator.dragTo(targetLocator, {
      targetPosition: { x: 0, y: 50 },
    })
  }

  /**
   * Wait for form builder to load
   */
  async waitForFormBuilder() {
    await expect(this.page.getByText('Templates')).toBeVisible()
    await expect(this.page.getByText('Components')).toBeVisible()

    // Wait for any loading indicators to disappear
    const loadingIndicators = this.page
      .locator('[data-loading]')
      .or(this.page.locator('.loading'))
      .or(this.page.locator('.spinner'))

    if ((await loadingIndicators.count()) > 0) {
      await expect(loadingIndicators.first()).not.toBeVisible()
    }
  }

  /**
   * Add form field via form builder
   */
  async addFormField(fieldType: string) {
    // Switch to components tab
    await this.selectTab('Components')

    // Click add field button
    await this.clickButton(fieldType)

    // Verify field was added
    const formFields = this.page.locator('[data-testid="form-field"]')
    const initialCount = await formFields.count()

    await expect(formFields).toHaveCount(initialCount + 1)

    return formFields.last()
  }

  /**
   * Configure form field properties
   */
  async configureFormField(
    fieldLocator: Locator,
    properties: {
      label?: string
      required?: boolean
      placeholder?: string
      helpText?: string
    }
  ) {
    // Select the field
    await fieldLocator.click()

    // Configure properties
    if (properties.label) {
      await this.fillInput('Label', properties.label)
    }

    if (properties.required !== undefined) {
      await this.toggleCheckbox('Required', properties.required)
    }

    if (properties.placeholder) {
      const placeholderInput = this.page.getByLabel(/placeholder/i)
      if (await placeholderInput.isVisible()) {
        await this.fillInput('Placeholder', properties.placeholder)
      }
    }

    if (properties.helpText) {
      const helpTextInput = this.page.getByLabel(/help.*text|description/i)
      if (await helpTextInput.isVisible()) {
        await this.fillInput('Help Text', properties.helpText)
      }
    }
  }

  /**
   * Verify responsive design
   */
  async testResponsiveDesign() {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
    ]

    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height })

      // Verify basic UI elements are still visible and functional
      await expect(this.page.getByText('Templates')).toBeVisible()
      await expect(this.page.getByText('Components')).toBeVisible()

      // Test basic interaction
      await this.selectTab('Components')
      await expect(this.page.getByText('Text Field')).toBeVisible()
    }

    // Reset to default viewport
    await this.page.setViewportSize({ width: 1280, height: 720 })
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Test tab navigation
    await this.page.keyboard.press('Tab')

    // Verify focus is visible
    const focusedElement = this.page.locator(':focus')
    await expect(focusedElement).toBeVisible()

    // Test Enter key on buttons
    const button = this.page.locator('button:focus')
    if ((await button.count()) > 0) {
      await this.page.keyboard.press('Enter')
      // Button should respond (this is a basic test)
      await expect(button).toBeVisible()
    }

    // Test Escape key for closing modals
    await this.page.keyboard.press('Escape')
  }
}
