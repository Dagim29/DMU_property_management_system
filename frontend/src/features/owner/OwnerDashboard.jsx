import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Package,
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Bell,
  ArrowRight,
  BarChart3,
  PieChart,
  Camera,
  MessageSquare,
  Zap
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function OwnerDashboard() {
  const { user, token } = useSelector((state) => state.auth)
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/owner/dashboard/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16 mb-4"></div>
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    )
  }

  const stats = dashboardData?.statistics || {}

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Compact Welcome Header */}
      <div className="mb-6 animate-slide-up">
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                Welcome back, {user?.first_name || user?.username}! 👋
              </h1>
              <p className="text-purple-100">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            {user?.department && (
              <div className="hidden md:block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <span className="font-semibold">{user.department}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics - 5 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <StatCard
          title="My Assets"
          value={stats.assigned_assets?.total || 0}
          icon={Package}
          color="blue"
          link="/dashboard/owner/my-assets"
        />
        <StatCard
          title="Asset Requests"
          value={stats.asset_requests?.total || 0}
          icon={Clock}
          color="indigo"
          link="/dashboard/owner/my-asset-requests"
          badge={stats.asset_requests?.pending > 0 ? stats.asset_requests.pending : null}
        />
        <StatCard
          title="Active Checkouts"
          value={stats.checkouts?.active || 0}
          icon={Clock}
          color="purple"
          link="/dashboard/owner/my-checkouts"
        />
        <StatCard
          title="Maintenance Requests"
          value={stats.maintenance_requests?.pending || 0}
          icon={Wrench}
          color="orange"
          link="/dashboard/owner/my-requests"
        />
        <StatCard
          title="Overdue Returns"
          value={stats.checkouts?.overdue || 0}
          icon={AlertTriangle}
          color="red"
          alert={stats.checkouts?.overdue > 0}
          pulse={stats.checkouts?.overdue > 0}
        />
      </div>

      {/* Critical Alert - Overdue Items */}
      {dashboardData?.overdue_checkouts?.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-xl shadow-md mb-6 animate-slide-up">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                {dashboardData.overdue_checkouts.length} Overdue Item{dashboardData.overdue_checkouts.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-2">
                {dashboardData.overdue_checkouts.slice(0, 3).map((checkout) => (
                  <div key={checkout.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{checkout.asset.name}</p>
                      <p className="text-xs text-gray-600">{checkout.asset.asset_id}</p>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                      {checkout.days_overdue}d overdue
                    </span>
                  </div>
                ))}
              </div>
              <Link
                to="/dashboard/owner/my-checkouts"
                className="inline-flex items-center gap-2 text-red-700 hover:text-red-800 font-semibold text-sm mt-3"
              >
                View all checkouts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions - Takes 1 column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 h-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <QuickActionButton
                to="/dashboard/owner/browse-assets"
                icon={Package}
                title="Request New Asset"
                color="from-green-500 to-emerald-600"
              />
              <QuickActionButton
                to="/dashboard/owner/qr-scanner"
                icon={Camera}
                title="Scan QR Code"
                color="from-indigo-500 to-purple-600"
              />
              <QuickActionButton
                to="/dashboard/owner/my-requests/new"
                icon={Wrench}
                title="Submit Maintenance Request"
                color="from-blue-500 to-cyan-600"
              />
              <QuickActionButton
                to="/dashboard/owner/my-assets"
                icon={Package}
                title="Browse My Assets"
                color="from-purple-500 to-pink-600"
              />
              <QuickActionButton
                to="/dashboard/owner/feedback"
                icon={MessageSquare}
                title="Give Feedback"
                color="from-orange-500 to-red-600"
              />
            </div>
          </div>
        </div>

        {/* Pending Requests - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-purple-600" />
                My Maintenance Requests
              </h2>
              <Link
                to="/dashboard/owner/my-requests"
                className="text-purple-600 hover:text-purple-700 text-sm font-semibold flex items-center gap-1"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {dashboardData?.pending_requests?.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {dashboardData.pending_requests.slice(0, 5).map((request) => (
                  <Link
                    key={request.id}
                    to={`/dashboard/maintenance/requests/${request.id}`}
                    className="block p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-600">{request.request_id}</span>
                        <PriorityBadge priority={request.priority} />
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="font-semibold text-gray-900 mb-1">{request.asset_name}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                      {request.assigned_to_name && (
                        <span>Assigned: {request.assigned_to_name}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="h-16 w-16 mx-auto mb-3 text-green-400" />
                <p className="font-medium">No pending requests</p>
                <p className="text-sm mt-1">All your maintenance requests are up to date</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Asset Status Distribution */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-purple-600" />
            Asset Status
          </h2>
          {stats.assigned_assets?.by_status && Object.keys(stats.assigned_assets.by_status).length > 0 ? (
            <div className="h-64">
              <Doughnut
                data={{
                  labels: Object.keys(stats.assigned_assets.by_status).map(s => s.replace('_', ' ')),
                  datasets: [{
                    data: Object.values(stats.assigned_assets.by_status),
                    backgroundColor: [
                      'rgba(34, 197, 94, 0.8)',
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(251, 146, 60, 0.8)',
                      'rgba(239, 68, 68, 0.8)'
                    ],
                    borderColor: [
                      'rgba(34, 197, 94, 1)',
                      'rgba(59, 130, 246, 1)',
                      'rgba(251, 146, 60, 1)',
                      'rgba(239, 68, 68, 1)'
                    ],
                    borderWidth: 2
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 12,
                        font: { size: 11 }
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No data available</p>
            </div>
          )}
        </div>

        {/* Maintenance Priority */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Maintenance Priority
          </h2>
          {stats.maintenance_requests?.by_priority && stats.maintenance_requests.by_priority.length > 0 ? (
            <div className="h-64">
              <Bar
                data={{
                  labels: stats.maintenance_requests.by_priority.map(item => item.priority),
                  datasets: [{
                    label: 'Requests',
                    data: stats.maintenance_requests.by_priority.map(item => item.count),
                    backgroundColor: [
                      'rgba(239, 68, 68, 0.8)',
                      'rgba(251, 146, 60, 0.8)',
                      'rgba(234, 179, 8, 0.8)',
                      'rgba(34, 197, 94, 0.8)'
                    ],
                    borderColor: [
                      'rgba(239, 68, 68, 1)',
                      'rgba(251, 146, 60, 1)',
                      'rgba(234, 179, 8, 1)',
                      'rgba(34, 197, 94, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-600" />
            Recent Notifications
          </h2>
          {dashboardData?.notifications?.filter(n => !n.is_read).length > 0 && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
              {dashboardData.notifications.filter(n => !n.is_read).length} new
            </span>
          )}
        </div>
        {dashboardData?.notifications?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.notifications.slice(0, 6).map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all ${
                  notification.is_read
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-purple-50 border-purple-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <NotificationIcon type={notification.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{notification.title}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Bell className="h-16 w-16 mx-auto mb-3" />
            <p>No notifications</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, link, alert, pulse, badge }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600'
  }

  const content = (
    <div className={`bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 ${alert ? 'ring-2 ring-red-400' : ''} ${pulse ? 'animate-pulse-slow' : ''} relative`}>
      {badge && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
          {badge}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
    </div>
  )

  return link ? <Link to={link} className="block">{content}</Link> : content
}

function QuickActionButton({ to, icon: Icon, title, color }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-md transition-all group"
    >
      <div className={`p-2 rounded-lg bg-gradient-to-br ${color} group-hover:scale-110 transition-transform shadow-md`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors text-sm">
        {title}
      </span>
      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 ml-auto group-hover:translate-x-1 transition-all" />
    </Link>
  )
}

function StatusBadge({ status }) {
  const statusColors = {
    SUBMITTED: 'bg-blue-100 text-blue-800',
    ASSIGNED: 'bg-purple-100 text-purple-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    WAITING_PARTS: 'bg-orange-100 text-orange-800'
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const priorityColors = {
    EMERGENCY: 'bg-red-100 text-red-800 ring-1 ring-red-600',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800'
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[priority] || 'bg-gray-100 text-gray-800'}`}>
      {priority}
    </span>
  )
}

function NotificationIcon({ type }) {
  const icons = {
    SUCCESS: <CheckCircle className="h-5 w-5 text-green-500" />,
    WARNING: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    ERROR: <AlertTriangle className="h-5 w-5 text-red-500" />,
    INFO: <Bell className="h-5 w-5 text-blue-500" />
  }

  return icons[type] || icons.INFO
}
