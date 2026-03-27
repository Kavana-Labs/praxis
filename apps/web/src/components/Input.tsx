import React, { useState } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  type?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, type = "text", error, ...props }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="mb-4 text-left">
      <label className="block text-sm font-medium mb-1" htmlFor={props.id || props.name}>
        {label}
      </label>
      <div className="relative">
        <input
          className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-0 focus:border-primary-400 transition text-base ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-400" : "border-slate-300"
          }`}
          aria-invalid={Boolean(error)}
          {...props}
          type={inputType}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full p-1"
            onClick={() => setShow((s) => !s)}
          >
            {show ? (
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3l18 18" />
                <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" />
                <path d="M9.88 5.52A9.46 9.46 0 0 1 12 5c4.55 0 8.44 2.94 10 7-0.46 1.26-1.16 2.41-2.05 3.39" />
                <path d="M6.61 6.61C4.6 7.76 3.05 9.63 2 12c.9 2.18 2.38 4.03 4.24 5.36A10.4 10.4 0 0 0 9.5 18.5" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default Input;
