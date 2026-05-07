import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { formatPrice } from "../lib/api";
import { CheckCircle, Package } from "@phosphor-icons/react";

export default function OrderConfirmed() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/orders/${id}`).then((r) => setOrder(r.data));
  }, [id]);

  if (!order) return <div className="max-w-3xl mx-auto px-6 py-24 text-center text-stone-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center shadow-sm">
        <div className="inline-flex w-20 h-20 rounded-full bg-forest/10 items-center justify-center text-forest mb-6">
          <CheckCircle size={48} weight="duotone" />
        </div>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-stone-900">Order placed!</h1>
        <p className="text-stone-600 mt-2">Thank you, your order has been received.</p>
        <div className="mt-6 inline-flex items-center gap-2 bg-stone-50 px-4 py-2 rounded-full text-sm">
          <Package size={16} className="text-forest" /> Order ID: <span className="font-mono font-semibold">{order.id.slice(0, 8).toUpperCase()}</span>
        </div>

        <div className="mt-8 text-left border border-stone-200 rounded-2xl p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-stone-500 text-xs uppercase tracking-wider">Total</div><div className="font-display font-bold text-lg">{formatPrice(order.total)}</div></div>
            <div><div className="text-stone-500 text-xs uppercase tracking-wider">Payment</div><div className="font-semibold">{order.payment_method}</div></div>
            <div><div className="text-stone-500 text-xs uppercase tracking-wider">Status</div><div className="font-semibold capitalize">{order.status}</div></div>
            <div><div className="text-stone-500 text-xs uppercase tracking-wider">Items</div><div className="font-semibold">{order.items.length}</div></div>
          </div>
          <div className="mt-5 pt-5 border-t border-stone-200 text-sm">
            <div className="text-stone-500 text-xs uppercase tracking-wider mb-1">Delivery to</div>
            <div className="text-stone-700">{order.address.full_name}, {order.address.line1}, {order.address.city}, {order.address.state} - {order.address.pincode}</div>
          </div>
        </div>

        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/account" className="btn-outline">View my orders</Link>
          <Link to="/shop" className="btn-primary">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
