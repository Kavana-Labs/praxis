import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./login";
import { SignupPage } from "./signup";
import { ForgotPasswordPage } from "./forgot-password";
import { ResetPasswordPage } from "./reset-password";
import { ConfirmEmailPage } from "./confirm-email";
import { AuthActionPage } from "./action";

/** All authentication screens under /auth/* (one lazy chunk). */
export function Component() {
  return (
    <Routes>
      <Route index element={<Navigate to="/auth/login" replace />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="signup" element={<SignupPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="confirm-email" element={<ConfirmEmailPage />} />
      <Route path="action" element={<AuthActionPage />} />
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}

export default Component;
