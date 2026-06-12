import { beforeEach, describe, expect, it } from "vitest";
import { LocalAuthService } from "../services/localAuthService";
import { validateEmail, validateName, validatePassword } from "../types";

/**
 * Full lifecycle of the browser-local auth adapter: signup, verification,
 * sign-in, password reset, and profile mutations — the same surface the
 * Firebase adapter implements against the hosted backend.
 */

const CREDS = { name: "Ada Lovelace", email: "ada@analytical.engine", password: "difference-engine-1" };

let service: LocalAuthService;

beforeEach(() => {
  localStorage.clear();
  service = new LocalAuthService(localStorage);
});

describe("signup & verification", () => {
  it("creates an account, signs it in, and issues a verification code", async () => {
    const result = await service.signUp(CREDS);
    expect(result.ok).toBe(true);
    expect(result.localActionCode).toBeTruthy();

    const user = service.getCurrentUser();
    expect(user?.email).toBe(CREDS.email);
    expect(user?.displayName).toBe(CREDS.name);
    expect(user?.emailVerified).toBe(false);

    const verify = await service.verifyEmail(result.localActionCode!);
    expect(verify.ok).toBe(true);
    expect(service.getCurrentUser()?.emailVerified).toBe(true);
  });

  it("rejects duplicate emails and reused verification codes", async () => {
    const first = await service.signUp(CREDS);
    await service.verifyEmail(first.localActionCode!);
    const reused = await service.verifyEmail(first.localActionCode!);
    expect(reused.ok).toBe(false);

    const dup = await service.signUp({ ...CREDS, name: "Imposter" });
    expect(dup.ok).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });
});

describe("sessions", () => {
  it("signs out and back in with the right password only", async () => {
    await service.signUp(CREDS);
    await service.signOut();
    expect(service.getCurrentUser()).toBeNull();

    const wrong = await service.signIn(CREDS.email, "not-the-password");
    expect(wrong.ok).toBe(false);
    expect(service.getCurrentUser()).toBeNull();

    const right = await service.signIn(CREDS.email.toUpperCase(), CREDS.password);
    expect(right.ok).toBe(true);
    expect(service.getCurrentUser()?.email).toBe(CREDS.email);
  });

  it("notifies subscribers on auth changes", async () => {
    const seen: (string | null)[] = [];
    const unsub = service.subscribe((u) => seen.push(u?.email ?? null));
    await service.signUp(CREDS);
    await service.signOut();
    unsub();
    expect(seen[0]).toBeNull(); // immediate fire
    expect(seen).toContain(CREDS.email);
    expect(seen[seen.length - 1]).toBeNull();
  });
});

describe("password reset", () => {
  it("resets via a single-use code", async () => {
    await service.signUp(CREDS);
    await service.signOut();

    const sent = await service.sendPasswordReset(CREDS.email);
    expect(sent.ok).toBe(true);
    const code = sent.localActionCode!;
    expect(code).toBeTruthy();

    const reset = await service.confirmPasswordReset(code, "new-password-42");
    expect(reset.ok).toBe(true);

    expect((await service.signIn(CREDS.email, CREDS.password)).ok).toBe(false);
    expect((await service.signIn(CREDS.email, "new-password-42")).ok).toBe(true);

    // single use
    expect((await service.confirmPasswordReset(code, "again")).ok).toBe(false);
  });

  it("does not reveal whether an email is registered", async () => {
    const result = await service.sendPasswordReset("nobody@nowhere.test");
    expect(result.ok).toBe(true);
    expect(result.localActionCode).toBeUndefined();
  });
});

describe("profile mutations", () => {
  it("updates display name, email (re-verifying), and password", async () => {
    await service.signUp(CREDS);

    expect((await service.updateDisplayName("Ada L.")).ok).toBe(true);
    expect(service.getCurrentUser()?.displayName).toBe("Ada L.");

    const verify = await service.resendVerification();
    await service.verifyEmail(verify.localActionCode!);
    expect(service.getCurrentUser()?.emailVerified).toBe(true);

    const emailChange = await service.changeEmail("ada@newdomain.test");
    expect(emailChange.ok).toBe(true);
    expect(service.getCurrentUser()?.email).toBe("ada@newdomain.test");
    expect(service.getCurrentUser()?.emailVerified).toBe(false); // re-verify

    expect((await service.changePassword("rotated-pass-9")).ok).toBe(true);
    await service.signOut();
    expect((await service.signIn("ada@newdomain.test", "rotated-pass-9")).ok).toBe(true);
  });

  it("refuses an email change onto an existing account", async () => {
    await service.signUp(CREDS);
    await service.signOut();
    await service.signUp({ name: "Grace", email: "grace@navy.mil", password: "cobol-rules-1" });
    const clash = await service.changeEmail(CREDS.email);
    expect(clash.ok).toBe(false);
  });
});

describe("validation helpers", () => {
  it("validates emails, passwords, and names", () => {
    expect(validateEmail("")).toBeTruthy();
    expect(validateEmail("not-an-email")).toBeTruthy();
    expect(validateEmail("a@b.co")).toBeNull();
    expect(validatePassword("short")).toBeTruthy();
    expect(validatePassword("long-enough-1")).toBeNull();
    expect(validateName("")).toBeTruthy();
    expect(validateName("Ada")).toBeNull();
  });
});
