import { useState, useEffect, useRef } from 'react'
import { 
  FaUsers, 
  FaClipboardList, 
  FaExclamationTriangle, 
  FaCheckCircle,
  FaClock,
  FaChartBar,
  FaTasks,
  FaDollarSign,
  FaArrowUp,
  FaChartLine,
  FaComments,
  FaStar,
  FaTachometerAlt,
  FaCalendarAlt,
  FaSync,
  FaCog
} from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const SupervisorDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalTechnicians: 0,
    activeTechnicians: 0,
    pendingRequests: 0,
    overdueRequests: 0,
    inProgressRequests: 0,
    completedToday: 0,
    completedThisWeek: 0,
    totalCostThisMonth: 0,
    slaCompliance: 0,
    technicianWorkload: [],
    priorityBreakdown: { EMERGENCY: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    categoryBreakdown: {}
  })
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [requestsRes, usersRes, workOrdersRes] = await Promise.all([
        api.get('/maintenance/requests/'),
        api.get('/users/users/?role=MAINTENANCE_TECHNICIAN'),
        api.get('/maintenance/work-orders/')
      ])

      const requests = requestsRes.data.results || requestsRes.data
      const technicians = usersRes.data.results || usersRes.data
      const workOrders = workOrdersRes.data.results || workOrdersRes.data

      const pending = requests.filter(r => r.status === 'SUBMITTED').length
      const overdue = requests.filter(r => 
        r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && isOverdue(r)
      ).length
      const inProgress = requests.filter(r => 
        r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED' || r.status === 'WAITING_PARTS'
      ).length
      
      const today = new Date()
      const todayStr = today.toDateString()
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const completedToday = requests.filter(r => 
        r.status === 'COMPLETED' && new Date(r.updated_at).toDateString() === todayStr
      ).length

      const completedThisWeek = requests.filter(r => 
        r.status === 'COMPLETED' && new Date(r.updated_at) >= weekAgo
      ).length

      const completedRequests = requests.filter(r => r.status === 'COMPLETED')
      const onTimeRequests = completedRequests.filter(r => !isOverdue(r))
      const slaCompliance = completedRequests.length > 0 
        ? Math.round((onTimeRequests.length / completedRequests.length) * 100)
        : 100

      const priorityBreakdown = {
        EMERGENCY: requests.filter(r => r.priority === 'EMERGENCY' && r.status !== 'COMPLETED').length,
        HIGH: requests.filter(r => r.priority === 'HIGH' && r.status !== 'COMPLETED').length,
        MEDIUM: requests.filter(r => r.priority === 'MEDIUM' && r.status !== 'COMPLETED').length,
        LOW: requests.filter(r => r.priority === 'LOW' && r.status !== 'COMPLETED').length
      }

      const categoryBreakdown = {}
      requests.filter(r => r.status !== 'COMPLETED').forEach(r => {
        categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1
      })

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const totalCostThisMonth = workOrders
        .filter(wo => new Date(wo.created_at) >= firstDayOfMonth)
        .reduce((sum, wo) => sum + parseFloat(wo.cost_total || 0), 0)

      const workload = technicians.map(tech => {
        const assigned = requests.filter(r => 
          r.assigned_to?.id === tech.id && 
          ['ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS'].includes(r.status)
        ).length
        
        const completedThisWeek = requests.filter(r => 
          r.assigned_to?.id === tech.id && 
          r.status === 'COMPLETED' &&
          new Date(r.updated_at) >= weekAgo
        ).length

        return {
          id: tech.id,
          name: `${tech.first_name} ${tech.last_name}`,
          specialization: tech.specialization || 'General',
          activeRequests: assigned,
          completedThisWeek,
          status: tech.is_active ? 'Active' : 'Inactive'
        }
      }).sort((a, b) => b.activeRequests - a.activeRequests)

      const activity = requests
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 10)
        .map(r => ({
          id: r.id,
          request_id: r.request_id,
          action: getActivityAction(r),
          timestamp: r.updated_at,
          priority: r.priority,
          status: r.status
        }))

      setStats({
        totalTechnicians: technicians.length,
        activeTechnicians: technicians.filter(t => t.is_active).length,
        pendingRequests: pending,
        overdueRequests: overdue,
        inProgressRequests: inProgress,
        completedToday,
        completedThisWeek,
        totalCostThisMonth,
        slaCompliance,
        technicianWorkload: workload,
        priorityBreakdown,
        categoryBreakdown
      })

      setRecentActivity(activity)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isOverdue = (request) => {
    const created = new Date(request.created_at)
    const now = new Date()
    const hoursDiff = (now - created) / (1000 * 60 * 60)
    const slaHours = { 'EMERGENCY': 24, 'HIGH': 72, 'MEDIUM': 168, 'LOW': 336 }
    return hoursDiff > (slaHours[request.priority] || 168)
  }

  const getActivityAction = (request) => {
    if (request.status === 'COMPLETED') return 'Completed'
    if (request.status === 'IN_PROGRESS') return 'In Progress'
    if (request.status === 'ASSIGNED') return 'Assigned'
    if (request.status === 'SUBMITTED') return 'Submitted'
    return 'Updated'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'EMERGENCY': 'text-red-600',
      'HIGH': 'text-orange-600',
      'MEDIUM': 'text-blue-600',
      'LOW': 'text-gray-600'
    }
    return colors[priority] || 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Welcome Header - Compact Style */}
      <div className="mb-6 animate-slide-up">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-6 text-white relative overflow-hidden border border-blue-700">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48"></div>
          </div>
          
          <div className="relative flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <FaTachometerAlt className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">
                    Supervisor Dashboard
                  </h1>
                  <p className="text-blue-100 text-sm flex items-center gap-2 mt-1">
                    <FaUsers className="text-base" />
                    Maintenance Operations Overview
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm">
                  <FaCalendarAlt className="text-xs" />
                  <span className="font-medium">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm">
                  <FaUsers className="text-xs" />
                  <span className="font-medium">
                    {stats.activeTechnicians} Active Technicians
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/30 transition-all flex items-center gap-2 border border-white/30 text-sm"
              >
                <FaSync className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 animate-scale-in">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <FaUsers className="text-4xl text-blue-600" />
            <span className="text-sm text-gray-500">Team</span>
          </div>
          <p className="text-gray-600 text-sm mb-1">Active Technicians</p>
          <p className="text-3xl font-bold text-gray-800">
            {stats.activeTechnicians}/{stats.totalTechnicians}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all cursor-pointer"
             onClick={() => navigate('/dashboard/supervisor/assign')}>
          <div className="flex items-center justify-between mb-4">
            <FaClipboardList className="text-4xl text-yellow-600" />
            <span className="text-sm text-yellow-600 font-semibold">Action Needed</span>
          </div>
          <p className="text-gray-600 text-sm mb-1">Pending Assignment</p>
          <p className="text-3xl font-bold text-gray-800">{stats.pendingRequests}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <FaExclamationTriangle className="text-4xl text-red-600" />
            <span className="text-sm text-red-600 font-semibold">Urgent</span>
          </div>
          <p className="text-gray-600 text-sm mb-1">Overdue Requests</p>
          <p className="text-3xl font-bold text-gray-800">{stats.overdueRequests}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <FaClock className="text-4xl text-indigo-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">In Progress</p>
          <p className="text-3xl font-bold text-gray-800">{stats.inProgressRequests}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-scale-in">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <FaCheckCircle className="text-4xl text-green-600" />
            <div className="flex items-center gap-1 text-green-600">
              <FaArrowUp className="text-sm" />
              <span className="text-sm font-semibold">+{stats.completedThisWeek}</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Completed Today</p>
          <p className="text-3xl font-bold text-gray-800">{stats.completedToday}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <FaChartBar className="text-4xl text-purple-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">SLA Compliance</p>
          <p className="text-3xl font-bold text-gray-800">{stats.slaCompliance}%</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <FaDollarSign className="text-4xl text-emerald-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Cost This Month</p>
          <p className="text-3xl font-bold text-gray-800">
            ETB {stats.totalCostThisMonth.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <FaTasks className="text-4xl text-cyan-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">This Week</p>
          <p className="text-3xl font-bold text-gray-800">{stats.completedThisWeek}</p>
        </div>
      </div>

      {/* New High-Priority Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Management Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div 
            className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer text-white"
            onClick={() => navigate('/dashboard/supervisor/availability')}
          >
            <FaUsers className="text-5xl mb-4 opacity-80" />
            <h3 className="text-2xl font-bold mb-2">Technician Availability</h3>
            <p className="text-purple-100">Manage schedules, time off, and shifts</p>
          </div>

          <div 
            className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer text-white"
            onClick={() => navigate('/dashboard/supervisor/sla-monitoring')}
          >
            <FaClock className="text-5xl mb-4 opacity-80" />
            <h3 className="text-2xl font-bold mb-2">SLA Monitoring</h3>
            <p className="text-blue-100">Track response times and compliance</p>
          </div>

          <div 
            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer text-white"
            onClick={() => navigate('/dashboard/supervisor/reports')}
          >
            <FaChartBar className="text-5xl mb-4 opacity-80" />
            <h3 className="text-2xl font-bold mb-2">Reports & Analytics</h3>
            <p className="text-indigo-100">Generate performance reports</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Additional Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer text-white"
            onClick={() => navigate('/dashboard/supervisor/analytics')}
          >
            <FaChartLine className="text-5xl mb-4 opacity-80" />
            <h3 className="text-2xl font-bold mb-2">Advanced Analytics</h3>
            <p className="text-green-100">Trends, charts, and insights</p>
          </div>

          <div 
            className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer text-white"
            onClick={() => navigate('/dashboard/supervisor/communication')}
          >
            <FaComments className="text-5xl mb-4 opacity-80" />
            <h3 className="text-2xl font-bold mb-2">Team Communication</h3>
            <p className="text-pink-100">Message and broadcast to team</p>
          </div>

          <div 
            className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer text-white"
            onClick={() => navigate('/dashboard/supervisor/performance-reviews')}
          >
            <FaStar className="text-5xl mb-4 opacity-80" />
            <h3 className="text-2xl font-bold mb-2">Performance Reviews</h3>
            <p className="text-yellow-100">Evaluate and provide feedback</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 animate-slide-up">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Active Requests by Priority</h2>
          </div>
          <div className="p-6 space-y-4">
            {Object.entries(stats.priorityBreakdown).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    priority === 'EMERGENCY' ? 'bg-red-600' :
                    priority === 'HIGH' ? 'bg-orange-600' :
                    priority === 'MEDIUM' ? 'bg-blue-600' : 'bg-gray-600'
                  }`}></div>
                  <span className="text-gray-700 font-medium">{priority}</span>
                </div>
                <span className="text-2xl font-bold text-gray-800">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 animate-slide-up">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Requests by Category</h2>
          </div>
          <div className="p-6 space-y-3">
            {Object.entries(stats.categoryBreakdown).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active requests</p>
            ) : (
              Object.entries(stats.categoryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">{category}</span>
                    <span className="text-xl font-bold text-indigo-600">{count}</span>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 animate-slide-up">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
          </div>
          <div className="p-6">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 6).map((activity) => (
                  <div 
                    key={activity.id}
                    onClick={() => navigate(`/dashboard/maintenance/requests/${activity.id}`)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-800">{activity.request_id}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{activity.action}</span>
                      <span className={`text-xs font-semibold ${getPriorityColor(activity.priority)}`}>
                        {activity.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  )
}

export default SupervisorDashboard
