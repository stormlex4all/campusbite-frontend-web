import { Navigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../auth/AuthContext';
import Loading from '../components/Loading';
import PageHeader from '../components/PageHeader';
import { LinkButton } from '../components/Button';

export default function HomePage() {
  const { status, user } = useAuth();
  if (status === 'loading') return <Loading label="Loading CampusBite" />;
  if (status === 'authenticated') return <Navigate to={homePathFor(user.role)} replace />;
  return (
    <>
      <PageHeader title="Good food, rescued." subtitle="CampusBite connects students with surplus food from campus cafeterias and restaurants." documentTitle="Welcome" />
      <div className="hero card">
        <p>Create a student account with your school email to browse participating stores. Vendors are set up by the CampusBite team.</p>
        <div className="actions">
          <LinkButton to="/register" variant="primary">Create student account</LinkButton>
          <LinkButton to="/login">Sign in</LinkButton>
        </div>
      </div>
    </>
  );
}
