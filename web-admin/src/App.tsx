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
const ProfileUpdateRequestsPage = lazy(() => import('@/pages/profile-update-requests/ProfileUpdateRequestsPage'));
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
const QiwaPage = lazy(() => import('./pages/qiwa/QiwaPage'));
const QiwaDashboardPage = lazy(() => import('./pages/qiwa/QiwaDashboardPage'));
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
const SmartDashboardPage = lazy(() => import('./pages/smart-policies/SmartDashboardPage'));
const PolicyMarketplacePage = lazy(() => import('./pages/smart-policies/PolicyMarketplacePage'));
const PolicyWizardPage = lazy(() => import('./pages/smart-policies/PolicyWizardPage'));
const EmployeeTrackingPage = lazy(() => import('./pages/tracking/EmployeeTrackingPage'));
const TrackingReportsPage = lazy(() => import('./pages/tracking/TrackingReportsPage'));
const OrgStructurePage = lazy(() => import('./pages/org-structure/OrgStructurePage'));
const TasksPage = lazy(() => import('./pages/tasks/TasksPage'));
const SalesCommissionPage = lazy(() => import('./pages/sales-commission/SalesCommissionPage'));
const AiChatPage = lazy(() => import('./pages/ai-chat/AiChatPage'));
const GeniusAiPage = lazy(() => import('./pages/ai-chat/GeniusAiPage'));
const CostCentersPage = lazy(() => import('./pages/cost-centers/CostCentersPage'));
const EmployeeTasksPage = lazy(() => import('./pages/my-tasks/EmployeeTasksPage'));
const PerformanceReviewsPage = lazy(() => import('./pages/performance-reviews/PerformanceReviewsPage'));
const GoalsPage = lazy(() => import('./pages/goals/GoalsPage'));
const RecognitionPage = lazy(() => import('./pages/recognition/RecognitionPage'));
const CompanyConfigPage = lazy(() => import('./pages/company-config/CompanyConfigPage'));
const KPIPage = lazy(() => import('./pages/kpi/KPIPage'));
const HolidaysPage = lazy(() => import('./pages/holidays/HolidaysPage'));
const BonusManagementPage = lazy(() => import('./pages/payroll/BonusManagementPage'));
const PayrollReportsPage = lazy(() => import('./pages/payroll/PayrollReportsPage'));
const CommissionManagementPage = lazy(() => import('./pages/payroll/CommissionManagementPage'));
const AllowanceManagementPage = lazy(() => import('./pages/payroll/AllowanceManagementPage'));
const LogisticsPage = lazy(() => import('./pages/logistics/LogisticsPage'));
const SaudizationPage = lazy(() => import('./pages/saudization/SaudizationPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const IntegrationsPage = lazy(() => import('./pages/integrations/IntegrationsPage'));
const TeamCollaborationPage = lazy(() => import('./pages/team-collaboration/TeamCollaborationPage'));
const OdooSettingsPage = lazy(() => import('./pages/settings/OdooSettingsPage'));
// Enterprise Payroll Pages
const PayrollAnalyticsPage = lazy(() => import('./pages/enterprise-payroll/PayrollAnalyticsPage'));
const EmployeeSelfServicePage = lazy(() => import('./pages/enterprise-payroll/EmployeeSelfServicePage'));
const PayrollAuditPage = lazy(() => import('./pages/enterprise-payroll/PayrollAuditPage'));
const PayrollSimulationPage = lazy(() => import('./pages/enterprise-payroll/PayrollSimulationPage'));
const EmployeeDebtPage = lazy(() => import('./pages/employee-debt/EmployeeDebtPage'));
const CustodyAuditPage = lazy(() => import('./pages/custody-audit/CustodyAuditPage'));
const MuqeemManagementPage = lazy(() => import('./pages/integrations/muqeem/MuqeemManagementPage'));
const MuqeemSettingsPage = lazy(() => import('./pages/settings/MuqeemSettingsPage'));
const AiPredictivePage = lazy(() => import('./pages/ai-predictive/AiPredictivePage').then(m => ({ default: m.AiPredictivePage })));
const SocialFeedPage = lazy(() => import('./pages/social-feed/SocialFeedPage'));

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
          <Route path="holidays" element={
            <Suspense fallback={<PageLoader />}>
              <HolidaysPage />
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
          <Route path="profile-update-requests" element={
            <Suspense fallback={<PageLoader />}>
              <ProfileUpdateRequestsPage />
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
          <Route path="smart-policies/dashboard" element={
            <Suspense fallback={<PageLoader />}>
              <SmartDashboardPage />
            </Suspense>
          } />
          <Route path="smart-policies/marketplace" element={
            <Suspense fallback={<PageLoader />}>
              <PolicyMarketplacePage />
            </Suspense>
          } />
          <Route path="smart-policies/wizard" element={
            <Suspense fallback={<PageLoader />}>
              <PolicyWizardPage />
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
          <Route path="employee-debt" element={
            <Suspense fallback={<PageLoader />}>
              <EmployeeDebtPage />
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
          <Route path="qiwa" element={
            <Suspense fallback={<PageLoader />}>
              <QiwaPage />
            </Suspense>
          } />
          <Route path="qiwa/dashboard" element={
            <Suspense fallback={<PageLoader />}>
              <QiwaDashboardPage />
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
          <Route path="tracking-reports" element={
            <Suspense fallback={<PageLoader />}>
              <TrackingReportsPage />
            </Suspense>
          } />
          <Route path="org-structure" element={
            <Suspense fallback={<PageLoader />}>
              <OrgStructurePage />
            </Suspense>
          } />
          <Route path="tasks" element={
            <Suspense fallback={<PageLoader />}>
              <TasksPage />
            </Suspense>
          } />
          <Route path="my-tasks" element={
            <Suspense fallback={<PageLoader />}>
              <EmployeeTasksPage />
            </Suspense>
          } />
          <Route path="sales-commission" element={
            <Suspense fallback={<PageLoader />}>
              <SalesCommissionPage />
            </Suspense>
          } />
          <Route path="ai-chat" element={
            <Suspense fallback={<PageLoader />}>
              <AiChatPage />
            </Suspense>
          } />
          <Route path="genius-ai" element={
            <Suspense fallback={<PageLoader />}>
              <GeniusAiPage />
            </Suspense>
          } />
          <Route path="ai-predictive" element={
            <Suspense fallback={<PageLoader />}>
              <AiPredictivePage />
            </Suspense>
          } />
          <Route path="cost-centers" element={
            <Suspense fallback={<PageLoader />}>
              <CostCentersPage />
            </Suspense>
          } />
          <Route path="performance-reviews" element={
            <Suspense fallback={<PageLoader />}>
              <PerformanceReviewsPage />
            </Suspense>
          } />
          <Route path="goals" element={
            <Suspense fallback={<PageLoader />}>
              <GoalsPage />
            </Suspense>
          } />
          <Route path="recognition" element={
            <Suspense fallback={<PageLoader />}>
              <RecognitionPage />
            </Suspense>
          } />
          <Route path="company-config" element={
            <Suspense fallback={<PageLoader />}>
              <CompanyConfigPage />
            </Suspense>
          } />
          <Route path="kpi" element={
            <Suspense fallback={<PageLoader />}>
              <KPIPage />
            </Suspense>
          } />
          <Route path="bonus-management" element={
            <Suspense fallback={<PageLoader />}>
              <BonusManagementPage />
            </Suspense>
          } />
          <Route path="payroll-reports" element={
            <Suspense fallback={<PageLoader />}>
              <PayrollReportsPage />
            </Suspense>
          } />
          <Route path="commission-management" element={
            <Suspense fallback={<PageLoader />}>
              <CommissionManagementPage />
            </Suspense>
          } />
          <Route path="allowance-management" element={
            <Suspense fallback={<PageLoader />}>
              <AllowanceManagementPage />
            </Suspense>
          } />
          <Route path="logistics" element={
            <Suspense fallback={<PageLoader />}>
              <LogisticsPage />
            </Suspense>
          } />
          <Route path="saudization" element={
            <Suspense fallback={<PageLoader />}>
              <SaudizationPage />
            </Suspense>
          } />
          <Route path="projects" element={
            <Suspense fallback={<PageLoader />}>
              <ProjectsPage />
            </Suspense>
          } />
          <Route path="team-collaboration" element={
            <Suspense fallback={<PageLoader />}>
              <TeamCollaborationPage />
            </Suspense>
          } />
          {/* Social Feed Routes */}
          <Route path="muqeem" element={
            <Suspense fallback={<PageLoader />}>
              <MuqeemManagementPage />
            </Suspense>
          } />
          <Route path="settings/muqeem" element={
            <Suspense fallback={<PageLoader />}>
              <MuqeemSettingsPage />
            </Suspense>
          } />
          <Route path="social-feed" element={
            <Suspense fallback={<PageLoader />}>
              <SocialFeedPage />
            </Suspense>
          } />
          <Route path="social-feed/post/:id" element={
            <Suspense fallback={<PageLoader />}>
              <SocialFeedPage />
            </Suspense>
          } />
          <Route path="integrations" element={
            <Suspense fallback={<PageLoader />}>
              <IntegrationsPage />
            </Suspense>
          } />
          <Route path="settings/odoo" element={
            <Suspense fallback={<PageLoader />}>
              <OdooSettingsPage />
            </Suspense>
          } />
          {/* Enterprise Payroll Routes */}
          <Route path="payroll-analytics" element={
            <Suspense fallback={<PageLoader />}>
              <PayrollAnalyticsPage />
            </Suspense>
          } />
          <Route path="employee-self-service" element={
            <Suspense fallback={<PageLoader />}>
              <EmployeeSelfServicePage />
            </Suspense>
          } />
          <Route path="payroll-audit" element={
            <Suspense fallback={<PageLoader />}>
              <PayrollAuditPage />
            </Suspense>
          } />
          <Route path="payroll-simulation" element={
            <Suspense fallback={<PageLoader />}>
              <PayrollSimulationPage />
            </Suspense>
          } />
          <Route path="custody">
            <Route index element={
              <Suspense fallback={<PageLoader />}>
                <CustodyDashboard />
              </Suspense>
            } />
            <Route path="audit" element={
              <Suspense fallback={<PageLoader />}>
                <CustodyAuditPage />
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
