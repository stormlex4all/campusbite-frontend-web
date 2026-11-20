import { useId } from 'react';

/**
 * Accessible form controls (Feature 12).
 * Every control has a visible <label>, optional hint text, and an error message that is linked with
 * aria-describedby, flagged with aria-invalid, and never relies on colour alone (icon + text).
 */
function FieldShell({ id, label, hint, error, required, children, className = '' }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      <label htmlFor={id}>
        {label}
        {required ? <span className="req"> (required)</span> : null}
      </label>
      {hint && (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
      {children({ describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined })}
      {error && (
        <p className="field-error" id={errorId}>
          <span aria-hidden="true">✕ </span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function TextField({ label, hint, error, required, type = 'text', id, className, ...rest }) {
  const auto = useId();
  const fid = id || `f-${auto}`;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} className={className}>
      {({ describedBy }) => (
        <input id={fid} type={type} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} aria-required={required || undefined} {...rest} />
      )}
    </FieldShell>
  );
}

export function TextAreaField({ label, hint, error, required, id, rows = 3, className, ...rest }) {
  const auto = useId();
  const fid = id || `f-${auto}`;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} className={className}>
      {({ describedBy }) => (
        <textarea id={fid} rows={rows} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} aria-required={required || undefined} {...rest} />
      )}
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, required, id, options, className, ...rest }) {
  const auto = useId();
  const fid = id || `f-${auto}`;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} className={className}>
      {({ describedBy }) => (
        <select id={fid} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
