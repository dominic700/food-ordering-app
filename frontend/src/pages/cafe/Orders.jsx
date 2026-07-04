import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAccountHistory } from '../../api/customer.js';
import BottomNav from '../../components/BottomNav.jsx';
import OrderCard from '../../components/OrderCard.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';
import useLanguage from '../../hooks/useLanguage.js';
import { FiClock, FiCheckCircle, FiXCircle, FiShoppingBag, FiClipboard, FiPackage } from 'react-icons/fi';

export default function Orders() {
  const { cafeId } = useParams();
  const navigate = useNavigate();
  const { t }     = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  const TABS = [
    { key: 'active',    label: t('activeTab'),    icon: FiClock,       status: 'pending'   },
    { key: 'completed', label: t('completedTab'), icon: FiCheckCircle, status: 'approved'  },
    { key: 'cancelled', label: t('cancelled'),     icon: FiXCircle,     status: 'cancelled' },
  ];

  useEffect(() => {
    telegram.showBackButton(() => navigate(`/cafe/${cafeId}/menu`));
    return () => telegram.hideBackButton();
  }, []);

  useEffect(() => {
    getAccountHistory(cafeId)
      .then(data => setOrders(data.orders))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cafeId]);

  const activeTab = TABS.find(tb => tb.key === tab);
  const filtered = orders.filter(o => o.status === activeTab.status);
  const activeCount = orders.filter(o => o.status === 'pending').length;

  if (loading) return <Spinner fullPage label={t('loadingOrders')} />;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate(`/cafe/${cafeId}/menu`)}>‹</button>
        <div className="header-title">{t('ordersPage')}</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="tabs">
        {TABS.map(tb => (
          <button key={tb.key} className={`tab ${tab === tb.key ? 'active' : ''}`} onClick={() => setTab(tb.key)}>
            <tb.icon size={14} style={{ marginRight: 4, verticalAlign: -2 }} /> {tb.label}
          </button>
        ))}
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><FiShoppingBag size={20} /></div>
          <div>
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">{t('activeOrders')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiClipboard size={20} /></div>
          <div>
            <div className="stat-value">{orders.length}</div>
            <div className="stat-label">{t('totalOrders')}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><FiPackage size={40} /></div>
            <div className="empty-title">{t('noPrefix')} {activeTab.label.toLowerCase()} {t('ordersSuffixWord')}</div>
          </div>
        ) : (
          filtered.map(order => <OrderCard key={order.id} order={order} />)
        )}
      </div>

      <div style={{ height: 90 }} />
      <BottomNav variant="customer-cafe" cafeId={cafeId} active="orders" />
    </div>
  );
}
