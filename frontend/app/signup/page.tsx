"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setLoading(true);

    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") || "").trim(),
      email: String(f.get("email") || "").trim(),
      password: String(f.get("password") || ""),
      phone: String(f.get("phone") || "").trim(),
      street: String(f.get("street") || "").trim(),
      suburb: String(f.get("suburb") || "").trim(),
      postcode: String(f.get("postcode") || "").trim(),
    };

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOk(true);
        setTimeout(() => (window.location.href = "/login?created=1"), 700);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Failed to create account.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-[#FFFFFF] text-[#1E1E1E] grid grid-cols-1 lg:grid-cols-2">
      {/* LEFT — form */}
      <section className="flex flex-col justify-center p-6 lg:p-12 overflow-hidden">
        <div className="w-full max-w-[400px] mx-auto scale-95">
          <h1 className="text-[45px] leading-[52px] font-bold">Welcome</h1>
          <p className="text-[24px] leading-[32px] mt-1">Create your account here</p>
          <hr className="h-px bg-[#E5E7EB] border-0 mt-3 mb-6 w-full" />

          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Name">
              <Input name="name" placeholder="Name" required />
            </Field>

            <Field label="Email">
              <Input name="email" type="email" placeholder="Email" required />
            </Field>

            <Field label="Password">
              <Input name="password" type="password" placeholder="Password" required />
            </Field>

            <Field label="Phone">
              <Input name="phone" type="tel" placeholder="Phone" />
            </Field>

            <Field label="Street Address">
              <Input name="street" placeholder="Address" />
            </Field>

            <Field label="Suburb">
              <Input name="suburb" placeholder="Suburb" />
            </Field>

            <Field label="Postcode">
              <Input name="postcode" placeholder="Postcode" />
            </Field>

            {error && <div className="text-[#b91c1c] text-sm">{error}</div>}
            {ok && <div className="text-green-700 text-sm">Account created! Redirecting…</div>}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-[10px] font-semibold text-white bg-[#0873B9] hover:opacity-95 disabled:opacity-70"
            >
              {loading ? "Creating…" : "Create Account"}
            </button>

            <Link
              href="/login"
              className="h-11 w-full rounded-[10px] font-semibold text-white bg-[#0873B9] hover:opacity-95 grid place-items-center"
            >
              Already Have an Account?
            </Link>
          </form>
        </div>
      </section>

      {/* RIGHT — logo + illustration */}
      <section className="relative flex flex-col justify-center p-6 lg:p-12 overflow-hidden">
        <div className="ml-auto mr-[8%] h-[110px] w-[330px] border-2 border-[#0873B9] rounded-[10px] bg-white flex items-center justify-center">
          <Image
            src="/uploads/bowerlogog.png"
            alt="Bower logo"
            width={300}
            height={70}
            priority
            style={{ width: "90%", height: "auto" }}
          />
        </div>

        <div className="ml-auto mr-[6%] w-[75%] max-w-[800px] mt-4">
          <Image
            src="/uploads/donate-truck.png"
            alt="Donation truck"
            width={800}
            height={450}
            priority
            style={{ width: "100%", height: "auto", objectFit: "contain" }}
          />
        </div>
      </section>
    </div>
  );
}

/* Reusable components */
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
