import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, describeError, hooks, setToken } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const ready = true; // nothing is remembered between visits, so there is no saved sign-in to check
  const [staff, setStaff] = useState([]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStaff([]);
  }, []);

  // If the server says our token is no longer valid (expired, or the account was removed), sign out.
  useEffect(() => {
    hooks.onUnauthorized = logout;
    return () => { hooks.onUnauthorized = null; };
  }, [logout]);

  const refreshStaff = useCallback(async () => {
    if (user?.role !== "admin") return;
    try { setStaff(await api.get("/api/staff")); } catch { /* shown by the caller if needed */ }
  }, [user]);

  useEffect(() => { refreshStaff(); }, [refreshStaff]);

  async function login(email, password) {
    try {
      const result = await api.post("/api/auth/login", { email, password });
      setToken(result.token);
      setUser(result.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.status === 401 ? "Email or password is incorrect." : describeError(err) };
    }
  }

  async function addStaff(form) {
    try {
      await api.post("/api/staff", form);
      await refreshStaff();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: describeError(err) };
    }
  }

  async function removeStaff(id) {
    try {
      await api.del(`/api/staff/${id}`);
      await refreshStaff();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: describeError(err) };
    }
  }

  return (
    <AuthContext.Provider value={{ user, ready, users: staff, login, logout, addStaff, removeStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
