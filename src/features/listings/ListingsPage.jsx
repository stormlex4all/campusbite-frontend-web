import { useState } from 'react';
import { listingsApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/PageHeader';
import QueryState from '../../components/QueryState';
import Pagination from '../../components/Pagination';
import Alert from '../../components/Alert';
import Button, { LinkButton } from '../../components/Button';
import { SelectField } from '../../components/fields';
import { formatDateTime, money } from '../../utils';

const STATE_LABELS = { live: 'Live', sold_out: 'Sold out', ended: 'Ended', closed: 'Closed' };

export default function ListingsPage() {
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const { data, error: loadError, loading, reload } = useAsync(() => listingsApi.list({ status, page }), [status, page]);
  const items = data?.data || [];

  const change = async (listing, action) => {
    setError('');
    try {
      await listingsApi[action](listing.id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Listings" subtitle="Surplus food students can see right now." actions={<LinkButton to="/listings/new" variant="primary">New listing</LinkButton>} />
      <div className="stack">
        {error && <Alert tone="error">{error}</Alert>}
        <SelectField
          label="Show"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: 'active', label: 'Open listings' },
            { value: 'closed', label: 'Closed listings' },
            { value: 'all', label: 'All listings' },
          ]}
        />
        <QueryState loading={loading} error={loadError} onRetry={reload} empty={!loading && !loadError && items.length === 0} emptyMessage="No listings here yet." loadingLabel="Loading listings">
          <ul className="card-grid">
            {items.map((l) => (
              <li key={l.id} className="card">
                <h2>{l.title}</h2>
                <p>
                  <span className="badge">{STATE_LABELS[l.state] || l.state}</span> {l.source === 'menu_item' ? 'From a menu item' : 'One-off item'}
                </p>
                <p>
                  {money(l.price)} · {l.quantityAvailable} of {l.quantityTotal} left
                </p>
                <p className="muted">
                  Pickup {formatDateTime(l.pickupStart)} to {formatDateTime(l.pickupEnd)}
                </p>
                {l.status === 'active' ? (
                  <Button variant="secondary" onClick={() => change(l, 'close')} aria-label={`Close listing ${l.title}`}>
                    Close listing
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => change(l, 'reopen')} aria-label={`Reopen listing ${l.title}`}>
                    Reopen listing
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <Pagination meta={data?.meta} onPage={setPage} />
        </QueryState>
      </div>
    </>
  );
}
