import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <p>We could not find that page. <Link to="/">Go to the home page</Link>.</p>
    </>
  );
}
