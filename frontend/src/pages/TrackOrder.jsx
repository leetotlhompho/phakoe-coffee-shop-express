import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, ChefHat, ClipboardList, PackageCheck, Printer, LogOut } from "lucide-react";
import { useShop } from "../context/ShopContext.jsx";
import "../style/track.css";

const steps = [
  { status: "Pending", label: "Pending", Icon: ClipboardList, text: "We have received your order and will start on it shortly." },
  { status: "Preparing", label: "Preparing", Icon: ChefHat, text: "Your order is being prepared right now." },
  { status: "Ready", label: "Ready", Icon: PackageCheck, text: "Your order is ready. Please collect it at the counter." },
  { status: "Collected", label: "Collected", Icon: CheckCircle2, text: "Thank you! Your order has been collected." },
];

const money = (n) => `M${Number(n).toFixed(2)}`;

function Slip({ order }) {
  return (
    <div className="print-slip">
      <h2>Phakoe's Coffee Shop Express</h2>
      <p className="slip-sub">Maseru, Lesotho</p>
      <hr />
      <div className="slip-row"><span>Order no.</span><b>{order.id}</b></div>
      <div className="slip-row"><span>Customer</span><b>{order.customerName}</b></div>
      <div className="slip-row"><span>Placed</span><span>{new Date(order.createdAt).toLocaleString()}</span></div>
      <div className="slip-row"><span>Collected</span><span>{new Date(order.collectedAt || order.updatedAt || order.createdAt).toLocaleString()}</span></div>
      <hr />
      {order.items.map((i) => (
        <div className="slip-row" key={i.id}><span>{i.quantity} × {i.name}</span><span>{money(i.price * i.quantity)}</span></div>
      ))}
      <hr />
      <div className="slip-row slip-total"><span>TOTAL</span><b>{money(order.total)}</b></div>
      {order.notes && <p className="slip-notes">Notes: {order.notes}</p>}
      <p className="slip-thanks">Status: COLLECTED<br />Thank you for visiting Phakoe's Coffee Shop Express!</p>
    </div>
  );
}

export default function TrackOrder() {
  const { trackedOrder, tracked, trackLogin, trackLogout, refreshOrders } = useShop();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const prefill = useLocation().state || {}; // set when coming from the order confirmation page
  const [name, setName] = useState(prefill.name || "");
  const [orderId, setOrderId] = useState(prefill.orderId || "");
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(20);
  const printedRef = useRef(false);
  const status = trackedOrder?.status;

  function exitPage() {
    trackLogout();
    navigate("/", { replace: true });
  }

  // Keep the status fresh while the customer is watching.
  useEffect(() => {
    if (!tracked) return;
    refreshOrders();
    const timer = setInterval(refreshOrders, 2000);
    return () => clearInterval(timer);
  }, [tracked]);

  // Once collected: print the slip, then leave the customer page automatically.
  useEffect(() => {
    if (status !== "Collected") return;
    let exited = false;
    const leave = () => {
      if (exited) return;
      exited = true;
      trackLogout();
      navigate("/", { replace: true });
    };
    const printTimer = setTimeout(() => {
      if (!printedRef.current) {
        printedRef.current = true;
        window.print();
      }
    }, 700);
    const onAfterPrint = () => setTimeout(leave, 1200);
    window.addEventListener("afterprint", onAfterPrint);
    const countdown = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => {
      clearTimeout(printTimer);
      clearInterval(countdown);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [status]);

  // Countdown finished: leave the customer page.
  useEffect(() => {
    if (status === "Collected" && secondsLeft === 0) exitPage();
  }, [secondsLeft, status]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const result = await trackLogin(name, orderId);
    setBusy(false);
    setError(result.ok ? "" : result.message);
  }

  // Saved session found, order still loading from the server.
  if (tracked && !trackedOrder) {
    return <section className="container track-page"><div className="track-card"><p>Loading your order…</p></div></section>;
  }

  // ---- Not signed in: ask for name + order number ----
  if (!tracked || !trackedOrder) {
    return (
      <section className="container track-page">
        <div className="track-card">
          <span className="eyebrow">TRACK YOUR ORDER</span>
          <h1>Where is my <em>order?</em></h1>
          <p>Enter the name you ordered with and your order number to see its progress.</p>
          <form className="staff-form" onSubmit={submit}>
            <label>Your name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name used on the order" /></label>
            <label>Order number<input required value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="e.g. BH-7K3M9Q" /></label>
            {error && <div className="form-error">{error}</div>}
            <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Looking…" : "View my order"}</button>
          </form>
        </div>
      </section>
    );
  }

  const order = trackedOrder;
  const currentIndex = steps.findIndex((s) => s.status === order.status);

  return (
    <>
      <section className="container track-page no-print">
        <div className="track-card track-wide">
          <div className="track-head">
            <div>
              <span className="eyebrow">ORDER {order.id}</span>
              <h1>Hi {order.customerName}, <em>{order.status === "Collected" ? "all done!" : "here is your order."}</em></h1>
            </div>
            <button className="button button-outline" onClick={exitPage}><LogOut size={15} /> Exit</button>
          </div>

          <ol className="track-steps">
            {steps.map((s, i) => (
              <li key={s.status} className={i < currentIndex ? "done" : i === currentIndex ? "current" : ""}>
                <span className="track-dot"><s.Icon size={18} /></span>
                <b>{s.label}</b>
              </li>
            ))}
          </ol>

          <p className="track-message">{steps[currentIndex]?.text}</p>
          {order.status !== "Collected" && <p className="track-live">This page updates automatically when staff change your order status.</p>}

          <div className="track-items">
            {order.items.map((i) => (
              <div className="slip-row" key={i.id}><span>{i.quantity} × {i.name}</span><span>{money(i.price * i.quantity)}</span></div>
            ))}
            <div className="slip-row slip-total"><span>Total</span><b>{money(order.total)}</b></div>
          </div>

          {order.status === "Collected" && (
            <div className="track-finish">
              <p>Your slip is printing. This page will close automatically in <b>{secondsLeft}s</b>.</p>
              <div className="confirmation-actions">
                <button className="button button-primary" onClick={() => window.print()}><Printer size={15} /> Print slip again</button>
                <button className="button button-outline" onClick={exitPage}>Exit now</button>
              </div>
            </div>
          )}
        </div>
      </section>
      {order.status === "Collected" && <Slip order={order} />}
    </>
  );
}
