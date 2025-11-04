"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import "./signup.css";

export default function SignupPage() {
  const router = useRouter();

  // keep original shape so backend stays happy
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",   // ✅ use "address" (not "street") to match original API
    suburb: "",
    postcode: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  function update(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErr("");
    setMsg("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      // ✅ unchanged endpoint & payload keys
      await axios.post("/api/auth/signup", form);
      setMsg("Account created! Redirecting…");
      router.push("/login?created=1");
    } catch (error: any) {
      setErr(error?.response?.data?.error || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-screen">
      {/* LEFT — form */}
      <section className="signup-left">
        <div className="signup-formwrap">
          <h1 className="signup-title">Welcome</h1>
          <p className="signup-subtitle">Create your account here</p>
          <hr className="signup-rule" />

          <form onSubmit={onSubmit} className="signup-form">
            <Field label="Name">
              <Input name="name" placeholder="Name" value={form.name} onChange={update} required />
            </Field>

            <Field label="Email">
              <Input name="email" type="email" placeholder="Email" value={form.email} onChange={update} required />
            </Field>

            <Field label="Password">
              <Input name="password" type="password" placeholder="Password" value={form.password} onChange={update} required />
            </Field>

            <Field label="Phone">
              <Input name="phone" type="tel" placeholder="Phone" value={form.phone} onChange={update} required />
            </Field>

            {/* ✅ keep original key "address" (design used 'street') */}
            <Field label="Street Address">
              <Input name="address" placeholder="Address" value={form.address} onChange={update} required />
            </Field>

            <Field label="Suburb">
              <Input name="suburb" placeholder="Suburb" value={form.suburb} onChange={update} required />
            </Field>

            <Field label="Postcode">
              <Input name="postcode" placeholder="Postcode" value={form.postcode} onChange={update} required />
            </Field>

            {err && <div className="signup-error">{err}</div>}
            {msg && <div className="signup-ok">{msg}</div>}

            <button type="submit" disabled={loading} className="signup-btn">
              {loading ? "Creating…" : "Create Account"}
            </button>

            <Link href="/login" className="signup-btn secondary">
              Already Have an Account?
            </Link>
          </form>
        </div>
      </section>

      {/* RIGHT — logo + illustration */}
      <section className="signup-right">
        <div className="signup-logo">
          <Image
            src="/uploads/bowerlogog.png"
            alt="Bower logo"
            width={300}
            height={70}
            priority
            style={{ width: "90%", height: "auto" }}
          />
        </div>

        <div className="signup-illustration">
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

/* -------- Reusable components (UI-only) -------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "input " + (props.className || "")
      }
    />
  );
}
