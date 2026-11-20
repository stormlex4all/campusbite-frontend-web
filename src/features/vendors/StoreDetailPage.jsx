import { Link, useParams } from 'react-router-dom';
import { storesApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/PageHeader';
import QueryState from '../../components/QueryState';
import Alert from '../../components/Alert';
import config from '../../config';
import { formatDateTime, money } from '../../utils';
import { OpeningHoursList } from './OpeningHours';

/** What the store is offering right now (live listings only). */
function AvailableNow({ storeId }) {
  const { data, error, loading, reload } = useAsync(() => storesApi.listings(storeId, {}), [storeId]);
  const items = data?.data || [];
  return (
    <section className="card" aria-labelledby="now-h">
      <h2 id="now-h">Available now</h2>
      <QueryState loading={loading} error={error} onRetry={reload} empty={!loading && !error && items.length === 0} emptyMessage="Nothing is listed right now. Check back later." loadingLabel="Loading listings">
        <ul className="listing-list">
          {items.map((l) => (
            <li key={l.id}>
              {l.images[0] && <img className="thumb" src={config.assetUrl(l.images[0].url)} alt={l.images[0].alt} width="120" height="90" />}
              <div>
                <h3>{l.title}</h3>
                {l.description && <p>{l.description}</p>}
                <p>
                  <strong>{money(l.price)}</strong> · {l.quantityAvailable} left
                </p>
                <p className="muted">Pickup {formatDateTime(l.pickupStart)} to {formatDateTime(l.pickupEnd)}</p>
              </div>
            </li>
          ))}
        </ul>
      </QueryState>
    </section>
  );
}

export default function StoreDetailPage() {
  const { id } = useParams();
  const { data: store, error, loading, reload } = useAsync(() => storesApi.get(id), [id]);

  if (error?.status === 404) {
    return (
      <>
        <PageHeader title="Store not found" />
        <Alert tone="info">This store is not available right now. <Link to="/stores">Back to all stores</Link></Alert>
      </>
    );
  }
  return (
    <QueryState loading={loading} error={error} onRetry={reload} loadingLabel="Loading store">
      {store && (
        <>
          <PageHeader title={store.storeName} subtitle={`${store.building}${store.counterLocation ? ` · ${store.counterLocation}` : ''}`} />
          <div className="stack">
            {store.description && <p>{store.description}</p>}
            <AvailableNow storeId={store.id} />
            <section className="card" aria-labelledby="pickup-h">
              <h2 id="pickup-h">Pickup</h2>
              <p>{store.pickupInstructions || 'No special pickup instructions.'}</p>
            </section>
            <section className="card" aria-labelledby="hours-h">
              <h2 id="hours-h">Opening hours</h2>
              <OpeningHoursList hours={store.openingHours} />
            </section>
            <p>
              <Link to="/stores">← Back to all stores</Link>
            </p>
          </div>
        </>
      )}
    </QueryState>
  );
}
