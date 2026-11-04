import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { CircleDollarSign, ClipboardList, Clock3, Coffee, PackagePlus, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { api, describeError } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { categories } from "../data/categories.js";
import "../style/staff.css";

const STATUSES = ["Pending", "Preparing", "Ready", "Collected"];
const emptyItem = { name: "", category: "Coffee", description: "", price: "", image: "", available: true };

export default function StaffDashboard() {
  const { user, ready, users, addStaff, removeStaff } = useAuth();
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useShop();

  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("orders");
  const [editing, setEditing] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await api.get("/api/orders"));
      setOrdersError("");
    } catch (err) {
      setOrdersError(describeError(err));
    }
  }, []);

  // Orders come from the API and are refreshed every few seconds so new orders appear on their own.
  useEffect(() => {
    if (!user) return;
    loadOrders();
    const timer = setInterval(loadOrders, 5000);
    return () => clearInterval(timer);
  }, [user, loadOrders]);

  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const sales = todays.reduce((s, o) => s + o.total, 0);

  const shown = useMemo(
    () => orders.filter((o) => `${o.id} ${o.customerName}`.toLowerCase().includes(search.toLowerCase())),
    [orders, search]
  );

  const dailySummary = useMemo(() => {
    const days = {};
    orders.forEach((o) => {
      const key = new Date(o.createdAt).toDateString();
      const d = (days[key] ||= { key, date: new Date(o.createdAt), orders: 0, items: 0, total: 0, Pending: 0, Preparing: 0, Ready: 0, Collected: 0 });
      d.orders += 1;
      d.items += o.items.reduce((s, i) => s + i.quantity, 0);
      d.total += o.total;
      d[o.status] = (d[o.status] || 0) + 1;
    });
    return Object.values(days).sort((a, b) => b.date - a.date);
  }, [orders]);

  if (!ready) return <section className="container staff-page"><p>Checking your sign-in…</p></section>;
  if (!user) return <Navigate to="/staff/login" replace />;

  const isAdmin = user.role === "admin";

  // Runs an API action, then shows a success or error message.
  async function run(action, successMessage) {
    setBusy(true);
    try {
      await action();
      setNotice(successMessage);
      return true;
    } catch (err) {
      setNotice(describeError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(e) {
    e.preventDefault();
    const item = {
      name: itemForm.name,
      category: itemForm.category,
      description: itemForm.description,
      price: Number(itemForm.price),
      image: itemForm.image.trim(), // left empty when no photo address is given
      available: itemForm.available,
    };
    const ok = await run(() => (editing ? updateMenuItem(editing, item) : addMenuItem(item)), editing ? "Menu item updated." : "Menu item added.");
    if (ok) { setItemForm(emptyItem); setEditing(null); }
  }

  function editItem(i) {
    setEditing(i.id);
    setItemForm({ name: i.name, category: i.category, description: i.description, price: String(i.price), image: i.image || "", available: i.available !== false });
    setTab("menu");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeStatus(id, status) {
    const ok = await run(() => api.patch(`/api/orders/${id}/status`, { status }), `Order ${id} is now ${status}.`);
    if (ok) loadOrders();
  }

  async function createStaff(e) {
    e.preventDefault();
    const result = await addStaff(staffForm);
    setNotice(result.ok ? `Staff account created for ${staffForm.name}.` : result.message);
    if (result.ok) setStaffForm({ name: "", email: "", password: "" });
  }

  const set = (field) => (e) => setItemForm({ ...itemForm, [field]: e.target.value });

  return (
    <section className="container staff-page">
      <div className="staff-heading">
        <div>
          <span className="eyebrow">PHAKOE'S EXPRESS OPERATIONS</span>
          <h1>{isAdmin ? "Admin" : "Staff"} <em>dashboard.</em></h1>
          <p>Welcome, {user.name}. {isAdmin ? "You have administrator access to all dashboard sections." : "Manage the menu and customer orders."}</p>
        </div>
        <span className="role-badge">{isAdmin ? <ShieldCheck size={15} /> : <Coffee size={15} />} {user.role.toUpperCase()}</span>
      </div>

      {notice && <div className="form-notice"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}

      <div className="staff-stats">
        <article><span className="stat-icon"><ClipboardList /></span><div><small>Today's orders</small><strong>{todays.length}</strong><span>Orders placed today</span></div></article>
        <article><span className="stat-icon"><CircleDollarSign /></span><div><small>Today's order total</small><strong>M{sales.toFixed(2)}</strong><span>All statuses included</span></div></article>
        <article><span className="stat-icon"><Coffee /></span><div><small>Menu items</small><strong>{menuItems.length}</strong><span>Current catalogue</span></div></article>
        <article><span className="stat-icon"><Clock3 /></span><div><small>Active orders</small><strong>{orders.filter((o) => o.status !== "Collected").length}</strong><span>Not yet collected</span></div></article>
      </div>

      <div className="staff-tabs">
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Customer orders</button>
        <button className={tab === "menu" ? "active" : ""} onClick={() => setTab("menu")}>Manage menu</button>
        <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>Daily summary</button>
        {isAdmin && <button className={tab === "team" ? "active" : ""} onClick={() => setTab("team")}>Staff accounts</button>}
      </div>

      {tab === "orders" && (
        <div className="staff-orders-panel">
          <div className="staff-orders-heading">
            <div><h2>Customer orders</h2><p>View order items, totals and update order status.</p></div>
            <label className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order or customer" /></label>
          </div>
          {ordersError && <div className="form-error">{ordersError}</div>}
          {shown.length === 0 ? (
            <div className="staff-empty"><PackagePlus size={32} /><h3>No orders to show</h3><p>Customer orders placed from the menu will appear here.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Order details</th><th>Total</th><th>Status</th><th>Update</th></tr></thead>
                <tbody>
                  {shown.map((o) => (
                    <tr key={o.id}>
                      <td><b>{o.id}</b><small>{new Date(o.createdAt).toLocaleString()}</small></td>
                      <td>{o.customerName}</td>
                      <td>{o.items.reduce((s, i) => s + i.quantity, 0)} item(s)<small>{o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</small></td>
                      <td>{o.notes || "—"}</td>
                      <td><b>M{o.total.toFixed(2)}</b></td>
                      <td><span className={`status-pill status-${o.status.toLowerCase()}`}>{o.status}</span></td>
                      <td>
                        <select value={o.status} disabled={busy} onChange={(e) => changeStatus(o.id, e.target.value)} aria-label={`Update ${o.id} status`}>
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "menu" && (
        <div className="staff-orders-panel">
          <div className="staff-orders-heading"><div><h2>{editing ? "Update menu item" : "Add a menu item"}</h2><p>Create, edit, remove items or mark them unavailable.</p></div></div>
          <form className="staff-form item-form" onSubmit={saveItem}>
            <label>Item name<input required maxLength={80} value={itemForm.name} onChange={set("name")} /></label>
            <label>Category<select value={itemForm.category} onChange={set("category")}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Price (M)<input type="number" min="0.01" step="0.01" required value={itemForm.price} onChange={set("price")} /></label>
            <label>Photo URL (optional, leave empty for no photo)<input value={itemForm.image} onChange={set("image")} placeholder="https://..." /></label>
            <label className="form-wide">Description<textarea required maxLength={300} rows="2" value={itemForm.description} onChange={set("description")} /></label>
            <label className="availability-check"><input type="checkbox" checked={itemForm.available} onChange={(e) => setItemForm({ ...itemForm, available: e.target.checked })} /> Available for customers</label>
            <div className="form-actions">
              <button className="button button-primary" type="submit" disabled={busy}>{editing ? "Save changes" : "Add menu item"}</button>
              {editing && <button className="button button-outline" type="button" onClick={() => { setEditing(null); setItemForm(emptyItem); }}>Cancel</button>}
            </div>
          </form>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th></tr></thead>
              <tbody>
                {menuItems.map((i) => (
                  <tr key={i.id}>
                    <td><b>{i.name}</b><small>{i.description}</small></td>
                    <td>{i.category}</td>
                    <td>M{Number(i.price).toFixed(2)}</td>
                    <td><span className={`status-pill ${i.available === false ? "status-pending" : "status-ready"}`}>{i.available === false ? "Unavailable" : "Available"}</span></td>
                    <td>
                      <div className="action-buttons">
                        <button className="small-action" onClick={() => editItem(i)}>Edit</button>
                        <button className="small-action danger" disabled={busy} onClick={() => window.confirm(`Delete ${i.name}?`) && run(() => deleteMenuItem(i.id), "Menu item deleted.")}><Trash2 size={14} /> Delete</button>
                        <button className="small-action" disabled={busy} onClick={() => run(() => updateMenuItem(i.id, { available: i.available === false }), "Availability updated.")}>{i.available === false ? "Make available" : "Mark unavailable"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "summary" && (
        <div className="staff-orders-panel">
          <div className="staff-orders-heading"><div><h2>Daily order summary</h2><p>Orders, items sold and totals for each day.</p></div></div>
          {dailySummary.length === 0 ? (
            <div className="staff-empty"><PackagePlus size={32} /><h3>No orders yet</h3><p>Daily summaries appear once customers place orders.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Orders</th><th>Items sold</th><th>Total</th><th>Pending</th><th>Preparing</th><th>Ready</th><th>Collected</th></tr></thead>
                <tbody>
                  {dailySummary.map((s) => (
                    <tr key={s.key}>
                      <td><b>{s.date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</b>{s.key === today && <small>Today</small>}</td>
                      <td>{s.orders}</td><td>{s.items}</td><td><b>M{s.total.toFixed(2)}</b></td>
                      <td>{s.Pending}</td><td>{s.Preparing}</td><td>{s.Ready}</td><td>{s.Collected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "team" && isAdmin && (
        <div className="staff-orders-panel">
          <div className="staff-orders-heading"><div><h2><Users size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />Staff accounts</h2><p>Only administrators can create or remove staff accounts.</p></div></div>
          <form className="staff-form item-form" onSubmit={createStaff}>
            <label>Staff member name<input required maxLength={60} value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} /></label>
            <label>Staff email<input type="email" required value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} /></label>
            <label>Temporary password (min 8 characters)<input type="password" minLength={8} required value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} /></label>
            <div className="form-actions"><button className="button button-primary" type="submit">Create staff account</button></div>
          </form>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
                    <td>
                      {u.role === "staff" ? (
                        <button className="small-action danger" onClick={async () => {
                          if (!window.confirm(`Remove staff account for ${u.name}?`)) return;
                          const r = await removeStaff(u.id);
                          setNotice(r.ok ? "Staff account removed." : r.message);
                        }}><Trash2 size={14} /> Remove</button>
                      ) : <span className="status-pill status-ready">Protected</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
