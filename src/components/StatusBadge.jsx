const LABELS = { active: 'Active', pending: 'Pending approval', suspended: 'Suspended' };
const ICONS = { active: '●', pending: '◐', suspended: '■' };

/** Status is shown with text and a shape, not colour alone. */
export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span aria-hidden="true">{ICONS[status] || '•'} </span>
      {LABELS[status] || status}
    </span>
  );
}

export function RoleBadge({ role }) {
  return <span className="badge badge-role">{role[0].toUpperCase() + role.slice(1)}</span>;
}
