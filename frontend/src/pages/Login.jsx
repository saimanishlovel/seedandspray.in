import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import api, { formatErr } from "../lib/api";
import { EnvelopeSimple, Phone } from "@phosphor-icons/react";

export default function Login() {
  const { login, refresh } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState({ phone: "", code: "", sent: false, sending: false });
  const [loading, setLoading] = useState(false);

  const submitEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(email.email, email.password);
    setLoading(false);
    if (r.ok) { toast.success("Welcome back!"); navigate("/"); }
    else toast.error(r.error);
  };

  const sendOtp = async () => {
    if (!otp.phone || otp.phone.length < 10) return toast.error("Enter a valid phone number");
    setOtp({ ...otp, sending: true });
    try {
      const { data } = await api.post("/auth/otp/send", { phone: otp.phone });
      setOtp({ ...otp, sent: true, sending: false });
      if (data.sent_via === "sms") toast.success("OTP sent via SMS");
      else toast.message("OTP sent (check console — Twilio sender not configured yet)");
    } catch (e) {
      setOtp({ ...otp, sending: false });
      toast.error(formatErr(e));
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/otp/verify", { phone: otp.phone, code: otp.code });
      localStorage.setItem("agrimart_token", data.token);
      await refresh();
      toast.success("Logged in!");
      navigate("/");
    } catch (err) {
      toast.error(formatErr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-topo">
      <div className="bg-white/95 backdrop-blur rounded-3xl border border-stone-200 shadow-xl w-full max-w-md p-8 md:p-10">
        <div className="label-eyebrow mb-3">Welcome back</div>
        <h1 className="font-display font-extrabold text-3xl text-stone-900">Sign in to Rythu Shubham</h1>
        <p className="text-stone-500 mt-2 text-sm">New customer? <Link to="/register" className="text-forest font-semibold hover:underline">Create an account</Link></p>

        <div className="mt-6 inline-flex bg-stone-100 rounded-full p-1 w-full">
          <button data-testid="login-tab-email" onClick={() => setMode("email")} className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-full text-sm font-medium transition-colors ${mode === "email" ? "bg-forest text-white" : "text-stone-600"}`}>
            <EnvelopeSimple size={16} /> Email
          </button>
          <button data-testid="login-tab-phone" onClick={() => setMode("phone")} className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-full text-sm font-medium transition-colors ${mode === "phone" ? "bg-forest text-white" : "text-stone-600"}`}>
            <Phone size={16} /> Phone OTP
          </button>
        </div>

        {mode === "email" ? (
          <form onSubmit={submitEmail} className="mt-6 space-y-4">
            <Field label="Email" type="email" required value={email.email} onChange={(e) => setEmail({ ...email, email: e.target.value })} testid="login-email" />
            <Field label="Password" type="password" required value={email.password} onChange={(e) => setEmail({ ...email, password: e.target.value })} testid="login-password" />
            <button type="submit" disabled={loading} data-testid="login-submit" className="btn-primary w-full justify-center inline-flex disabled:opacity-50">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={otp.sent ? verifyOtp : (e) => { e.preventDefault(); sendOtp(); }} className="mt-6 space-y-4">
            <Field label="Phone (10 digits)" type="tel" required disabled={otp.sent} value={otp.phone} onChange={(e) => setOtp({ ...otp, phone: e.target.value })} testid="login-phone" placeholder="9876543210" />
            {otp.sent && (
              <Field label="6-digit OTP" required value={otp.code} onChange={(e) => setOtp({ ...otp, code: e.target.value })} testid="login-otp-code" placeholder="123456" maxLength={6} />
            )}
            <button type="submit" disabled={loading || otp.sending} data-testid="login-otp-submit" className="btn-primary w-full justify-center inline-flex disabled:opacity-50">
              {otp.sending ? "Sending..." : otp.sent ? (loading ? "Verifying..." : "Verify & Sign in") : "Send OTP"}
            </button>
            {otp.sent && (
              <button type="button" onClick={() => setOtp({ phone: otp.phone, code: "", sent: false, sending: false })} className="block w-full text-center text-xs text-stone-500 hover:text-forest">Change phone number</button>
            )}
          </form>
        )}

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
      <input data-testid={testid} {...rest} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-forest disabled:bg-stone-50" />
    </label>
  );
}
