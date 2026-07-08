import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { PauseProvider } from "@/stores/pauseStore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Pause from "./pages/Pause";
import Plan from "./pages/Plan";
import Health from "./pages/Health";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/Dashboard";
import Customers from "./pages/admin/Customers";
import CustomerDetail from "./pages/admin/CustomerDetail";
import AdminPlans from "./pages/admin/Plans";
import Trainers from "./pages/admin/Trainers";
import Societies from "./pages/admin/Societies";
import Marketing from "./pages/admin/Marketing";
import Tips from "./pages/admin/Tips";
import Corporate from "./pages/Corporate";
import TrainerDashboard from "./pages/TrainerDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PauseProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                {/* Client pages — trainers are redirected to /trainer */}
                <Route path="/dashboard" element={<ProtectedRoute allow={["client", "admin"]}><Dashboard /></ProtectedRoute>} />
                <Route path="/pause" element={<ProtectedRoute allow={["client", "admin"]}><Pause /></ProtectedRoute>} />
                <Route path="/plan" element={<ProtectedRoute allow={["client", "admin"]}><Plan /></ProtectedRoute>} />
                <Route path="/health" element={<ProtectedRoute allow={["client", "admin"]}><Health /></ProtectedRoute>} />

                {/* Shared */}
                <Route path="/profile" element={<Profile />} />

                {/* Trainer pages — clients are redirected to /dashboard */}
                <Route path="/trainer" element={<ProtectedRoute allow={["trainer", "admin"]}><TrainerDashboard /></ProtectedRoute>} />

                {/* Admin pages */}
                <Route path="/admin" element={<ProtectedRoute allow={["admin"]}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/customers" element={<ProtectedRoute allow={["admin"]}><Customers /></ProtectedRoute>} />
                <Route path="/admin/customers/:id" element={<ProtectedRoute allow={["admin"]}><CustomerDetail /></ProtectedRoute>} />
                <Route path="/admin/plans" element={<ProtectedRoute allow={["admin"]}><AdminPlans /></ProtectedRoute>} />
                <Route path="/admin/trainers" element={<ProtectedRoute allow={["admin"]}><Trainers /></ProtectedRoute>} />
                <Route path="/admin/societies" element={<ProtectedRoute allow={["admin"]}><Societies /></ProtectedRoute>} />
                <Route path="/admin/marketing" element={<ProtectedRoute allow={["admin"]}><Marketing /></ProtectedRoute>} />
                <Route path="/admin/tips" element={<ProtectedRoute allow={["admin"]}><Tips /></ProtectedRoute>} />
              </Route>
              <Route path="/index" element={<Navigate to="/dashboard" replace />} />
              <Route path="/corporate" element={<Corporate />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PauseProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
