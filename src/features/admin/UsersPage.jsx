import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import PageHeader from '../../components/PageHeader';
import QueryState from '../../components/QueryState';
import Pagination from '../../components/Pagination';
import { SelectField } from '../../components/fields';
import StatusBadge, { RoleBadge } from '../../components/StatusBadge';
import { LinkButton } from '../../components/Button';
import { formatDateTime } from '../../utils';

const ROLE_OPTIONS = [{ value: '', label: 'All roles' }, { value: 'student', label: 'Students' }, { value: 'vendor', label: 'Vendors' }, { value: 'admin', label: 'Administrators' }];
const STATUS_OPTIONS = [{ value: '', label: 'Any status' }, { value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending approval' }, { value: 'suspended', label: 'Suspended' }];

export default function UsersPage() {
  const [filters, setFilters] = useState({ q: '', role: '', status: '' });
  const [page, setPage] = useState(1);
  const q = useDebounce(filters.q.trim(), 300);
  const { data, error, loading, reload } = useAsync(
    () => adminApi.users({ q, role: filters.role, status: filters.status, page, limit: 15 }),
    [q, filters.role, filters.status, page],
  );
  const users = data?.data || [];
  const change = (name) => (e) => {
    setFilters((f) => ({ ...f, [name]: e.target.value }));
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Approve vendors, suspend or reactivate accounts." actions={<LinkButton to="/admin/vendors/new" variant="primary">Add vendor</LinkButton>} />
      <form role="search" className="filters" onSubmit={(e) => e.preventDefault()} aria-label="Filter users">
        <div className="field">
          <label htmlFor="user-q">Search by name or email</label>
          <input id="user-q" type="search" value={filters.q} onChange={change('q')} />
        </div>
        <SelectField label="Role" value={filters.role} onChange={change('role')} options={ROLE_OPTIONS} />
        <SelectField label="Status" value={filters.status} onChange={change('status')} options={STATUS_OPTIONS} />
      </form>
      <p className="sr-only" aria-live="polite">
        {!loading && !error ? `${data?.meta?.total ?? 0} users found` : ''}
      </p>
      <QueryState loading={loading} error={error} onRetry={reload} empty={!users.length} emptyMessage="No users match these filters." loadingLabel="Loading users">
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Users</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <th scope="row">
                    <Link to={`/admin/users/${u.id}`}>{u.name}</Link>
                  </th>
                  <td>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="muted">Never</span>}</td>
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
