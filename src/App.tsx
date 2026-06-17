import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import DataIngestion from "@/pages/DataIngestion";
import DataPreparation from "@/pages/admin/DataPreparation";
import DataProcessing from "@/pages/DataProcessing";
import Dashboard from "@/pages/Dashboard";
import VectorAI from "./pages/VectorAI";
import DataQuality from "@/pages/DataQuality";
import DataModelling from "@/pages/DataModelling";
import Reports from "@/pages/Reports";
import Admin from "@/pages/Admin";
import AdminLayout from "@/pages/admin/AdminLayout";
import Tenants from "@/pages/admin/Tenants";
import Organizations from "@/pages/admin/Organizations";
import UserRoles from "@/pages/admin/UserRoles";
import Users from "@/pages/admin/Users";
import UserSessions from "@/pages/admin/UserSessions";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import DigitalTwin from "@/pages/DigitalTwin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="bottom-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/data-ingestion" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/data-ingestion" element={<DataIngestion />} />
                <Route path="/data-preparation" element={<DataPreparation />} />
                <Route path="/data-processing" element={<DataProcessing />} />
                <Route path="/digital-twin" element={<DigitalTwin />} />
                <Route path="/vector-ai" element={<VectorAI />} />
                <Route path="/bot" element={<Navigate to="/vector-ai" replace />} />
                <Route path="/data-quality" element={<DataQuality />} />
                <Route path="/data-modelling" element={<DataModelling />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Admin />} />
                  <Route path="tenants" element={<Tenants />} />
                  <Route path="organizations" element={<Organizations />} />
                  <Route path="user-roles" element={<UserRoles />} />
                  <Route path="users" element={<Users />} />
                  <Route path="user-sessions" element={<UserSessions />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
