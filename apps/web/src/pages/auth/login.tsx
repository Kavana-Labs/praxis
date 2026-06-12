import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/use-auth";
import { validateEmail } from "@/auth/types";
import {
  AuthDivider,
  AuthLayout,
  AuthNotice,
  GoogleButton,
  GradientButton,
  LocalModeNote,
  NotchedField,
} from "./components/AuthKit";

export function LoginPage() {
  const { service, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Already signed in → straight to the destination.
  if (isAuthenticated && !busy && !googleBusy) {
    return <Navigate to={from} replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    const passwordError = password ? null : "Enter your password.";
    setFieldErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
    if (emailError || passwordError) return;

    setBusy(true);
    setError(null);
    const result = await service.signIn(email, password);
    setBusy(false);
    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError(result.error ?? "Sign-in failed.");
    }
  };

  const google = async () => {
    setGoogleBusy(true);
    setError(null);
    const result = await service.signInWithGoogle();
    setGoogleBusy(false);
    if (result.ok) navigate(from, { replace: true });
    else setError(result.error ?? "Google sign-in failed.");
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Create scientific presentations with native LaTeX, simulations, and research-grade tools."
    >
      <div className="flex w-full flex-col gap-6">
        {service.kind === "local" ? <LocalModeNote /> : null}
        {params.get("verified") === "1" ? (
          <AuthNotice kind="success">
            Your email is verified — sign in to continue.
          </AuthNotice>
        ) : null}
        {params.get("reset") === "1" ? (
          <AuthNotice kind="success">
            Your password has been updated — sign in with the new one.
          </AuthNotice>
        ) : null}
        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}

        {service.kind === "firebase" ? (
          <>
            <GoogleButton
              label="Continue with Google"
              busy={googleBusy}
              onClick={() => void google()}
            />
            <AuthDivider label="Or sign in with your Email" />
          </>
        ) : null}

        <form onSubmit={(e) => void submit(e)} className="flex w-full flex-col gap-6" noValidate>
          <NotchedField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="name@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <div className="flex w-full flex-col items-end gap-2">
            <NotchedField
              label="Password"
              password
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />
            <Link
              to="/auth/forgot-password"
              className="text-xs font-semibold text-[#652ff3] hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="flex w-full flex-col items-center gap-6">
            <GradientButton busy={busy}>Login</GradientButton>
            <p className="text-xs font-medium text-gray-500">
              Don’t have an Account?{" "}
              <Link to="/auth/signup" className="font-semibold text-[#652ff3] hover:underline">
                Register
              </Link>
            </p>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
