import { Link, Outlet } from 'react-router-dom';
import AccountMenu from './AccountMenu.jsx';

// Shared frame for logged-in pages: the header with the account menu, and the page content.
export default function AppLayout() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/dashboard" className="brand">
          🌱 Habit Garden
        </Link>
        <AccountMenu />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
