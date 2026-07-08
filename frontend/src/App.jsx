import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import useSessionTimeout from './hooks/useSessionTimeout'
import SessionTimeoutWarning from './components/SessionTimeoutWarning'
import LandingPage from './pages/LandingPage'
import NotFound from './pages/NotFound'
import LoginPortal from './pages/LoginPortal'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './features/dashboard/Dashboard'
import AdminDashboard from './features/admin/AdminDashboard'
import AssetList from './features/assets/AssetList'
import AssetDetail from './features/assets/AssetDetail'
import AssetForm from './features/assets/AssetForm'
import AssetEdit from './features/assets/AssetEdit'
import AssetTransfer from './features/assets/AssetTransfer'
import BulkImport from './features/assets/BulkImport'
import TransferHistory from './features/assets/TransferHistory'
import AssetDisposal from './features/assets/AssetDisposalEnhanced'
import AssetVerification from './features/assets/AssetVerification'
import BusinessRulesDashboard from './features/assets/BusinessRulesDashboard'
import AssetAnalytics from './features/assets/AssetAnalytics'
import PredictiveMaintenance from './features/assets/PredictiveMaintenance'
import AssetManagementHub from './features/assets/AssetManagementHub'
import WarrantyForm from './features/assets/WarrantyForm'
import InsuranceForm from './features/assets/InsuranceForm'
import CheckoutForm from './features/assets/CheckoutForm'
import CheckoutManagement from './features/assets/CheckoutManagement'
import BudgetForm from './features/assets/BudgetForm'
import DocumentUploadForm from './features/assets/DocumentUploadForm'
import MaintenanceRequestList from './features/maintenance/MaintenanceRequestList'
import MaintenanceRequestForm from './features/maintenance/MaintenanceRequestForm'
import MaintenanceRequestDetail from './features/maintenance/MaintenanceRequestDetail'
import WorkOrderList from './features/maintenance/WorkOrderList'
import WorkOrderDetail from './features/maintenance/WorkOrderDetail'
import CostTracking from './features/maintenance/CostTracking'
import PreventiveMaintenance from './features/maintenance/PreventiveMaintenance'
import NewPreventiveSchedule from './features/maintenance/NewPreventiveSchedule'
import EditPreventiveSchedule from './features/maintenance/EditPreventiveSchedule'
import ReportsPage from './features/reports/ReportsPage'
import ReportDetail from './features/reports/ReportDetail'
import UserManagement from './features/admin/UserManagement'
import AuditLog from './features/admin/AuditLog'
import SystemSettings from './features/admin/SystemSettings'
import SystemHealth from './features/admin/SystemHealth'
import BulkOperations from './features/admin/BulkOperations'
import SecurityCenter from './features/admin/SecurityCenter'
import SupervisorDashboard from './features/supervisor/SupervisorDashboard'
import TechnicianManagement from './features/supervisor/TechnicianManagement'
import EditTechnician from './features/supervisor/EditTechnician'
import TechnicianDetail from './features/supervisor/TechnicianDetail'
import AddTechnician from './features/supervisor/AddTechnician'
import RequestAssignment from './features/supervisor/RequestAssignment'
import SupervisorReports from './features/supervisor/SupervisorReports'
import TechnicianAvailability from './features/supervisor/TechnicianAvailability'
import RequestReassignment from './features/supervisor/RequestReassignment'
import SLAMonitoring from './features/supervisor/SLAMonitoring'
import AdvancedAnalytics from './features/supervisor/AdvancedAnalytics'
import TeamCommunication from './features/supervisor/TeamCommunication'
import PerformanceReviews from './features/supervisor/PerformanceReviews'
import UserProfile from './features/profile/UserProfile'
import OwnerDashboard from './features/owner/OwnerDashboard'
import MyAssets from './features/owner/MyAssets'
import MyCheckouts from './features/owner/MyCheckouts'
import MyRequests from './features/owner/MyRequests'
import MyRequestDetail from './features/owner/MyRequestDetail'
import NewMaintenanceRequest from './features/owner/NewMaintenanceRequest'
import NotificationCenter from './features/owner/NotificationCenter'
import AssetHistory from './features/owner/AssetHistory'
import QRScanner from './features/owner/QRScanner'
import QuickMaintenance from './features/owner/QuickMaintenance'
import QRCodeGenerator from './features/owner/QRCodeGenerator'
import FeedbackDashboard from './features/owner/FeedbackDashboard'
import AssetFeedbackForm from './features/owner/AssetFeedbackForm'
import PortalSuggestionForm from './features/owner/PortalSuggestionForm'
import AssetDetailView from './features/owner/AssetDetailView'
import TechnicianDashboard from './features/technician/TechnicianDashboard'
import TechnicianWorkOrders from './features/technician/TechnicianWorkOrders'
import TechnicianWorkOrderDetail from './features/technician/TechnicianWorkOrderDetail'
import TechnicianSchedule from './features/technician/TechnicianSchedule'
import TechnicianPerformance from './features/technician/TechnicianPerformance'
import TechnicianLeaderboard from './features/technician/TechnicianLeaderboard'
import TechnicianRouteOptimization from './features/technician/TechnicianRouteOptimization'
import TechnicianTimeTracking from './features/technician/TechnicianTimeTracking'
import PartsInventory from './features/technician/PartsInventory'
import PartsRequests from './features/technician/PartsRequests'
import TechnicianCommunication from './features/technician/TechnicianCommunication'
import AssetRequestForm from './features/assets/AssetRequestForm'
import MyAssetRequests from './features/assets/MyAssetRequests'
import AssetRequestDetail from './features/assets/AssetRequestDetail'
import RequestExtension from './features/owner/RequestExtension'
import AssignmentRequestQueue from './features/assets/AssignmentRequestQueue'
import BrowseAssets from './features/owner/BrowseAssets'
import PendingReturns from './features/assets/PendingReturns'
import ExtensionRequests from './features/manager/ExtensionRequests'

