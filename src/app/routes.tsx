import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { AnalyzeStatementPage } from '../pages/AnalyzeStatementPage'
import { AnalysisResultsPage } from '../pages/AnalysisResultsPage'
import { DashboardPage } from '../pages/DashboardPage'
import { HowItWorksPage } from '../pages/HowItWorksPage'
import { LoginPage } from '../pages/LoginPage'
import { ModelInformationPage } from '../pages/ModelInformationPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { TransactionDetailsPage } from '../pages/TransactionDetailsPage'
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage'
import { isAuthenticated } from '../services/demoAuth'

export function AppRoutes() {
  return <Routes>
    <Route path="login" element={<LoginPage />} />
    <Route element={<ProtectedRoutes />}>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="analyze-statement" element={<AnalyzeStatementPage />} />
        <Route path="analysis-results" element={<AnalysisResultsPage />} />
        <Route path="transactions" element={<TransactionHistoryPage />} />
        <Route path="transactions/:transactionId" element={<TransactionDetailsPage />} />
        <Route path="model-information" element={<ModelInformationPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes>
}

function ProtectedRoutes() {
  const location = useLocation()
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}
