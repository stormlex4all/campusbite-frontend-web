/** tone: info | success | warning | error. Errors are announced immediately; the rest politely. */
export default function Alert({ tone = 'info', title, children, className = '' }) {
  const role = tone === 'error' ? 'alert' : 'status';
  const icon = { info: 'ℹ', success: '✓', warning: '!', error: '✕' }[tone];
  return (
    <div className={`alert alert-${tone} ${className}`} role={role}>
      <span className="alert-icon" aria-hidden="true">{icon}</span>
      <div>
        {title && <strong className="alert-title">{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}
