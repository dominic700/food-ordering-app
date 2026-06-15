// Maps a status string (from orders, deposits, registrations,
// credit applications, etc.) to one of the badge styles in index.css.
const STATUS_MAP = {
  pending:   { label: 'Pending',     className: 'badge-pending' },
  approved:  { label: 'Approved',    className: 'badge-approved' },
  verified:  { label: 'Verified',    className: 'badge-approved' },
  preparing: { label: 'Preparing',   className: 'badge-preparing' },
  delivery:  { label: 'On Delivery', className: 'badge-delivery' },
  delivered: { label: 'Delivered',   className: 'badge-delivered' },
  cancelled: { label: 'Cancelled',   className: 'badge-cancelled' },
  rejected:  { label: 'Rejected',    className: 'badge-cancelled' },
  failed:    { label: 'Failed',      className: 'badge-cancelled' },
  suspended: { label: 'Suspended',   className: 'badge-cancelled' },
};

export default function StatusBadge({ status, label }) {
  const info = STATUS_MAP[status] || { label: status, className: 'badge-pending' };
  return <span className={`badge ${info.className}`}>{label || info.label}</span>;
}
