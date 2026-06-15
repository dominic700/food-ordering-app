import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import telegram from './telegram.js';
import { initApp, adminLogin, setAdminToken, getAdminToken } from './api/auth.js';
import useStore from './store/useStore.js';
import BottomNav from './components/BottomNav.jsx';
import Spinner from './components/Spinner.jsx';

import Home from './pages/customer/Home.jsx';
import CafeMenu from './pages/customer/CafeMenu.jsx';
import Cart from './pages/customer/Cart.jsx';
import Orders from './pages/customer/Orders.jsx';
import Deposit from './pages/customer/Deposit.jsx';
import Profile from './pages/customer/Profile.jsx';
import Favorites from './pages/customer/Favorites.jsx';
import CreditApply from './pages/customer/CreditApply.jsx';

import Dashboard from './pages/cafe/Dashboard.jsx';
import CafeOrders from './pages/cafe/Orders.jsx';
import MenuEditor from './pages/cafe/MenuEditor.jsx';
import Customers from './pages/cafe/Customers.jsx';
import Registrations from './pages/cafe/Registrations.jsx';
import CafeProfile from './pages/cafe/CafeProfile.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import CreateCafe from './pages/admin/CreateCafe.jsx';
import CafeDetail from './pages/admin/CafeDetail.jsx';

// ============================================================
// PLACEHOLDER PAGE
// A simple stand-in so every route renders something while the
// remaining real pages (Favorites, cafe-owner dashboard pages,
// admin pages) are built next.
// ============================================================
function Placeholder({ title, subtitle, nav }) {
  return (
    <div className="page">
      <div className="header">
        <div style={{ width: 36 }} />
        <div className="header-title">{title}</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="empty">
        <div className="empty-icon">🚧</div>
        <div className="empty-title">{title}</div>
        <div className="empty-desc">{subtitle || 'This page is coming next.'}</div>
      </div>
      {nav}
    </div>
  );
}

// ============================================================
// CUSTOMER APP (role === 'customer')
// ============================================================
function CustomerApp() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/cafe/:cafeId/menu" element={<CafeMenu />} />
      <Route path="/cafe/:cafeId/orders" element={<Orders />} />
      <Route path="/cafe/:cafeId/cart" element={<Cart />} />
      <Route path="/cafe/:cafeId/deposit" element={<Deposit />} />
      <Route path="/cafe/:cafeId/profile" element={<Profile />} />
      <Route path="/cafe/:cafeId/credit" element={<CreditApply />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

// ============================================================
// CAFE OWNER APP (role === 'cafe_owner')
// ============================================================
function CafeOwnerApp() {
  return (
    <Routes>
      <Route path="/cafe-home"               element={<Dashboard />} />
      <Route path="/cafe-home/orders"        element={<CafeOrders />} />
      <Route path="/cafe-home/menu"          element={<MenuEditor />} />
      <Route path="/cafe-home/customers"     element={<Customers />} />
      <Route path="/cafe-home/registrations" element={<Registrations />} />
      <Route path="/cafe-home/profile"       element={<CafeProfile />} />
      <Route path="*"                        element={<Navigate to="/cafe-home" />} />
    </Routes>
  );
}

// ============================================================
// TELEGRAM ENTRY POINT
// Boots the Telegram WebApp SDK, calls /api/auth/init to detect
// the role (customer / cafe_owner / admin), then renders the
// correct portal. Used for every route EXCEPT /admin/*.
// ============================================================
function TelegramEntry() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const setAuth = useStore(s => s.setAuth);
  const role = useStore(s => s.role);

  useEffect(() => {
    telegram.init();

    async function boot() {
      try {
        const user = telegram.getUser();
        const phone = user?.phone_number || null;
        const result = await initApp(phone);
        setAuth(result.role, result.account);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, []);

  if (loading) return <Spinner fullPage label="Loading..." />;

  if (error) {
    return (
      <div className="loading-page">
        <div style={{ fontSize: 32 }}>⚠️</div>
        <span style={{ color: 'var(--red)', textAlign: 'center', padding: '0 24px' }}>{error}</span>
      </div>
    );
  }

  if (role === 'cafe_owner') return <CafeOwnerApp />;
  if (role === 'admin') return <Navigate to="/admin" />;
  return <CustomerApp />;
}

// ============================================================
// ADMIN LOGIN
// Standalone email + password login (no Telegram). On success,
// stores the JWT and redirects to /admin.
// ============================================================
function AdminLogin() {
  const navigate = useNavigate();
  const setAuth = useStore(s => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await adminLogin(email, password);
      setAdminToken(result.token);
      setAuth('admin', result.admin);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: 360, padding: 24 }}>
        <div className="section-title" style={{ marginBottom: 20, textAlign: 'center' }}>Admin Login</div>

        <div className="input-group">
          <label className="input-label">Email</label>
          <input className="input" style={{ paddingLeft: 14 }} type="email" value={email}
            onChange={e => setEmail(e.target.value)} required />
        </div>

        <div className="input-group">
          <label className="input-label">Password</label>
          <input className="input" style={{ paddingLeft: 14 }} type="password" value={password}
            onChange={e => setPassword(e.target.value)} required />
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button className="btn btn-red" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// ADMIN APP (role === 'admin')
// Protected by JWT in localStorage. If no token, redirect to login.
// ============================================================
function AdminApp() {
  if (!getAdminToken()) return <Navigate to="/admin/login" />;

  return (
    <Routes>
      <Route path="/admin/login"       element={<Navigate to="/admin" />} />
      <Route path="/admin"             element={<AdminDashboard />} />
      <Route path="/admin/create"      element={<CreateCafe />} />
      <Route path="/admin/cafe/:cafeId" element={<CafeDetail />} />
      <Route path="*"                  element={<Navigate to="/admin" />} />
    </Routes>
  );
}

// ============================================================
// ROOT
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<TelegramEntry />} />
      </Routes>
    </BrowserRouter>
  );
}
