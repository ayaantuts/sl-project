import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppProviders from './context/AppProviders';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import { GuestOnly, HomeRedirect, RequireAuth } from './routes/guards';
import { LoadingState } from './components/common/States';
import { ROLES } from './config/appConfig';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const TrackTokenPage = lazy(() => import('./pages/public/TrackTokenPage'));
const MyTokensPage = lazy(() => import('./pages/citizen/MyTokensPage'));
const JoinQueuePage = lazy(() => import('./pages/citizen/JoinQueuePage'));
const DependentsPage = lazy(() => import('./pages/citizen/DependentsPage'));
const CounterConsolePage = lazy(() => import('./pages/staff/CounterConsolePage'));
const DisplayPickerPage = lazy(() => import('./pages/staff/DisplayPickerPage'));
const DisplayBoardPage = lazy(() => import('./pages/staff/DisplayBoardPage'));
const DomainsPage = lazy(() => import('./pages/domains/DomainsPage'));
const DomainDetailPage = lazy(() => import('./pages/domains/DomainDetailPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const STAFF = [ROLES.MODERATOR, ROLES.ADMIN];

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            {/* Public */}
            <Route
              element={
                <GuestOnly>
                  <AuthLayout />
                </GuestOnly>
              }
            >
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route path="/track/:ticketNumber?" element={<TrackTokenPage />} />

            {/* Full-screen hall display (staff) */}
            <Route
              path="/display/:domainId"
              element={
                <RequireAuth roles={STAFF}>
                  <DisplayBoardPage />
                </RequireAuth>
              }
            />

            {/* Signed-in application */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<HomeRedirect />} />
              <Route path="settings" element={<SettingsPage />} />

              <Route element={<RequireAuth roles={[ROLES.USER]} />}>
                <Route path="my-tokens" element={<MyTokensPage />} />
                <Route path="join" element={<JoinQueuePage />} />
                <Route path="dependents" element={<DependentsPage />} />
              </Route>

              <Route element={<RequireAuth roles={STAFF} />}>
                <Route path="console" element={<CounterConsolePage />} />
                <Route path="display" element={<DisplayPickerPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="domains" element={<DomainsPage />} />
                <Route path="domains/:domainId" element={<DomainDetailPage />} />
              </Route>

              <Route element={<RequireAuth roles={[ROLES.ADMIN]} />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  );
}
