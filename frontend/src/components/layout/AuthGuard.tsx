import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

/**
 * Wrap any page that requires authentication.
 * Redirects to /login if not signed in.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
