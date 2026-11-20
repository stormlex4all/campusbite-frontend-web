import { useEffect } from 'react';

/** Sets the browser tab title; the route announcer reads it to screen readers on navigation. */
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | CampusBite` : 'CampusBite';
  }, [title]);
}
