import { useState, useEffect } from 'react'
import { 
  FaServer, 
  FaHdd, 
  FaMemory, 
  FaMicrochip,
  FaDatabase,
  FaUsers,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSync,
  FaSearch
} from 'react-icons/fa'
import api from '../../services/api'

const SystemHealth = () => {
  const [health, setHealth] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logLevel, setLogLevel] = useState('')
  const [logSearch, setLogSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchHealth()
    fetchLogs()
    
    let interval
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchHealth()
      }, 30000) // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const response = await api.get('/core/health/status/')
      setHealth(response.data)
    } catch (error) {
      console.error('Error fetching health:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      setLogsLoading(true)
      const params = new URLSearchParams()
      params.append('limit', '50')
      if (logLevel) params.append('level', logLevel)
      if (logSearch) params.append('search', logSearch)
      
      const response = await api.get(`/core/health/error_logs/?${params}`)
      setLogs(response.data.logs || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLogsLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <FaCheckCircle />
      case 'warning': return <FaExclamationTriangle />
      case 'critical': return <FaExclamationTriangle />
      default: return <FaServer />
    }
  }

  const getUsageColor = (percent) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getLevelColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR': return 'bg-red-100 text-red-800'
      case 'WARNING': return 'bg-yellow-100 text-yellow-800'
      case 'INFO': return 'bg-blue-100 text-blue-800'
      case 'CRITICAL': return 'bg-red-200 text-red-900'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && !health) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <FaServer className="animate-spin text-6xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading system health...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">System Health</h1>
              <p className="text-purple-100 text-lg">Monitor system resources and performance</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-sm">Auto-refresh (30s)</span>
              </label>
              <button
                onClick={fetchHealth}
                disabled={loading}
                className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      {health && (
        <div className="mb-6">
          <div className={`rounded-xl p-6 flex items-center gap-4 ${getStatusColor(health.status)} border-2`}>
            <div className="text-4xl">
              {getStatusIcon(health.status)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold capitalize">{health.status}</h2>
              <p className="text-sm">System Status - Last updated: {new Date(health.timestamp).toLocaleTimeString()}</p>
            </div>
            {health.warnings && health.warnings.length > 0 && (
              <div className="text-right">
                <p className="text-sm font-semibold">{health.warnings.length} Warning(s)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {health?.warnings && health.warnings.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
            <FaExclamationTriangle />
            Active Warnings
          </h3>
          <ul className="space-y-1">
            {health.warnings.map((warning, index) => (
              <li key={index} className="text-yellow-700 text-sm">• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Resource Usage Cards */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Disk Usage */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <FaHdd className="text-2xl text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-800">{health.disk.percent}%</span>
            </div>
            <h3 className="text-gray-600 font-semibold mb-2">Disk Usage</h3>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className={`h-3 rounded-full transition-all ${getUsageColor(health.disk.percent)}`}
                style={{ width: `${health.disk.percent}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {health.disk.used_gb} GB / {health.disk.total_gb} GB
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {health.disk.free_gb} GB free
            </p>
          </div>

          {/* Memory Usage */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                <FaMemory className="text-2xl text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-800">{health.memory.percent}%</span>
            </div>
            <h3 className="text-gray-600 font-semibold mb-2">Memory Usage</h3>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className={`h-3 rounded-full transition-all ${getUsageColor(health.memory.percent)}`}
                style={{ width: `${health.memory.percent}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {health.memory.used_gb} GB / {health.memory.total_gb} GB
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {health.memory.available_gb} GB available
            </p>
          </div>

          {/* CPU Usage */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <FaMicrochip className="text-2xl text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-800">{health.cpu.percent}%</span>
            </div>
            <h3 className="text-gray-600 font-semibold mb-2">CPU Usage</h3>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className={`h-3 rounded-full transition-all ${getUsageColor(health.cpu.percent)}`}
                style={{ width: `${health.cpu.percent}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {health.cpu.count} Cores
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Average across all cores
            </p>
          </div>

          {/* Database Size */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                <FaDatabase className="text-2xl text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-800">{health.database.size_mb}</span>
            </div>
            <h3 className="text-gray-600 font-semibold mb-2">Database Size</h3>
            <p className="text-sm text-gray-600 mb-2">
              {health.database.size_gb} GB
            </p>
            <p className="text-xs text-gray-500">
              PostgreSQL Database
            </p>
          </div>
        </div>
      )}

      {/* User Activity & System Info */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* User Activity */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                <FaUsers className="text-2xl text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">User Activity</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total Users</span>
                <span className="font-bold text-gray-800">{health.users.total}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Active Users</span>
                <span className="font-bold text-green-600">{health.users.active}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Active Sessions</span>
                <span className="font-bold text-blue-600">{health.users.active_sessions}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Recent Logins (1h)</span>
                <span className="font-bold text-purple-600">{health.users.recent_logins}</span>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl">
                <FaClock className="text-2xl text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">System Information</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Uptime</span>
                <span className="font-bold text-gray-800">
                  {health.system.uptime_days}d {health.system.uptime_hours}h
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Boot Time</span>
                <span className="font-bold text-gray-800 text-sm">
                  {new Date(health.system.boot_time).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Last Check</span>
                <span className="font-bold text-gray-800 text-sm">
                  {new Date(health.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Logs Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Error Logs</h3>
          <button
            onClick={fetchLogs}
            disabled={logsLoading}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <FaSync className={logsLoading ? 'animate-spin' : ''} />
            Refresh Logs
          </button>
        </div>

        {/* Log Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <select
              value={logLevel}
              onChange={(e) => {
                setLogLevel(e.target.value)
                setTimeout(fetchLogs, 100)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Logs Table */}
        {logsLoading ? (
          <div className="text-center py-8">
            <FaSync className="animate-spin text-4xl text-purple-600 mx-auto mb-2" />
            <p className="text-gray-600">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <FaCheckCircle className="text-6xl text-green-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No error logs found</p>
            <p className="text-gray-400 text-sm">System is running smoothly!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Logger</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {log.logger}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default SystemHealth
