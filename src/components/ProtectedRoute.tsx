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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-background to-emerald-50/30">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-white p-10 shadow-xl border border-emerald-100/50">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-16 w-16 animate-ping rounded-full bg-emerald-100 opacity-75"></div>
            <div className="relative h-16 w-16 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent shadow-sm"></div>
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-emerald-900">กำลังโหลดข้อมูล</h2>
            <p className="text-sm text-muted-foreground">กรุณารอสักครู่ ระบบกำลังเตรียมพร้อม...</p>
          </div>
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
