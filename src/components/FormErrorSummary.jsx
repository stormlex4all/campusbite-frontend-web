import { useEffect, useRef } from 'react';

/**
 * Shown above a form after a failed submit. It takes focus so screen readers announce it, lists every
 * problem, and each item jumps to the field that needs fixing. `formError` is for problems that do not
 * belong to a single field (for example "Incorrect email or password").
 */
export default function FormErrorSummary({ summaryRef, summary, formError, submitCount, fieldIdFor }) {
  const hasProblems = summary.length > 0 || Boolean(formError);

  // Move focus to the summary once per submit attempt. It must NOT refocus when an error disappears
  // while the user is typing in a field, or focus would be pulled out of the input.
  const focusedFor = useRef(0);
  useEffect(() => {
    if (submitCount > 0 && hasProblems && focusedFor.current !== submitCount) {
      focusedFor.current = submitCount;
      summaryRef.current?.focus();
    }
  }, [submitCount, hasProblems, summaryRef]);

  if (!hasProblems) return null;

  const jump = (field) => (event) => {
    const target = document.querySelector(`[name="${field}"]`) || document.getElementById(fieldIdFor?.(field) || field);
    if (target) {
      event.preventDefault();
      target.focus();
    }
  };

  return (
    <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby="error-summary-title">
      <h2 id="error-summary-title">
        {summary.length > 1 ? `There are ${summary.length} problems to fix` : summary.length === 1 ? 'There is a problem to fix' : 'We could not complete that'}
      </h2>
      {formError && <p>{formError}</p>}
      {summary.length > 0 && (
        <ul>
          {summary.map(({ field, message }) => (
            <li key={field}>
              <a href={`#${field}`} onClick={jump(field)}>
                {message}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
