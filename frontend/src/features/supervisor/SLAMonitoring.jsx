import { useState, useEffect } from 'react'
import { 
  FaChartLine, 
  FaExclamationTriangle, 
  FaCheckCircle,
  FaClock,
  FaChartBar,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6']

const SLAMonitoring = () => {
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState(30)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/maintenance/analytics/sla-monitoring/?days=${period}`)
      setData(response.data)
    } catch (err) {
      console.error('Error fetching SLA data:', err)
      showError('Failed to load SLA monitoring data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
      </div>
    )
  }

  if (!data) return null

  const { summary, priority_breakdown, overdue_requests, trends } = data

  // Prepare chart data
  const complianceData = priority_breakdown.map(p => ({
    name: p.priority,
    response: p.response_compliance,
    resolution: p.resolution_compliance
  }))

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <FaChartLine className="text-5xl" />
                SLA Monitoring Dashboard
              </h1>
              <p className="text-indigo-100 text-lg">Real-time Service Level Agreement tracking and compliance</p>
            </div>
            <div className="flex gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={60}>Last 60 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-all disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-indigo-500">
          <div className="flex items-center justify-between mb-2">
            <FaChartBar className="text-3xl text-indigo-600" />
            <span className="text-sm font-semibold text-gray-500">TOTAL REQUESTS</span>
          </div>
          <p className="text-4xl font-bold text-gray-800">{summary.total_requests}</p>
          <p className="text-sm text-gray-600 mt-2">Last {period} days</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <FaCheckCircle className="text-3xl text-green-600" />
            <span className="text-sm font-semibold text-gray-500">RESPONSE SLA</span>
          </div>
          <p className="text-4xl font-bold text-green-600">{summary.response_compliance}%</p>
          <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
            {summary.response_compliance >= 90 ? (
              <><FaArrowUp className="text-green-500" /> Excellent</>
            ) : summary.response_compliance >= 75 ? (
              <><FaClock className="text-yellow-500" /> Good</>
            ) : (
              <><FaArrowDown className="text-red-500" /> Needs Improvement</>
            )}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <FaCheckCircle className="text-3xl text-blue-600" />
            <span className="text-sm font-semibold text-gray-500">RESOLUTION SLA</span>
          </div>
          <p className="text-4xl font-bold text-blue-600">{summary.resolution_compliance}%</p>
          <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
            {summary.resolution_compliance >= 90 ? (
              <><FaArrowUp className="text-green-500" /> Excellent</>
            ) : summary.resolution_compliance >= 75 ? (
              <><FaClock className="text-yellow-500" /> Good</>
            ) : (
              <><FaArrowDown className="text-red-500" /> Needs Improvement</>
            )}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <FaExclamationTriangle className="text-3xl text-red-600" />
            <span className="text-sm font-semibold text-gray-500">OVERDUE</span>
          </div>
          <p className="text-4xl font-bold text-red-600">{summary.overdue_count}</p>
          <p className="text-sm text-gray-600 mt-2">{summary.escalated_count} escalated</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* SLA Compliance by Priority */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaChartBar className="text-indigo-600" />
            SLA Compliance by Priority
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={complianceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="response" fill="#10b981" name="Response SLA %" />
              <Bar dataKey="resolution" fill="#3b82f6" name="Resolution SLA %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SLA Trends */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaChartLine className="text-indigo-600" />
            SLA Compliance Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="response_compliance" stroke="#10b981" name="Response %" strokeWidth={2} />
              <Line type="monotone" dataKey="resolution_compliance" stroke="#3b82f6" name="Resolution %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Breakdown Table */}
      <div className="bg-white rounded-xl shadow-lg mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Priority Level Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Priority</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total Requests</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Response SLA</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Resolution SLA</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Avg Response Delay</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Avg Resolution Delay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {priority_breakdown.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      item.priority === 'EMERGENCY' ? 'bg-red-100 text-red-700' :
                      item.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      item.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{item.total}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        item.response_compliance >= 90 ? 'text-green-600' :
                        item.response_compliance >= 75 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {item.response_compliance}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${
                      item.resolution_compliance >= 90 ? 'text-green-600' :
                      item.resolution_compliance >= 75 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {item.resolution_compliance}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{item.avg_response_delay.toFixed(2)}h</td>
                  <td className="px-6 py-4 text-gray-700">{item.avg_resolution_delay.toFixed(2)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overdue Requests */}
      {overdue_requests.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200 bg-red-50">
            <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <FaExclamationTriangle />
              Overdue Requests ({overdue_requests.length})
            </h2>
            <p className="text-red-600 mt-1">Requests that have exceeded their SLA deadlines</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Request ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Asset</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Priority</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Assigned To</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Hours Overdue</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdue_requests.map((request, index) => (
                  <tr key={index} className="hover:bg-red-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">{request.request_id}</td>
                    <td className="px-6 py-4 text-gray-700">{request.asset}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        request.priority === 'EMERGENCY' ? 'bg-red-100 text-red-700' :
                        request.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {request.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{request.assigned_to}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-red-600">{request.hours_overdue.toFixed(1)}h</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Average Response Time</h3>
          <div className="flex items-center gap-4">
            <FaClock className="text-5xl text-indigo-600" />
            <div>
              <p className="text-4xl font-bold text-gray-800">{summary.avg_response_hours.toFixed(1)}h</p>
              <p className="text-sm text-gray-600">Average time to first response</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Average Resolution Time</h3>
          <div className="flex items-center gap-4">
            <FaCheckCircle className="text-5xl text-green-600" />
            <div>
              <p className="text-4xl font-bold text-gray-800">{summary.avg_resolution_hours.toFixed(1)}h</p>
              <p className="text-sm text-gray-600">Average time to complete resolution</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SLAMonitoring
