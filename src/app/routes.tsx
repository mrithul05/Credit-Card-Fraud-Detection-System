import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { CheckTransactionPage } from '../pages/CheckTransactionPage'
import { DashboardPage } from '../pages/DashboardPage'
import { HowItWorksPage } from '../pages/HowItWorksPage'
import { ModelInformationPage } from '../pages/ModelInformationPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { TransactionDetailsPage } from '../pages/TransactionDetailsPage'
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage'

export function AppRoutes() {
  return <Routes>
    <Route element={<AppShell />}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="check-transaction" element={<CheckTransactionPage />} />
      <Route path="transactions" element={<TransactionHistoryPage />} />
      <Route path="transactions/:transactionId" element={<TransactionDetailsPage />} />
      <Route path="model-information" element={<ModelInformationPage />} />
      <Route path="how-it-works" element={<HowItWorksPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
}
