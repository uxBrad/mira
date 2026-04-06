import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Toaster } from './components/ui/toaster'
import AppShell from './components/layout/AppShell'

// Auth pages
import LoginPage from './pages/auth/Login'
import RegisterPage from './pages/auth/Register'
import ForgotPasswordPage from './pages/auth/ForgotPassword'

// App pages
import DashboardPage from './pages/dashboard'
import ProjectPage from './pages/project/ProjectPage'
import SettingsPage from './pages/settings'
import PaywallPage from './pages/auth/Paywall'
import TemplatesPage from './pages/templates'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
<Route path="/paywall" element={<ProtectedRoute><PaywallPage /></ProtectedRoute>} />

      {/* App routes */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </HashRouter>
  )
}
