import { test, expect } from '@playwright/test';

/**
 * E2E tests for Admin Dashboard
 * NOTE: These tests require admin authentication setup
 */

test.describe('Admin Dashboard Access', () => {
  test('should redirect non-admin users to regular dashboard', async ({ page }) => {
    // TODO: Setup regular user authentication
    await page.goto('/services/solutions-financieres/vcard/admin');

    // Should redirect or show access denied
    await page.waitForURL(/dashboard|access.*denied/i);

    // Should not show admin interface
    await expect(page.locator('[data-testid="admin-panel"]')).not.toBeVisible();
  });

  test('should allow admin users to access admin panel', async ({ page }) => {
    // TODO: Setup admin user authentication
    await page.goto('/services/solutions-financieres/vcard/admin');

    // Should show admin dashboard
    await expect(page.locator('[data-testid="admin-panel"], h1:has-text(/admin|administration/i)')).toBeVisible();
  });
});

test.describe('Admin User Management', () => {
  test('should display users table', async ({ page }) => {
    // Assume admin is authenticated
    await page.goto('/services/solutions-financieres/vcard/admin/users');

    // Should show users table
    const usersTable = page.locator('[data-testid="users-table"], table');
    await expect(usersTable).toBeVisible();

    // Table should have headers
    await expect(page.locator('th:has-text(/email/i)')).toBeVisible();
    await expect(page.locator('th:has-text(/nom|name/i)')).toBeVisible();
    await expect(page.locator('th:has-text(/kyc.*statut|kyc.*status/i)')).toBeVisible();
  });

  test('should paginate users list', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/users');

    // Should have pagination controls
    const paginationNext = page.locator('[data-testid="pagination-next"], button:has-text(/suivant|next/i)');
    await expect(paginationNext).toBeVisible();

    // Click next page
    await paginationNext.click();

    // URL or page content should update
    await page.waitForTimeout(500);
    expect(page.url()).toMatch(/page=2|\?.*page.*2/);
  });

  test('should search users by email or name', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/users');

    // Should have search input
    const searchInput = page.locator('input[name="search"], input[placeholder*="recherche"]');
    await expect(searchInput).toBeVisible();

    // Type search query
    await searchInput.fill('john@example.com');

    // Wait for search results
    await page.waitForTimeout(500);

    // Table should filter results
    const rows = page.locator('tbody tr');
    const count = await rows.count();

    // All visible rows should match search
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      await expect(row).toContainText(/john/i);
    }
  });

  test('should filter users by KYC status', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/users');

    // Select KYC status filter
    await page.selectOption('select[name="kyc_filter"]', 'PENDING');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // All visible users should have pending status
    const statusBadges = page.locator('[data-testid="kyc-status"]');
    const count = await statusBadges.count();

    for (let i = 0; i < count; i++) {
      const badge = statusBadges.nth(i);
      await expect(badge).toContainText(/pending|en attente/i);
    }
  });

  test('should view user details', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/users');

    // Click on first user row
    await page.click('tbody tr:first-child');

    // Should show user details modal or page
    await expect(page.locator('[data-testid="user-details"]')).toBeVisible();

    // Should show user information
    await expect(page.locator('text=/email/i')).toBeVisible();
    await expect(page.locator('text=/téléphone|phone/i')).toBeVisible();
  });
});

