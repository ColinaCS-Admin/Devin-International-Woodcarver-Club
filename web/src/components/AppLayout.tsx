import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function AppLayout() {
  const { roles, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header>
        <span className="brand">International Woodcarver Club</span>
        <nav>
          <NavLink to="/home">Home</NavLink>
          <NavLink to="/account">My Account</NavLink>
          {roles.includes('ADMIN') && <NavLink to="/admin/members">Member Listing</NavLink>}
        </nav>
        <button
          type="button"
          className="link-button"
          onClick={() => {
            void logout().then(() => navigate('/login', { replace: true }));
          }}
        >
          Sign out
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
