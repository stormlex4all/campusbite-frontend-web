import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../api/ApiError';

/**
 * Accessible form state (Feature 12).
 *
 *  - Client rules run on submit (and per field on blur once touched); the server is still the authority:
 *    its field errors are mapped back onto the same fields.
 *  - After a failed submit `summaryRef` should be focused so screen-reader users hear what went wrong.
 *  - Errors that belong to no visible field (e.g. "wrong password") appear in `formError`.
 *
 * @param {object} opts
 *   initialValues
 *   validate(values) -> { field: message }
 *   onSubmit(values)  async; may throw ApiError
 *   mapServerField(name) -> form field name (e.g. 'store.storeName' -> 'storeName'); return null to drop
 *   fieldOrder  optional array to order the summary
 */
export default function useForm({ initialValues, validate, onSubmit, mapServerField = (f) => f, fieldOrder }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const summaryRef = useRef(null);

  const setValue = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    // typing fixes an error: clear that field's message right away
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }, []);

  const handleChange = useCallback(
    (event) => {
      const { name, type, checked, value } = event.target;
      setValue(name, type === 'checkbox' ? checked : value);
    },
    [setValue],
  );

  const handleBlur = useCallback(
    (event) => {
      if (submitCount === 0) return;
      const { name } = event.target;
      const found = validate ? validate(values)[name] : undefined;
      setErrors((e) => ({ ...e, [name]: found }));
    },
    [submitCount, validate, values],
  );

  const reset = useCallback(
    (next = initialValues) => {
      setValues(next);
      setErrors({});
      setFormError('');
      setSubmitCount(0);
    },
    [initialValues],
  );

  const handleSubmit = useCallback(
    async (event) => {
      event?.preventDefault();
      if (submitting) return;
      setSubmitCount((n) => n + 1);
      setFormError('');
      const clientErrors = validate ? validate(values) : {};
      if (Object.keys(clientErrors).length) {
        setErrors(clientErrors);
        return;
      }
      setErrors({});
      setSubmitting(true);
      try {
        await onSubmit(values);
      } catch (err) {
        if (err instanceof ApiError && err.isValidation) {
          const mapped = {};
          const leftovers = [];
          for (const d of err.details) {
            const field = mapServerField(d.field);
            if (field && field in values) mapped[field] = mapped[field] || d.message;
            else leftovers.push(d.message);
          }
          setErrors(mapped);
          if (leftovers.length || !Object.keys(mapped).length) setFormError(leftovers.join(' ') || err.message);
        } else if (err instanceof ApiError) {
          setFormError(err.message);
        } else {
          setFormError('Something went wrong. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [onSubmit, mapServerField, submitting, validate, values],
  );

  const activeErrors = Object.entries(errors).filter(([, m]) => m);
  const ordered = fieldOrder
    ? [...activeErrors].sort((a, b) => fieldOrder.indexOf(a[0]) - fieldOrder.indexOf(b[0]))
    : activeErrors;
  const summary = ordered.map(([field, message]) => ({ field, message }));

  /** Props for <TextField/> etc. */
  const field = (name) => ({
    name,
    value: values[name] ?? '',
    onChange: handleChange,
    onBlur: handleBlur,
    error: errors[name] || '',
  });

  return {
    values,
    setValues,
    setValue,
    errors,
    setErrors,
    summary,
    formError,
    setFormError,
    submitting,
    submitCount,
    summaryRef,
    handleSubmit,
    handleChange,
    reset,
    field,
  };
}
