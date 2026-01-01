import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MainLayout } from '@/components/layout/MainLayout';

// Lazy load all pages for better performance
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const UsersPage = lazy(() => import('@/pages/users/UsersPage').then(m => ({ default: m.UsersPage })));
const EmployeeImportPage = lazy(() => import('@/pages/users/EmployeeImportPage'));
const AttendancePage = lazy(() => import('@/pages/attendance/AttendancePage').then(m => ({ default: m.AttendancePage })));
const BranchesPage = lazy(() => import('@/pages/branches/BranchesPage').then(m => ({ default: m.BranchesPage })));
const LeavesPage = lazy(() => import('@/pages/leaves/LeavesPage').then(m => ({ default: m.LeavesPage })));
const LettersPage = lazy(() => import('@/pages/letters/LettersPage').then(m => ({ default: m.LettersPage })));
const RaisesPage = lazy(() => import('@/pages/raises/RaisesPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const DataUpdatesPage = lazy(() => import('@/pages/data-updates/DataUpdatesPage'));
const PermissionsPage = lazy(() => import('@/pages/permissions/PermissionsPage'));
const PermissionAuditPage = lazy(() => import('@/pages/permissions/PermissionAuditPage'));
const JobTitlesPage = lazy(() => import('@/pages/job-titles/JobTitlesPage'));
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'));
const AdvancesPage = lazy(() => import('@/pages/advances/AdvancesPage'));
const SalaryPage = lazy(() => import('./pages/salary/SalaryPage').then(m => ({ default: m.SalaryPage })));
const PayrollRunNewPage = lazy(() => import('./pages/salary/PayrollRunNewPage').then(m => ({ default: m.PayrollRunNewPage })));
const PayrollRunDetailsPage = lazy(() => import('./pages/salary/PayrollRunDetailsPage').then(m => ({ default: m.PayrollRunDetailsPage })));
const EosCalculatorPage = lazy(() => import('./pages/eos/EosCalculatorPage').then(m => ({ default: m.EosCalculatorPage })));
const RetroPayPage = lazy(() => import('./pages/retro-pay/RetroPayPage').then(m => ({ default: m.RetroPayPage })));
const PoliciesPage = lazy(() => import('./pages/policies/PoliciesPage').then(m => ({ default: m.PoliciesPage })));
const AuditLogsPage = lazy(() => import('./pages/audit/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const SubmissionTimelinePage = lazy(() => import('./pages/audit/SubmissionTimelinePage'));
const ContractsPage = lazy(() => import('./pages/contracts/ContractsPage'));
const WpsExportPage = lazy(() => import('./pages/wps-export/WpsExportPage'));
const ExceptionsCenterPage = lazy(() => import('./pages/exceptions/ExceptionsCenterPage'));
const BankAccountsPage = lazy(() => import('./pages/bank-accounts/BankAccountsPage'));
const DevicesPage = lazy(() => import('./pages/devices/DevicesPage'));
const LoanPaymentsPage = lazy(() => import('./pages/loan-payments/LoanPaymentsPage'));
const CompaniesPage = lazy(() => import('./pages/companies/CompaniesPage'));
const PayrollDashboardPage = lazy(() => import('./pages/payroll/PayrollDashboardPage').then(m => ({ default: m.PayrollDashboardPage })));
const PayrollWizardPage = lazy(() => import('./pages/payroll/PayrollWizardPage').then(m => ({ default: m.PayrollWizardPage })));
const ComplianceOverviewPage = lazy(() => import('./pages/compliance/ComplianceOverviewPage'));
const PayslipsPage = lazy(() => import('./pages/payslips/PayslipsPage'));
const WpsTrackingPage = lazy(() => import('./pages/wps-tracking/WpsTrackingPage'));
const MudadPage = lazy(() => import('./pages/mudad/MudadPage'));
const GosiPage = lazy(() => import('./pages/gosi/GosiPage'));
const DisciplinaryHRPage = lazy(() => import('./pages/disciplinary/DisciplinaryHRPage').then(m => ({ default: m.DisciplinaryHRPage })));
const DisciplinaryManagerPage = lazy(() => import('./pages/disciplinary/DisciplinaryManagerPage').then(m => ({ default: m.DisciplinaryManagerPage })));
const DisciplinaryEmployeePage = lazy(() => import('./pages/disciplinary/DisciplinaryEmployeePage').then(m => ({ default: m.DisciplinaryEmployeePage })));
const DisciplinaryCaseDetail = lazy(() => import('./pages/disciplinary/DisciplinaryCaseDetail').then(m => ({ default: m.DisciplinaryCaseDetail })));
const EmployeeProfilePage = lazy(() => import('./pages/employee-profile/EmployeeProfilePage'));
const CustodyDashboard = lazy(() => import('@/pages/custody/CustodyDashboard'));
const CustodyItemsList = lazy(() => import('@/pages/custody/CustodyItemsList'));
const CustodyCategories = lazy(() => import('@/pages/custody/CustodyCategories'));
const CustodyReturns = lazy(() => import('@/pages/custody/CustodyReturns'));
const CustodyMaintenance = lazy(() => import('@/pages/custody/CustodyMaintenancePage'));
const CustodyAssign = lazy(() => import('@/pages/custody/CustodyAssign'));
const CustodyItemForm = lazy(() => import('@/pages/custody/CustodyItemForm'));
const CustodyItemDetail = lazy(() => import('@/pages/custody/CustodyItemDetail'));
const MyPayslipsPage = lazy(() => import('./pages/my-payslips/MyPayslipsPage'));
const PayrollSettingsPage = lazy(() => import('./pages/payroll-settings/PayrollSettingsPage'));
const SmartPoliciesPage = lazy(() => import('./pages/smart-policies/SmartPoliciesPage'));
const EmployeeTrackingPage = lazy(() => import('./pages/tracking/EmployeeTrackingPage'));
const OrgStructurePage = lazy(() => import('./pages/org-structure/OrgStructurePage'));

// Loading component for Suspense
const PageLoader = () => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    height="50vh"
    gap={2}
  >
    <CircularProgress size={40} />
    <Typography color="text.secondary">جاري التحميل...</Typography>
  </Box>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

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
    <Suspense fallback={<PageLoader />}>
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
          <Route path="dashboard" element={
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          } />
          <Route path="users" element={
            <Suspense fallback={<PageLoader />}>
              <UsersPage />
            </Suspense>
          } />
          <Route path="users/import" element={
            <Suspense fallback={<PageLoader />}>
              <EmployeeImportPage />
            </Suspense>
          } />
          <Route path="attendance" element={
            <Suspense fallback={<PageLoader />}>
              <AttendancePage />
            </Suspense>
          } />
          <Route path="branches" element={
            <Suspense fallback={<PageLoader />}>
              <BranchesPage />
            </Suspense>
          } />
          <Route path="leaves" element={
            <Suspense fallback={<PageLoader />}>
              <LeavesPage />
            </Suspense>
          } />
          <Route path="letters" element={
            <Suspense fallback={<PageLoader />}>
              <LettersPage />
            </Suspense>
          } />
          <Route path="raises" element={
            <Suspense fallback={<PageLoader />}>
              <RaisesPage />
            </Suspense>
          } />
          <Route path="advances" element={
            <Suspense fallback={<PageLoader />}>
              <AdvancesPage />
            </Suspense>
          } />
          <Route path="reports" element={
            <Suspense fallback={<PageLoader />}>
              <ReportsPage />
            </Suspense>
          } />
          <Route path="data-updates" element={
            <Suspense fallback={<PageLoader />}>
              <DataUpdatesPage />
            </Suspense>
          } />
          <Route path="permissions" element={
            <Suspense fallback={<PageLoader />}>
              <PermissionsPage />
            </Suspense>
          } />
          <Route path="permissions/audit" element={
            <Suspense fallback={<PageLoader />}>
              <PermissionAuditPage />
            </Suspense>
          } />
          <Route path="notifications" element={
            <Suspense fallback={<PageLoader />}>
              <NotificationsPage />
            </Suspense>
          } />
          <Route path="job-titles" element={
            <Suspense fallback={<PageLoader />}>
              <JobTitlesPage />
            </Suspense>
          } />
          <Route path="salary" element={
            <Suspense fallback={<PageLoader />}>
              <SalaryPage />
            </Suspense>
          } />
          <Route path="salary/runs/new" element={
            <Suspense fallback={<PageLoader />}>
              <PayrollRunNewPage />
            </Suspense>
          } />
          <Route path="salary/runs/:id" element={
            <Suspense fallback={<PageLoader />}>
              <PayrollRunDetailsPage />
            </Suspense>
          } />
          <Route path="eos" element={
            <Suspense fallback={<PageLoader />}>
              <EosCalculatorPage />
            </Suspense>
          } />
          <Route path="retro-pay" element={
            <Suspense fallback={<PageLoader />}>
              <RetroPayPage />
            </Suspense>
          } />
          <Route path="policies" element={
            <Suspense fallback={<PageLoader />}>
              <PoliciesPage />
            </Suspense>
          } />
          <Route path="smart-policies" element={
            <Suspense fallback={<PageLoader />}>
              <SmartPoliciesPage />
            </Suspense>
          } />
          <Route path="audit" element={
            <Suspense fallback={<PageLoader />}>
              <AuditLogsPage />
            </Suspense>
          } />
          <Route path="audit/submissions" element={
            <Suspense fallback={<PageLoader />}>
              <SubmissionTimelinePage />
            </Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          } />
          <Route path="contracts" element={
            <Suspense fallback={<PageLoader />}>
              <ContractsPage />
            </Suspense>
          } />
          <Route path="wps-export" element={
            <Suspense fallback={<PageLoader />}>
              <WpsExportPage />
            </Suspense>
          } />
          <Route path="exceptions" element={
            <Suspense fallback={<PageLoader />}>
              <ExceptionsCenterPage />
            </Suspense>
          } />
          <Route path="bank-accounts" element={
            <Suspense fallback={<PageLoader />}>
              <BankAccountsPage />
            </Suspense>
          } />
          <Route path="devices" element={
            <Suspense fallback={<PageLoader />}>
              <DevicesPage />
            </Suspense>
          } />
          <Route path="loan-payments" element={
            <Suspense fallback={<PageLoader />}>
              <LoanPaymentsPage />
            </Suspense>
          } />
          <Route path="companies" element={
            <Suspense fallback={<PageLoader />}>
              <CompaniesPage />
            </Suspense>
          } />
          <Route path="payroll-dashboard" element={
            <Suspense fallback={<PageLoader />}>
              <PayrollDashboardPage />
            </Suspense>
          } />
          <Route path="salary/wizard" element={
            <Suspense fallback={<PageLoader />}>
              <PayrollWizardPage />
            </Suspense>
          } />
          <Route path="compliance" element={
            <Suspense fallback={<PageLoader />}>
              <ComplianceOverviewPage />
            </Suspense>
          } />
          <Route path="payslips" element={
            <Suspense fallback={<PageLoader />}>
              <PayslipsPage />
            </Suspense>
          } />
          <Route path="wps-tracking" element={
            <Suspense fallback={<PageLoader />}>
              <WpsTrackingPage />
            </Suspense>
          } />
          <Route path="mudad" element={
            <Suspense fallback={<PageLoader />}>
              <MudadPage />
            </Suspense>
          } />
          <Route path="gosi" element={
            <Suspense fallback={<PageLoader />}>
              <GosiPage />
            </Suspense>
          } />
          <Route path="disciplinary" element={
            <Suspense fallback={<PageLoader />}>
              <DisciplinaryHRPage />
            </Suspense>
          } />
          <Route path="disciplinary/manager" element={
            <Suspense fallback={<PageLoader />}>
              <DisciplinaryManagerPage />
            </Suspense>
          } />
          <Route path="disciplinary/employee" element={
            <Suspense fallback={<PageLoader />}>
              <DisciplinaryEmployeePage />
            </Suspense>
          } />
          <Route path="disciplinary/cases/:id" element={
            <Suspense fallback={<PageLoader />}>
              <DisciplinaryCaseDetail />
            </Suspense>
          } />
          <Route path="employee-profile/:id" element={
            <Suspense fallback={<PageLoader />}>
              <EmployeeProfilePage />
            </Suspense>
          } />
          <Route path="my-payslips" element={
            <Suspense fallback={<PageLoader />}>
              <MyPayslipsPage />
            </Suspense>
          } />
          <Route path="payroll-settings" element={
            <Suspense fallback={<PageLoader />}>
              <PayrollSettingsPage />
            </Suspense>
          } />
          <Route path="tracking" element={
            <Suspense fallback={<PageLoader />}>
              <EmployeeTrackingPage />
            </Suspense>
          } />
          <Route path="org-structure" element={
            <Suspense fallback={<PageLoader />}>
              <OrgStructurePage />
            </Suspense>
          } />
          <Route path="custody">
            <Route index element={
              <Suspense fallback={<PageLoader />}>
                <CustodyDashboard />
              </Suspense>
            } />
            <Route path="categories" element={
              <Suspense fallback={<PageLoader />}>
                <CustodyCategories />
              </Suspense>
            } />
            <Route path="returns" element={
              <Suspense fallback={<PageLoader />}>
                <CustodyReturns />
              </Suspense>
            } />
            <Route path="maintenance" element={
              <Suspense fallback={<PageLoader />}>
                <CustodyMaintenance />
              </Suspense>
            } />
            <Route path="assign" element={
              <Suspense fallback={<PageLoader />}>
                <CustodyAssign />
              </Suspense>
            } />
            <Route path="items">
              <Route index element={
                <Suspense fallback={<PageLoader />}>
                  <CustodyItemsList />
                </Suspense>
              } />
              <Route path="new" element={
                <Suspense fallback={<PageLoader />}>
                  <CustodyItemForm />
                </Suspense>
              } />
              <Route path=":id" element={
                <Suspense fallback={<PageLoader />}>
                  <CustodyItemDetail />
                </Suspense>
              } />
              <Route path=":id/edit" element={
                <Suspense fallback={<PageLoader />}>
                  <CustodyItemForm />
                </Suspense>
              } />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
