import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/PageHeader';
import QueryState from '../../components/QueryState';
import Pagination from '../../components/Pagination';
import { SelectField } from '../../components/fields';
import { ACTION_LABELS, formatDateTime } from '../../utils';

const ACTION_OPTIONS = [{ value: '', label: 'All actions' }, ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))];

const detailText = (log) => {
  const d = log.details || {};
  if (d.reason) return `Reason: ${d.reason}`;
  if (d.storeName) return `Store: ${d.storeName}`;
  if (d.restoredStatus) return `Restored to: ${d.restoredStatus}`;
  return '';
};

export default function AuditLogPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => adminApi.auditLogs({ action, page, limit: 20 }), [action, page]);
  const logs = data?.data || [];

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every administrator action, newest first." />
      <form className="filters" onSubmit={(e) => e.preventDefault()} aria-label="Filter audit log">
        <SelectField
          label="Action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          options={ACTION_OPTIONS}
        />
      </form>
      <QueryState loading={loading} error={error} onRetry={reload} empty={!logs.length} emptyMessage="No activity recorded yet." loadingLabel="Loading audit log">
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Audit log</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Action</th>
                <th scope="col">By</th>
                <th scope="col">Account</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{formatDateTime(l.createdAt)}</td>
                  <th scope="row">{ACTION_LABELS[l.action] || l.action}</th>
                  <td>{l.actor?.name}</td>
                  <td>{l.target?.id ? <Link to={`/admin/users/${l.target.id}`}>{l.target.name || l.target.email}</Link> : ''}</td>
                  <td>{detailText(l)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={data?.meta} onPage={setPage} />
      </QueryState>
    </>
  );
}
