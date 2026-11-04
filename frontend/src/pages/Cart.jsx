import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useShop } from "../context/ShopContext.jsx";
import { describeError } from "../api.js";
import "../style/cart.css";

export default function Cart() {
  const { cart, cartTotal, changeQuantity, removeFromCart, placeOrder, menuItems } = useShop();
  const [orderError, setOrderError] = useState("");
  const [placing, setPlacing] = useState(false);
  const isUnavailable = (id) => { const m = menuItems.find((i) => i.id === id); return !m || m.available === false; };
  const hasUnavailable = cart.some((i) => isUnavailable(i.id));
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [completedOrder, setCompletedOrder] = useState(null);
  const navigate = useNavigate();

  async function submitOrder(event) {
    event.preventDefault();
    if (!customerName.trim() || cart.length === 0) return;
    setPlacing(true);
    setOrderError("");
    try {
      setCompletedOrder(await placeOrder(customerName, notes));
    } catch (err) {
      setOrderError(describeError(err));
    } finally {
      setPlacing(false);
    }
  }

  if (completedOrder) {
    return <section className="container cart-page confirmation-page"><div className="confirmation-card"><div className="confirmation-icon">✓</div><span className="eyebrow">ORDER RECEIVED</span><h1>Thanks, {completedOrder.customerName}!</h1><p>Your order has been placed successfully.</p><div className="order-number">Order number <strong>{completedOrder.id}</strong></div><div className="confirmation-total"><span>Order total</span><strong>M{completedOrder.total.toFixed(2)}</strong></div><p className="muted-note">Keep your order number. Use it with your name on the Track order page to see when your order is ready.</p><div className="confirmation-actions"><button className="button button-primary" onClick={() => navigate("/track", { state: { name: completedOrder.customerName, orderId: completedOrder.id } })}>Track my order</button><button className="button button-outline" onClick={() => navigate("/menu")}>Back to menu</button></div></div></section>;
  }

  return (
    <section className="container cart-page">
      <div className="cart-page-heading"><span className="eyebrow">YOUR LITTLE PICK-ME-UPS</span><h1>Your <em>basket.</em></h1><p>Have a look at what you picked.</p></div>
      {cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={36} /><h2>Nothing in your basket just yet.</h2><p>Something delicious is only a click away.</p><Link className="button button-primary" to="/menu">Explore the menu</Link></div> : (
        <div className="cart-layout">
          <div className="cart-list"><div className="cart-list-header"><span>Your items ({cart.length})</span><Link to="/menu"><ArrowLeft size={15} /> Keep browsing</Link></div>
            {cart.map(item => <article className="cart-line" key={item.id}>{item.image ? <img src={item.image} alt={item.name} /> : <div className="cart-line-photo-empty" aria-hidden="true" />}<div className="cart-line-info"><span>{item.category}</span><h3>{item.name}</h3><p>M{item.price.toFixed(2)} each{isUnavailable(item.id) && <b className="line-unavailable"> · No longer available</b>}</p><div className="quantity-stepper"><button onClick={() => changeQuantity(item.id, -1)} aria-label="Decrease quantity"><Minus size={14} /></button><b>{item.quantity}</b><button onClick={() => changeQuantity(item.id, 1)} aria-label="Increase quantity"><Plus size={14} /></button></div></div><strong className="line-total">M{(item.price * item.quantity).toFixed(2)}</strong><button className="remove-item" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}`}><Trash2 size={17} /></button></article>)}
          </div>
          <aside className="checkout-card"><span className="eyebrow">ONE LAST THING</span><h2>Order summary</h2><div className="summary-row"><span>Subtotal</span><span>M{cartTotal.toFixed(2)}</span></div><div className="summary-row"><span>Service</span><span>At the counter</span></div><div className="summary-total"><span>Total</span><strong>M{cartTotal.toFixed(2)}</strong></div><form onSubmit={submitOrder} className="checkout-form"><label>Your name<input value={customerName} onChange={e => setCustomerName(e.target.value)} required maxLength={60} placeholder="Enter your name" /></label><label>Order notes <small>(optional)</small><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Milk preference, allergies, etc." rows="3" /></label>{orderError && <div className="form-error">{orderError}</div>}<button className="button button-primary checkout-submit" type="submit" disabled={hasUnavailable || placing}>{placing ? "Placing order…" : "Place order"}</button></form></aside>
        </div>
      )}
    </section>
  );
}