import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../lib/api";
import { Trash, Plus, Minus, ShoppingCart } from "@phosphor-icons/react";

export default function Cart() {
  const { cart, updateQty, removeItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <ShoppingCart size={56} className="mx-auto text-stone-400" weight="duotone" />
        <h2 className="font-display font-bold text-3xl mt-6">Sign in to view your cart</h2>
        <p className="text-stone-500 mt-2">Login to add products and checkout.</p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/login" className="btn-primary">Sign in</Link>
          <Link to="/register" className="btn-outline">Create account</Link>
        </div>
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <ShoppingCart size={56} className="mx-auto text-stone-400" weight="duotone" />
        <h2 className="font-display font-bold text-3xl mt-6">Your cart is empty</h2>
        <p className="text-stone-500 mt-2">Browse our catalog and find what your farm needs.</p>
        <Link to="/shop" className="btn-accent inline-flex mt-8">Start shopping</Link>
      </div>
    );
  }

  const shipping = cart.subtotal >= 1000 ? 0 : 49;
  const total = cart.subtotal + shipping;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display font-bold text-4xl text-stone-900 mb-10">Your Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((it) => (
            <div key={it.product_id} data-testid={`cart-item-${it.product_id}`} className="bg-white rounded-2xl border border-stone-200 p-4 flex gap-4">
              <Link to={`/product/${it.product_id}`} className="w-24 h-24 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 flex flex-col">
                <Link to={`/product/${it.product_id}`} className="font-display font-semibold text-stone-900 hover:text-forest line-clamp-2">{it.name}</Link>
                <div className="text-xs text-stone-500 mt-1">{it.unit}</div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="inline-flex items-center bg-stone-50 border border-stone-200 rounded-full">
                    <button onClick={() => updateQty(it.product_id, it.quantity - 1)} className="w-9 h-9 flex items-center justify-center hover:bg-stone-100 rounded-l-full">
                      <Minus size={14} />
                    </button>
                    <span className="w-9 text-center font-semibold text-sm">{it.quantity}</span>
                    <button onClick={() => updateQty(it.product_id, it.quantity + 1)} className="w-9 h-9 flex items-center justify-center hover:bg-stone-100 rounded-r-full">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-display font-bold text-lg">{formatPrice(it.line_total)}</div>
                    <button onClick={() => removeItem(it.product_id)} data-testid={`remove-${it.product_id}`} className="text-stone-400 hover:text-destructive">
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sticky top-28">
            <h3 className="font-display font-bold text-xl mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-stone-600"><span>Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
              <div className="flex justify-between text-stone-600"><span>Shipping</span><span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
              {shipping > 0 && (
                <div className="text-xs text-ochre">Add {formatPrice(1000 - cart.subtotal)} more for free shipping</div>
              )}
              <div className="border-t border-stone-200 pt-3 flex justify-between font-display font-bold text-lg">
                <span>Total</span><span>{formatPrice(total)}</span>
              </div>
            </div>
            <button onClick={() => navigate("/checkout")} data-testid="checkout-btn" className="btn-accent w-full mt-6 justify-center inline-flex">
              Proceed to Checkout
            </button>
            <Link to="/shop" className="block text-center text-sm text-stone-500 hover:text-forest mt-4">Continue shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
