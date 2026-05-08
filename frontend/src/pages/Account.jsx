import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { formatPrice } from "../lib/api";
import { Package } from "@phosphor-icons/react";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Account() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.get("/orders").then((r) => {
        setOrders(r.data);
        setLoading(false);
      });
    }
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sticky top-28">
            <div className="w-16 h-16 rounded-full bg-forest text-white flex items-center justify-center text-2xl font-display font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <h2 className="font-display font-bold text-xl mt-4">{user.name}</h2>
            <p className="text-sm text-stone-500">{user.email}</p>
            {user.phone && <p className="text-sm text-stone-500">{user.phone}</p>}
            <div className="mt-4 inline-flex bg-forest/10 text-forest text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {user.role}
            </div>
            {user.role === "admin" && (
              <Link to="/admin" className="block mt-6 btn-primary text-sm text-center">Open Admin Panel</Link>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h1 className="font-display font-bold text-3xl mb-6">My Orders</h1>
          {loading ? (
            <div className="text-stone-500">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
              <Package size={48} className="mx-auto text-stone-400" weight="duotone" />
              <p className="mt-4 text-stone-600">You haven't placed any orders yet.</p>
              <Link to="/shop" className="btn-accent mt-6 inline-flex">Start shopping</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div key={o.id} data-testid={`order-${o.id}`} className="bg-white rounded-2xl border border-stone-200 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200">
                    <div>
                      <div className="text-xs text-stone-500 uppercase tracking-wider">Order</div>
                      <div className="font-mono font-semibold text-sm">{o.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-stone-500 uppercase tracking-wider">Date</div>
                      <div className="text-sm font-semibold">{new Date(o.created_at).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-stone-500 uppercase tracking-wider">Total</div>
                      <div className="font-display font-bold">{formatPrice(o.total)}</div>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${STATUS_COLORS[o.status] || "bg-stone-100"}`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {o.items.slice(0, 4).map((it) => (
                      <div key={it.product_id} className="flex items-center gap-3 bg-stone-50 rounded-xl p-2 pr-4">
                        <img src={it.image} alt={it.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="text-xs">
                          <div className="font-medium line-clamp-1 max-w-[180px]">{it.name}</div>
                          <div className="text-stone-500">Qty {it.quantity}</div>
                        </div>
                      </div>
                    ))}
                    {o.items.length > 4 && <div className="text-xs text-stone-500 self-center">+{o.items.length - 4} more</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
