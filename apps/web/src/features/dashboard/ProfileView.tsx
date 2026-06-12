import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { BadgeCheck, CircleAlert, LogOut } from "lucide-react";
import { useAuth } from "@/auth/use-auth";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "@/auth/types";
import { cn } from "@/lib/utils";

/**
 * Profile settings inside the dashboard shell: display name, email (with
 * verified state + change-email flow), password change, and sign out. Local
 * accounts get the same surface with in-app verification links.
 */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string | null;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300",
          error ? "border-red-300" : "border-gray-200",
        )}
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

type Notice = { kind: "success" | "error"; text: string } | null;

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      role={notice.kind === "error" ? "alert" : "status"}
      className={cn(
        "mt-3 rounded-md border px-3 py-2 text-xs leading-relaxed",
        notice.kind === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {notice.text}
    </p>
  );
}

export function ProfileView() {
  const { user, status, service } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState(user?.displayName ?? "");
  const [nameNotice, setNameNotice] = useState<Notice>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailNotice, setEmailNotice] = useState<Notice>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [verifyNotice, setVerifyNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (status === "loading") return null;
  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  const initials =
    user.displayName
      ?.split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || user.email[0]?.toUpperCase();

  const saveName = async () => {
    const error = validateName(name);
    if (error) {
      setNameNotice({ kind: "error", text: error });
      return;
    }
    setBusy("name");
    const result = await service.updateDisplayName(name);
    setBusy(null);
    setNameNotice(
      result.ok
        ? { kind: "success", text: "Name updated." }
        : { kind: "error", text: result.error ?? "Could not update the name." },
    );
  };

  const changeEmail = async () => {
    const error = validateEmail(newEmail);
    if (error) {
      setEmailNotice({ kind: "error", text: error });
      return;
    }
    setBusy("email");
    const result = await service.changeEmail(newEmail);
    setBusy(null);
    if (result.ok) {
      setEmailNotice({
        kind: "success",
        text:
          service.kind === "firebase"
            ? `A confirmation link was sent to ${newEmail.trim()}. The change applies once you open it.`
            : "Email updated — confirm it with the new verification link below.",
      });
      setNewEmail("");
      if (result.localActionCode) {
        setVerifyNotice({
          kind: "success",
          text: "A new verification link is ready in the Email section.",
        });
      }
    } else {
      setEmailNotice({ kind: "error", text: result.error ?? "Could not change the email." });
    }
  };

  const changePassword = async () => {
    const error =
      validatePassword(newPassword) ??
      (confirmPassword === newPassword ? null : "Passwords don't match.");
    if (error) {
      setPasswordNotice({ kind: "error", text: error });
      return;
    }
    setBusy("password");
    const result = await service.changePassword(newPassword);
    setBusy(null);
    if (result.ok) {
      setPasswordNotice({ kind: "success", text: "Password updated." });
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordNotice({
        kind: "error",
        text: result.error ?? "Could not change the password.",
      });
    }
  };

  const resendVerification = async () => {
    setBusy("verify");
    const result = await service.resendVerification();
    setBusy(null);
    if (result.ok && result.localActionCode) {
      const code = result.localActionCode;
      setVerifyNotice({ kind: "success", text: "Verification link created — confirming…" });
      const verified = await service.verifyEmail(code);
      setVerifyNotice(
        verified.ok
          ? { kind: "success", text: "Email verified." }
          : { kind: "error", text: verified.error ?? "Verification failed." },
      );
    } else {
      setVerifyNotice(
        result.ok
          ? { kind: "success", text: "Verification email sent — check your inbox." }
          : { kind: "error", text: result.error ?? "Could not send the email." },
      );
    }
  };

  const button =
    "rounded-lg bg-[#652ff3] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-600 text-xl font-semibold text-white">
          {initials}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-bold tracking-[-0.48px] text-gray-800">
            {user.displayName ?? user.email}
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            {user.email}
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <BadgeCheck size={12} /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                <CircleAlert size={12} /> Unverified
              </span>
            )}
          </p>
        </div>
      </div>

      {service.kind === "local" ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-600">
          This deployment stores accounts locally in your browser. Verification
          links are handled in-app instead of by email.
        </p>
      ) : null}

      <Section title="Display name" description="Shown on your account and future collaboration features.">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="Name" value={name} onChange={setName} autoComplete="name" />
          </div>
          <button
            type="button"
            disabled={busy === "name" || name.trim() === (user.displayName ?? "")}
            onClick={() => void saveName()}
            className={button}
          >
            Save
          </button>
        </div>
        <NoticeLine notice={nameNotice} />
      </Section>

      <Section
        title="Email"
        description={
          user.emailVerified
            ? "Changing your email sends a confirmation link to the new address."
            : "Your current email is not verified yet."
        }
      >
        {!user.emailVerified ? (
          <button
            type="button"
            disabled={busy === "verify"}
            onClick={() => void resendVerification()}
            className="mb-4 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-50"
          >
            {service.kind === "firebase"
              ? "Resend verification email"
              : "Verify email now"}
          </button>
        ) : null}
        <NoticeLine notice={verifyNotice} />
        <div className="mt-2 flex items-end gap-3">
          <div className="flex-1">
            <Field
              label="New email"
              value={newEmail}
              onChange={setNewEmail}
              type="email"
              placeholder="name@university.edu"
              autoComplete="email"
            />
          </div>
          <button
            type="button"
            disabled={busy === "email" || !newEmail.trim()}
            onClick={() => void changeEmail()}
            className={button}
          >
            Change
          </button>
        </div>
        <NoticeLine notice={emailNotice} />
      </Section>

      <Section title="Password" description="Use at least 8 characters.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            type="password"
            autoComplete="new-password"
          />
          <Field
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            autoComplete="new-password"
          />
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={busy === "password" || !newPassword}
            onClick={() => void changePassword()}
            className={button}
          >
            Update password
          </button>
        </div>
        <NoticeLine notice={passwordNotice} />
      </Section>

      <Section title="Session">
        <button
          type="button"
          onClick={() => {
            void service.signOut().then(() => navigate("/app"));
          }}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <LogOut size={15} /> Sign out
        </button>
      </Section>
    </div>
  );
}
