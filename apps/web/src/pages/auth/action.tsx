import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/use-auth";
import { AuthLayout, AuthNotice, GradientButton } from "./components/AuthKit";
import { ResetPasswordPage } from "./reset-password";

/**
 * Firebase email-action landing (`/auth/action?mode=…&oobCode=…`): handles
 * verifyEmail directly and hands resetPassword to the reset form. Configured
 * as the custom action URL in the Firebase email templates; the default
 * hosted pages also continue back into the app either way.
 */
export function AuthActionPage() {
  const { service } = useAuth();
  const [params] = useSearchParams();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode") ?? "";

  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (mode !== "verifyEmail" || !oobCode) return;
    let cancelled = false;
    void service.verifyEmail(oobCode).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState("done");
      } else {
        setState("error");
        setMessage(result.error ?? "This link is invalid or has already been used.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode, oobCode, service]);

  if (mode === "resetPassword" && oobCode) {
    return <ResetPasswordPage codeOverride={oobCode} />;
  }

  if (mode === "verifyEmail" && oobCode) {
    return (
      <AuthLayout
        title={
          state === "working"
            ? "Verifying your email…"
            : state === "done"
              ? "Email verified"
              : "Verification failed"
        }
      >
        <div className="flex w-full flex-col items-center gap-6">
          {state === "done" ? (
            <>
              <AuthNotice kind="success">
                Your email address is confirmed. You can sign in now.
              </AuthNotice>
              <Link to="/auth/login?verified=1" className="w-full">
                <GradientButton type="button">Continue to login</GradientButton>
              </Link>
            </>
          ) : state === "error" ? (
            <>
              <AuthNotice kind="error">{message}</AuthNotice>
              <Link
                to="/auth/confirm-email"
                className="text-xs font-semibold text-[#652ff3] hover:underline"
              >
                Request a new verification link
              </Link>
            </>
          ) : null}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Invalid link">
      <div className="flex w-full flex-col items-center gap-6">
        <AuthNotice kind="error">
          This link is incomplete or unsupported. Open the most recent email we
          sent you, or sign in directly.
        </AuthNotice>
        <Link to="/auth/login" className="text-xs font-semibold text-[#652ff3] hover:underline">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
