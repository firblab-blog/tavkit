import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { type ReactNode } from 'react'
import { useAuthStore } from './store/authStore'
import { ThemeProvider } from './contexts/ThemeContext'
import { AIProvider } from './contexts/AIContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Dashboard from './components/dashboard/Dashboard'
import './App.css'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AIProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AIProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
