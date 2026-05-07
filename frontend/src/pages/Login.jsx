import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(form.email, form.password);
    setLoading(false);
    if (r.ok) {
      toast.success("Welcome back!");
      navigate("/");
    } else {
      toast.error(r.error);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-topo">
      <div className="bg-white/95 backdrop-blur rounded-3xl border border-stone-200 shadow-xl w-full max-w-md p-8 md:p-10">
        <div className="label-eyebrow mb-3">Welcome back</div>
        <h1 className="font-display font-extrabold text-3xl text-stone-900">Sign in to Seed &amp; Spray</h1>
        <p className="text-stone-500 mt-2 text-sm">New customer? <Link to="/register" className="text-forest font-semibold hover:underline">Create an account</Link></p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} testid="login-email" />
          <Field label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} testid="login-password" />
          <button type="submit" disabled={loading} data-testid="login-submit" className="btn-primary w-full justify-center inline-flex disabled:opacity-50">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-xs text-stone-500 bg-stone-50 rounded-xl p-3">
          Demo admin: <span className="font-mono">admin@seedandspray.in</span> / <span className="font-mono">Admin@123</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, testid, ...rest }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1.5 block">{label}</span>
      <input data-testid={testid} {...rest} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-forest" />
    </label>
  );
}
