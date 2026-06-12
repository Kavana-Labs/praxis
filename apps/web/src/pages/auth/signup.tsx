import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/use-auth";
import { validateEmail, validateName, validatePassword } from "@/auth/types";
import {
  AuthDivider,
  AuthLayout,
  AuthNotice,
  GoogleButton,
  GradientButton,
  LocalModeNote,
  NotchedField,
} from "./components/AuthKit";

type FieldErrors = Partial<Record<"name" | "email" | "password" | "confirm", string>>;

export function SignupPage() {
  const { service } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: FieldErrors = {
      name: validateName(name) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirm:
        confirm === password ? undefined : "Passwords don't match.",
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setBusy(true);
    setError(null);
    const result = await service.signUp({ name, email, password });
    setBusy(false);
    if (result.ok) {
      navigate("/auth/confirm-email", {
        replace: true,
        state: { email: email.trim(), localActionCode: result.localActionCode },
      });
    } else {
      setError(result.error ?? "Sign-up failed.");
    }
  };

  const google = async () => {
    setGoogleBusy(true);
    setError(null);
    const result = await service.signInWithGoogle();
    setGoogleBusy(false);
    if (result.ok) navigate("/app", { replace: true });
    else setError(result.error ?? "Google sign-up failed.");
  };

  return (
    <AuthLayout
      title="Create a Free Account"
      below={
        <p className="text-xs text-gray-500">
          By creating an account, you agree to our{" "}
          <a
            href="https://github.com/Kavana-Labs/praxis/blob/master/docs/security.md"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#652ff3] hover:underline"
          >
            Terms of Use
          </a>
        </p>
      }
    >
      <div className="flex w-full flex-col gap-6">
        {service.kind === "local" ? <LocalModeNote /> : null}
        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}

        {service.kind === "firebase" ? (
          <>
            <GoogleButton
              label="Sign up with Google"
              busy={googleBusy}
              onClick={() => void google()}
            />
            <AuthDivider label="Or sign up with your Email" />
          </>
        ) : null}

        <form onSubmit={(e) => void submit(e)} className="flex w-full flex-col gap-6" noValidate>
          <NotchedField
            label="Name"
            autoComplete="name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
          />
          <NotchedField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="name@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <NotchedField
            label="Password"
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
            placeholder="Repeat your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={fieldErrors.confirm}
          />
          <div className="flex w-full flex-col items-center gap-6">
            <GradientButton busy={busy}>Create Account</GradientButton>
            <p className="text-xs font-medium text-gray-500">
              Already have an Account?{" "}
              <Link to="/auth/login" className="font-semibold text-[#652ff3] hover:underline">
                Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
