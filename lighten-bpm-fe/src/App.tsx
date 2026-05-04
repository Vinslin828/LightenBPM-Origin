import { Suspense, lazy, ReactNode, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/protected-route";
import { ToastProvider, useToast } from "./components/ui/toast";
import "./App.css";
import ApplicationFormPage from "./pages/application/ApplicationFormPage";
import ApplicationListPage from "./pages/application/ApplicationListPage";
import ApplicationDetailPage from "./pages/application/ApplicationDetailPage";
import ApplicationReviewPage from "./pages/application/ApplicationReviewPage";
import { Layout } from "./components/Layout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import ApprovalListPage from "./pages/approval/ApprovalListPage";

// Lazy-loaded pages
// Auth / docs
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const AuthCallbackPage = lazy(() =>
  import("./pages/AuthCallbackPage").then((m) => ({
    default: m.AuthCallbackPage,
  })),
);
const LogoutCallbackPage = lazy(() =>
  import("./pages/LogoutCallbackPage").then((m) => ({
    default: m.LogoutCallbackPage,
  })),
);
const DocPage = lazy(() =>
  import("./pages/DocPage").then((m) => ({
    default: m.default,
  })),
);

// Dashboard / form
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.default })),
);
const FormListPage = lazy(() =>
  import("./pages/form/FormListPage").then((m) => ({
    default: m.FormListPage,
  })),
);

const EditFormPage = lazy(() =>
  import("./pages/form/EditFormPage").then((m) => ({
    default: m.EditFormPage,
  })),
);

// Workflow
const WorkflowListPage = lazy(() =>
  import("./pages/flow/WorkflowListPage").then((m) => ({
    default: m.WorkflowListPage,
  })),
);
const WorkflowDetailPage = lazy(() =>
  import("./pages/flow/EditWorkflowPage").then((m) => ({
    default: m.WorkflowDetailPage,
  })),
);

// Master data
const MasterDataPage = lazy(() =>
  import("./pages/master-data/MasterDataPage").then((m) => ({
    default: m.MasterDataPage,
  })),
);
const MasterDataDetailPage = lazy(() =>
  import("./pages/master-data/MasterDataDetailPage").then((m) => ({
    default: m.MasterDataDetailPage,
  })),
);

// Admin
const RolesPage = lazy(() =>
  import("./pages/admin/RolesPage").then((m) => ({ default: m.RolesPage })),
);
const UsersPage = lazy(() =>
  import("./pages/admin/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const PermissionsPage = lazy(() =>
  import("./pages/admin/PermissionsPage").then((m) => ({
    default: m.PermissionsPage,
  })),
);
const FormsReviewPage = lazy(() =>
  import("./pages/admin/FormsReviewPage").then((m) => ({
    default: m.FormsReviewPage,
  })),
);
const OrganizationsPage = lazy(() =>
  import("./pages/admin/OrganizationsPage").then((m) => ({
    default: m.default,
  })),
);
const ValidationRegistryPage = lazy(() =>
  import("./pages/admin/ValidationRegistryPage").then((m) => ({
    default: m.default,
  })),
);

const ProfilePage = lazy(() => import("./pages/ProfilePage"));

// Shared / fallback
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);

// Placeholder pages for the remaining menu items
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-6">
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-600">Coming soon...</p>
      </div>
    </div>
  </div>
);

const LoadingFallback = () => (
  <div className="flex h-screen w-screen items-center justify-center">
    <div>Loading...</div>
  </div>
);

const ProtectedLayout = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

const AppRoutes = () => {
  const enableAIFeature = import.meta.env.VITE_ENABLE_AIFEATURE === "true";
  const withProtectedLayout = (element: ReactNode) => (
    <ProtectedLayout>{element}</ProtectedLayout>
  );

  const publicRoutes: Array<{ path: string; element: ReactNode }> = [
    { path: "/login", element: <LoginPage /> },
    { path: "/login/redirect", element: <AuthCallbackPage /> },
    { path: "/logout/redirect", element: <LogoutCallbackPage /> },
    { path: "/doc", element: <DocPage /> },
  ];

  const protectedRoutes: Array<{ path: string; element: ReactNode }> = [
    { path: "/profile", element: <ProfilePage /> },
    { path: "/dashboard", element: <DashboardPage /> },
    { path: "/application", element: <ApplicationListPage /> },
    { path: "/approval", element: <ApprovalListPage /> },
    { path: "/application/history", element: <ApplicationListPage /> },
    { path: "/application/:applicationId", element: <ApplicationDetailPage /> },
    {
      path: "/dashboard/application/:applicationId",
      element: <ApplicationDetailPage />,
    },
    {
      path: "/dashboard/application/form/:bindingId",
      element: <ApplicationFormPage />,
    },
    {
      path: "/application/review/:approvalTaskId",
      element: <ApplicationReviewPage />,
    },
    {
      path: "/dashboard/application/review/:applicationId",
      element: <ApplicationReviewPage />,
    },
    { path: "/forms", element: <FormListPage /> },
    { path: "/forms/:formId", element: <EditFormPage /> },
    { path: "/workflow", element: <WorkflowListPage /> },
    { path: "/workflow/:flowId", element: <WorkflowDetailPage /> },
    { path: "/master-data", element: <MasterDataPage /> },
    { path: "/master-data/:code", element: <MasterDataDetailPage /> },
    { path: "/admin/roles", element: <RolesPage /> },
    { path: "/admin/users", element: <UsersPage /> },
    { path: "/admin/permissions", element: <PermissionsPage /> },
    { path: "/admin/forms/review", element: <FormsReviewPage /> },
    { path: "/diagram", element: <PlaceholderPage title="Diagram" /> },
    { path: "/react-flow", element: <PlaceholderPage title="React Flow" /> },
    {
      path: "/react-diagram",
      element: <PlaceholderPage title="React Diagram" />,
    },
  ];

  const featureFlagRoutes: Array<{ path: string; element: ReactNode }> = [
    ...(enableAIFeature
      ? [{ path: "/admin/organizations", element: <OrganizationsPage /> }]
      : []),
    ...(enableAIFeature
      ? [{ path: "/validation-registry", element: <ValidationRegistryPage /> }]
      : []),
  ];

  return (
    <Routes>
      {publicRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
      {[...protectedRoutes, ...featureFlagRoutes].map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={withProtectedLayout(route.element)}
        />
      ))}

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 Page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const AppContent = () => {
  const { toast } = useToast();
  // Log application version on startup
  console.log(
    `Application Version: ${import.meta.env.VITE_PUBLIC_BUILD_VERSION}`,
  );
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            throwOnError: false,
          },
          mutations: {
            retry: 0,
            onError: (error) => {
              let message = "An unexpected error occurred.";
              console.error(error);
              if (isAxiosError(error)) {
                message = error.response?.data?.message ?? error.message;
              } else if (error instanceof Error) {
                message = error.message;
              }
              toast({
                variant: "destructive",
                title: error.message,
                description: message,
              });
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
