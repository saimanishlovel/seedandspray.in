import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart({ items: [], subtotal: 0 });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/cart");
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToCart = async (product_id, quantity = 1) => {
    if (!user) {
      toast.error("Please login to add items");
      return false;
    }
    await api.post("/cart/items", { product_id, quantity });
    await refresh();
    toast.success("Added to cart");
    return true;
  };

  const updateQty = async (product_id, quantity) => {
    if (quantity < 1) return removeItem(product_id);
    await api.put(`/cart/items/${product_id}`, { product_id, quantity });
    await refresh();
  };

  const removeItem = async (product_id) => {
    await api.delete(`/cart/items/${product_id}`);
    await refresh();
  };

  const clearCart = async () => {
    await api.delete("/cart");
    await refresh();
  };

  const itemCount = cart.items.reduce((s, it) => s + it.quantity, 0);

  const value = useMemo(
    () => ({ cart, loading, addToCart, updateQty, removeItem, clearCart, refresh, itemCount }),
    [cart, loading, refresh, itemCount]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
