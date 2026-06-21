import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore.js';
import { getMenuAll, addMenuItem, addCategory, deleteCategory } from '../../api/menu.js';
import NotificationBell from '../../components/NotificationBell.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

const EMPTY_FORM = { name: '', description: '', price: '', discount_percent: '0', category_id: '', is_available: true };

// Its own dedicated page (not a popup) with its own top tabs:
// "Add Food" | "Add Category" — matching the request that adding
// new food/category should live on its own page with its own
// upper nav, separate from the Edit popup in MenuEditor.jsx.
export default function AddFood() {
  const navigate = useNavigate();
  const account  = useStore(s => s.account);
  const cafeId   = account?.cafe_id;

  const [tab, setTab]             = useState('food'); // 'food' | 'category'
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);

  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [savingCat, setSavingCat]   = useState(false);

  const load = useCallback(async () => {
    if (!cafeId) return;
    try {
      const data = await getMenuAll(cafeId);
      setCategories(data.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveFood() {
    if (!form.name.trim() || !form.price) return telegram.alert('Name and price are required.');
    setSaving(true);
    try {
      await addMenuItem({
        name:             form.name.trim(),
        description:      form.description.trim(),
        price:            parseFloat(form.price),
        discount_percent: parseFloat(form.discount_percent || 0),
        category_id:      form.category_id || null,
        is_available:     form.is_available,
      });
      telegram.haptic('success');
      telegram.alert(`"${form.name}" added to the menu!`);
      setForm(EMPTY_FORM);
      navigate('/cafe-home/menu');
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      await addCategory(newCatName.trim());
      telegram.haptic('success');
      setNewCatName('');
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSavingCat(false);
    }
  }

  async function handleDeleteCategory(id) {
    try {
      await deleteCategory(id);
      telegram.haptic();
      await load();
    } catch (err) {
      telegram.alert(err.message);
    }
  }

  if (loading) return <Spinner fullPage label="Loading..." />;

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/cafe-home/menu')}>‹</button>
        <div className="header-title">Add to Menu</div>
        <NotificationBell to="/cafe-home/notifications" />
      </div>

      {/* Upper sliding tab nav: Add Food / Add Category */}
      <div className="upper-tabs">
        <button className={`upper-tab ${tab === 'food' ? 'active' : ''}`} onClick={() => setTab('food')}>
          🍽️ Add Food
        </button>
        <button className={`upper-tab ${tab === 'category' ? 'active' : ''}`} onClick={() => setTab('category')}>
          📁 Add Category
        </button>
      </div>

      <div style={{ padding: '16px 16px 40px' }}>

        {tab === 'food' && (
          <>
            <div className="input-group">
              <label className="input-label">Item Name *</label>
              <input
                className="input" style={{ paddingLeft: 14 }}
                placeholder="e.g. Burger Classic"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <input
                className="input" style={{ paddingLeft: 14 }}
                placeholder="Ingredients or short description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Base Price (ETB) *</label>
                <input
                  className="input" style={{ paddingLeft: 14, fontWeight: 700 }}
                  type="number" min="0" placeholder="0.00"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Discount %</label>
                <input
                  className="input" style={{ paddingLeft: 14, fontWeight: 700 }}
                  type="number" min="0" max="100" placeholder="0"
                  value={form.discount_percent}
                  onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: -8, marginBottom: 14 }}>
              This discount only applies when customers pay with wallet balance or credit. Cash and Transfer always pay full price.
            </div>

            <div className="input-group">
              <label className="input-label">Category</label>
              <select
                className="input" style={{ paddingLeft: 14 }}
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              >
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {categories.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
                  No categories yet — switch to "Add Category" tab to create one.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <label style={{ fontWeight: 600, fontSize: 14 }}>Available immediately</label>
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: 'var(--red)' }}
              />
            </div>

            <button className="btn btn-red" onClick={handleSaveFood} disabled={saving}>
              {saving ? 'Adding...' : '⊕ Add to Menu'}
            </button>
          </>
        )}

        {tab === 'category' && (
          <>
            <div className="input-group">
              <label className="input-label">Category Name</label>
              <input
                className="input" style={{ paddingLeft: 14 }}
                placeholder="e.g. Burgers, Drinks, Desserts..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
            </div>
            <button className="btn btn-red" onClick={handleAddCategory} disabled={savingCat} style={{ marginBottom: 24 }}>
              {savingCat ? 'Adding...' : '⊕ Add Category'}
            </button>

            <div className="section-label" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
              Existing Categories
            </div>
            {categories.length === 0 ? (
              <div className="empty" style={{ padding: '24px 0' }}>
                <div className="empty-icon">📁</div>
                <div className="empty-title">No categories yet</div>
              </div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                {categories.map((c, i) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: i < categories.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => handleDeleteCategory(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
