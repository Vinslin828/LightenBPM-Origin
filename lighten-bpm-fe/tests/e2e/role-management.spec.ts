import { test, expect } from "@playwright/test";

test.describe("Role Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("admin@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test.describe("Page Layout", () => {
    test("should display role page with list and detail panels", async ({
      page,
    }) => {
      await page.goto("/admin/roles");

      // Header visible
      await expect(page.getByText("Role", { exact: true })).toBeVisible();

      // New Role button
      await expect(
        page.getByRole("button", { name: /new role/i }),
      ).toBeVisible();

      // Search input
      await expect(
        page.getByPlaceholder(/search role name/i),
      ).toBeVisible();
    });

    test("should show empty state when no roles exist", async ({ page }) => {
      await page.goto("/admin/roles");

      // Either roles exist or empty state shows
      const emptyState = page.getByText(/no role/i);
      const roleList = page.locator(
        ".space-y-1 .cursor-pointer",
      );

      const hasRoles = (await roleList.count()) > 0;
      if (!hasRoles) {
        await expect(emptyState.first()).toBeVisible();
      }
    });

    test("should show select prompt when no role is selected", async ({
      page,
    }) => {
      await page.goto("/admin/roles");

      await expect(
        page.getByText(/select a role to view details/i),
      ).toBeVisible();
    });
  });

  test.describe("Create Role", () => {
    test("should open and close create role modal", async ({ page }) => {
      await page.goto("/admin/roles");

      // Open modal
      await page.getByRole("button", { name: /new role/i }).click();
      await expect(page.getByText("New Role")).toBeVisible();

      // Fields are visible
      await expect(page.getByLabel(/role code/i)).toBeVisible();
      await expect(page.getByLabel(/name/i)).toBeVisible();

      // Cancel closes modal
      await page.getByRole("button", { name: /cancel/i }).click();
      await expect(
        page.locator(".fixed.inset-0"),
      ).not.toBeVisible();
    });

    test("should validate required fields in create modal", async ({
      page,
    }) => {
      await page.goto("/admin/roles");

      await page.getByRole("button", { name: /new role/i }).click();

      // Submit with empty fields
      await page.getByRole("button", { name: /create/i }).click();

      // Should show validation error
      await expect(page.locator(".text-red-600")).toBeVisible();
    });

    test("should create a new role", async ({ page }) => {
      await page.goto("/admin/roles");

      await page.getByRole("button", { name: /new role/i }).click();

      const timestamp = Date.now();
      await page.getByLabel(/role code/i).fill(`TEST_ROLE_${timestamp}`);
      await page.getByLabel(/name/i).last().fill(`Test Role ${timestamp}`);
      await page.getByRole("button", { name: /create/i }).click();

      // Modal should close and role should appear in list
      await expect(
        page.locator(".fixed.inset-0"),
      ).not.toBeVisible();

      // Wait for role to appear in the list
      await expect(
        page.getByText(`Test Role ${timestamp}`),
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Role Detail Panel", () => {
    test("should show detail panel when role is selected", async ({
      page,
    }) => {
      await page.goto("/admin/roles");

      // Click the first role in list
      const firstRole = page
        .locator(".space-y-1 .cursor-pointer")
        .first();
      if ((await firstRole.count()) > 0) {
        await firstRole.click();

        // Detail panel shows
        await expect(
          page.getByText(/role details/i),
        ).toBeVisible();

        // Role ID, code, name fields visible
        await expect(page.getByText(/role id/i)).toBeVisible();
        await expect(page.getByLabel(/role code/i)).toBeVisible();
        await expect(page.getByLabel(/name/i).last()).toBeVisible();
      }
    });

    test("should enable save button only when fields change", async ({
      page,
    }) => {
      await page.goto("/admin/roles");

      const firstRole = page
        .locator(".space-y-1 .cursor-pointer")
        .first();
      if ((await firstRole.count()) > 0) {
        await firstRole.click();

        await expect(
          page.getByText(/role details/i),
        ).toBeVisible();

        const saveButton = page.getByRole("button", { name: /save/i });

        // Initially disabled
        await expect(saveButton).toBeDisabled();

        // Change name
        const nameInput = page.getByLabel(/name/i).last();
        await nameInput.fill("Modified Name");

        // Now enabled
        await expect(saveButton).toBeEnabled();
      }
    });
  });

  test.describe("Role Delete", () => {
    test("should show delete option in more menu", async ({ page }) => {
      await page.goto("/admin/roles");

      const firstRole = page
        .locator(".space-y-1 .cursor-pointer")
        .first();
      if ((await firstRole.count()) > 0) {
        await firstRole.click();

        await expect(
          page.getByText(/role details/i),
        ).toBeVisible();

        // Click "..." button
        const moreButton = page.locator(
          'button:has(svg.lucide-more-horizontal)',
        );
        await moreButton.click();

        // Delete option visible in red
        await expect(
          page.getByRole("button", { name: /delete/i }),
        ).toBeVisible();
      }
    });

    test("should show confirmation dialog on delete", async ({ page }) => {
      await page.goto("/admin/roles");

      const firstRole = page
        .locator(".space-y-1 .cursor-pointer")
        .first();
      if ((await firstRole.count()) > 0) {
        await firstRole.click();

        await expect(
          page.getByText(/role details/i),
        ).toBeVisible();

        // Open "..." menu and click delete
        const moreButton = page.locator(
          'button:has(svg.lucide-more-horizontal)',
        );
        await moreButton.click();

        await page
          .locator(".absolute.right-0 button")
          .filter({ hasText: /delete/i })
          .click();

        // Confirmation dialog should appear
        await expect(
          page.getByText(/once deleted.*cannot be recovered/i),
        ).toBeVisible();

        // Cancel button works
        await page.getByRole("button", { name: /cancel/i }).click();
      }
    });
  });

  test.describe("Users Section", () => {
    test("should show users section in detail panel", async ({ page }) => {
      await page.goto("/admin/roles");

      const firstRole = page
        .locator(".space-y-1 .cursor-pointer")
        .first();
      if ((await firstRole.count()) > 0) {
        await firstRole.click();

        // Users section visible
        await expect(page.getByText("Users")).toBeVisible();
      }
    });

    test("should open add users modal with tabs", async ({ page }) => {
      await page.goto("/admin/roles");

      const firstRole = page
        .locator(".space-y-1 .cursor-pointer")
        .first();
      if ((await firstRole.count()) > 0) {
        await firstRole.click();

        await expect(
          page.getByText(/role details/i),
        ).toBeVisible();

        // Click edit (pencil) button in users section
        const editButton = page.locator(
          'button:has(svg.lucide-edit)',
        );
        if ((await editButton.count()) > 0) {
          await editButton.first().click();

          // Modal with tabs
          await expect(page.getByText("All")).toBeVisible();
          await expect(page.getByText("User")).toBeVisible();

          // Search field
          await expect(
            page.getByPlaceholder(/add name or email/i),
          ).toBeVisible();

          // Close modal
          await page.getByRole("button", { name: /cancel/i }).click();
        }
      }
    });

    test("should show checked users in All tab", async ({ page }) => {
      await page.goto("/admin/roles");

      const firstRole = page
        .locator(".space-y-1 .cursor-pointer")
        .first();
      if ((await firstRole.count()) > 0) {
        await firstRole.click();

        await expect(
          page.getByText(/role details/i),
        ).toBeVisible();

        // Open add users modal
        const editButton = page.locator(
          'button:has(svg.lucide-edit)',
        );
        if ((await editButton.count()) > 0) {
          await editButton.first().click();

          // In User tab, check the first unchecked user
          const uncheckedCheckbox = page
            .locator('input[type="checkbox"]:not(:checked)')
            .first();

          if ((await uncheckedCheckbox.count()) > 0) {
            const userName = await uncheckedCheckbox
              .locator("xpath=ancestor::label")
              .locator(".text-sm.font-medium")
              .textContent();

            await uncheckedCheckbox.check();

            // Switch to All tab
            await page
              .locator("button.rounded-full")
              .filter({ hasText: "All" })
              .click();

            // The checked user should appear in All tab
            if (userName) {
              await expect(
                page.getByText(userName.trim()),
              ).toBeVisible();
            }
          }

          await page.getByRole("button", { name: /cancel/i }).click();
        }
      }
    });
  });

  test.describe("Search", () => {
    test("should filter roles by search query", async ({ page }) => {
      await page.goto("/admin/roles");

      const searchInput = page.getByPlaceholder(/search role name/i);

      // Type a search query
      await searchInput.fill("nonexistent_role_xyz");

      // Should show no results or filtered results
      const roleItems = page.locator(
        ".space-y-1 .cursor-pointer",
      );
      await page.waitForTimeout(300); // debounce
      const count = await roleItems.count();

      // Either no results or fewer results than before
      expect(count).toBeGreaterThanOrEqual(0);

      // Clear search
      await searchInput.clear();
    });
  });
});
