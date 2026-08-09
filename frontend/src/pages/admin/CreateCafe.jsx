import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCafe, uploadCafeLogo } from '../../api/admin.js';
import AdminBottomNav from '../../components/AdminBottomNav.jsx';
import telegram from '../../telegram.js';
import LangToggle from '../../components/LangToggle.jsx';
import useLanguage from '../../hooks/useLanguage.js';

const EMPTY = {
  name: '',
  address: '',
  phone: '',
  description: '',
  service_fee: '',
  owner_telegram_id: '',
  owner_name: '',
  owner_phone: '',
  cbe_account_name: '',
  cbe_account_number: '',
  telebirr_name: '',
  telebirr_phone: '',
};

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

function getImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}

export default function CreateCafe() {
  const navigate = useNavigate();
  const { t }     = useLanguage();
  const [form, setForm] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleLogoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      telegram.alert(t('imageSizeLimit'));
      return;
    }
    setUploadingLogo(true);
    try {
      const { image_url } = await uploadCafeLogo(file);
      set('logo_url', image_url);
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  }

  async function handleCreate() {
    if (!form.name.trim())              return telegram.alert(t('cafeNameRequired'));
    if (!form.owner_telegram_id.trim()) return telegram.alert(t('ownerTgIdRequired'));
    if (!form.service_fee)              return telegram.alert(t('serviceFeeRequired'));

    setSaving(true);
    try {
      await createCafe({
        name:               form.name.trim(),
        address:            form.address.trim(),
        phone:              form.phone.trim(),
        description:        form.description.trim(),
        service_fee:        parseFloat(form.service_fee) || 0,
        owner_telegram_id:  form.owner_telegram_id.trim(),
        owner_name:         form.owner_name.trim(),
        owner_phone:        form.owner_phone.trim(),
        cbe_account_name:   form.cbe_account_name.trim(),
        cbe_account_number: form.cbe_account_number.trim(),
        telebirr_name:      form.telebirr_name.trim(),
        telebirr_phone:     form.telebirr_phone.trim(),
      });
      telegram.haptic('success');
      telegram.alert(t('cafeCreatedSuccess'));
      navigate('/admin');
    } catch (err) {
      telegram.alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const previewInitials = form.name
    ? form.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="header-icon" onClick={() => navigate('/admin')}>‹</button>
        <div className="header-title">{t('createNewCafe')}</div>
        <LangToggle />
      </div>

      <div style={{ padding: '20px 16px 120px' }}>

        {/* Cafe Name */}
        <div className="input-group">
          <label className="input-label">{t('cafeNameLabel')}</label>
          <div className="input-wrap">
            <span className="input-icon">🏪</span>
            <input className="input" placeholder={t('cafeNamePlaceholder')} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
        </div>

        {/* Location */}
        <div className="input-group">
          <label className="input-label">{t('locationLabel')}</label>
          <div className="input-wrap">
            <span className="input-icon">📍</span>
            <input className="input" placeholder={t('locationPlaceholder')} value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
        </div>

        {/* Phone */}
        <div className="input-group">
          <label className="input-label">{t('cafePhoneOptional')}</label>
          <div className="input-wrap">
            <span className="input-icon">📞</span>
            <input className="input" placeholder="+251 9XX XXX XXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>

        {/* Service Fee */}
        <div className="input-group">
          <label className="input-label">{t('serviceFeePerItem')}</label>
          <div className="input-wrap">
            <span className="input-icon">💰</span>
            <input
              className="input"
              type="number" min="0" placeholder="e.g. 10"
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              value={form.service_fee}
              onChange={e => set('service_fee', e.target.value)}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
            {t('serviceFeeHint')}
          </div>
        </div>

        {/* Description */}
        <div className="input-group">
          <label className="input-label">{t('descriptionOptional')}</label>
          <div className="input-wrap">
            <span className="input-icon">📝</span>
            <input className="input" placeholder={t('descriptionPlaceholder')} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        <div className="divider" style={{ margin: '20px 0' }} />
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('cafeOwnerDetails')}</div>

        {/* Owner Telegram ID (Username field in design) */}
        <div className="input-group">
          <label className="input-label">{t('ownerTelegramId')}</label>
          <div className="input-wrap">
            <span className="input-icon">👤</span>
            <input
              className="input"
              placeholder={t('ownerTelegramIdPlaceholder')}
              value={form.owner_telegram_id}
              onChange={e => set('owner_telegram_id', e.target.value)}
              type="number"
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
            {t('ownerTelegramIdHint')}
          </div>
        </div>

        {/* Owner Name (Password field in design — repurposed) */}
        <div className="input-group">
          <label className="input-label">{t('ownerNameLabel')}</label>
          <div className="input-wrap">
            <span className="input-icon">🏷️</span>
            <input
              className="input"
              placeholder={t('ownerNamePlaceholder')}
              value={form.owner_name}
              onChange={e => set('owner_name', e.target.value)}
            />
          </div>
        </div>

        {/* Owner Phone */}
        <div className="input-group">
          <label className="input-label">{t('ownerPhoneLabel')}</label>
          <div className="input-wrap">
            <span className="input-icon">📞</span>
            <input
              className="input"
              placeholder="+251 9XX XXX XXX"
              value={form.owner_phone}
              onChange={e => set('owner_phone', e.target.value)}
            />
          </div>
        </div>

        <div className="divider" style={{ margin: '20px 0' }} />
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>💳 Payment Account Info</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
          These details will be shown to customers when they choose Telebirr or CBE Birr as payment method.
        </div>

        {/* CBE */}
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>🏦 CBE Birr Account</div>
        <div className="input-group">
          <label className="input-label">Account Holder Name</label>
          <div className="input-wrap">
            <span className="input-icon">👤</span>
            <input className="input" placeholder="Full name on CBE account" value={form.cbe_account_name} onChange={e => set('cbe_account_name', e.target.value)} />
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">CBE Account Number</label>
          <div className="input-wrap">
            <span className="input-icon">🔢</span>
            <input className="input" placeholder="e.g. 1000123456789" value={form.cbe_account_number} onChange={e => set('cbe_account_number', e.target.value)} />
          </div>
        </div>

        {/* Telebirr */}
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text2)', marginBottom: 8, marginTop: 8 }}>📱 Telebirr Account</div>
        <div className="input-group">
          <label className="input-label">Full Name</label>
          <div className="input-wrap">
            <span className="input-icon">👤</span>
            <input className="input" placeholder="Full name on Telebirr" value={form.telebirr_name} onChange={e => set('telebirr_name', e.target.value)} />
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Telebirr Phone Number</label>
          <div className="input-wrap">
            <span className="input-icon">📱</span>
            <input className="input" placeholder="+251 9XX XXX XXX" value={form.telebirr_phone} onChange={e => set('telebirr_phone', e.target.value)} />
          </div>
        </div>

        <div className="divider" style={{ margin: '20px 0' }} />

        {/* Cafe Picture — click to upload, or paste a URL below */}
        <div className="input-group">
          <label className="input-label">{t('cafePictureOptional')}</label>
          <div
            onClick={() => !uploadingLogo && fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border)', borderRadius: 12,
              padding: '24px 16px', textAlign: 'center', marginBottom: 12,
              cursor: uploadingLogo ? 'default' : 'pointer', background: 'var(--bg)',
            }}
          >
            {uploadingLogo ? (
              <div className="spinner" style={{ margin: '0 auto' }} />
            ) : form.logo_url ? (
              <>
                <img
                  src={getImageUrl(form.logo_url)}
                  alt="Cafe logo"
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }}
                />
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{t('changeImage')}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, color: 'var(--red)', marginBottom: 8 }}>☁️</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{t('uploadCafePicture')}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{t('imageFormatHintPng')}</div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleLogoFile}
          />
          <input
            className="input"
            style={{ paddingLeft: 14 }}
            placeholder={t('pasteImageUrl')}
            value={form.logo_url || ''}
            onChange={e => set('logo_url', e.target.value)}
          />
        </div>

        {/* Preview */}
        {form.name && (
          <>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('previewLabel')}</div>
            <div style={{
              borderRadius: 16, overflow: 'hidden', marginBottom: 20,
              border: '1.5px solid var(--border)',
            }}>
              {form.logo_url ? (
                <img src={getImageUrl(form.logo_url)} alt="Preview" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} onError={e => e.target.style.display = 'none'} />
              ) : (
                <div style={{
                  height: 180, background: `linear-gradient(135deg, #1a1a1a, #333)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 64, fontWeight: 900, color: '#fff', letterSpacing: 2,
                }}>
                  {previewInitials}
                </div>
              )}
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{form.name}</div>
                {form.address && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>📍 {form.address}</div>}
                {form.service_fee && <div style={{ fontSize: 13, color: 'var(--red)', marginTop: 4 }}>{t('serviceFeePreview')}: {form.service_fee} {t('etb')}{t('perItemSuffix')}</div>}
              </div>
            </div>
          </>
        )}

        {/* Create button */}
        <button className="btn btn-red" style={{ borderRadius: 12, fontSize: 16, fontWeight: 700 }} onClick={handleCreate} disabled={saving}>
          {saving ? t('creatingBtn') : t('createCafeBtn')}
        </button>
      </div>

      <AdminBottomNav active="create" />
    </div>
  );
}
