import { useEffect, useState, useCallback } from 'react';
import useStore from '../../store/useStore.js';
import { getMenuAll, addMenuItem, updateMenuItem, deleteMenuItem, addCategory } from '../../api/menu.js';
import { getCafeSettings } from '../../api/cafe.js';
import { request } from '../../api/auth.js';
import BottomNav from '../../components/BottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

const EMPTY_FORM = { name: '', description: '', price: '', discount_percent: '0', category_id: '', is_available: true };

export default function MenuEditor() {
  const account = useStore(s => s.account);
  const cafeId = account?.cafe_id;

  const [menu, setMenu] = useState({ categories: [], items: [], service_fee: 0 });
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'unavailable'
  const [loading, setLoading] = useState(true);

  // Add/Edit item sheet
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = adding
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Add category sheet
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Discount setting
  const [discountPercent, setDiscountPercent] = useState('0');
  const [savingDiscount, setSavingDiscount] = useState(false);

  const load = useCallback(async () => {
    if (!cafeId) return;
    try {
      const [menuData, settings] = await Promise.all([
        getMenuAll(cafeId),
        getCafeSettings(),
      ]);
      setMenu(menuData);
      // discountPercent here is from cafe settings if it exists
      // (future: per-item discount is already on each item)
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price?.toString() || '',
      discount_percent: item.discount_percent?.toString() || '0',
      category_id: item.category_id || '',
      is_available: item.is_available,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) return telegram.alert('Name and price are required.');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        discount_percent: parseFloat(form.discount_percent || 0),
        category_id: form.category_id || null,
        is_available: form.is_available,
      };
      if (editingItem) {
        await updateMenuItem(editingItem.id, payload);
      } else {
        await addMenuItem(payload);
      }
      telegram.haptic('success');
      setShowForm(false);
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    telegram.alert(`Delete "${item.name}"? This cannot be undone.`);
    // Telegram's native alert is just informational — proceed directly
    try {
      await deleteMenuItem(item.id);
      telegram.haptic();
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

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    try {
      await addCategory(newCatName.trim());
      setNewCatName('');
      setShowCatForm(false);
      await load();
    } catch (err) {
      telegram.alert(err.message);
    }
  }

  async function handleSaveDiscount() {
    const pct = parseFloat(discountPercent);
    if (isNaN(pct) || pct < 0 || pct > 100) return telegram.alert('Enter a valid percentage between 0 and 100.');
    setSavingDiscount(true);
    try {
      await request('PATCH', '/cafe/settings', { balance_discount_percent: pct });
      telegram.haptic('success');
      telegram.alert('Discount saved! It will apply to all wallet/credit orders.');
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSavingDiscount(false);
    }
  }

  const filtered = menu.items.filter(item => {
    if (filter === 'available')   return item.is_available;
    if (filter === 'unavailable') return !item.is_available;
    return true;
  });

  if (loading) return <Spinner fullPage label="Loading menu..." />;

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div className="header">
        <button className="header-icon">☰</button>
        <div className="header-title">Menu Management</div>
        <button className="header-icon" style={{ position: 'relative' }}>🔔</button>
      </div>

      {/* Filter tabs */}
      <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', gap: 8 }}>
        {['all', 'available', 'unavailable'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 16px', borderRadius: 20, fontFamily: 'var(--font)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: filter === f ? 'var(--red)' : 'transparent',
            color: filter === f ? '#fff' : 'var(--text)',
            border: filter === f ? 'none' : '1.5px solid var(--border)',
          }}>
            {f === 'all' ? 'All Items' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Discount setting card */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>💰 Balance Discount for Registered Accounts</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
            Set a percentage discount applied to orders paid with deposited wallet balance or credit. Transfer payments are excluded.
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                className="input"
                style={{ paddingLeft: 14, paddingRight: 36, fontWeight: 700, fontSize: 16 }}
                type="number" min="0" max="100" placeholder="0"
                value={discountPercent}
                onChange={e => setDiscountPercent(e.target.value)}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text2)' }}>%</span>
            </div>
            <button className="btn btn-red" style={{ width: 'auto', padding: '13px 20px', flexShrink: 0 }} onClick={handleSaveDiscount} disabled={savingDiscount}>
              {savingDiscount ? '...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Menu items */}
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🍽️</div>
            <div className="empty-title">No items yet</div>
            <div className="empty-desc">Tap "Add New Food" to get started</div>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
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
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                    {parseFloat(item.price).toFixed(0)} ETB
                    {parseFloat(item.discount_percent || 0) > 0 && (
                      <span style={{ fontSize: 11, color: '#22c55e', marginLeft: 6 }}>({item.discount_percent}% off)</span>
                    )}
                  </div>
                  {item.description && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{item.description}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(item)}>Edit</button>
                <button
                  className="btn btn-sm"
                  style={{ flex: 1, background: item.is_available ? '#fff3e0' : '#e8f5e9', color: item.is_available ? '#f97316' : '#22c55e', border: '1.5px solid currentColor' }}
                  onClick={() => handleToggleAvailable(item)}
                >
                  {item.is_available ? 'Mark Unavailable' : 'Mark Available'}
                </button>
                <button className="btn btn-sm" style={{ flex: 1, background: '#ffeaea', color: 'var(--red)', border: '1.5px solid var(--red)' }} onClick={() => handleDelete(item)}>Delete</button>
              </div>
            </div>
          ))
        )}

        {/* Add Category */}
        <button className="btn btn-outline" style={{ marginTop: 8, marginBottom: 8 }} onClick={() => setShowCatForm(true)}>
          + Add Category
        </button>
      </div>

      {/* Floating Add button */}
      <div style={{ position: 'fixed', bottom: 'calc(var(--nav-height) + 12px)', left: 16, right: 16, zIndex: 40 }}>
        <button className="btn btn-red" style={{ borderRadius: 30, fontSize: 15, fontWeight: 700 }} onClick={openAdd}>
          ⊕ Add New Food
        </button>
      </div>

      <BottomNav variant="cafe-owner" active="menu" />

      {/* Add / Edit item sheet */}
      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
            <div className="sheet-handle" />
            <div className="sheet-title">{editingItem ? 'Edit Item' : 'Add New Food'}</div>

            <div className="input-group">
              <label className="input-label">Item Name *</label>
              <input className="input" style={{ paddingLeft: 14 }} placeholder="e.g. Burger Classic" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <input className="input" style={{ paddingLeft: 14 }} placeholder="Ingredients or short description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Base Price (ETB) *</label>
                <input className="input" style={{ paddingLeft: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }} type="number" min="0" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Discount %</label>
                <input className="input" style={{ paddingLeft: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }} type="number" min="0" max="100" placeholder="0" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Category</label>
              <select className="input" style={{ paddingLeft: 14 }} value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">No category</option>
                {menu.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <label style={{ fontWeight: 600, fontSize: 14 }}>Available</label>
              <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} style={{ width: 18, height: 18, accentColor: 'var(--red)' }} />
            </div>

            <button className="btn btn-red" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </div>
      )}

      {/* Add category sheet */}
      {showCatForm && (
        <div className="overlay" onClick={() => setShowCatForm(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">Add Category</div>
            <div className="input-group">
              <label className="input-label">Category Name</label>
              <input className="input" style={{ paddingLeft: 14 }} placeholder="e.g. Burgers, Drinks..." value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus />
            </div>
            <button className="btn btn-red" onClick={handleAddCategory}>Add Category</button>
          </div>
        </div>
      )}
    </div>
  );
}
