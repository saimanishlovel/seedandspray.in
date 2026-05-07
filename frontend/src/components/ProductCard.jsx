import { Link } from "react-router-dom";
import { ShoppingCart, Star } from "@phosphor-icons/react";
import { formatPrice } from "../lib/api";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="card-tactile group flex flex-col overflow-hidden" data-testid={`product-card-${product.id}`}>
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-stone-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-forest text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {discount}% OFF
          </span>
        )}
        {product.featured && (
          <span className="absolute top-3 right-3 bg-ochre text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            Featured
          </span>
        )}
      </Link>
      <div className="p-5 flex flex-col flex-1">
        <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">{product.brand || product.category}</div>
        <Link to={`/product/${product.id}`} className="font-display font-semibold text-stone-900 leading-snug hover:text-forest line-clamp-2 mb-2">
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-stone-500 mb-3">
          <Star size={14} weight="fill" className="text-ochre" />
          <span>{product.rating?.toFixed(1) || "4.5"}</span>
          <span className="ml-2">{product.unit}</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <div className="font-display font-bold text-lg text-stone-900">{formatPrice(product.price)}</div>
            {product.mrp && product.mrp > product.price && (
              <div className="text-xs text-stone-400 line-through">{formatPrice(product.mrp)}</div>
            )}
          </div>
          <button
            onClick={() => addToCart(product.id, 1)}
            data-testid={`add-to-cart-${product.id}`}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-ochre hover:bg-ochre-dark text-white transition-colors"
            title="Add to cart"
          >
            <ShoppingCart size={18} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
