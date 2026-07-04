import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getMenuAll, updateMenuItem, deleteMenuItem } from '../../api/menu.js';
import BottomNav from '../../components/BottomNav.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';
import useLanguage from '../../hooks/useLanguage.js';

// ── Edit Item popup form state ──────────────────────────────────
const EMPTY_EDIT_FORM = { name: '', description: '', price: '', discount_percent: '0', category_id: '', is_available: true };

export default function MenuEditor() {
  const navigate = useNavigate();
  const { t }     = useLanguage();
  const account  = useStore(s => s.account);
  const cafeId   = account?.cafe_id;

  const FILTER_LABELS = {
    all: t('allItems'),
    available: t('available'),
    unavailable: t('unavailable'),
  };

  const [menu, setMenu]       = useState({ categories: [], items: [], service_fee: 0 });
  const [filter, setFilter]   = useState('all'); // 'all' | 'available' | 'unavailable'
  const [loading, setLoading] = useState(true);

  // Edit item popup ("upper bile" sheet) — NOT used for adding,
  // adding new food has its own dedicated page (AddFood.jsx)
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm]               = useState(EMPTY_EDIT_FORM);
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    if (!cafeId) return;
    try {
      const menuData = await getMenuAll(cafeId);
      setMenu(menuData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => { load(); }, [load]);

  function openEdit(item) {
    setEditingItem(item);
    setForm({
      name:             item.name,
      description:      item.description || '',
      price:            item.price?.toString() || '',
      discount_percent: item.discount_percent?.toString() || '0',
      category_id:      item.category_id || '',
      is_available:     item.is_available,
    });
  }

  function closeEdit() {
    setEditingItem(null);
    setForm(EMPTY_EDIT_FORM);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) return telegram.alert(t('nameAndPriceRequired'));
    setSaving(true);
    try {
      await updateMenuItem(editingItem.id, {
        name:             form.name.trim(),
        description:      form.description.trim(),
        price:            parseFloat(form.price),
        discount_percent: parseFloat(form.discount_percent || 0),
        category_id:      form.category_id || null,
        is_available:     form.is_available,
      });
      telegram.haptic('success');
      closeEdit();
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    try {
      await deleteMenuItem(item.id);
      telegram.haptic();
      closeEdit();
      await load();
    } catch (err) {
      telegram.alert(err.message);
    }
  }

  async function handleToggleAvailable(item) {
    try {
      await updateMenuItem(item.id, { is_available: !item.is_available });
      await load();
    } catch (err) {
      telegram.alert(err.message);
    }
  }

  const filtered = menu.items.filter(item => {
    if (filter === 'available')   return item.is_available;
    if (filter === 'unavailable') return !item.is_available;
    return true;
  });

  if (loading) return <Spinner fullPage label={t('loadingMenu')} />;

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div className="header">
        <button className="header-icon">☰</button>
        <div className="header-title">{t('menuManagement')}</div>
        <NotificationBell to="/cafe-home/notifications" />
      </div>

      {/* Filter tabs — upper sliding nav: Available / Unavailable / Add New */}
      <div className="upper-tabs">
        {['all', 'available', 'unavailable'].map(f => (
          <button
            key={f}
            className={`upper-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
        <button
          className="upper-tab"
          style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }}
          onClick={() => navigate('/cafe-home/menu/add')}
        >
          {t('addNewFood')}
        </button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🍽️</div>
            <div className="empty-title">{t('noMenuItems')}</div>
            <div className="empty-desc">{t('noMenuDesc')}</div>
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              className="card"
              style={{ marginBottom: 10, padding: 14, cursor: 'pointer' }}
              onClick={() => openEdit(item)}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 64, height: 64, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🍽️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
                    <span style={{
                      background: item.is_available ? '#e8f5e9' : '#ffeaea',
                      color: item.is_available ? '#22c55e' : 'var(--red)',
                      borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '2px 8px', flexShrink: 0, marginLeft: 8
                    }}>
                      {item.is_available ? t('available') : t('unavailable')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                    {parseFloat(item.price).toFixed(0)} {t('etb')}
                    {parseFloat(item.discount_percent || 0) > 0 && (
                      <span style={{ fontSize: 11, color: '#22c55e', marginLeft: 6 }}>({item.discount_percent}% {t('percentOff')})</span>
                    )}
                  </div>
                  {item.description && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{item.description}</div>}
                </div>
                <div style={{ color: 'var(--text3)', fontSize: 16 }}>›</div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                <button
                  className="btn btn-sm"
                  style={{ flex: 1, background: item.is_available ? '#fff3e0' : '#e8f5e9', color: item.is_available ? '#f97316' : '#22c55e', border: '1.5px solid currentColor' }}
                  onClick={() => handleToggleAvailable(item)}
                >
                  {item.is_available ? t('markUnavailable') : t('markAvailable')}
                </button>
                <button className="btn btn-sm" style={{ flex: 1, background: '#ffeaea', color: 'var(--red)', border: '1.5px solid var(--red)' }} onClick={() => handleDelete(item)}>
                  {t('delete')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav variant="cafe-owner" active="menu" />

      {/* ── Edit item popup ("upper bile") ─────────────────────── */}
      {editingItem && (
        <div className="overlay" onClick={closeEdit}>
          <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
            <div className="sheet-handle" />
            <div className="sheet-title">{t('editItem')}</div>

            <div className="input-group">
              <label className="input-label">{t('itemName')}</label>
              <input className="input" style={{ paddingLeft: 14 }} placeholder="e.g. Burger Classic" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">{t('description')}</label>
              <input className="input" style={{ paddingLeft: 14 }} placeholder="Ingredients or short description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">{t('basePrice')}</label>
                <input className="input" style={{ paddingLeft: 14, fontWeight: 700 }} type="number" min="0" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">{t('discountPct')}</label>
                <input className="input" style={{ paddingLeft: 14, fontWeight: 700 }} type="number" min="0" max="100" placeholder="0" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: -8, marginBottom: 14 }}>
              {t('discountNote')}
            </div>

            <div className="input-group">
              <label className="input-label">{t('category')}</label>
              <select className="input" style={{ paddingLeft: 14 }} value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">{t('noCategory')}</option>
                {menu.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <label style={{ fontWeight: 600, fontSize: 14 }}>{t('availableLabel')}</label>
              <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} style={{ width: 18, height: 18, accentColor: 'var(--red)' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => handleDelete(editingItem)}>
                {t('delete')}
              </button>
              <button className="btn btn-red" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
                {saving ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
