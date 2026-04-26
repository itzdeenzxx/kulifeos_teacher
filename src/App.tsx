import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import TeacherOnboarding from "./pages/TeacherOnboarding";
import TeacherDashboard from "./pages/TeacherDashboard";
import ClassroomDetail from "./pages/teacher/ClassroomDetail";
import TeacherSettings from "./pages/teacher/TeacherSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute requireOnboarded={false}><TeacherOnboarding /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/classroom/:classroomId" element={<ProtectedRoute><ClassroomDetail /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><TeacherSettings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
