// Signed-in tests. `test` from here signs in through test sign-in (R43): its
// `request` sends the token, and its `page` starts with the test session saved, so
// the app opens signed in. Specs about signing in itself use @playwright/test.
import {
  test as base,
  expect,
  request as playwrightRequest,
} from "@playwright/test";

export const USER = "tester@example.com";
export const TEST_SESSION_KEY = "accountable-test-session";

type Session = { access_token: string; email: string };

export async function testSession(
  baseURL: string,
  email = USER,
): Promise<Session> {
  const context = await playwrightRequest.newContext({ baseURL });
  const reply = await context.post("/api/auth/test-sign-in", {
    data: { email },
  });
  expect(reply.ok()).toBeTruthy();
  const session = (await reply.json()) as Session;
  await context.dispose();
  return session;
}

/** An API client signed in as `email`. Dispose of it when done. */
export async function apiAs(baseURL: string, email: string) {
  const session = await testSession(baseURL, email);
  return playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Authorization: `Bearer ${session.access_token}` },
  });
}

export const test = base.extend<{ session: Session }>({
  session: async ({ baseURL }, use) => {
    await use(await testSession(baseURL ?? ""));
  },
  request: async ({ baseURL, session }, use) => {
    const context = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${session.access_token}` },
    });
    await use(context);
    await context.dispose();
  },
  page: async ({ page, session }, use) => {
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [TEST_SESSION_KEY, JSON.stringify(session)],
    );
    await use(page);
  },
});

export { expect };
export type { Locator, Page } from "@playwright/test";
