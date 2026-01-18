import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { MainLayout } from '@/components/layout';
import {
  LoginPage,
  DashboardPage,
  MaterialsPage,
  WarehousesPage,
  WarehouseDetailPage,
  PurchasesPage,
  PurchaseFormPage,
  PurchaseDetailPage,
  PurchaseEditPage,
  ExportsPage,
  ExportFormPage,
  ExportDetailPage,
  VehiclesPage,
  ProjectsPage,
  UsersPage,
  SettingsPage,
  InventoryReportPage,
  TransportReportPage
} from './pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner w-8 h-8" />
          <p className="text-slate-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Placeholder pages for routes not yet implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="text-slate-500 mt-2">Trang này đang được phát triển</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Master data */}
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="warehouses/:id" element={<WarehouseDetailPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />

        {/* Transactions - Purchases */}
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="purchases/new" element={<PurchaseFormPage />} />
        <Route path="purchases/:id" element={<PurchaseDetailPage />} />
        <Route path="purchases/:id/edit" element={<PurchaseEditPage />} />

        {/* Transactions - Exports */}
        <Route path="exports" element={<ExportsPage />} />
        <Route path="exports/new" element={<ExportFormPage />} />
        <Route path="exports/:id" element={<ExportDetailPage />} />

        {/* Reports */}
        {/* <Route path="reports" element={<PlaceholderPage title="Báo cáo" />} /> */}
        <Route path="reports" element={<InventoryReportPage />} />
        <Route path="reports/transport" element={<TransportReportPage />} />
        <Route path="reports/profit" element={<PlaceholderPage title="Báo cáo lợi nhuận" />} />

        {/* Admin */}
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
