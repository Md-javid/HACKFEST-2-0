// This file is not used by Vite — routing is handled in src/App.tsx via React Router.
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function RootPage() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}
