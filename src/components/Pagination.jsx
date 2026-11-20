import Button from './Button';

export default function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total } = meta;
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button variant="secondary" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        Previous
      </Button>
      <span aria-live="polite">
        Page {page} of {totalPages} <span className="muted">({total} results)</span>
      </span>
      <Button variant="secondary" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
        Next
      </Button>
    </nav>
  );
}
