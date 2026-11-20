import Alert from './Alert';
import Button from './Button';
import Loading from './Loading';

/** Standard loading / error / empty handling for data screens. */
export default function QueryState({ loading, error, onRetry, empty, emptyMessage, children, loadingLabel }) {
  if (loading) return <Loading label={loadingLabel || 'Loading'} />;
  if (error) {
    return (
      <Alert tone="error" title="We could not load this">
        <p>{error.message}</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Alert>
    );
  }
  if (empty) return <p className="empty">{emptyMessage}</p>;
  return children;
}
