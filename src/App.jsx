// client/src/App.jsx
import React, { Suspense, useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
  useLocation,
  useParams
} from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SocketProvider } from './context/SocketProvider';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { UnsavedChangesProvider } from './context/UnsavedChangesContext';
import Spinner from './components/ui/Spinner';
import { getTenantItem } from './lib/storage';
import { getWorkspaces } from './api/workspaces';
import { safeLazy } from './lib/safeLazy';

const LoginPage = safeLazy(() => import('./pages/LoginPage'), 'LoginPage');
const RegisterPage = safeLazy(() => import('./pages/RegisterPage'), 'RegisterPage');
const BoardPage = safeLazy(() => import('./pages/BoardPage'), 'BoardPage');
const AccountPage = safeLazy(() => import('./pages/AccountPage'), 'AccountPage');
const NotFoundPage = safeLazy(() => import('./pages/NotFoundPage'), 'NotFoundPage');
const AccessDeniedPage = safeLazy(() => import('./pages/AccessDeniedPage'), 'AccessDeniedPage');

// DEV-only: guarded so Vite tree-shakes this import entirely in production builds
const DevComponentsPage = import.meta.env.DEV
  ? safeLazy(() => import('./pages/DevComponentsPage'), 'DevComponentsPage')
  : null;

// Focus management and skip link support
function NavigationManager() {
  const location = useLocation();

  useEffect(() => {
    // Focus the first heading on navigation for screen readers
    const timer = setTimeout(() => {
      const heading = document.querySelector('h1[tabindex="-1"], h1');
      if (heading) {
        heading.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
    >
      Skip to content
    </a>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen w-screen bg-app flex flex-col items-center justify-center space-y-4">
      <Spinner size="xl" />
      <p className="text-sm font-semibold text-text-secondary">Loading TaskFlow...</p>
    </div>
  );
}

// Protected Route Guard with Neutral Loading Screen
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    const nextPath = encodeURIComponent(location.pathname + location.search + location.hash);
    return <Navigate to={`/login?next=${nextPath}`} replace />;
  }

  return children;
}

// Public auth route guard: redirects logged-in users to home
function PublicAuthRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <RootRedirect />;
  }

  return children;
}

// Root redirect to last visited workspace or first available workspace
function RootRedirect() {
  const { user } = useAuth();
  const [targetUrl, setTargetUrl] = React.useState(null);

  useEffect(() => {
    async function determineHome() {
      if (!user) return;
      const lastWsId = getTenantItem(user?.tenant_id, 'last_workspace_id', null);
      if (lastWsId) {
        setTargetUrl(`/w/${lastWsId}/home`);
        return;
      }
      try {
        const res = await getWorkspaces();
        if (res.workspaces && res.workspaces.length > 0) {
          setTargetUrl(`/w/${res.workspaces[0].id}/home`);
        } else {
          setTargetUrl('/w/new/home');
        }
      } catch {
        setTargetUrl('/w/1/home');
      }
    }
    determineHome();
  }, [user]);

  if (!targetUrl) {
    return <LoadingScreen />;
  }

  return <Navigate to={targetUrl} replace />;
}

// Invite route handler: preserves query params and redirects to register
function InviteRedirect() {
  const location = useLocation();
  return <Navigate to={`/register${location.search}`} replace />;
}

// Root layout providing unsaved changes guard, navigation manager, and suspense outlet
function RootLayout() {
  return (
    <UnsavedChangesProvider>
      <NavigationManager />
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </UnsavedChangesProvider>
  );
}

// Data router for useBlocker support
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/login',
        element: (
          <PublicAuthRoute>
            <LoginPage />
          </PublicAuthRoute>
        )
      },
      {
        path: '/register',
        element: (
          <PublicAuthRoute>
            <RegisterPage />
          </PublicAuthRoute>
        )
      },
      {
        path: '/invite',
        element: <InviteRedirect />
      },
      ...(import.meta.env.DEV && DevComponentsPage
        ? [
            {
              path: '/dev/components',
              element: <DevComponentsPage />
            }
          ]
        : []),
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <RootRedirect />
          </ProtectedRoute>
        )
      },
      {
        path: '/account',
        element: (
          <ProtectedRoute>
            <Navigate to="/account/profile" replace />
          </ProtectedRoute>
        )
      },
      {
        path: '/account/:tab',
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/w/:workspaceId/*',
        element: (
          <ProtectedRoute>
            <BoardPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/403',
        element: <AccessDeniedPage />
      },
      {
        path: '/404',
        element: <NotFoundPage />
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
