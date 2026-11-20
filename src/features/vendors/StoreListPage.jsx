import { useState } from 'react';
import { Link } from 'react-router-dom';
import { storesApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import PageHeader from '../../components/PageHeader';
import QueryState from '../../components/QueryState';
import Pagination from '../../components/Pagination';

export default function StoreListPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounce(q.trim(), 300);
  const { data, error, loading, reload } = useAsync(() => storesApi.list({ q: search, page, limit: 12 }), [search, page]);
  const items = data?.data || [];

  return (
    <>
      <PageHeader title="Campus stores" subtitle="Cafeterias and restaurants that share surplus food with students." />
      <form role="search" className="searchbar" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="store-search">Search stores by name</label>
        <input
          id="store-search"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="e.g. Campus Cafe"
        />
      </form>
      <p className="sr-only" aria-live="polite">
        {!loading && !error ? `${data?.meta?.total ?? 0} stores found` : ''}
      </p>
      <QueryState loading={loading} error={error} onRetry={reload} empty={!items.length} emptyMessage={search ? `No stores match “${search}”. Try a different name.` : 'No stores are taking part yet. Check back soon.'} loadingLabel="Loading stores">
        <ul className="card-grid">
          {items.map((s) => (
            <li key={s.id} className="card">
              <h2>
                <Link to={`/stores/${s.id}`}>{s.storeName}</Link>
              </h2>
              <p className="muted">{s.building}{s.counterLocation ? ` · ${s.counterLocation}` : ''}</p>
              {s.description && <p>{s.description}</p>}
            </li>
          ))}
        </ul>
        <Pagination meta={data?.meta} onPage={setPage} />
      </QueryState>
    </>
  );
}
