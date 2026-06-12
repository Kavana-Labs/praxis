import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/use-auth";
import { validateEmail } from "@/auth/types";
import {
  AuthLayout,
  AuthNotice,
  GradientButton,
  LocalModeNote,
  NotchedField,
} from "./components/AuthKit";

export function ForgotPasswordPage() {
  const { service } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ localActionCode?: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    setFieldError(emailError);
    if (emailError) return;

    setBusy(true);
    setError(null);
    const result = await service.sendPasswordReset(email);
    setBusy(false);
    if (result.ok) setSent({ localActionCode: result.localActionCode });
    else setError(result.error ?? "Could not send the reset email.");
  };

  return (
    <AuthLayout
      title="Reset your Password"
      subtitle="Enter the email for your account and we'll send you a link to set a new password."
    >
      <div className="flex w-full flex-col gap-6">
        {service.kind === "local" ? <LocalModeNote /> : null}
        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}

        {sent ? (
          <div className="flex w-full flex-col items-center gap-6">
            <AuthNotice kind="success">
              If an account exists for <strong>{email.trim()}</strong>,
              {service.kind === "firebase"
                ? " a reset link is on its way to that inbox."
                : " a reset link has been created."}
            </AuthNotice>
            {service.kind === "local" && sent.localActionCode ? (
              <GradientButton
                type="button"
                onClick={() =>
                  navigate(`/auth/reset-password?code=${sent.localActionCode}`)
                }
              >
                Open reset link
              </GradientButton>
            ) : null}
            <Link
              to="/auth/login"
              className="text-xs font-semibold text-[#652ff3] hover:underline"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="flex w-full flex-col gap-6" noValidate>
            <NotchedField
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldError}
            />
            <div className="flex w-full flex-col items-center gap-6">
              <GradientButton busy={busy}>Send reset link</GradientButton>
              <p className="text-xs font-medium text-gray-500">
                Remembered it?{" "}
                <Link to="/auth/login" className="font-semibold text-[#652ff3] hover:underline">
                  Back to login
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
