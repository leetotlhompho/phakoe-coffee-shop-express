import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Coffee, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import "../style/staff.css";

export default function StaffLogin() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!ready) return <section className="container staff-page"><p>Checking your sign-in…</p></section>;
  if (user) return <Navigate to="/staff" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await login(email, password);
    setBusy(false);
    if (result.ok) navigate("/staff");
    else setError(result.message);
  }

  return (
    <section className="container staff-page">
      <div className="auth-card">
        <div className="auth-icon"><Coffee size={26} /></div>
        <span className="eyebrow">PHAKOE'S EXPRESS TEAM PORTAL</span>
        <h1>Staff <em>sign in.</em></h1>
        <p>Sign in to manage menu items and customer orders. Staff accounts are created by the administrator.</p>
        <form onSubmit={submit} className="staff-form">
          <label>Email address<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="username" /></label>
          <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" /></label>
          {error && <div className="form-error">{error}</div>}
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        {import.meta.env.DEV && (
          <div className="demo-credentials">
            <ShieldCheck size={17} />
            <div><b>Development only</b><span>Default admin: admin@brewhaven.local</span><span>Password: Admin123! (set ADMIN_EMAIL / ADMIN_PASSWORD on the server)</span></div>
          </div>
        )}
      </div>
    </section>
  );
}
