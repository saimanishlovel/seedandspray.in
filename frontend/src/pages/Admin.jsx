import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { formatPrice, formatErr } from "../lib/api";
import { toast } from "sonner";
import { Package, ShoppingBag, Users, CurrencyInr, Plus, PencilSimple, Trash, X } from "@phosphor-icons/react";

const TABS = ["Dashboard", "Products", "Orders"];

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("Dashboard");

  if (loading) return <div className="px-6 py-20 text-stone-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="label-eyebrow mb-2">Admin</div>
          <h1 className="font-display font-extrabold text-4xl text-stone-900">Control Center</h1>
        </div>
        <div className="inline-flex bg-white border border-stone-200 rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t}
              data-testid={`admin-tab-${t.toLowerCase()}`}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${tab === t ? "bg-forest text-white" : "text-stone-600 hover:text-forest"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "Dashboard" && <Dashboard />}
      {tab === "Products" && <ProductsAdmin />}
      {tab === "Orders" && <OrdersAdmin />}
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)); }, []);
  if (!stats) return <div className="text-stone-500">Loading...</div>;
  const cards = [
    { icon: CurrencyInr, label: "Revenue", value: formatPrice(stats.revenue), color: "bg-forest text-white" },
    { icon: Package, label: "Total Orders", value: stats.total_orders, color: "bg-white" },
    { icon: ShoppingBag, label: "Pending Orders", value: stats.pending_orders, color: "bg-ochre text-white" },
    { icon: Users, label: "Customers", value: stats.total_customers, color: "bg-white" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl p-6 border border-stone-200 ${c.color}`}>
          <c.icon size={28} weight="duotone" />
          <div className="text-3xl font-display font-extrabold mt-4">{c.value}</div>
          <div className={`text-xs uppercase tracking-wider mt-1 ${c.color.includes("white") && c.color.includes("text") ? "text-white/80" : "text-stone-500"}`}>{c.label}</div>
        </div>
      ))}
      <div className="col-span-2 lg:col-span-4 mt-2 text-stone-600 text-sm">Use the tabs above to manage products and orders.</div>
    </div>
  );
}

const EMPTY_PRODUCT = { name: "", category: "seeds", price: "", mrp: "", unit: "per pack", description: "", image: "", stock: 100, brand: "", featured: false };
const CAT_OPTS = ["seeds", "sprayers", "machinery", "tools", "fertilizers"];

function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const refresh = () => api.get("/products?limit=200").then((r) => setProducts(r.data));
  useEffect(() => { refresh(); }, []);

  const save = async (form) => {
    try {
      const body = { ...form, price: Number(form.price), mrp: form.mrp ? Number(form.mrp) : null, stock: Number(form.stock) };
      if (editing?.id) {
        await api.put(`/products/${editing.id}`, body);
        toast.success("Product updated");
      } else {
        await api.post("/products", body);
        toast.success("Product created");
      }
      setOpen(false);
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Deleted");
      refresh();
    } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display font-bold text-2xl">Products ({products.length})</h2>
        <button data-testid="admin-add-product-btn" onClick={() => { setEditing(EMPTY_PRODUCT); setOpen(true); }} className="btn-accent inline-flex items-center gap-2">
          <Plus size={18} weight="bold" /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="text-left p-4">Product</th>
                <th className="text-left p-4">Category</th>
                <th className="text-right p-4">Price</th>
                <th className="text-right p-4">Stock</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-stone-100" data-testid={`admin-product-row-${p.id}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div className="font-medium line-clamp-1 max-w-xs">{p.name}</div>
                    </div>
                  </td>
                  <td className="p-4 capitalize">{p.category}</td>
                  <td className="p-4 text-right font-semibold">{formatPrice(p.price)}</td>
                  <td className="p-4 text-right">{p.stock}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => { setEditing(p); setOpen(true); }} className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-stone-100 mr-1" data-testid={`edit-${p.id}`}>
                      <PencilSimple size={16} />
                    </button>
                    <button onClick={() => remove(p.id)} className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-red-50 text-destructive" data-testid={`delete-${p.id}`}>
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && <ProductModal initial={editing} onClose={() => { setOpen(false); setEditing(null); }} onSave={save} />}
    </div>
  );
}

function ProductModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || EMPTY_PRODUCT);
  const change = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display font-bold text-2xl">{initial?.id ? "Edit" : "New"} Product</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-stone-100 inline-flex items-center justify-center"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="grid md:grid-cols-2 gap-4">
          <Field label="Name" required value={form.name} onChange={change("name")} className="md:col-span-2" />
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1.5 block">Category</span>
            <select data-testid="admin-cat-select" value={form.category} onChange={change("category")} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-forest capitalize">
              {CAT_OPTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <Field label="Brand" value={form.brand || ""} onChange={change("brand")} />
          <Field label="Price (₹)" type="number" required value={form.price} onChange={change("price")} />
          <Field label="MRP (₹)" type="number" value={form.mrp || ""} onChange={change("mrp")} />
          <Field label="Unit" value={form.unit} onChange={change("unit")} />
          <Field label="Stock" type="number" value={form.stock} onChange={change("stock")} />
          <Field label="Image URL" required value={form.image} onChange={change("image")} className="md:col-span-2" />
          <label className="block md:col-span-2">
            <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1.5 block">Description</span>
            <textarea required rows={3} value={form.description} onChange={change("description")} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-forest" />
          </label>
          <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.featured} onChange={change("featured")} /> Featured product
          </label>
          <div className="md:col-span-2 flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" data-testid="admin-product-save" className="btn-accent">{initial?.id ? "Save changes" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, className = "", ...rest }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1.5 block">{label}</span>
      <input {...rest} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-forest" />
    </label>
  );
}

function OrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const refresh = () => api.get("/admin/orders").then((r) => setOrders(r.data));
  useEffect(() => { refresh(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/orders/${id}`, { status });
      toast.success("Order updated");
      refresh();
    } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div>
      <h2 className="font-display font-bold text-2xl mb-6">Orders ({orders.length})</h2>
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} data-testid={`admin-order-${o.id}`} className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="grid md:grid-cols-5 gap-4 items-center">
              <div className="md:col-span-2">
                <div className="font-mono font-semibold text-sm">{o.id.slice(0, 8).toUpperCase()}</div>
                <div className="text-xs text-stone-500 mt-1">{o.user_email}</div>
                <div className="text-xs text-stone-500">{new Date(o.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-stone-500">Total</div>
                <div className="font-display font-bold">{formatPrice(o.total)}</div>
                <div className="text-xs text-stone-500">{o.payment_method}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-stone-500">Items</div>
                <div className="font-semibold">{o.items.length} item(s)</div>
              </div>
              <div>
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  data-testid={`admin-order-status-${o.id}`}
                  className="w-full bg-white border border-stone-200 rounded-full px-4 py-2 text-sm outline-none focus:border-forest capitalize"
                >
                  {["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 text-xs text-stone-600">
              Ship to: {o.address.full_name}, {o.address.line1}, {o.address.city}, {o.address.state} - {o.address.pincode} • {o.address.phone}
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="text-stone-500">No orders yet.</div>}
      </div>
    </div>
  );
}
