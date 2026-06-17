import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import telegram from './telegram.js';
import { initApp, adminLogin, setAdminToken, getAdminToken } from './api/auth.js';
import useStore from './store/useStore.js';
import Spinner from './components/Spinner.jsx';

// ── Customer pages ────────────────────────────────────────────
import Home        from './pages/customer/Home.jsx';
import CafeMenu    from './pages/customer/CafeMenu.jsx';
import Cart        from './pages/customer/Cart.jsx';
import Orders      from './pages/customer/Orders.jsx';
import Deposit     from './pages/customer/Deposit.jsx';
import Profile     from './pages/customer/Profile.jsx';
import Favorites   from './pages/customer/Favorites.jsx';
import CreditApply from './pages/customer/CreditApply.jsx';

// ── Cafe owner pages ──────────────────────────────────────────
import Dashboard     from './pages/cafe/Dashboard.jsx';
import CafeOrders    from './pages/cafe/Orders.jsx';
import MenuEditor    from './pages/cafe/MenuEditor.jsx';
import Customers     from './pages/cafe/Customers.jsx';
import Registrations from './pages/cafe/Registrations.jsx';
import CafeProfile   from './pages/cafe/CafeProfile.jsx';

// ── Admin pages ───────────────────────────────────────────────
import AdminLogin     from './pages/admin/AdminLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import CreateCafe     from './pages/admin/CreateCafe.jsx';
import CafeDetail     from './pages/admin/CafeDetail.jsx';


// ============================================================
// CUSTOMER APP
// Role: customer
// Entry: / (home page — cafe list)
// ============================================================
function CustomerApp() {
  return (
    <Routes>
      <Route path="/"                      element={<Home />} />
      <Route path="/favorites"             element={<Favorites />} />
      <Route path="/cafe/:cafeId/menu"     element={<CafeMenu />} />
      <Route path="/cafe/:cafeId/orders"   element={<Orders />} />
      <Route path="/cafe/:cafeId/cart"     element={<Cart />} />
      <Route path="/cafe/:cafeId/deposit"  element={<Deposit />} />
      <Route path="/cafe/:cafeId/profile"  element={<Profile />} />
      <Route path="/cafe/:cafeId/credit"   element={<CreditApply />} />
      <Route path="*"                      element={<Navigate to="/" />} />
    </Routes>
  );
}


// ============================================================
// CAFE OWNER APP
// Role: cafe_owner
// Entry: /cafe-home (dashboard)
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
// ADMIN APP
// Role: admin
// Entry: /admin (dashboard)
// Protected by JWT — if no token redirect to /admin/login
// ============================================================
function AdminApp() {
  // If no JWT token saved → go to login page
  if (!getAdminToken()) {
    return <Navigate to="/admin/login" />;
  }

  return (
    <Routes>
      <Route path="/admin"              element={<AdminDashboard />} />
      <Route path="/admin/create"       element={<CreateCafe />} />
      <Route path="/admin/cafe/:cafeId" element={<CafeDetail />} />
      <Route path="*"                   element={<Navigate to="/admin" />} />
    </Routes>
  );
}


// ============================================================
// TELEGRAM ENTRY POINT
// Called when the Mini App opens inside Telegram.
// Detects the user's role and renders the correct portal.
// ============================================================
function TelegramEntry() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const setAuth = useStore(s => s.setAuth);
  const role    = useStore(s => s.role);

  useEffect(() => {
    telegram.init();

    async function boot() {
      try {
        const user  = telegram.getUser();
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
        <span style={{ color: 'var(--red)', textAlign: 'center', padding: '0 24px' }}>
          {error}
        </span>
      </div>
    );
  }

  // Route to correct portal based on role
  if (role === 'cafe_owner') return <CafeOwnerApp />;
  if (role === 'admin')      return <AdminApp />;
  return <CustomerApp />;
}


// ============================================================
// ROOT APP
// This is the top level component.
// /admin/login → AdminLogin page (no auth needed)
// /admin/*     → AdminApp (needs JWT)
// /*           → TelegramEntry (detects role via Telegram)
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin login — standalone page, no Telegram needed */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin portal — protected by JWT */}
        <Route path="/admin/*" element={<AdminApp />} />

        {/* Everything else — goes through Telegram role detection */}
        <Route path="/*" element={<TelegramEntry />} />
      </Routes>
    </BrowserRouter>
  );
}
