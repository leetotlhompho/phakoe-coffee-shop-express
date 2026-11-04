import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const ShopContext = createContext(null);

export function ShopProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuStatus, setMenuStatus] = useState("loading"); // loading | ready | error
  const [menuError, setMenuError] = useState("");
  const [tracked, setTracked] = useState(null);
  const [trackedOrder, setTrackedOrder] = useState(null);

  // ---------- menu (from the API) ----------
  const loadMenu = useCallback(async () => {
    try {
      setMenuItems(await api.get("/api/menu"));
      setMenuStatus("ready");
      setMenuError("");
    } catch (err) {
      setMenuError(err.message);
      setMenuStatus((s) => (s === "ready" ? "ready" : "error"));
    }
  }, []);

  useEffect(() => {
    loadMenu();
    const timer = setInterval(loadMenu, 15000); // picks up availability changes made by staff
    return () => clearInterval(timer);
  }, [loadMenu]);

  // Staff actions (the API checks the staff sign-in and returns an error if it is missing).
  const addMenuItem = async (item) => { await api.post("/api/menu", item); await loadMenu(); };
  const updateMenuItem = async (id, changes) => { await api.put(`/api/menu/${id}`, changes); await loadMenu(); };
  const deleteMenuItem = async (id) => { await api.del(`/api/menu/${id}`); await loadMenu(); };

  // ---------- cart ----------
  function addToCart(product) {
    if (product.available === false) return;
    setCart((c) => {
      const found = c.find((i) => i.id === product.id);
      return found ? c.map((i) => (i.id === product.id ? { ...i, quantity: Math.min(99, i.quantity + 1) } : i)) : [...c, { ...product, quantity: 1 }];
    });
  }
  const changeQuantity = (id, amount) =>
    setCart((c) => c.map((i) => (i.id === id ? { ...i, quantity: Math.min(99, i.quantity + amount) } : i)).filter((i) => i.quantity > 0));
  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));

  /** Sends the order to the API. Throws an ApiError (with a readable message) when it is rejected. */
  async function placeOrder(customerName, notes = "") {
    const order = await api.post("/api/orders", {
      customerName: customerName.trim(),
      notes: notes.trim(),
      items: cart.map(({ id, quantity }) => ({ id, quantity })),
    });
    setCart([]);
    loadMenu();
    return order;
  }

  // ---------- customer order tracking (name + order number) ----------
  const fetchOrder = (t) => api.get(`/api/orders/${encodeURIComponent(t.id)}?customerName=${encodeURIComponent(t.name)}`);

  function trackLogout() {
    setTracked(null);
    setTrackedOrder(null);
  }

  async function trackLogin(name, orderId) {
    const attempt = { id: orderId.trim().toUpperCase(), name: name.trim() };
    try {
      const order = await fetchOrder(attempt);
      const session = { id: order.id, name: attempt.name };
      setTracked(session);
      setTrackedOrder(order);
      return { ok: true };
    } catch (err) {
      if (err.status === 404 || err.status === 400) {
        return { ok: false, message: "We could not find an order with that name and order number. Please check and try again." };
      }
      return { ok: false, message: err.message };
    }
  }

  const refreshOrders = useCallback(async () => {
    if (!tracked) return;
    try {
      setTrackedOrder(await fetchOrder(tracked));
    } catch (err) {
      if (err.status === 404) trackLogout();
    }
  }, [tracked]);

  // Load the order again when the page is reloaded with a saved session.
  useEffect(() => {
    if (tracked && !trackedOrder) refreshOrders();
  }, [tracked]);

  const value = useMemo(
    () => ({
      menuItems, menuStatus, menuError, reloadMenu: loadMenu,
      cart,
      cartCount: cart.reduce((s, i) => s + i.quantity, 0),
      cartTotal: cart.reduce((s, i) => s + i.price * i.quantity, 0),
      addToCart, changeQuantity, removeFromCart, placeOrder,
      addMenuItem, updateMenuItem, deleteMenuItem,
      tracked, trackedOrder, trackLogin, trackLogout, refreshOrders,
    }),
    [menuItems, menuStatus, menuError, cart, tracked, trackedOrder, refreshOrders]
  );
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const c = useContext(ShopContext);
  if (!c) throw new Error("useShop must be used inside ShopProvider");
  return c;
}
