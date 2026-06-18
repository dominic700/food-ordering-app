import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPromotions, deletePromotion, uploadPromoImage } from '../../api/admin.js';
import AdminBottomNav from '../../components/AdminBottomNav.jsx';
import Spinner from '../../components/Spinner.jsx';
import telegram from '../../telegram.js';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

export default function Promotions() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      const data = await getPromotions();
      setPromos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      telegram.alert('Image must be smaller than 5MB.');
      return;
    }

    setSelectedFile(file);

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!selectedFile) return telegram.alert('Please select an image first.');
    setUploading(true);
    try {
      await uploadPromoImage(selectedFile, title);
      telegram.haptic('success');
      setSelectedFile(null);
      setPreview(null);
      setTitle('');
      setShowForm(false);
      await load();
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deletePromotion(id);
      telegram.haptic();
      await load();
    } catch (err) {
      telegram.alert(err.message);
    }
  }

  function getImageUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  }

  if (loading) return <Spinner fullPage label="Loading promotions..." />;

  return (
    <div className="page">
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/admin')}>‹</button>
        <div className="header-title">Promotions</div>
        <button className="header-icon" style={{ position: 'relative' }}>🔔</button>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {/* Info card */}
        <div className="card" style={{ marginBottom: 16, padding: 14, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
            📢 Upload up to 5 promo images. They will slide automatically every 10 seconds on the customer home screen.
          </div>
        </div>

        {/* Current promos */}
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div className="section-title" style={{ fontSize: 16 }}>
            Promo Images ({promos.length}/5)
          </div>
          {promos.length < 5 && (
            <button
              className="btn btn-red btn-sm"
              onClick={() => setShowForm(true)}
            >
              + Add Image
            </button>
          )}
        </div>

        {promos.length === 0 ? (
          <div className="empty" style={{ padding: '32px 0' }}>
            <div className="empty-icon">🖼️</div>
            <div className="empty-title">No promo images yet</div>
            <div className="empty-desc">Add images to show on the customer home screen</div>
            <button
              className="btn btn-red"
              style={{ maxWidth: 200, margin: '16px auto 0' }}
              onClick={() => setShowForm(true)}
            >
              + Add First Image
            </button>
          </div>
        ) : (
          promos.map((promo, i) => (
            <div key={promo.id} className="card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
              {/* Image preview */}
              <div style={{ height: 160, background: '#1a1a1a', position: 'relative' }}>
                {getImageUrl(promo.image_url) ? (
                  <img
                    src={getImageUrl(promo.image_url)}
                    alt={promo.title || `Promo ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                    🖼️
                  </div>
                )}
                {/* Slide number badge */}
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'var(--red)', color: '#fff',
                  borderRadius: 6, fontSize: 11, fontWeight: 800,
                  padding: '3px 8px',
                }}>
                  Slide {i + 1}
                </div>
              </div>

              {/* Info row */}
              <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{promo.title || `Promo ${i + 1}`}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Added {new Date(promo.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  style={{ background: '#ffeaea', color: 'var(--red)', border: '1.5px solid var(--red)', width: 'auto' }}
                  onClick={() => handleDelete(promo.id)}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AdminBottomNav active="promotions" />

      {/* Upload sheet */}
      {showForm && (
        <div className="overlay" onClick={() => { setShowForm(false); setPreview(null); setSelectedFile(null); setTitle(''); }}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">Add Promo Image</div>

            {/* File picker */}
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 12,
                padding: '24px 16px',
                textAlign: 'center',
                marginBottom: 14,
                cursor: 'pointer',
                background: preview ? '#000' : 'var(--bg)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 160,
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 }}
                />
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Tap to select image</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>JPG, PNG, WebP up to 5MB</div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {preview && (
              <button
                className="btn btn-outline btn-sm"
                style={{ marginBottom: 14 }}
                onClick={() => fileInputRef.current?.click()}
              >
                Change Image
              </button>
            )}

            <div className="input-group">
              <label className="input-label">Promo Title (optional)</label>
              <input
                className="input"
                style={{ paddingLeft: 14 }}
                placeholder="e.g. 50% OFF Burger Combo"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <button
              className="btn btn-red"
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
            >
              {uploading ? 'Uploading...' : '⬆️ Upload Image'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
