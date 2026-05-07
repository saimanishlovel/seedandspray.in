import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api, { formatPrice, formatErr } from "../lib/api";
import { toast } from "sonner";
import { CreditCard, Money, MapPin } from "@phosphor-icons/react";

export default function Checkout() {
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState("COD");
  const [form, setForm] = useState({
    full_name: user?.name || "",
    phone: user?.phone || "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  if (!user) return <Navigate to="/login" replace />;
  if (!cart.items.length) return <Navigate to="/cart" replace />;

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const shipping = cart.subtotal >= 1000 ? 0 : 49;
  const total = cart.subtotal + shipping;

  const placeOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/orders", {
        address: form,
        payment_method: payment,
        notes: "",
      });
      toast.success("Order placed successfully!");
      await refresh();
      navigate(`/order-confirmed/${data.id}`);
    } catch (err) {
      toast.error(formatErr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display font-bold text-4xl text-stone-900 mb-10">Checkout</h1>

      <form onSubmit={placeOrder} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <MapPin size={22} className="text-forest" />
              <h3 className="font-display font-bold text-xl">Delivery Address</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Full name" required value={form.full_name} onChange={onChange("full_name")} testid="addr-fullname" />
              <Input label="Phone" required value={form.phone} onChange={onChange("phone")} testid="addr-phone" />
              <Input label="Address line 1" required value={form.line1} onChange={onChange("line1")} className="md:col-span-2" testid="addr-line1" />
              <Input label="Address line 2 (optional)" value={form.line2} onChange={onChange("line2")} className="md:col-span-2" testid="addr-line2" />
              <Input label="City" required value={form.city} onChange={onChange("city")} testid="addr-city" />
              <Input label="State" required value={form.state} onChange={onChange("state")} testid="addr-state" />
              <Input label="Pincode" required value={form.pincode} onChange={onChange("pincode")} testid="addr-pincode" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h3 className="font-display font-bold text-xl mb-5">Payment Method</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <PayOption icon={Money} label="Cash on Delivery" desc="Pay when your order arrives" value="COD" current={payment} onSelect={setPayment} testid="pay-cod" />
              <PayOption icon={CreditCard} label="Online Payment" desc="UPI / cards / netbanking via Razorpay" value="ONLINE" current={payment} onSelect={setPayment} testid="pay-online" />
            </div>
            {payment === "ONLINE" && (
              <p className="mt-4 text-xs text-stone-600">Pay securely via Razorpay (UPI, cards, netbanking, wallets). Test mode active — use UPI <span className="font-mono">success@razorpay</span> or test card <span className="font-mono">4111 1111 1111 1111</span>.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sticky top-28">
            <h3 className="font-display font-bold text-xl mb-4">Summary</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin pr-1 mb-4">
              {cart.items.map((it) => (
                <div key={it.product_id} className="flex gap-3 text-sm">
                  <img src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-stone-100" />
                  <div className="flex-1">
                    <div className="font-medium line-clamp-1">{it.name}</div>
                    <div className="text-xs text-stone-500">Qty {it.quantity}</div>
                  </div>
                  <div className="font-semibold">{formatPrice(it.line_total)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-200 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-stone-600"><span>Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
              <div className="flex justify-between text-stone-600"><span>Shipping</span><span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
              <div className="flex justify-between font-display font-bold text-lg pt-2 border-t border-stone-200">
                <span>Total</span><span>{formatPrice(total)}</span>
              </div>
            </div>
            <button type="submit" disabled={loading} data-testid="place-order-btn" className="btn-accent w-full mt-6 justify-center inline-flex disabled:opacity-50">
              {loading ? "Placing order..." : `Place Order • ${formatPrice(total)}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Input({ label, className = "", testid, ...rest }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1.5 block">{label}</span>
      <input data-testid={testid} {...rest} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-forest" />
    </label>
  );
}

function PayOption({ icon: Icon, label, desc, value, current, onSelect, testid }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      data-testid={testid}
      className={`text-left p-5 rounded-2xl border-2 transition-all ${active ? "border-forest bg-forest/5" : "border-stone-200 hover:border-stone-300"}`}
    >
      <Icon size={26} className={active ? "text-forest" : "text-stone-500"} weight="duotone" />
      <div className="font-display font-bold mt-3">{label}</div>
      <div className="text-xs text-stone-500 mt-1">{desc}</div>
    </button>
  );
}
