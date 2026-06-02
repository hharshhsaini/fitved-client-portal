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
import Admin from "./pages/Admin";
import Customers from "./pages/admin/Customers";
import CustomerDetail from "./pages/admin/CustomerDetail";
import Trainers from "./pages/admin/Trainers";
import Societies from "./pages/admin/Societies";
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
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/trainer" element={<TrainerDashboard />} />
                <Route path="/pause" element={<Pause />} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/health" element={<Health />} />
                <Route path="/profile" element={<Profile />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/customers"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Customers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/customers/:id"
                  element={
                    <ProtectedRoute requireAdmin>
                      <CustomerDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/trainers"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Trainers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/societies"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Societies />
                    </ProtectedRoute>
                  }
                />
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
