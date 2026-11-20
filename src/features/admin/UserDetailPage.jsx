import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import useAsync from '../../hooks/useAsync';
import useForm from '../../hooks/useForm';
import { rules, validateAll } from '../../validation/rules';
import PageHeader from '../../components/PageHeader';
import QueryState from '../../components/QueryState';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import FormErrorSummary from '../../components/FormErrorSummary';
import { TextAreaField } from '../../components/fields';
import StatusBadge, { RoleBadge } from '../../components/StatusBadge';
import { OpeningHoursList } from '../vendors/OpeningHours';
import { formatDateTime } from '../../utils';

function SuspendDialog({ user, onClose, onDone }) {
  const form = useForm({
    initialValues: { reason: '' },
    validate: (v) => validateAll({ reason: rules.reason }, v),
    onSubmit: async (v) => {
      await adminApi.suspend(user.id, v.reason.trim());
      onDone(`${user.name} was suspended and signed out.`);
    },
  });
  return (
    <Modal title={`Suspend ${user.name}?`} onClose={onClose}>
      <p>They will be signed out immediately and will not be able to sign in until you reactivate the account. This is recorded in the audit log.</p>
      <form onSubmit={form.handleSubmit} noValidate aria-label="Suspend account">
        <FormErrorSummary {...form} />
        <TextAreaField label="Reason" required hint="Visible to administrators only." data-autofocus {...form.field('reason')} />
        <div className="actions">
          <Button type="submit" variant="danger" loading={form.submitting} loadingText="Suspending">
            Suspend account
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function UserDetailPage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { data: u, error, loading, reload } = useAsync(() => adminApi.user(id), [id]);
  const [dialog, setDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState('');

  const run = async (name, fn, success) => {
    setBusy(name);
    setActionError('');
    setMessage('');
    try {
      await fn();
      setMessage(success);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  const done = (text) => {
    setDialog(false);
    setMessage(text);
    reload();
  };

  return (
    <QueryState loading={loading} error={error} onRetry={reload} loadingLabel="Loading user">
      {u && (
        <>
          <PageHeader title={u.name} subtitle={u.email} documentTitle={`User: ${u.name}`} />
          <p>
            <Link to="/admin/users">← Back to users</Link>
          </p>
          {message && <Alert tone="success">{message}</Alert>}
          {actionError && <Alert tone="error" title="That did not work">{actionError}</Alert>}
          <div className="two-col">
            <section className="card" aria-labelledby="acct-h">
              <h2 id="acct-h">Account</h2>
              <dl className="details">
                <dt>Role</dt>
                <dd><RoleBadge role={u.role} /></dd>
                <dt>Status</dt>
                <dd><StatusBadge status={u.status} /></dd>
                {u.status === 'suspended' && (
                  <>
                    <dt>Reason</dt>
                    <dd>{u.statusReason}</dd>
                  </>
                )}
                {u.statusChangedAt && (
                  <>
                    <dt>Status changed</dt>
                    <dd>{formatDateTime(u.statusChangedAt)}</dd>
                  </>
                )}
                <dt>Last sign-in</dt>
                <dd>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</dd>
                <dt>Created</dt>
                <dd>{formatDateTime(u.createdAt)}</dd>
              </dl>
              <div className="actions">
                {u.role === 'vendor' && u.status === 'pending' && (
                  <Button loading={busy === 'approve'} loadingText="Approving" onClick={() => run('approve', () => adminApi.approve(u.id), `${u.name} was approved.`)}>
                    Approve vendor
                  </Button>
                )}
                {u.status === 'suspended' && (
                  <Button loading={busy === 'reactivate'} loadingText="Reactivating" onClick={() => run('reactivate', () => adminApi.reactivate(u.id), `${u.name} was reactivated.`)}>
                    Reactivate account
                  </Button>
                )}
                {u.status !== 'suspended' && u.role !== 'admin' && u.id !== me.id && (
                  <Button variant="danger" onClick={() => setDialog(true)}>
                    Suspend account…
                  </Button>
                )}
              </div>
              {u.role === 'admin' && <p className="muted">Administrator accounts cannot be suspended here.</p>}
            </section>
            {u.store && (
              <section className="card" aria-labelledby="store-h">
                <h2 id="store-h">Store</h2>
                <p>
                  <strong>{u.store.storeName}</strong>
                  <br />
                  <span className="muted">{u.store.building}{u.store.counterLocation ? ` · ${u.store.counterLocation}` : ''}</span>
                </p>
                <p>{u.store.isActive ? 'Visible to students.' : 'Hidden from students until the account is active.'}</p>
                <OpeningHoursList hours={u.store.openingHours} />
              </section>
            )}
          </div>
          {dialog && <SuspendDialog user={u} onClose={() => setDialog(false)} onDone={done} />}
        </>
      )}
    </QueryState>
  );
}
