import { test, expect } from '@playwright/test';

/**
 * E2E tests for vCard authentication flows
 */

test.describe('vCard Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/auth');
    await page.waitForLoadState('networkidle');
  });

  test('should display login form with all required fields', async ({ page }) => {
    // Check for login form elements
    const emailField = page.locator('input[name="email"], input[type="email"]');
    const passwordField = page.locator('input[name="password"], input[type="password"]');
    const loginButton = page.locator('button[type="submit"]:has-text(/connexion|login/i)');

    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(loginButton).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    const loginButton = page.locator('button[type="submit"]:has-text(/connexion|login/i)');

    await loginButton.click();

    // Should show validation errors
    await expect(page.locator('text=/email.*requis|email.*required/i')).toBeVisible();
    await expect(page.locator('text=/mot de passe.*requis|password.*required/i')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', 'invalid-email');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');

    const loginButton = page.locator('button[type="submit"]:has-text(/connexion|login/i)');
    await loginButton.click();

    // Should show email format error
    await expect(page.locator('text=/email.*invalide|invalid.*email/i')).toBeVisible();
  });

  test.skip('should successfully login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'TestPassword123!');

    const loginButton = page.locator('button[type="submit"]:has-text(/connexion|login/i)');
    await loginButton.click();

    // Wait for navigation
    await page.waitForURL(/dashboard/i);

    // Should redirect to dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test.skip('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', 'invalid@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'WrongPassword123!');

    const loginButton = page.locator('button[type="submit"]:has-text(/connexion|login/i)');
    await loginButton.click();

    // Should show error message
    await expect(page.locator('text=/identifiants.*incorrects|invalid.*credentials/i')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordField = page.locator('input[name="password"], input[type="password"]');
    const toggleButton = page.locator('button[aria-label*="password"], [data-testid="toggle-password"]');

    // Password should be hidden initially
    await expect(passwordField).toHaveAttribute('type', 'password');

    // Click toggle button
    await toggleButton.click();

    // Password should be visible
    await expect(passwordField).toHaveAttribute('type', 'text');
  });

  test('should navigate to register form', async ({ page }) => {
    // Click register link
    await page.click('text=/inscription|register|créer.*compte/i');

    // Should show register form
    await expect(page.locator('input[name="first_name"], input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="last_name"], input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
  });
});

test.describe('vCard Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/auth?mode=register');
    await page.waitForLoadState('networkidle');
  });

  test('should display registration form with all required fields', async ({ page }) => {
    // Check for all registration fields
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('input[name="first_name"], input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="last_name"], input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
  });

  test('should validate phone number format', async ({ page }) => {
    await page.fill('input[name="phone"]', '123'); // Invalid phone

    const submitButton = page.locator('button[type="submit"]:has-text(/inscription|register/i)');
    await submitButton.click();

    // Should show phone validation error
    await expect(page.locator('text=/téléphone.*invalide|invalid.*phone/i')).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.fill('input[name="password"], input[type="password"]', 'weak');

    // Should show password strength indicator
    await expect(page.locator('text=/mot de passe.*faible|weak.*password/i')).toBeVisible();
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.fill('input[name="password"]', 'StrongPassword123!');
    await page.fill('input[name="confirm_password"], input[name="confirmPassword"]', 'DifferentPassword123!');

    const submitButton = page.locator('button[type="submit"]:has-text(/inscription|register/i)');
    await submitButton.click();

    // Should show password mismatch error
    await expect(page.locator('text=/mots de passe.*correspondent pas|passwords.*not match/i')).toBeVisible();
  });

  test.skip('should successfully register new user', async ({ page }) => {
    // Fill registration form
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'StrongPassword123!');
    await page.fill('input[name="confirm_password"], input[name="confirmPassword"]', 'StrongPassword123!');
    await page.fill('input[name="first_name"], input[name="firstName"]', 'John');
    await page.fill('input[name="last_name"], input[name="lastName"]', 'Doe');
    await page.fill('input[name="phone"]', '+237671234567');

    const submitButton = page.locator('button[type="submit"]:has-text(/inscription|register/i)');
    await submitButton.click();

    // Should redirect to dashboard or KYC page
    await page.waitForURL(/dashboard|kyc/i);
    expect(page.url()).toMatch(/dashboard|kyc/i);
  });

  test('should navigate back to login form', async ({ page }) => {
    await page.click('text=/connexion|login|compte.*existant/i');

    // Should show login form
    await expect(page.locator('button[type="submit"]:has-text(/connexion|login/i)')).toBeVisible();
  });
});

test.describe('Password Reset', () => {
  test.skip('should display forgot password form', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/auth');
    await page.click('text=/mot de passe.*oublié|forgot.*password/i');

    // Should show email input for password reset
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button:has-text(/envoyer|send|réinitialiser/i)')).toBeVisible();
  });

  test.skip('should send password reset email', async ({ page }) => {
    await page.goto('/services/solutions-financieres/vcard/auth/forgot-password');

    await page.fill('input[name="email"]', 'user@example.com');
    await page.click('button:has-text(/envoyer|send/i)');

    // Should show success message
    await expect(page.locator('text=/email.*envoyé|email.*sent/i')).toBeVisible();
  });
});
