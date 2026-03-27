import React, { useState } from "react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { ShadcnLogoIcon } from "@/components/Logo";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/auth-context";
import mathBackground from "@/assets/math_background.png";

const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    setSubmitError(null);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSubmitError(null);

    try {
      // TODO: Replace with real API call
      // For now, simulate registration
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Mock successful registration
      setUser({
        id: "user-123",
        name: name.trim(),
      });
      
      navigate("/app");
    } catch (error) {
      setSubmitError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    // TODO: Implement Google OAuth
    // eslint-disable-next-line no-console
    console.log("Google OAuth - to be implemented");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f6f7fb] via-[#f3efff] to-[#ede7fa] relative px-2 overflow-hidden py-8">
      <div
        className="absolute inset-0 opacity-[0.25] pointer-events-none select-none bg-cover bg-center"
        style={{ backgroundImage: `url(${mathBackground})` }}
      />
      <main className="relative z-10 w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <div className="flex flex-col items-center mb-6">
          <ShadcnLogoIcon style={{ width: 48, height: 40 }} />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Create a Free Account</h1>
          <p className="mt-2 text-slate-600 text-center text-base max-w-xs">
            Create scientific presentations with native LaTeX, simulations, and research-grade tools.
          </p>
        </div>
        <form className="w-full" onSubmit={handleSubmit} noValidate>
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="w-full mb-4 h-11 px-4 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-base flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
            aria-label="Sign up with Google"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign up with Google
          </button>
          <div className="flex items-center my-4">
            <div className="flex-grow h-px bg-slate-200" />
            <span className="mx-3 text-slate-400 text-sm">Or sign in with your Email</span>
            <div className="flex-grow h-px bg-slate-200" />
          </div>
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {submitError}
            </div>
          )}
          <Input
            label="Name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="John Doe"
            value={name}
            onChange={e => setName(e.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@university.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={errors.email}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={errors.password}
            required
          />
          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            required
          />
          <Button type="submit" fullWidth disabled={loading} className="mb-2">
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-600">
          Already have an Account?{' '}
          <Link
            to="/auth/login"
            className="text-primary hover:text-primary/90 hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded font-medium"
          >
            Login
          </Link>
        </div>
        <div className="mt-6 text-xs text-slate-400 text-center whitespace-nowrap">
          LaTeX-native • Academic-ready exports • Built for scientists & engineers
        </div>
        <div className="mt-4 text-xs text-slate-400 text-center">
          By creating an account, you agree to our{' '}
          <Link
            to="/terms"
            className="text-primary hover:text-primary/90 hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded font-medium"
          >
            Terms of Use
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Register;
