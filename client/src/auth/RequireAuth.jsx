import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import StateMessage from '../components/StateMessage.jsx';

// Wraps every protected route. Logged-in users see the page. Everyone else goes to /login.
export default function RequireAuth() {
  const { status, error, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <StateMessage>Loading your garden…</StateMessage>;

  if (status === 'error') {
    return (
      <StateMessage role="alert" action={<button type="button" className="button" onClick={retry}>Try again</button>}>
        {error}
      </StateMessage>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
