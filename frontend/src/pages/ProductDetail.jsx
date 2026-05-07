import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { formatPrice } from "../lib/api";
import { useCart } from "../context/CartContext";
import { ShoppingCart, Star, Truck, ShieldCheck, Plus, Minus, ArrowLeft } from "@phosphor-icons/react";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => {
      setProduct(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-20 text-stone-500">Loading...</div>;
  if (!product) return <div className="max-w-7xl mx-auto px-6 py-20">Product not found.</div>;

  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest mb-6">
        <ArrowLeft size={16} /> Back to shop
      </Link>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        <div className="rounded-3xl overflow-hidden bg-stone-100 aspect-square">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-col">
          <div className="label-eyebrow mb-3">{product.brand || product.category}</div>
          <h1 className="font-display font-extrabold text-3xl md:text-5xl text-stone-900 leading-tight">{product.name}</h1>
          <div className="flex items-center gap-3 mt-4 text-sm text-stone-600">
            <div className="inline-flex items-center gap-1">
              <Star size={16} weight="fill" className="text-ochre" /> {product.rating?.toFixed(1) || "4.5"}
            </div>
            <span className="w-1 h-1 rounded-full bg-stone-300" />
            <span>{product.unit}</span>
            <span className="w-1 h-1 rounded-full bg-stone-300" />
            <span className={product.stock > 0 ? "text-green-700" : "text-destructive"}>
              {product.stock > 0 ? "In stock" : "Out of stock"}
            </span>
          </div>

          <div className="mt-6 flex items-end gap-4">
            <div className="font-display font-bold text-4xl text-stone-900">{formatPrice(product.price)}</div>
            {product.mrp && product.mrp > product.price && (
              <>
                <div className="text-stone-400 line-through text-xl">{formatPrice(product.mrp)}</div>
                <div className="bg-forest/10 text-forest text-sm font-semibold px-2.5 py-1 rounded-full">{discount}% OFF</div>
              </>
            )}
          </div>

          <p className="mt-6 text-stone-600 leading-relaxed">{product.description}</p>

          <div className="mt-8 flex items-center gap-4">
            <div className="inline-flex items-center bg-white border border-stone-200 rounded-full">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-11 h-11 flex items-center justify-center hover:bg-stone-50 rounded-l-full" data-testid="qty-minus">
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-semibold" data-testid="qty-value">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-11 h-11 flex items-center justify-center hover:bg-stone-50 rounded-r-full" data-testid="qty-plus">
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={() => addToCart(product.id, qty)}
              data-testid="pdp-add-to-cart"
              disabled={product.stock <= 0}
              className="btn-accent inline-flex items-center gap-2 flex-1 justify-center disabled:opacity-50"
            >
              <ShoppingCart size={20} weight="bold" /> Add to Cart
            </button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-50">
              <Truck size={22} className="text-forest mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-stone-900">Free delivery</div>
                <div className="text-xs text-stone-500">On orders above ₹1000</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-50">
              <ShieldCheck size={22} className="text-forest mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-stone-900">Genuine product</div>
                <div className="text-xs text-stone-500">100% authentic guarantee</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
