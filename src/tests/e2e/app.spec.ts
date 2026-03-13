import { test, expect } from '@playwright/test';

// Use a unique suffix for each test run to avoid SQLite unique constraint conflicts on the username
const username = `test_journalist_${Date.now()}`;
const password = 'securepassword123';

test('End-to-End Authentication and Drafting Workflow', async ({ page }) => {
    // Navigate to the root
    await page.goto('/');

    // 1. Verify we are unauthenticated and see the Login screen
    await expect(page.locator('h1', { hasText: 'Calypso Weekly' })).toBeVisible();
    await expect(page.locator('text=Sign in to your account')).toBeVisible();

    // 2. Switch to Registration
    await page.locator('button', { hasText: 'Need an account? Register' }).click();
    await expect(page.locator('text=Create a Journalist Account')).toBeVisible();

    // 3. Perform Registration
    await page.getByPlaceholder('e.g. KaraSwisher').fill(username);
    await page.getByPlaceholder('••••••••').fill(password);

    // Listen for frontend console errors to catch Fetch exceptions
    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });

    // Listen for the network response to help debug "Failed to fetch" and CORS issues
    const registerResponsePromise = page.waitForResponse(response =>
        response.url().includes('/api/auth/register') && response.request().method() === 'POST'
    );

    await page.locator('button', { hasText: 'Create Account' }).click();
    const registerResponse = await registerResponsePromise;
    if (!registerResponse.ok()) {
        const body = await registerResponse.json();
        console.log(`REGISTER FAILED: ${JSON.stringify(body)}`);
    }
    expect(registerResponse.ok()).toBeTruthy();

    // 4. Verify Dashboard Renders (we are logged in)
    // Wait for identity first as it's the source of truth for auth completion
    await expect(page.locator(`text=👤 ${username}`)).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Weekly Recap Draft' })).toBeVisible();

    // 5. Test Draft Saving UI Interaction
    const textarea = page.locator('textarea');
    await textarea.fill('Testing the authenticated draft save feature...');

    const saveResponsePromise = page.waitForResponse(response =>
        response.url().includes('/api/drafts') && response.request().method() === 'POST'
    );
    await page.locator('button', { hasText: 'Save Draft' }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok()).toBeTruthy();

    // Handle standard browser alert from the UI
    page.on('dialog', dialog => dialog.accept());

    // 6. Test Logout
    await page.locator('button', { hasText: 'Sign Out' }).click();

    // Should be back at login
    await expect(page.locator('text=Sign in to your account')).toBeVisible();

    // 7. Test Login
    await page.getByPlaceholder('e.g. KaraSwisher').fill(username);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.locator('button', { hasText: 'Sign In' }).click();

    // Verify Dashboard renders again
    await expect(page.getByRole('heading', { name: 'Weekly Recap Draft' })).toBeVisible();
});
