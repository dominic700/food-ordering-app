import { useNavigate } from 'react-router-dom';
import telegram from '../telegram.js';
import { LuStore, LuImage, LuPlus } from 'react-icons/lu';
import { FiBarChart2 } from 'react-icons/fi';

export default function AdminBottomNav({ active, totalOrdersToday = 0 }) {
  const navigate = useNavigate();

  function go(path) {
    telegram.haptic();
    navigate(path);
  }

  const btnStyle = (key) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    padding: '4px 8px',
  });

  const iconStyle = (key) => ({
    display: 'flex',
    color: active === key ? 'var(--red)' : 'var(--text2)',
  });

  const labelStyle = (key) => ({
    fontSize: 11,
    fontWeight: 600,
    color: active === key ? 'var(--red)' : 'var(--text2)',
  });

  const ICON_SIZE = 22;

  return (
    <div className="bottom-nav" style={{ justifyContent: 'space-around' }}>

      {/* Cafes */}
      <button style={btnStyle('cafes')} onClick={() => go('/admin')}>
        <span style={iconStyle('cafes')}><LuStore size={ICON_SIZE} /></span>
        <span style={labelStyle('cafes')}>Cafes</span>
      </button>

      {/* New Cafe — big red circle center */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <button
          onClick={() => go('/admin/create')}
          style={{
            width: 52, height: 52,
            background: active === 'create' ? '#c0000a' : 'var(--red)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            border: 'none', cursor: 'pointer',
            marginTop: -16,
            boxShadow: '0 4px 14px rgba(230,57,70,0.4)',
          }}
        >
          <LuPlus size={26} />
        </button>
        <span style={{ fontSize: 11, fontWeight: 600, color: active === 'create' ? 'var(--red)' : 'var(--text2)' }}>
          New Cafe
        </span>
      </div>

      {/* Promotions */}
      <button style={btnStyle('promotions')} onClick={() => go('/admin/promotions')}>
        <span style={iconStyle('promotions')}><LuImage size={ICON_SIZE} /></span>
        <span style={labelStyle('promotions')}>Promos</span>
      </button>

      {/* Orders Today */}
      <button style={btnStyle('orders')} onClick={() => go('/admin/orders')} >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <span style={iconStyle('orders')}><FiBarChart2 size={ICON_SIZE} /></span>
          {totalOrdersToday > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -8,
              background: 'var(--red)', color: '#fff',
              fontSize: 9, fontWeight: 800,
              borderRadius: 10, padding: '1px 4px',
              lineHeight: 1.4,
            }}>
              {totalOrdersToday}
            </span>
          )}
        </div>
        <span style={labelStyle('orders')}>Orders</span>
      </button>

    </div>
  );
}
