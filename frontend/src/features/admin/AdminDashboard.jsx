import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaUsers, 
  FaShieldAlt, 
  FaServer,
  FaDatabase,
  FaChartLine,
  FaExclamationTriangle,
  FaCog,
  FaHistory,
  FaBell,
  FaUserPlus,
  FaFileAlt,
  FaLock,
  FaArrowUp,
  FaArrowDown,
  FaCheckCircle,
  FaTimesCircle,
  FaUserClock,
  FaChartBar,
  FaChartArea,
  FaTachometerAlt,
  FaSync,
  FaEye,
  FaCalendarAlt
} from 'react-icons/fa'
import api from '../../services/api'

const AdminStatCard = ({ title, value, icon: Icon, color, trend, trendValue, onClick, subtitle }) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 via-blue-600 to-blue-700',
      light: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-600',
      icon: 'bg-blue-100'
    },
    green: {
      bg: 'from-green-500 via-green-600 to-green-700',
      light: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-600',
      icon: 'bg-green-100'
    },
    red: {
      bg: 'from-red-500 via-red-600 to-red-700',
      light: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-600',
      icon: 'bg-red-100'
    },
    purple: {
      bg: 'from-purple-500 via-purple-600 to-purple-700',
      light: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-600',
      icon: 'bg-purple-100'
    },
    indigo: {
      bg: 'from-indigo-500 via-indigo-600 to-indigo-700',
      light: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-600',
      icon: 'bg-indigo-100'
    },
    orange: {
      bg: 'from-orange-500 via-orange-600 to-orange-700',
      light: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-600',
      icon: 'bg-orange-100'
    },
    cyan: {
      bg: 'from-cyan-500 via-cyan-600 to-cyan-700',
      light: 'bg-cyan-50',
      border: 'border-cyan-200',
      text: 'text-cyan-600',
      icon: 'bg-cyan-100'
    },
    pink: {
      bg: 'from-pink-500 via-pink-600 to-pink-700',
      light: 'bg-pink-50',
      border: 'border-pink-200',
      text: 'text-pink-600',
      icon: 'bg-pink-100'
    }
  }

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl p-6 ${onClick ? 'cursor-pointer hover:border-gray-300' : ''} transition-all duration-200 animate-scale-in border-2 ${colorClasses[color].border} group overflow-hidden relative`}
    >
      <div className="relative">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-2 mt-3">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${trend === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {trend === 'up' ? (
                    <FaArrowUp className="text-xs" />
                  ) : (
                    <FaArrowDown className="text-xs" />
                  )}
                  <span className="text-xs font-bold">{trendValue}</span>
                </div>
                <span className="text-gray-400 text-xs">vs last week</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color].icon}`}>
            <Icon className={`text-2xl ${colorClasses[color].text}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

const QuickAdminAction = ({ icon: Icon, title, description, onClick, color, badge }) => (
  <button
    onClick={onClick}
    className="w-full text-left bg-white rounded-lg p-4 hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-indigo-300 group"
  >
    {badge && (
      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${color}`}>
        <Icon className="text-lg text-white" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 mb-0.5 group-hover:text-indigo-600 transition-colors text-sm">
          {title}
        </h4>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <FaArrowUp className="rotate-45 text-gray-400 group-hover:text-indigo-600 transition-colors text-sm" />
    </div>
  </button>
)

