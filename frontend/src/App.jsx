import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import telegram from './telegram.js';
import { initApp } from './api/auth.js';
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
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import CreateCafe     from './pages/admin/CreateCafe.jsx';
import CafeDetail     from './pages/admin/CafeDetail.jsx';
import Promotions     from './pages/admin/Promotions.jsx';


// ── Customer App ──────────────────────────────────────────────
function CustomerApp() {
  return (
    <Routes>
      <Route path="/"                     element={<Home />} />
      <Route path="/favorites"            element={<Favorites />} />
      <Route path="/cafe/:cafeId/menu"    element={<CafeMenu />} />
      <Route path="/cafe/:cafeId/orders"  element={<Orders />} />
      <Route path="/cafe/:cafeId/cart"    element={<Cart />} />
      <Route path="/cafe/:cafeId/deposit" element={<Deposit />} />
      <Route path="/cafe/:cafeId/profile" element={<Profile />} />
      <Route path="/cafe/:cafeId/credit"  element={<CreditApply />} />
      <Route path="*"                     element={<Navigate to="/" />} />
    </Routes>
  );
}

// ── Cafe Owner App ────────────────────────────────────────────
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

// ── Admin App ─────────────────────────────────────────────────
function AdminApp() {
  return (
    <Routes>
      <Route path="/admin"               element={<AdminDashboard />} />
      <Route path="/admin/create"        element={<CreateCafe />} />
      <Route path="/admin/cafe/:cafeId"  element={<CafeDetail />} />
      <Route path="/admin/promotions"    element={<Promotions />} />
      <Route path="*"                    element={<Navigate to="/admin" />} />
    </Routes>
  );
}

// ── Main Entry ────────────────────────────────────────────────
function AppEntry() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const setAuth = useStore(s => s.setAuth);
  const role    = useStore(s => s.role);

  useEffect(() => {
    telegram.init();
    async function boot() {
      try {
        const user   = telegram.getUser();
        const phone  = user?.phone_number || null;
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
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: 'var(--red)', textAlign: 'center', padding: '0 32px', fontSize: 14 }}>
          {error}
        </div>
      </div>
    );
  }

  if (role === 'admin')      return <AdminApp />;
  if (role === 'cafe_owner') return <CafeOwnerApp />;
  return <CustomerApp />;
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppEntry />
    </BrowserRouter>
  );
}
