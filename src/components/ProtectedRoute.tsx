import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarded?: boolean;
}

export function ProtectedRoute({ children, requireOnboarded = true }: ProtectedRouteProps) {
  const { authUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authUser || !userProfile) {
    return <Navigate to="/auth" replace />;
  }

  // Enforce teacher only
  if (userProfile.role !== "teacher") {
    // If a student somehow gets here, push to auth which handles logging out
    return <Navigate to="/auth" replace />;
  }

  // If onboarding is required and user hasn't completed it (teachers only have 1 step)
  if (requireOnboarded && userProfile.onboardingStep < 1) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
