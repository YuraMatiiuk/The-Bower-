"use client";

import { useState } from "react";
import axios from "axios";
import "./login.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      const role = res.data.role;
      if (role === "admin") window.location.href = "/admin";
      else if (role === "driver") window.location.href = "/driver";
      else if (role === "caseworker") window.location.href = "/marketplace";
      else window.location.href = "/donate"; // donor
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="login-container">
      {/* LEFT — form */}
      <section className="login-left">
        <div className="login-box">
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Log in to your account</p>
          <hr className="login-divider" />

          <form onSubmit={handleLogin} className="login-form">
            <label className="login-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                required
              />
            </label>

            <label className="login-field password-field">
              <span>Password</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="toggle-password"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOn /> : <EyeOff />}
              </button>
            </label>

            {message && <p className="login-error">{message}</p>}

            <button type="submit" className="login-btn">
              Log In
            </button>

            <a href="/signup" className="login-btn secondary">
              Create an Account
            </a>
          </form>
        </div>
      </section>

      {/* RIGHT — logo / illustration */}
      <section className="login-right">
        <div className="login-logo">
          <img src="/uploads/bowerlogog.png" alt="Bower logo" />
        </div>
        <div className="login-illustration">
          <img src="/uploads/donate-truck.png" alt="Donation truck" />
        </div>
      </section>
    </div>
  );
}

/* Eye icons */
function EyeOn() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-.88M7.94 7.94A9.974 9.974 0 0012 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.896 5.362M6.1 6.1A9.974 9.974 0 002.458 12C3.732 7.943 7.523 5 12 5c.84 0 1.654.094 2.435.27" />
    </svg>
  );
}
