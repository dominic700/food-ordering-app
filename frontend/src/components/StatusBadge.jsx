// Maps a status string (from orders, deposits, registrations,
// credit applications, etc.) to one of the badge styles in index.css.
// Labels come from translations.js so the badge follows the
// user's selected language automatically.
import useLanguage from '../hooks/useLanguage.js';

const STATUS_MAP = {
  pending:   { key: 'pending',   className: 'badge-pending' },
  approved:  { key: 'approved',  className: 'badge-approved' },
  verified:  { key: 'verified',  className: 'badge-approved' },
  preparing: { key: 'preparing', className: 'badge-preparing' },
  delivery:  { key: 'delivery',  className: 'badge-delivery' },
  delivered: { key: 'delivered', className: 'badge-delivered' },
  cancelled: { key: 'cancelled', className: 'badge-cancelled' },
  rejected:  { key: 'rejected',  className: 'badge-cancelled' },
  failed:    { key: 'failed',    className: 'badge-cancelled' },
  suspended: { key: 'suspended', className: 'badge-cancelled' },
};

export default function StatusBadge({ status, label }) {
  const { t } = useLanguage();
  const info = STATUS_MAP[status] || { key: null, className: 'badge-pending' };
  const text = label || (info.key ? t(info.key) : status);
  return <span className={`badge ${info.className}`}>{text}</span>;
}
