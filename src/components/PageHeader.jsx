import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import useDocumentTitle from '../hooks/useDocumentTitle';

/**
 * The page's single <h1>. It receives focus after every navigation so keyboard and screen-reader
 * users start at the top of the new content, and it sets the document title.
 */
export default function PageHeader({ title, subtitle, actions, documentTitle }) {
  const ref = useRef(null);
  const { key } = useLocation();
  useDocumentTitle(documentTitle || title);
  useEffect(() => {
    ref.current?.focus({ preventScroll: false });
  }, [key]);
  return (
    <div className="page-header">
      <div>
        <h1 tabIndex={-1} ref={ref}>
          {title}
        </h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
