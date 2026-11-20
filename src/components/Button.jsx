import { Link } from 'react-router-dom';

/**
 * variant: primary | secondary | danger | ghost.
 * While `loading` the button stays focusable (aria-busy) but ignores clicks, so focus is not lost.
 */
export default function Button({ variant = 'primary', loading = false, loadingText, children, type = 'button', className = '', onClick, ...rest }) {
  return (
    <button type={type} className={`btn btn-${variant} ${className}`} aria-busy={loading || undefined} onClick={loading ? undefined : onClick} {...rest}>
      {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

export function LinkButton({ to, variant = 'secondary', children, className = '', ...rest }) {
  return (
    <Link to={to} className={`btn btn-${variant} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
