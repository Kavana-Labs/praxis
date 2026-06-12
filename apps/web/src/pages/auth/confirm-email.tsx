import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { useAuth } from "@/auth/use-auth";
import {
  AuthLayout,
  AuthNotice,
  GradientButton,
  LocalModeNote,
} from "./components/AuthKit";

/**
 * Post-signup verification screen. Firebase mode: "check your inbox" with
 * resend. Local mode: the verification "link" is an in-app action. Once the
 * account is verified the screen flips to a success state.
 */
export function ConfirmEmailPage() {
  const { service, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as
    | { email?: string; localActionCode?: string }
    | null;
  const email = state?.email ?? user?.email ?? "your inbox";

  const [localCode, setLocalCode] = useState(state?.localActionCode ?? null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const verified = user?.emailVerified === true;

  const confirmNow = async () => {
    if (!localCode) return;
    setBusy(true);
    const result = await service.verifyEmail(localCode);
    setBusy(false);
    if (!result.ok) {
      setNotice({ kind: "error", text: result.error ?? "Verification failed." });
    }
  };

  const resend = async () => {
    setBusy(true);
    setNotice(null);
    const result = await service.resendVerification();
    setBusy(false);
    if (result.ok) {
      if (result.localActionCode) setLocalCode(result.localActionCode);
      setNotice({
        kind: "success",
        text:
          service.kind === "firebase"
            ? "Verification email sent — check your inbox."
            : "A new verification link is ready below.",
      });
    } else {
      setNotice({ kind: "error", text: result.error ?? "Could not resend." });
    }
  };

  return (
    <AuthLayout
      title={verified ? "Email verified" : "Confirm your Email"}
      subtitle={
        verified
          ? "You're all set. Your account email is verified."
          : service.kind === "firebase"
            ? `We sent a verification link to ${email}. Open it to confirm your account.`
            : `Confirm the email for ${email} to finish setting up your account.`
      }
    >
      <div className="flex w-full flex-col items-center gap-6">
        {service.kind === "local" && !verified ? <LocalModeNote /> : null}
        {notice ? <AuthNotice kind={notice.kind}>{notice.text}</AuthNotice> : null}

        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f2eeff] text-[#652ff3]">
          <MailCheck size={28} strokeWidth={1.8} />
        </span>

        {verified ? (
          <GradientButton type="button" onClick={() => navigate("/app")}>
            Continue to dashboard
          </GradientButton>
        ) : (
          <>
            {service.kind === "local" && localCode ? (
              <GradientButton type="button" busy={busy} onClick={() => void confirmNow()}>
                Confirm email now
              </GradientButton>
            ) : null}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void resend()}
                className="text-xs font-semibold text-[#652ff3] hover:underline disabled:opacity-50"
              >
                {service.kind === "firebase"
                  ? "Resend verification email"
                  : "Generate a new verification link"}
              </button>
              <Link to="/app" className="text-xs font-medium text-gray-500 hover:underline">
                Skip for now — continue to the dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
