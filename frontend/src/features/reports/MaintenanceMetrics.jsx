import { useState, useEffect } from 'react'
import { 
  FaChartLine, 
  FaCalculator,
  FaClock,
  FaCheckCircle,
  FaMoneyBillWave,
  FaTools,
  FaDownload,
  FaChartBar,
  FaChartPie,
  FaTrophy,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaCalendarAlt
} from 'react-icons/fa'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { MESSAGES, formatErrorMessage } from '../../utils/messages'

const MaintenanceMetrics = () => {
  const { showSuccess, showError } = useToast()
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState(null)
  const [dateRange, setDateRange] = useState({
    period_start: '',
    period_end: ''
  })

  // Quick date range presets
  const setQuickRange = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    
    setDateRange({
      period_start: start.toISOString().split('T')[0],
      period_end: end.toISOString().split('T')[0]
    })
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  useEffect(() => {
    if (metrics.length > 0 && !selectedMetric) {
      setSelectedMetric(metrics[0])
    }
  }, [metrics])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reports/metrics/')
      const data = Array.isArray(response.data) ? response.data : (response.data.results || [])
      setMetrics(data)
    } catch (error) {
      console.error('Error fetching metrics:', error)
      showError(formatErrorMessage(error))
      setMetrics([])
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = async () => {
    if (!dateRange.period_start || !dateRange.period_end) {
      showError(MESSAGES.FORM.REQUIRED_FIELDS)
      return
    }

    try {
      setCalculating(true)
      await api.post('/reports/metrics/calculate/', dateRange)
      showSuccess('Maintenance metrics calculated successfully')
      fetchMetrics()
      setDateRange({ period_start: '', period_end: '' })
    } catch (error) {
      console.error('Error calculating metrics:', error)
      showError(formatErrorMessage(error))
    } finally {
      setCalculating(false)
    }
  }

  const exportMetrics = () => {
    if (!selectedMetric) return

    let csvContent = 'Maintenance Metrics Report\n'
    csvContent += `Period: ${selectedMetric.period_start} to ${selectedMetric.period_end}\n`
    csvContent += `Calculated: ${new Date(selectedMetric.calculated_at).toLocaleString()}\n\n`
    
    csvContent += 'Key Metrics\n'
    csvContent += `Mean Time To Repair,${selectedMetric.mean_time_to_repair} hours\n`
    csvContent += `First-Time Fix Rate,${selectedMetric.first_time_fix_rate}%\n`
    csvContent += `Cost Per Repair,ETB ${selectedMetric.cost_per_repair}\n`
    csvContent += `Total Requests,${selectedMetric.total_requests}\n`
    csvContent += `Completed Requests,${selectedMetric.completed_requests}\n`
    csvContent += `Total Cost,ETB ${selectedMetric.total_cost}\n\n`
    
    if (selectedMetric.metrics_by_category) {
      csvContent += 'Breakdown by Category\n'
      csvContent += 'Category,Count,Total Cost\n'
      Object.entries(selectedMetric.metrics_by_category).forEach(([key, data]) => {
        csvContent += `${data.name},${data.count},ETB ${data.total_cost}\n`
      })
      csvContent += '\n'
    }
    
    if (selectedMetric.metrics_by_priority) {
      csvContent += 'Breakdown by Priority\n'
      csvContent += 'Priority,Count,Completed,Completion Rate\n'
      Object.entries(selectedMetric.metrics_by_priority).forEach(([key, data]) => {
        csvContent += `${data.name},${data.count},${data.completed},${data.completion_rate}%\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `maintenance-metrics-${selectedMetric.period_start}-${selectedMetric.period_end}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showSuccess(MESSAGES.REPORT.EXPORT_CSV_SUCCESS)
  }

  // Prepare chart data
  const getCategoryChartData = () => {
    if (!selectedMetric?.metrics_by_category) return []
    return Object.entries(selectedMetric.metrics_by_category).map(([key, data]) => ({
      name: data.name,
      count: data.count,
      cost: parseFloat(data.total_cost)
    }))
  }

  const getPriorityChartData = () => {
    if (!selectedMetric?.metrics_by_priority) return []
    return Object.entries(selectedMetric.metrics_by_priority).map(([key, data]) => ({
      name: data.name,
      count: data.count,
      completed: data.completed,
      rate: parseFloat(data.completion_rate)
    }))
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-4xl font-bold mb-2">Maintenance Metrics</h2>
            <p className="text-blue-100 text-lg">Performance analytics and KPI tracking</p>
          </div>
          {selectedMetric && (
            <button
              onClick={exportMetrics}
              className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg"
            >
              <FaDownload />
              Export Data
            </button>
          )}
        </div>
      </div>

      {/* Calculate New Metrics */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <FaCalculator className="text-indigo-600 text-xl" />
          <h3 className="text-lg font-bold text-gray-800">Calculate New Metrics</h3>
        </div>
        
        {/* Quick Range Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setQuickRange(7)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setQuickRange(30)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setQuickRange(90)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
          >
            Last 90 Days
          </button>
          <button
            onClick={() => setQuickRange(365)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
          >
            Last Year
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FaCalendarAlt className="inline mr-2" />
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.period_start}
              onChange={(e) => setDateRange(prev => ({ ...prev, period_start: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FaCalendarAlt className="inline mr-2" />
              End Date
            </label>
            <input
              type="date"
              value={dateRange.period_end}
              onChange={(e) => setDateRange(prev => ({ ...prev, period_end: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {calculating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <FaCalculator />
                  Calculate Metrics
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics History */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : metrics.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
          <FaChartLine className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-semibold">No metrics calculated yet</p>
          <p className="text-sm text-gray-500 mt-2">Calculate metrics for a date range to see performance analytics</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metrics Selector */}
          {metrics.length > 1 && (
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Period to View
              </label>
              <select
                value={selectedMetric?.id || ''}
                onChange={(e) => setSelectedMetric(metrics.find(m => m.id === parseInt(e.target.value)))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {metrics.map(metric => (
                  <option key={metric.id} value={metric.id}>
                    {metric.period_start} to {metric.period_end} - Calculated {new Date(metric.calculated_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedMetric && (
            <>
              {/* Period Info */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {selectedMetric.period_start} to {selectedMetric.period_end}
                    </h3>
                    <p className="text-sm text-gray-600">
                      <FaClock className="inline mr-2" />
                      Calculated: {new Date(selectedMetric.calculated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-2">
                      <FaCheckCircle />
                      Compliant
                    </span>
                    {selectedMetric.overdue_requests > 0 && (
                      <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-semibold flex items-center gap-2">
                        <FaExclamationTriangle />
                        {selectedMetric.overdue_requests} Overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FaClock className="text-blue-600 text-xl" />
                        <p className="text-sm font-semibold text-gray-700">Mean Time To Repair</p>
                      </div>
                      <p className="text-4xl font-bold text-blue-600">{selectedMetric.mean_time_to_repair}</p>
                      <p className="text-sm text-gray-600 mt-1">hours average</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {selectedMetric.mean_time_to_repair < 24 ? (
                      <>
                        <FaArrowDown className="text-green-500" />
                        <span className="text-green-600 font-semibold">Excellent response time</span>
                      </>
                    ) : (
                      <>
                        <FaArrowUp className="text-orange-500" />
                        <span className="text-orange-600 font-semibold">Needs improvement</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FaCheckCircle className="text-green-600 text-xl" />
                        <p className="text-sm font-semibold text-gray-700">First-Time Fix Rate</p>
                      </div>
                      <p className="text-4xl font-bold text-green-600">{selectedMetric.first_time_fix_rate}%</p>
                      <p className="text-sm text-gray-600 mt-1">success rate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {selectedMetric.first_time_fix_rate >= 80 ? (
                      <>
                        <FaTrophy className="text-yellow-500" />
                        <span className="text-green-600 font-semibold">Outstanding performance</span>
                      </>
                    ) : (
                      <>
                        <FaExclamationTriangle className="text-orange-500" />
                        <span className="text-orange-600 font-semibold">Room for improvement</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FaMoneyBillWave className="text-purple-600 text-xl" />
                        <p className="text-sm font-semibold text-gray-700">Cost Per Repair</p>
                      </div>
                      <p className="text-4xl font-bold text-purple-600">{parseFloat(selectedMetric.cost_per_repair).toLocaleString()}</p>
                      <p className="text-sm text-gray-600 mt-1">ETB average</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Total: ETB {parseFloat(selectedMetric.total_cost || 0).toLocaleString()}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FaTools className="text-orange-600 text-xl" />
                        <p className="text-sm font-semibold text-gray-700">Total Requests</p>
                      </div>
                      <p className="text-4xl font-bold text-orange-600">{selectedMetric.total_requests}</p>
                      <p className="text-sm text-gray-600 mt-1">in this period</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-600 font-semibold">{selectedMetric.completed_requests} completed</span>
                    <span className="text-gray-500"> • </span>
                    <span className="text-gray-600">{((selectedMetric.completed_requests / selectedMetric.total_requests) * 100).toFixed(1)}% rate</span>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown Chart */}
                {selectedMetric.metrics_by_category && Object.keys(selectedMetric.metrics_by_category).length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <FaChartPie className="text-indigo-600" />
                      Breakdown by Category
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getCategoryChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {getCategoryChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {Object.entries(selectedMetric.metrics_by_category).map(([key, data], index) => (
                        <div key={key} className="bg-gray-50 rounded-lg p-3 border-l-4" style={{ borderColor: COLORS[index % COLORS.length] }}>
                          <p className="font-semibold text-gray-800 mb-1">{data.name}</p>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Requests:</span>
                              <span className="font-semibold">{data.count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Cost:</span>
                              <span className="font-semibold text-purple-600">ETB {parseFloat(data.total_cost).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Priority Breakdown Chart */}
                {selectedMetric.metrics_by_priority && Object.keys(selectedMetric.metrics_by_priority).length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <FaChartBar className="text-indigo-600" />
                      Breakdown by Priority
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getPriorityChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#3b82f6" name="Total" />
                        <Bar dataKey="completed" fill="#10b981" name="Completed" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                      {Object.entries(selectedMetric.metrics_by_priority).map(([key, data]) => {
                        const priorityColors = {
                          Low: 'border-blue-500',
                          Medium: 'border-yellow-500',
                          High: 'border-orange-500',
                          Emergency: 'border-red-500'
                        }
                        return (
                          <div key={key} className={`bg-gray-50 rounded-lg p-3 border-l-4 ${priorityColors[data.name] || 'border-gray-500'}`}>
                            <p className="font-semibold text-gray-800 mb-2">{data.name}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Count:</span>
                                <span className="font-semibold">{data.count}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Done:</span>
                                <span className="font-semibold text-green-600">{data.completed}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Rate:</span>
                                <span className="font-semibold text-indigo-600">{data.completion_rate}%</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default MaintenanceMetrics