function PrivateRoute({ children }) {
  const { token } = useSelector((state) => state.auth)
  return token ? children : <Navigate to="/login" />
}

function App() {
  const { isAuthenticated, sessionTimeout } = useSelector((state) => state.auth)
  
  // Enable session timeout only when user is authenticated
  // Pass sessionTimeout directly (will be null/undefined when not authenticated)
  useSessionTimeout(isAuthenticated ? sessionTimeout : null, 5)
  
  return (
    <>
      <SessionTimeoutWarning />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPortal />} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="supervisor" element={<SupervisorDashboard />} />
        <Route path="assets" element={<AssetList />} />
        <Route path="assets/analytics" element={<AssetAnalytics />} />
        <Route path="assets/predictive" element={<PredictiveMaintenance />} />
        <Route path="assets/management" element={<AssetManagementHub />} />
        <Route path="assets/transfer-approvals" element={<TransferHistory />} />
        <Route path="assets/disposals" element={<AssetDisposal />} />
        <Route path="assets/verifications" element={<AssetVerification />} />
        <Route path="assets/business-rules" element={<BusinessRulesDashboard />} />
        <Route path="assets/warranties/new" element={<WarrantyForm />} />
        <Route path="assets/insurance/new" element={<InsuranceForm />} />
        <Route path="assets/checkouts" element={<CheckoutManagement />} />
        <Route path="assets/checkouts/new" element={<CheckoutForm />} />
        <Route path="assets/budgets/new" element={<BudgetForm />} />
        <Route path="assets/documents/new" element={<DocumentUploadForm />} />
        <Route path="assets/new" element={<AssetForm />} />
        <Route path="assets/bulk-import" element={<BulkImport />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route path="assets/:id/edit" element={<AssetEdit />} />
        <Route path="assets/:id/transfer" element={<AssetTransfer />} />
        {/* Asset Assignment Request System */}
        <Route path="asset-request/:assetId" element={<AssetRequestForm />} />
        <Route path="my-asset-requests" element={<MyAssetRequests />} />
        <Route path="asset-requests/:id" element={<AssetRequestDetail />} />
        <Route path="assignment-requests" element={<AssignmentRequestQueue />} />
        <Route path="assignment-requests/:id" element={<AssetRequestDetail />} />
        <Route path="extension-requests" element={<ExtensionRequests />} />
        <Route path="pending-returns" element={<PendingReturns />} />
        <Route path="pending-returns/:id" element={<PendingReturns />} />
        <Route path="maintenance/requests" element={<MaintenanceRequestList />} />
        <Route path="maintenance/requests/new" element={<MaintenanceRequestForm />} />
        <Route path="maintenance/requests/:id" element={<MaintenanceRequestDetail />} />
        <Route path="maintenance/work-orders" element={<WorkOrderList />} />
        <Route path="maintenance/work-orders/:id" element={<WorkOrderDetail />} />
        <Route path="maintenance/costs" element={<CostTracking />} />
        <Route path="maintenance/preventive" element={<PreventiveMaintenance />} />
        <Route path="maintenance/preventive/new" element={<NewPreventiveSchedule />} />
        <Route path="maintenance/preventive/edit/:id" element={<EditPreventiveSchedule />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:id" element={<ReportDetail />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="admin/users" element={<UserManagement />} />
        <Route path="admin/audit-log" element={<AuditLog />} />
        <Route path="admin/system-health" element={<SystemHealth />} />
        <Route path="admin/bulk-operations" element={<BulkOperations />} />
        <Route path="admin/security" element={<SecurityCenter />} />
        <Route path="admin/settings" element={<SystemSettings />} />
        <Route path="notifications" element={<NotificationCenter />} />
        <Route path="supervisor/technicians" element={<TechnicianManagement />} />
        <Route path="supervisor/technician/:id/edit" element={<EditTechnician />} />
        <Route path="supervisor/technician/:id" element={<TechnicianDetail />} />
        <Route path="supervisor/add-technician" element={<AddTechnician />} />
        <Route path="supervisor/assign" element={<RequestAssignment />} />
        <Route path="supervisor/reports" element={<SupervisorReports />} />
        <Route path="supervisor/availability" element={<TechnicianAvailability />} />
        <Route path="supervisor/reassign/:requestId" element={<RequestReassignment />} />
        <Route path="supervisor/sla-monitoring" element={<SLAMonitoring />} />
        <Route path="supervisor/analytics" element={<AdvancedAnalytics />} />
        <Route path="supervisor/communication" element={<TeamCommunication />} />
        <Route path="supervisor/performance-reviews" element={<PerformanceReviews />} />
        <Route path="owner" element={<OwnerDashboard />} />
        <Route path="owner/browse-assets" element={<BrowseAssets />} />
        <Route path="owner/my-assets" element={<MyAssets />} />
        <Route path="owner/asset-detail/:id" element={<AssetDetailView />} />
        <Route path="owner/my-assets/:id/history" element={<AssetHistory />} />
        <Route path="owner/my-checkouts" element={<MyCheckouts />} />
        <Route path="owner/my-requests" element={<MyRequests />} />
        <Route path="owner/my-requests/new" element={<NewMaintenanceRequest />} />
        <Route path="owner/my-requests/:id" element={<MyRequestDetail />} />
        {/* Asset Assignment Requests for Owners */}
        <Route path="owner/request-asset/:assetId" element={<AssetRequestForm />} />
        <Route path="owner/my-asset-requests" element={<MyAssetRequests />} />
        <Route path="owner/asset-requests/:id" element={<AssetRequestDetail />} />
        <Route path="owner/request-extension/:assignmentId" element={<RequestExtension />} />
        <Route path="owner/notifications" element={<NotificationCenter />} />
        <Route path="owner/qr-scanner" element={<QRScanner />} />
        <Route path="owner/qr-maintenance/:assetId" element={<QuickMaintenance />} />
        <Route path="owner/qr-generator" element={<QRCodeGenerator />} />
        <Route path="owner/feedback" element={<FeedbackDashboard />} />
        <Route path="owner/feedback/asset-feedback" element={<AssetFeedbackForm />} />
        <Route path="owner/feedback/suggestion" element={<PortalSuggestionForm />} />
        <Route path="technician" element={<TechnicianDashboard />} />
        <Route path="technician/work-orders" element={<TechnicianWorkOrders />} />
        <Route path="technician/work-orders/:id" element={<TechnicianWorkOrderDetail />} />
        <Route path="technician/schedule" element={<TechnicianSchedule />} />
        <Route path="technician/performance" element={<TechnicianPerformance />} />
        <Route path="technician/time-tracking" element={<TechnicianTimeTracking />} />
        <Route path="technician/communication" element={<TechnicianCommunication />} />
        <Route path="technician/parts-inventory" element={<PartsInventory />} />
        <Route path="technician/parts-requests" element={<PartsRequests />} />
        <Route path="technician/leaderboard" element={<TechnicianLeaderboard />} />
        <Route path="technician/route" element={<TechnicianRouteOptimization />} />
        <Route path="profile" element={<UserProfile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  )
}

export default App
