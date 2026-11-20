import { WEEKDAYS, capitalize, formatTime } from '../../utils';

/** Read-only weekly hours (a real table, so screen readers get row/column context). */
export function OpeningHoursList({ hours = [] }) {
  const byDay = Object.fromEntries(hours.map((h) => [h.day, h]));
  if (!hours.length) return <p className="muted">Opening hours have not been added yet.</p>;
  return (
    <table className="hours-table">
      <caption className="sr-only">Opening hours</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Hours</th>
        </tr>
      </thead>
      <tbody>
        {WEEKDAYS.map((day) => {
          const h = byDay[day];
          return (
            <tr key={day}>
              <th scope="row">{capitalize(day)}</th>
              <td>{!h ? <span className="muted">Not listed</span> : h.closed ? 'Closed' : `${formatTime(h.opens)} – ${formatTime(h.closes)}`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Editable week. `value` is { monday: {closed, opens, closes}, ... }. */
export function OpeningHoursEditor({ value, onChange, error }) {
  const update = (day, patch) => onChange({ ...value, [day]: { ...value[day], ...patch } });
  return (
    <fieldset className="hours-editor" id="hours" tabIndex={-1} aria-describedby={error ? 'hours-error' : undefined}>
      <legend>Opening hours</legend>
      <p className="hint">Leave a day empty if you do not want to list it. Use 24-hour times.</p>
      {WEEKDAYS.map((day) => {
        const row = value[day];
        return (
          <div className="hours-row" key={day}>
            <span className="hours-day" id={`hours-${day}`}>
              {capitalize(day)}
            </span>
            <label className="check">
              <input type="checkbox" checked={row.closed} onChange={(e) => update(day, { closed: e.target.checked })} aria-describedby={`hours-${day}`} />
              Closed
            </label>
            <label>
              <span className="sr-only">{capitalize(day)} opens</span>
              <input type="time" value={row.opens} disabled={row.closed} onChange={(e) => update(day, { opens: e.target.value })} aria-describedby={`hours-${day}`} />
            </label>
            <span aria-hidden="true">to</span>
            <label>
              <span className="sr-only">{capitalize(day)} closes</span>
              <input type="time" value={row.closes} disabled={row.closed} onChange={(e) => update(day, { closes: e.target.value })} aria-describedby={`hours-${day}`} />
            </label>
          </div>
        );
      })}
      {error && (
        <p className="field-error" id="hours-error">
          <span aria-hidden="true">✕ </span>
          {error}
        </p>
      )}
    </fieldset>
  );
}

export const emptyWeek = () => Object.fromEntries(WEEKDAYS.map((d) => [d, { closed: false, opens: '', closes: '' }]));

export function weekFromApi(hours = []) {
  const week = emptyWeek();
  hours.forEach((h) => {
    week[h.day] = { closed: Boolean(h.closed), opens: h.opens || '', closes: h.closes || '' };
  });
  return week;
}

/** Form value -> API array (only days that were filled in or marked closed). */
export function weekToApi(week) {
  return WEEKDAYS.filter((d) => week[d].closed || week[d].opens || week[d].closes).map((d) =>
    week[d].closed ? { day: d, closed: true } : { day: d, closed: false, opens: week[d].opens, closes: week[d].closes },
  );
}

/** First problem in the week, as a plain-language sentence, or ''. */
export function validateWeek(week) {
  for (const d of WEEKDAYS) {
    const r = week[d];
    if (r.closed) continue;
    if (!r.opens && !r.closes) continue;
    if (!r.opens || !r.closes) return `${capitalize(d)}: enter both an opening and a closing time, or mark the day as closed`;
    if (r.closes <= r.opens) return `${capitalize(d)}: closing time must be after opening time`;
  }
  return '';
}
