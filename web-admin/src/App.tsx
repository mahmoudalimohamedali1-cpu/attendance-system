import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { AttendancePage } from '@/pages/attendance/AttendancePage';
import { BranchesPage } from '@/pages/branches/BranchesPage';
import { LeavesPage } from '@/pages/leaves/LeavesPage';
import { LettersPage } from '@/pages/letters/LettersPage';
import RaisesPage from '@/pages/raises/RaisesPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import DataUpdatesPage from '@/pages/data-updates/DataUpdatesPage';
import PermissionsPage from '@/pages/permissions/PermissionsPage';
import PermissionAuditPage from '@/pages/permissions/PermissionAuditPage';
import JobTitlesPage from '@/pages/job-titles/JobTitlesPage';
import NotificationsPage from '@/pages/notifications/NotificationsPage';
import AdvancesPage from '@/pages/advances/AdvancesPage';
import { SalaryPage } from './pages/salary/SalaryPage';
import { PayrollRunNewPage } from './pages/salary/PayrollRunNewPage';
import { PayrollRunDetailsPage } from './pages/salary/PayrollRunDetailsPage';
import { EosCalculatorPage } from './pages/eos/EosCalculatorPage';
import { RetroPayPage } from './pages/retro-pay/RetroPayPage';
import { PoliciesPage } from './pages/policies/PoliciesPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import SubmissionTimelinePage from './pages/audit/SubmissionTimelinePage';
import ContractsPage from './pages/contracts/ContractsPage';
import WpsExportPage from './pages/wps-export/WpsExportPage';
import ExceptionsCenterPage from './pages/exceptions/ExceptionsCenterPage';
import BankAccountsPage from './pages/bank-accounts/BankAccountsPage';
import DevicesPage from './pages/devices/DevicesPage';
import LoanPaymentsPage from './pages/loan-payments/LoanPaymentsPage';
import CompaniesPage from './pages/companies/CompaniesPage';
import { PayrollDashboardPage } from './pages/payroll/PayrollDashboardPage';
import { MainLayout } from '@/components/layout/MainLayout';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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
        <Route path="users" element={<UsersPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="leaves" element={<LeavesPage />} />
        <Route path="letters" element={<LettersPage />} />
        <Route path="raises" element={<RaisesPage />} />
        <Route path="advances" element={<AdvancesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="data-updates" element={<DataUpdatesPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="permissions/audit" element={<PermissionAuditPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="job-titles" element={<JobTitlesPage />} />
        <Route path="salary" element={<SalaryPage />} />
        <Route path="salary/runs/new" element={<PayrollRunNewPage />} />
        <Route path="salary/runs/:id" element={<PayrollRunDetailsPage />} />
        <Route path="eos" element={<EosCalculatorPage />} />
        <Route path="retro-pay" element={<RetroPayPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="audit/submissions" element={<SubmissionTimelinePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="wps-export" element={<WpsExportPage />} />
        <Route path="exceptions" element={<ExceptionsCenterPage />} />
        <Route path="bank-accounts" element={<BankAccountsPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="loan-payments" element={<LoanPaymentsPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="payroll-dashboard" element={<PayrollDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  );
}

export default App;
