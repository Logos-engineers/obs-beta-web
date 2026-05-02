import { test, expect, Page } from '@playwright/test';

const SESSION_KEY = 'loen-obs-beta-session';
const BACKEND_URL = 'http://localhost:8080/api/v1';

async function setupSession(page: Page, userId: string = 'test-user') {
  // 1. Fetch dev token from backend
  const response = await page.request.post(`${BACKEND_URL}/dev/token`, {
    data: { userId, role: 'USER' }
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to fetch dev token: ${response.status()} ${await response.text()}`);
  }
  
  const payload = await response.json();
  const accessToken = payload.data.accessToken;
  
  // 2. Prepare session object
  const session = {
    accessToken,
    refreshToken: 'mock-refresh-token',
    user: {
      userId,
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER'
    }
  };

  const sessionStr = JSON.stringify(session);
  console.log('Setting session cookie:', sessionStr);
  
  // 3. Set cookie in the browser
  // First navigate to a page on the domain to ensure context is initialized for that domain
  await page.goto('/login');
  await page.context().addCookies([{
    name: SESSION_KEY,
    value: encodeURIComponent(sessionStr), // js-cookie usually expects this or handles it
    domain: 'localhost',
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  }]);
}

test.describe('Loen Web Beta Full Flow', () => {
  test('should login and navigate through the review flow', async ({ page }) => {
    // Step 1: Login via Dev Token
    await setupSession(page);
    
    // Step 2: Navigate to Home
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Debug: Check if we are redirected to login
    if (page.url().includes('/login')) {
      console.log('Redirected to login. Session might not have been set correctly.');
      const cookies = await page.context().cookies();
      console.log('Current cookies:', JSON.stringify(cookies, null, 2));
    }

    // Step 3: Verify OBS List is loaded
    try {
      await expect(page.locator('.obs-card').first()).toBeVisible({ timeout: 15000 });
      const firstTitle = await page.locator('.obs-card-title').first().textContent();
      console.log(`Testing with OBS: ${firstTitle}`);
    } catch (e) {
      console.log('Current URL:', page.url());
      console.log('Page Content Snippet:', (await page.content()).slice(0, 1000));
      throw e;
    }
    
    // Step 4: Click '복습하기' (Review Start)
    await page.getByRole('link', { name: '복습하기' }).first().click();
    
    // Step 5: Verify Review Intro
    await expect(page).toHaveURL(/.*\/review\/intro/);
    await expect(page.getByText('복습 시작하기')).toBeVisible();
    await page.getByText('복습 시작하기').click();
    
    // Step 6: OX Quiz
    await expect(page).toHaveURL(/.*\/review\/ox/);
    // Click any option (O or X)
    await page.locator('.review-ox-card').first().click();
    await page.getByRole('button', { name: '선택할게요' }).click();
    await page.getByRole('button', { name: '다음 퀴즈 풀기' }).click();
    
    // Step 7: Multiple Choice Quiz (Short Answer)
    await expect(page).toHaveURL(/.*\/review\/multiple/);
    await page.locator('.review-hidden-input').fill('대한민국만세대한민국만세');
    await page.getByRole('button', { name: '선택할게요' }).click();
    
    // If it was incorrect, we might need to click "정답 보기"
    const isError = await page.locator('.is-error').count();
    if (isError > 0) {
      await page.getByRole('button', { name: '정답 보기' }).click();
    }
    await page.getByRole('button', { name: '다음 퀴즈 풀기' }).click();
    
    // Step 8: Essay Quiz (Subjective)
    await expect(page).toHaveURL(/.*\/review\/essay/);
    await page.getByRole('button', { name: '정답 보기' }).click();
    await page.getByRole('button', { name: '퀴즈 완료하기' }).click();
    
    // Step 9: Result Screen
    await expect(page).toHaveURL(/.*\/review\/result/);
    await page.getByRole('button', { name: '목록으로 돌아가기' }).click();
    
    // Step 10: Back to Home
    await expect(page).toHaveURL('/');
  });
});