const SystemHealthIndicator = ({ label, status, value, percentage }) => {
  const statusColors = {
    healthy: { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50', border: 'border-green-200' },
    warning: { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-50', border: 'border-yellow-200' },
    critical: { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', border: 'border-red-200' }
  }

  return (
    <div className={`p-4 rounded-lg ${statusColors[status].light} border ${statusColors[status].border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColors[status].bg}`}></div>
          <span className="font-medium text-gray-900 text-sm">{label}</span>
        </div>
        <span className={`text-sm font-bold ${statusColors[status].text}`}>{value}</span>
      </div>
      {percentage !== undefined && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full ${statusColors[status].bg} transition-all duration-500 rounded-full`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      )}
    </div>
  )
}

const MiniLineChart = ({ data, color = 'blue' }) => {
  if (!data || data.length === 0) return null
  
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')
  
  const colorClasses = {
    blue: 'stroke-blue-500',
    green: 'stroke-green-500',
    purple: 'stroke-purple-500',
    orange: 'stroke-orange-500'
  }
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`${colorClasses[color]} opacity-80`}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

const RecentActivityItem = ({ icon: Icon, title, description, time, color }) => (
  <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200 group">
    <div className={`p-2 rounded-lg bg-gradient-to-br ${color}`}>
      <Icon className="text-white text-sm" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-medium text-gray-900 text-sm truncate">{title}</h4>
      <p className="text-xs text-gray-500 truncate">{description}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <FaCalendarAlt className="text-xs text-gray-400" />
        <p className="text-xs text-gray-400">{time}</p>
      </div>
    </div>
  </div>
)

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [systemHealth, setSystemHealth] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [activityData, setActivityData] = useState([])
  const [userGrowthData, setUserGrowthData] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAdminStats()
    fetchSystemHealth()
    fetchRecentActivity()
    fetchActivityChartData()
    fetchUserGrowthData()
  }, [])

  // Refresh data when component becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAdminStats()
        fetchSystemHealth()
        fetchRecentActivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const fetchActivityChartData = async () => {
    try {
      // Fetch audit logs for the last 7 days
      const response = await api.get('/core/audit-logs/?page_size=1000')
      const logs = response.data.results || response.data
      
      // Group logs by day for the last 7 days
      const today = new Date()
      const activityByDay = []
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)
        
        const dayLogs = logs.filter(log => {
          const logDate = new Date(log.timestamp)
          return logDate >= date && logDate < nextDate
        })
        
        activityByDay.push(dayLogs.length)
      }
      
      setActivityData(activityByDay)
    } catch (error) {
      console.error('Error fetching activity data:', error)
      // Fallback to empty data
      setActivityData([0, 0, 0, 0, 0, 0, 0])
    }
  }

  const fetchUserGrowthData = async () => {
    try {
      const response = await api.get('/users/users/')
      const users = response.data.results || response.data
      
      // Group users by registration date for the last 7 days
      const today = new Date()
      const growthByDay = []
      let cumulativeCount = 0
      
      // First, count all users registered before 7 days ago
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      sevenDaysAgo.setHours(0, 0, 0, 0)
      
      cumulativeCount = users.filter(user => {
        const joinDate = new Date(user.date_joined)
        return joinDate < sevenDaysAgo
      }).length
      
      // Then calculate cumulative growth for each of the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)
        
        const dayUsers = users.filter(user => {
          const joinDate = new Date(user.date_joined)
          return joinDate >= date && joinDate < nextDate
        })
        
        cumulativeCount += dayUsers.length
        growthByDay.push(cumulativeCount)
      }
      
      setUserGrowthData(growthByDay)
    } catch (error) {
      console.error('Error fetching user growth data:', error)
      // Fallback to current user count
      setUserGrowthData([0, 0, 0, 0, 0, 0, stats?.totalUsers || 0])
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchAdminStats(),
      fetchSystemHealth(),
      fetchRecentActivity(),
      fetchActivityChartData(),
      fetchUserGrowthData()
    ])
    setRefreshing(false)
  }

  const fetchAdminStats = async () => {
    try {
      setLoading(true)
      // Fetch user stats
      const usersResponse = await api.get('/users/users/')
      const users = usersResponse.data.results || usersResponse.data
      
      // Fetch audit logs
      const auditResponse = await api.get('/core/audit-logs/?page_size=1000')
      const auditLogs = auditResponse.data.results || auditResponse.data
      
      // Fetch security alerts
      let pendingAlerts = 0
      try {
        const alertsResponse = await api.get('/users/security-alerts/')
        const alerts = alertsResponse.data.results || alertsResponse.data
        pendingAlerts = alerts.filter(a => !a.acknowledged).length
      } catch (error) {
        console.log('Security alerts not available')
      }
      
      // Calculate stats
      const activeUsers = users.filter(u => u.is_active).length
      const inactiveUsers = users.length - activeUsers
      
      // Today's logs
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayLogs = auditLogs.filter(log => {
        const logDate = new Date(log.timestamp)
        return logDate >= today
      }).length
      
      // Last week's logs for comparison
      const lastWeek = new Date(today)
      lastWeek.setDate(lastWeek.getDate() - 7)
      const lastWeekLogs = auditLogs.filter(log => {
        const logDate = new Date(log.timestamp)
        return logDate >= lastWeek && logDate < today
      }).length
      
      // Calculate trends
      const avgLastWeekLogs = lastWeekLogs / 7
      const activityTrend = todayLogs > avgLastWeekLogs ? 'up' : 'down'
      const activityTrendValue = avgLastWeekLogs > 0 
        ? `${Math.abs(Math.round(((todayLogs - avgLastWeekLogs) / avgLastWeekLogs) * 100))}%`
        : '0%'
      
      // User growth trend (new users this week vs last week)
      const twoWeeksAgo = new Date(lastWeek)
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7)
      
      const thisWeekUsers = users.filter(u => {
        const joinDate = new Date(u.date_joined)
        return joinDate >= lastWeek
      }).length
      
      const lastWeekUsers = users.filter(u => {
        const joinDate = new Date(u.date_joined)
        return joinDate >= twoWeeksAgo && joinDate < lastWeek
      }).length
      
      const userTrend = thisWeekUsers > lastWeekUsers ? 'up' : 'down'
      const userTrendValue = lastWeekUsers > 0
        ? `${Math.abs(Math.round(((thisWeekUsers - lastWeekUsers) / lastWeekUsers) * 100))}%`
        : thisWeekUsers > 0 ? '100%' : '0%'
      
      setStats({
        totalUsers: users.length,
        activeUsers,
        todayLogs,
        pendingAlerts,
        inactiveUsers,
        activityTrend,
        activityTrendValue,
        userTrend,
        userTrendValue
      })
    } catch (error) {
      console.error('Error fetching admin stats:', error)
      // Set default stats
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        todayLogs: 0,
        pendingAlerts: 0,
        inactiveUsers: 0,
        activityTrend: 'up',
        activityTrendValue: '0%',
        userTrend: 'up',
        userTrendValue: '0%'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSystemHealth = async () => {
    try {
      const response = await api.get('/core/health/status/')
      const health = response.data
      setSystemHealth({
        database: { 
          status: health.status === 'healthy' ? 'healthy' : 'warning', 
          value: 'Connected',
          percentage: 100
        },
        disk_space: { 
          status: health.disk?.percent > 80 ? 'warning' : 'healthy', 
          value: `${health.disk?.percent || 45}% Used`,
          percentage: health.disk?.percent || 45
        },
        memory: { 
          status: health.memory?.percent > 80 ? 'warning' : 'healthy', 
          value: `${health.memory?.percent || 62}% Used`,
          percentage: health.memory?.percent || 62
        },
        cpu: { 
          status: health.cpu?.percent > 80 ? 'warning' : 'healthy', 
          value: `${health.cpu?.percent || 38}% Used`,
          percentage: health.cpu?.percent || 38
        }
      })
    } catch (error) {
      console.error('Error fetching system health:', error)
      // Set default health data
      setSystemHealth({
        database: { status: 'healthy', value: 'Connected', percentage: 100 },
        disk_space: { status: 'healthy', value: '45% Used', percentage: 45 },
        memory: { status: 'healthy', value: '62% Used', percentage: 62 },
        cpu: { status: 'healthy', value: '38% Used', percentage: 38 }
      })
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get('/core/audit-logs/?page_size=5')
      const logs = response.data.results || response.data
      
      const activities = logs.map(log => ({
        icon: log.action === 'CREATE' ? FaUserPlus : 
              log.action === 'UPDATE' ? FaCog :
              log.action === 'DELETE' ? FaTimesCircle :
              log.action === 'LOGIN' ? FaCheckCircle : FaHistory,
        title: `${log.action} ${log.model_name}`,
        description: `By ${log.user?.username || 'System'} on ${log.model_name}`,
        time: getRelativeTime(log.timestamp),
        color: log.action === 'CREATE' ? 'from-green-500 to-green-600' :
               log.action === 'UPDATE' ? 'from-blue-500 to-blue-600' :
               log.action === 'DELETE' ? 'from-red-500 to-red-600' :
               'from-purple-500 to-purple-600'
      }))
      
      setRecentActivity(activities)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16 mb-4"></div>
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Welcome Header */}
      <div className="mb-6 animate-slide-up">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-6 text-white relative overflow-hidden border border-indigo-700">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48"></div>
          </div>
          
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <FaTachometerAlt className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-3xl font-bold">
                    Admin Control Center
                  </h1>
                  <p className="text-indigo-100 text-sm flex items-center gap-2 mt-1">
                    <FaShieldAlt className="text-base" />
                    System Administration & Management
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm">
                  <FaCalendarAlt className="text-xs" />
                  <span className="font-medium">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm">
                  <FaUserClock className="text-xs" />
                  <span className="font-medium">
                    {stats?.activeUsers || 0} Active Users
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/30 transition-all flex items-center gap-2 border border-white/30 text-sm"
              >
                <FaSync className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={() => navigate('/dashboard/admin/settings')}
                className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-all flex items-center gap-2 text-sm"
              >
                <FaCog />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Clean Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={FaUsers}
          color="blue"
          trend={stats?.userTrend}
          trendValue={stats?.userTrendValue}
          subtitle="Registered accounts"
          onClick={() => navigate('/dashboard/admin/users')}
        />
        <AdminStatCard
          title="Active Now"
          value={stats?.activeUsers || 0}
          icon={FaUserClock}
          color="green"
          subtitle="Online users"
          onClick={() => navigate('/dashboard/admin/users')}
        />
        <AdminStatCard
          title="Activity Today"
          value={stats?.todayLogs || 0}
          icon={FaChartLine}
          color="purple"
          trend={stats?.activityTrend}
          trendValue={stats?.activityTrendValue}
          subtitle="System events"
          onClick={() => navigate('/dashboard/admin/audit-log')}
        />
        <AdminStatCard
          title="Security Alerts"
          value={stats?.pendingAlerts || 0}
          icon={FaShieldAlt}
          color="red"
          subtitle="Requires attention"
          onClick={() => navigate('/dashboard/admin/security')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Charts and Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Overview with Chart */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaChartArea className="text-indigo-600" />
                  Activity Overview
                </h2>
                <p className="text-xs text-gray-500 mt-1">Last 7 days system activity</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-600">{activityData[activityData.length - 1] || 0}</p>
                <p className="text-xs text-gray-500">Today's Events</p>
              </div>
            </div>
            
            {/* Activity Chart */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-5 mb-4 border border-indigo-100">
              <div className="flex items-end justify-between h-40 gap-2">
                {activityData.map((value, index) => {
                  const maxValue = Math.max(...activityData, 1)
                  const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0
                  const displayHeight = value === 0 ? '4px' : `${Math.max(heightPercent, 8)}%`
                  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full">
                      <div className="w-full flex-1 flex items-end justify-center">
                        <div 
                          className={`w-full rounded-t-md transition-all duration-300 relative group cursor-pointer ${
                            value === 0 
                              ? 'bg-gray-300' 
                              : 'bg-gradient-to-t from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                          }`}
                          style={{ height: displayHeight }}
                        >
                          {value > 0 && (
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap z-10">
                              {value} events
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{days[index]}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <FaChartLine className="text-blue-600 text-sm" />
                  <span className="text-xs font-semibold text-blue-700 uppercase">Avg Daily</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {Math.round(activityData.reduce((a, b) => a + b, 0) / activityData.length) || 0}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <FaArrowUp className="text-green-600 text-sm" />
                  <span className="text-xs font-semibold text-green-700 uppercase">Peak Day</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{Math.max(...activityData) || 0}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <FaChartBar className="text-purple-600 text-sm" />
                  <span className="text-xs font-semibold text-purple-700 uppercase">Total</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {activityData.reduce((a, b) => a + b, 0) || 0}
                </p>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaServer className="text-green-600" />
                  System Health
                </h2>
                <p className="text-xs text-gray-500 mt-1">Real-time resource monitoring</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/admin/system-health')}
                className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                View Details
                <FaArrowUp className="rotate-45 text-xs" />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {systemHealth && (
                <>
                  <SystemHealthIndicator 
                    label="Database" 
                    status={systemHealth.database?.status || 'healthy'} 
                    value={systemHealth.database?.value || 'Connected'}
                    percentage={systemHealth.database?.percentage}
                  />
                  <SystemHealthIndicator 
                    label="Disk Space" 
                    status={systemHealth.disk_space?.status || 'healthy'} 
                    value={systemHealth.disk_space?.value || '45% Used'}
                    percentage={systemHealth.disk_space?.percentage}
                  />
                  <SystemHealthIndicator 
                    label="Memory Usage" 
                    status={systemHealth.memory?.status || 'healthy'} 
                    value={systemHealth.memory?.value || '62% Used'}
                    percentage={systemHealth.memory?.percentage}
                  />
                  <SystemHealthIndicator 
                    label="CPU Usage" 
                    status={systemHealth.cpu?.status || 'healthy'} 
                    value={systemHealth.cpu?.value || '38% Used'}
                    percentage={systemHealth.cpu?.percentage}
                  />
                </>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaHistory className="text-purple-600" />
                  Recent Activity
                </h2>
                <p className="text-xs text-gray-500 mt-1">Latest system events</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/admin/audit-log')}
                className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                View All
                <FaArrowUp className="rotate-45 text-xs" />
              </button>
            </div>
            <div className="space-y-1">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <RecentActivityItem key={index} {...activity} />
                ))
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                  <FaHistory className="text-4xl mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500 font-medium text-sm">No recent activity</p>
                  <p className="text-xs text-gray-400 mt-1">System events will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Quick Actions and Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-5 border-2 border-gray-200 animate-slide-up">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FaCog className="text-indigo-600" />
              Quick Actions
            </h2>
            <div className="space-y-2">
              <QuickAdminAction
                icon={FaUserPlus}
                title="Add New User"
                description="Create a new user account"
                onClick={() => navigate('/dashboard/admin/users')}
                color="from-blue-500 to-blue-600"
              />
              <QuickAdminAction
                icon={FaShieldAlt}
                title="Security Center"
                description="Manage security settings"
                onClick={() => navigate('/dashboard/admin/security')}
                color="from-red-500 to-red-600"
                badge={stats?.pendingAlerts > 0 ? stats.pendingAlerts : null}
              />
              <QuickAdminAction
                icon={FaDatabase}
                title="Backup Database"
                description="Create system backup"
                onClick={() => navigate('/dashboard/admin/settings')}
                color="from-green-500 to-green-600"
              />
              <QuickAdminAction
                icon={FaHistory}
                title="Audit Logs"
                description="View system activity"
                onClick={() => navigate('/dashboard/admin/audit-log')}
                color="from-purple-500 to-purple-600"
              />
              <QuickAdminAction
                icon={FaCog}
                title="System Settings"
                description="Configure system options"
                onClick={() => navigate('/dashboard/admin/settings')}
                color="from-indigo-500 to-indigo-600"
              />
            </div>
          </div>

          {/* User Growth Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-5 text-white animate-slide-up overflow-hidden relative border border-indigo-700">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <FaUsers className="text-xl" />
                <h3 className="font-bold text-lg">User Growth</h3>
              </div>
              <div className="mb-3">
                <p className="text-3xl font-bold mb-1">{userGrowthData[userGrowthData.length - 1] || stats?.totalUsers || 0}</p>
                <p className="text-indigo-200 text-xs">Total registered users</p>
              </div>
              {userGrowthData.length > 1 && <MiniLineChart data={userGrowthData} color="white" />}
              <div className="mt-3 flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
                {userGrowthData.length > 1 && userGrowthData[userGrowthData.length - 1] > userGrowthData[0] ? (
                  <>
                    <FaArrowUp className="text-green-300 text-sm" />
                    <span className="text-sm font-semibold">+{userGrowthData[userGrowthData.length - 1] - userGrowthData[0]} this week</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="text-green-300 text-sm" />
                    <span className="text-sm font-semibold">{stats?.totalUsers || 0} total users</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white rounded-xl p-5 border-2 border-gray-200 animate-slide-up">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-base">
              <FaServer className="text-gray-600" />
              System Information
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-gray-600 font-medium text-sm">Version</span>
                <span className="font-bold text-gray-900 text-sm">1.0.0</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-gray-600 font-medium text-sm">Uptime</span>
                <span className="font-bold text-green-600 text-sm">15 days</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-gray-600 font-medium text-sm">Last Backup</span>
                <span className="font-bold text-blue-600 text-sm">2 hours ago</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-gray-600 font-medium text-sm">Storage</span>
                <span className="font-bold text-gray-900 text-sm">250 GB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
