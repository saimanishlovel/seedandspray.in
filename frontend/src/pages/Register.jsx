import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const r = await register(form);
    setLoading(false);
    if (r.ok) {
      toast.success("Account created!");
      navigate("/");
    } else {
      toast.error(r.error);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-topo">
      <div className="bg-white/95 backdrop-blur rounded-3xl border border-stone-200 shadow-xl w-full max-w-md p-8 md:p-10">
        <div className="label-eyebrow mb-3">Get started</div>
        <h1 className="font-display font-extrabold text-3xl text-stone-900">Create your account</h1>
        <p className="text-stone-500 mt-2 text-sm">Already a customer? <Link to="/login" className="text-forest font-semibold hover:underline">Sign in</Link></p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} testid="reg-name" />
          <Field label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} testid="reg-email" />
          <Field label="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} testid="reg-phone" />
          <Field label="Password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} testid="reg-password" />
          <button type="submit" disabled={loading} data-testid="reg-submit" className="btn-primary w-full justify-center inline-flex disabled:opacity-50">
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
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
