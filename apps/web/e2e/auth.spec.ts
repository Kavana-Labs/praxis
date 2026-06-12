import { expect, test, type Page } from "@playwright/test";

/**
 * Full authentication journey against the browser-local adapter (the dev
 * server has no Firebase env): signup → verification → sign-out/in →
 * forgot/reset password → profile management → guarded routes. The Firebase
 * adapter exposes the identical interface in production.
 */

const ACCOUNT = {
  name: "Rosalind Franklin",
  email: "rosalind@kings.ac.uk",
  password: "photo-51-rules",
};

async function freshAuth(page: Page) {
  await page.goto("/auth/login");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText("Welcome Back")).toBeVisible();
}

async function signUp(page: Page) {
  await page.goto("/auth/signup");
  await page.getByLabel("Name").fill(ACCOUNT.name);
  await page.getByLabel("Email").fill(ACCOUNT.email);
  await page.getByLabel("Password", { exact: true }).fill(ACCOUNT.password);
  await page.getByLabel("Confirm Password").fill(ACCOUNT.password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByText("Confirm your Email")).toBeVisible();
}

test("signup → in-app verification → dashboard with account", async ({ page }) => {
  await freshAuth(page);
  await signUp(page);

  // Local mode surfaces the verification link in-app.
  await page.getByRole("button", { name: "Confirm email now" }).click();
  await expect(page.getByText("Email verified")).toBeVisible();
  await page.getByRole("button", { name: "Continue to dashboard" }).click();
  await expect(page).toHaveURL(/\/app/);

  // The avatar carries the user's initials.
  await expect(page.getByRole("button", { name: "Account" })).toHaveText("RF");
});

test("validation errors are inline and calm", async ({ page }) => {
  await freshAuth(page);
  await page.goto("/auth/signup");
  await page.getByLabel("Name").fill("R");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm Password").fill("different");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(page.getByText("Passwords don't match.")).toBeVisible();
});

test("sign out, wrong password, then successful sign-in", async ({ page }) => {
  await freshAuth(page);
  await signUp(page);
  await page.getByRole("link", { name: /skip for now/i }).click();
  await expect(page).toHaveURL(/\/app/);

  // Sign out from the account menu.
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Account" }).click();
  await expect(page.getByText("Local workspace")).toBeVisible();
  await page.keyboard.press("Escape");

  // Wrong password → calm error, no session.
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(ACCOUNT.email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(
    page.getByText(/doesn't match an account/i),
  ).toBeVisible();

  // Correct password → dashboard.
  await page.getByLabel("Password", { exact: true }).fill(ACCOUNT.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/app/);
});

test("forgot password → reset link → new password works", async ({ page }) => {
  await freshAuth(page);
  await signUp(page);
  await page.getByRole("link", { name: /skip for now/i }).click();
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await page.goto("/auth/forgot-password");
  await page.getByLabel("Email").fill(ACCOUNT.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/reset link has been created/i)).toBeVisible();
  await page.getByRole("button", { name: "Open reset link" }).click();

  await expect(page.getByText("Choose a new Password")).toBeVisible();
  await page.getByLabel("New Password").fill("after-the-reset-9");
  await page.getByLabel("Confirm Password").fill("after-the-reset-9");
  await page.getByRole("button", { name: "Update password" }).click();

  // Lands on login with the success banner; old password dead, new one works.
  await expect(page.getByText(/password has been updated/i)).toBeVisible();
  await page.getByLabel("Email").fill(ACCOUNT.email);
  await page.getByLabel("Password", { exact: true }).fill(ACCOUNT.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(/doesn't match an account/i)).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("after-the-reset-9");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/app/);
});

test("profile: guarded route, rename, verify, change password", async ({ page }) => {
  await freshAuth(page);

  // Signed out → /app/profile bounces to login, then returns after sign-in.
  await signUp(page);
  await page.getByRole("link", { name: /skip for now/i }).click();
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.goto("/app/profile");
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.getByLabel("Email").fill(ACCOUNT.email);
  await page.getByLabel("Password", { exact: true }).fill(ACCOUNT.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/app\/profile/);

  // Unverified badge → verify in-app → verified badge.
  await expect(page.getByText("Unverified")).toBeVisible();
  await page.getByRole("button", { name: "Verify email now" }).click();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();

  // Rename updates the avatar initials.
  await page.getByLabel("Name", { exact: true }).fill("Marie Curie");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Name updated.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Account" })).toHaveText("MC");

  // Change password and prove it.
  await page.getByLabel("New password").fill("polonium-radium-2");
  await page.getByLabel("Confirm password").fill("polonium-radium-2");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Password updated.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/app/);
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(ACCOUNT.email);
  await page.getByLabel("Password", { exact: true }).fill("polonium-radium-2");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/app/);
});
