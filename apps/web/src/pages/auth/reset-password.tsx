import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/use-auth";
import { validatePassword } from "@/auth/types";
import {
  AuthLayout,
  AuthNotice,
  GradientButton,
  NotchedField,
} from "./components/AuthKit";

/**
 * Set a new password from a reset link. Accepts the local adapter's `code`
 * query param or Firebase's `oobCode` (when the email template links straight
 * into the app); /auth/action also routes Firebase links here.
 */
export function ResetPasswordPage({ codeOverride }: { codeOverride?: string }) {
  const { service } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = codeOverride ?? params.get("code") ?? params.get("oobCode") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      password: validatePassword(password) ?? undefined,
      confirm: confirm === password ? undefined : "Passwords don't match.",
    };
    setFieldErrors(errors);
    if (errors.password || errors.confirm) return;

    setBusy(true);
    setError(null);
    const result = await service.confirmPasswordReset(code, password);
    setBusy(false);
    if (result.ok) {
      navigate("/auth/login?reset=1", { replace: true });
    } else {
      setError(result.error ?? "Could not update the password.");
    }
  };

  if (!code) {
    return (
      <AuthLayout title="Reset your Password">
        <div className="flex w-full flex-col items-center gap-6">
          <AuthNotice kind="error">
            This page needs a valid reset link. Open the link from your email,
            or request a new one.
          </AuthNotice>
          <Link
            to="/auth/forgot-password"
            className="text-xs font-semibold text-[#652ff3] hover:underline"
          >
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new Password"
      subtitle="Set a new password for your account. You'll sign in with it from now on."
    >
      <div className="flex w-full flex-col gap-6">
        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}
        <form onSubmit={(e) => void submit(e)} className="flex w-full flex-col gap-6" noValidate>
          <NotchedField
            label="New Password"
            password
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <NotchedField
            label="Confirm Password"
            password
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={fieldErrors.confirm}
          />
          <GradientButton busy={busy}>Update password</GradientButton>
        </form>
      </div>
    </AuthLayout>
  );
}
