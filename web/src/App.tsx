import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { type ReactNode, lazy, Suspense } from "react";
import { useAuthStore } from "./store/authStore";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AIProvider } from "./contexts/AIContext";
import { AppDataProvider } from "./providers/AppDataProvider";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ToastContainer } from "./components/common/Toast";
import GlobalModals from "./components/common/GlobalModals";
import "./App.css";

// Lazy load route components
const Login = lazy(() => import("./components/auth/Login"));
const Register = lazy(() => import("./components/auth/Register"));
const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-text">Loading...</div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AIProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <AppDataProvider>
                        <Dashboard />
                        {/* GlobalModals inside AppDataProvider ensures context is loaded */}
                        <GlobalModals />
                      </AppDataProvider>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </Suspense>
            <ToastContainer />
          </BrowserRouter>
        </AIProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
