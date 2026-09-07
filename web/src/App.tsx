import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { useAuth } from './auth/useAuth';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { MemberAccountPage } from './pages/MemberAccountPage';
import { MemberHomePage } from './pages/MemberHomePage';
import { MemberListingPage } from './pages/MemberListingPage';

function RequireAuth({ role, children }: { role?: string; children: React.ReactNode }) {
  const { isAuthenticated, isRestoring, roles } = useAuth();
  const location = useLocation();

  if (isRestoring) return <p className="page-status">Loading…</p>;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role && !roles.includes(role)) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/home" element={<MemberHomePage />} />
        <Route path="/account" element={<MemberAccountPage />} />
        <Route
          path="/admin/members"
          element={
            <RequireAuth role="ADMIN">
              <MemberListingPage />
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
