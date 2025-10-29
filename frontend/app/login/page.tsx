"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const BTN_BLUE = "#0873B9";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isDisabled = useMemo(
    () => loading || !email.trim() || !password,
    [loading, email, password]
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        // small delay for a smoother UX
        setTimeout(() => (window.location.href = "/donor"), 300);
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error || "Invalid credentials");
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1E1E1E] grid grid-cols-1 lg:grid-cols-2">
      {/* LEFT — form */}
      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-[420px]">
          <h1 className="text-[45px] leading-[52px] font-bold">Welcome back</h1>
          <p className="text-[24px] leading-[32px] mt-1">Log in to your account</p>
          <hr className="h-px bg-[#E5E7EB] border-0 mt-3 mb-6 w-full" />

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email">
              <Input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <div className="relative">
              <Field label="Password">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
              </Field>

              {/* Show/Hide toggle */}
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-[44px] text-gray-600 hover:text-black"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOn /> : <EyeOff />}
              </button>
            </div>

            {err && <div className="text-[#b91c1c] text-sm">{err}</div>}

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={isDisabled}
              className="h-11 w-full rounded-[10px] font-semibold text-white hover:opacity-95 disabled:opacity-70"
              style={{ background: BTN_BLUE }}
            >
              {loading ? "Signing in…" : "Log In"}
            </button>

            {/* Secondary CTA styled as button, links to signup */}
            <Link
              href="/signup"
              className="h-11 w-full rounded-[10px] font-semibold text-white bg-[#0873B9] hover:opacity-95 grid place-items-center"
            >
              Create an Account
            </Link>
          </form>
        </div>
      </section>

      {/* RIGHT — logo / illustration (kept consistent with your signup page) */}
      <section className="relative grid content-center gap-8 p-8">
        <div className="ml-auto mr-[10%] h-[120px] w-[360px] border-2 border-[#0873B9] rounded-[10px] bg-white flex items-center justify-center">
          {/* replace with your actual asset in /public/uploads if needed */}
          <img
            src="/uploads/bowerlogog.png"
            alt="Bower logo"
            width={320}
            height={80}
            style={{ width: "90%", height: "auto" }}
          />
        </div>

        <div className="ml-auto mr-[6%] w-[85%] max-w-[900px] mt-6">
          <img
            src="/uploads/donate-truck.png"
            alt="Donation truck"
            width={900}
            height={500}
            style={{ width: "100%", height: "auto", objectFit: "contain" }}
          />
        </div>
      </section>
    </div>
  );
}

/* ------- small UI helpers ------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "h-11 rounded-[10px] border border-[#E5E7EB] bg-[#F3F4F6] px-3 outline-none " +
        "focus:border-[#0873B9] focus:ring-4 focus:ring-[#0873B9]/20 " +
        (props.className || "")
      }
    />
  );
}

/* Icons (inline, no external deps) */
function EyeOn() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
function EyeOff() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-.88M7.94 7.94A9.974 9.974 0 0012 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.896 5.362M6.1 6.1A9.974 9.974 0 002.458 12C3.732 7.943 7.523 5 12 5c.84 0 1.654.094 2.435.27" />
    </svg>
  );
}
