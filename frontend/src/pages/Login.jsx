import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import api, { formatErr } from "../lib/api";
import { EnvelopeSimple, Phone } from "@phosphor-icons/react";

let msg91ScriptLoaded = false;

function loadMsg91Script() {
  return new Promise((resolve, reject) => {
    if (msg91ScriptLoaded && window.initSendOTP) return resolve();
    const urls = [
      "https://verify.msg91.com/otp-provider.js",
      "https://verify.phone91.com/otp-provider.js",
    ];
    let i = 0;
    const tryLoad = () => {
      const s = document.createElement("script");
      s.src = urls[i];
      s.async = true;
      s.onload = () => {
        msg91ScriptLoaded = true;
        resolve();
      };
      s.onerror = () => {
        i++;
        if (i < urls.length) tryLoad();
        else reject(new Error("MSG91 script failed to load"));
      };
      document.head.appendChild(s);
    };
    tryLoad();
  });
}

export default function Login() {
  const { login, refresh } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState({ email: "", password: "" });
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [cfg, setCfg] = useState(null);
  const initialised = useRef(false);

  useEffect(() => { api.get("/site-config").then((r) => setCfg(r.data)).catch(() => {}); }, []);

  const submitEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(email.email, email.password);
    setLoading(false);
    if (r.ok) { toast.success("Welcome back!"); navigate("/"); }
    else toast.error(r.error);
  };

  const verifyOnServer = async (accessToken) => {
    try {
      const { data } = await api.post("/auth/msg91/verify", {
        access_token: accessToken,
        phone: phone || undefined,
        name: name || undefined,
      });
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

  const startMsg91 = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return toast.error("Enter a valid 10-digit phone");
    if (!cfg?.msg91?.widget_id || !cfg?.msg91?.token_auth) {
      return toast.error("MSG91 not configured on server");
    }
    setLoading(true);
    try {
      await loadMsg91Script();
      const normalised = phone.startsWith("+") ? phone : `91${phone.replace(/\D/g, "").slice(-10)}`;
      const configuration = {
        widgetId: cfg.msg91.widget_id,
        tokenAuth: cfg.msg91.token_auth,
        identifier: normalised,
        exposeMethods: false,
        success: (data) => {
          // data.message is usually the JWT access-token string
          const accessToken = (data && (data.message || data.token || data["access-token"])) || data;
          if (typeof accessToken !== "string") {
            toast.error("MSG91 returned unexpected response");
            setLoading(false);
            return;
          }
          verifyOnServer(accessToken);
        },
        failure: (err) => {
          toast.error(err?.message || "OTP cancelled");
          setLoading(false);
        },
      };
      if (typeof window.initSendOTP === "function") {
        window.initSendOTP(configuration);
      } else {
        toast.error("MSG91 widget not loaded yet, try again");
        setLoading(false);
      }
    } catch (err) {
      toast.error("Failed to load MSG91 OTP widget");
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
          <form onSubmit={startMsg91} className="mt-6 space-y-4">
            <Field label="Phone (10 digits)" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} testid="login-phone" placeholder="9876543210" />
            <Field label="Your name (new customers)" value={name} onChange={(e) => setName(e.target.value)} testid="login-name" placeholder="Optional" />
            <button type="submit" disabled={loading} data-testid="login-msg91-submit" className="btn-primary w-full justify-center inline-flex disabled:opacity-50">
              {loading ? "Opening..." : "Continue with OTP"}
            </button>
            <p className="text-xs text-stone-500 text-center">Powered by MSG91 — secure OTP delivered via SMS to your phone.</p>
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
