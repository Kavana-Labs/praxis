import { expect, test, type Page } from "@playwright/test";

/** The landing page links into auth and the app coherently. */

async function freshLanding(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
}

test("header Login/Sign up route to the auth screens", async ({ page }) => {
  await freshLanding(page);

  await page.getByRole("link", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByText("Welcome Back")).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/auth\/signup/);
  await expect(page.getByText("Create a Free Account")).toBeVisible();
});

test("header reflects auth state after sign-in", async ({ page }) => {
  await freshLanding(page);

  // Create an account through the real flow.
  await page.getByRole("link", { name: "Sign up" }).click();
  await page.getByLabel("Name").fill("Niels Bohr");
  await page.getByLabel("Email").fill("niels@copenhagen.dk");
  await page.getByLabel("Password", { exact: true }).fill("complementarity-1");
  await page.getByLabel("Confirm Password").fill("complementarity-1");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByText("Confirm your Email")).toBeVisible();
  await page.getByRole("link", { name: /skip for now/i }).click();
  await expect(page).toHaveURL(/\/app/);

  // Back on the landing, the header now shows Dashboard + the profile avatar,
  // not Login/Sign up.
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Your profile" })).toHaveText("NB");
  await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);

  // The avatar links to the profile page.
  await page.getByRole("link", { name: "Your profile" }).click();
  await expect(page).toHaveURL(/\/app\/profile/);
});

test("primary CTA opens the dashboard", async ({ page }) => {
  await freshLanding(page);
  await page.getByRole("link", { name: "Get Started" }).first().click();
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByText("Create a New Presentation")).toBeVisible();
});
