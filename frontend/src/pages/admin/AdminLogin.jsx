import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, setAdminToken } from '../../api/auth.js';
import useStore from '../../store/useStore.js';
import LangToggle from '../../components/LangToggle.jsx';
import useLanguage from '../../hooks/useLanguage.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const setAuth = useStore(s => s.setAuth);
  const { t }    = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError(t('emailPasswordRequired'));
      return;
    }

    setLoading(true);
    try {
      const result = await adminLogin(email.trim(), password);
      setAdminToken(result.token);
      setAuth('admin', result.admin);
      navigate('/admin');
    } catch (err) {
      setError(err.message || t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🏢</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
          {t('adminTerminal')}
        </div>
        <div style={{ fontSize: 14, color: '#888' }}>
          {t('signInSubtitle')}
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
          <LangToggle />
        </div>
      </div>

      {/* Login card */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '28px 24px',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
          {t('signIn')}
        </div>

        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div className="input-group">
            <label className="input-label">{t('emailLabel')}</label>
            <div className="input-wrap">
              <span className="input-icon">✉️</span>
              <input
                className="input"
                type="email"
                placeholder="admin@foodapp.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="input-group">
            <label className="input-label">{t('passwordLabel')}</label>
            <div className="input-wrap" style={{ position: 'relative' }}>
              <span className="input-icon">🔒</span>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 16,
                  color: 'var(--text3)',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#ffeaea',
              color: 'var(--red)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            className="btn btn-red"
            type="submit"
            disabled={loading}
            style={{ borderRadius: 10, fontSize: 15, fontWeight: 700 }}
          >
            {loading ? t('signingIn') : t('signInArrow')}
          </button>

        </form>

        {/* Default credentials hint */}
        <div style={{
          marginTop: 20,
          padding: '12px 14px',
          background: 'var(--bg)',
          borderRadius: 10,
          fontSize: 12,
          color: 'var(--text2)',
          lineHeight: 1.6,
        }}>
          <strong>{t('defaultCredentials')}</strong><br />
          Email: admin@foodapp.com<br />
          Password: admin123<br />
          <span style={{ color: 'var(--red)' }}>
            {t('changeBeforeLive')}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: '#555' }}>
        {t('platformFooter')}
      </div>
    </div>
  );
}
