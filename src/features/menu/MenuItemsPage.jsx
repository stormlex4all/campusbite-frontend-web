import { useState } from 'react';
import { menuApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import config from '../../config';
import PageHeader from '../../components/PageHeader';
import QueryState from '../../components/QueryState';
import Alert from '../../components/Alert';
import Button, { LinkButton } from '../../components/Button';
import { SelectField } from '../../components/fields';
import { money } from '../../utils';

export default function MenuItemsPage() {
  const [status, setStatus] = useState('active');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const { data, error: loadError, loading, reload } = useAsync(() => menuApi.list({ status }), [status]);
  const items = data?.data || [];

  const toggle = async (item) => {
    setNotice('');
    setError('');
    try {
      await (item.status === 'active' ? menuApi.archive(item.id) : menuApi.restore(item.id));
      setNotice(item.status === 'active' ? `${item.name} was archived.` : `${item.name} was restored.`);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Menu items"
        subtitle="Items you sell regularly. Save them once, then pick one whenever you list surplus food."
        actions={<LinkButton to="/menu/new" variant="primary">Add menu item</LinkButton>}
      />
      <div className="stack">
        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
        <SelectField
          label="Show"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'active', label: 'Active items' },
            { value: 'archived', label: 'Archived items' },
            { value: 'all', label: 'All items' },
          ]}
        />
        <QueryState loading={loading} error={loadError} onRetry={reload} empty={!loading && !loadError && items.length === 0} emptyMessage="No menu items here yet." loadingLabel="Loading menu items">
          <ul className="card-grid">
            {items.map((item) => (
              <li key={item.id} className="card">
                {item.images[0] && <img className="thumb" src={config.assetUrl(item.images[0].url)} alt={item.images[0].alt} width="240" height="160" />}
                <h2>{item.name}</h2>
                <p>
                  {money(item.defaultPrice)} · {item.images.length} {item.images.length === 1 ? 'photo' : 'photos'}
                  {item.status === 'archived' && <span className="badge badge-suspended"> Archived</span>}
                </p>
                <div className="actions">
                  <LinkButton to={`/menu/${item.id}`}>Edit</LinkButton>
                  <Button variant="secondary" onClick={() => toggle(item)} aria-label={`${item.status === 'active' ? 'Archive' : 'Restore'} ${item.name}`}>
                    {item.status === 'active' ? 'Archive' : 'Restore'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </QueryState>
      </div>
    </>
  );
}
