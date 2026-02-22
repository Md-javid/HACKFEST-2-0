import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth-context";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import AIChatbot from "./components/ui/AIChatbot";

import LoginPage from "./app/login/page";
import DashboardPage from "./app/dashboard/page";
import ViolationsPage from "./app/violations/page";
import PoliciesPage from "./app/policies/page";
import RecordsPage from "./app/records/page";
import MonitoringPage from "./app/monitoring/page";
import ReportsPage from "./app/reports/page";
import UsersPage from "./app/users/page";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <LoadingSpinner />
      </div>
    );
  }
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

/** Show global AI chatbot only when a user is logged in */
function GlobalChatbot() {
  const { user } = useAuth();
  return user ? <AIChatbot /> : null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/violations" element={<ViolationsPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <GlobalChatbot />
      </AuthProvider>
    </BrowserRouter>
  );
}