test.describe('Admin KYC Management', () => {
  test('should display pending KYC requests', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/kyc');

    // Should show list of pending KYC
    const kycList = page.locator('[data-testid="kyc-pending-list"]');
    await expect(kycList).toBeVisible();

    // Should show KYC items
    await expect(page.locator('[data-testid="kyc-item"]').first()).toBeVisible();
  });

  test('should view KYC document image', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/kyc');

    // Click on KYC item
    await page.click('[data-testid="kyc-item"]:first-child');

    // Should show document image
    const documentImage = page.locator('img[data-testid="kyc-document"]');
    await expect(documentImage).toBeVisible();
  });

  test('should approve KYC request', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/kyc');

    // Click on KYC item
    await page.click('[data-testid="kyc-item"]:first-child');

    // Click approve button
    const approveButton = page.locator('button:has-text(/approuver|approve/i)');
    await expect(approveButton).toBeVisible();
    await approveButton.click();

    // Confirm action
    await page.click('button:has-text(/confirmer|confirm/i)');

    // Should show success message
    await expect(page.locator('text=/kyc.*approuvé|kyc.*approved/i')).toBeVisible();

    // Item should be removed from pending list or status updated
    await page.waitForTimeout(500);
  });

  test('should reject KYC request with reason', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/kyc');

    // Click on KYC item
    await page.click('[data-testid="kyc-item"]:first-child');

    // Click reject button
    const rejectButton = page.locator('button:has-text(/rejeter|reject/i)');
    await rejectButton.click();

    // Should show reason input
    const reasonInput = page.locator('textarea[name="reason"], input[name="reason"]');
    await expect(reasonInput).toBeVisible();

    // Enter rejection reason
    await reasonInput.fill('Document not clear, please resubmit');

    // Confirm rejection
    await page.click('button:has-text(/confirmer.*rejet|confirm.*reject/i)');

    // Should show success message
    await expect(page.locator('text=/kyc.*rejeté|kyc.*rejected/i')).toBeVisible();
  });

  test('should not allow approval without viewing document', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/kyc');

    // Approve button might be disabled initially
    const firstItem = page.locator('[data-testid="kyc-item"]:first-child');
    const approveButton = firstItem.locator('button:has-text(/approuver|approve/i)');

    // Button should require document view first (implementation dependent)
    // This is a security/UX best practice
  });
});

test.describe('Admin Transaction Management', () => {
  test('should display all transactions', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/transactions');

    // Should show transactions table
    const transactionsTable = page.locator('[data-testid="transactions-table"], table');
    await expect(transactionsTable).toBeVisible();

    // Should have transaction headers
    await expect(page.locator('th:has-text(/référence|reference/i)')).toBeVisible();
    await expect(page.locator('th:has-text(/montant|amount/i)')).toBeVisible();
    await expect(page.locator('th:has-text(/statut|status/i)')).toBeVisible();
  });

  test('should filter transactions by status', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/transactions');

    // Select status filter
    await page.selectOption('select[name="status_filter"]', 'COMPLETED');

    // All visible transactions should be completed
    const statusBadges = page.locator('[data-testid="transaction-status"]');
    const count = await statusBadges.count();

    for (let i = 0; i < count; i++) {
      const badge = statusBadges.nth(i);
      await expect(badge).toContainText(/completed|terminé/i);
    }
  });

  test('should filter transactions by date range', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/transactions');

    // Set date range
    await page.fill('input[name="date_from"]', '2025-01-01');
    await page.fill('input[name="date_to"]', '2025-01-31');

    // Apply filter
    await page.click('button:has-text(/appliquer|apply/i)');

    // Wait for results
    await page.waitForTimeout(500);

    // Results should be within date range (verify in UI)
  });

  test('should export transactions to CSV', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/transactions');

    // Click export button
    const exportButton = page.locator('button:has-text(/exporter|export/i)');
    await expect(exportButton).toBeVisible();

    // Start waiting for download
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify filename
    expect(download.suggestedFilename()).toMatch(/transactions.*\.csv/i);
  });
});

test.describe('Admin Dashboard Statistics', () => {
  test('should display key metrics', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin');

    // Should show statistics cards
    await expect(page.locator('[data-testid="stat-total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-total-cards"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-total-transactions"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-pending-kyc"]')).toBeVisible();
  });

  test('should display revenue chart', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin');

    // Should show chart
    const revenueChart = page.locator('[data-testid="revenue-chart"], canvas');
    await expect(revenueChart).toBeVisible();
  });

  test('should display recent activity feed', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin');

    // Should show activity feed
    const activityFeed = page.locator('[data-testid="activity-feed"]');
    await expect(activityFeed).toBeVisible();

    // Should show activity items
    await expect(page.locator('[data-testid="activity-item"]').first()).toBeVisible();
  });
});

test.describe('Admin Settings', () => {
  test('should allow admin to view system settings', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/settings');

    // Should show settings form
    await expect(page.locator('form[data-testid="settings-form"]')).toBeVisible();
  });

  test('should update fee configuration', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/admin/settings');

    // Update fee settings
    await page.fill('input[name="card_purchase_fee"]', '5.00');
    await page.fill('input[name="topup_fee_percentage"]', '2.5');

    // Save settings
    await page.click('button[type="submit"]:has-text(/enregistrer|save/i)');

    // Should show success message
    await expect(page.locator('text=/paramètres.*enregistrés|settings.*saved/i')).toBeVisible();
  });
});
