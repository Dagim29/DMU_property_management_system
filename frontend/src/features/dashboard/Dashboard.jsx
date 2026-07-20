import { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { 
  FaBox, 
  FaTools, 
  FaExclamationTriangle, 
  FaMoneyBillWave,
  FaArrowUp,
  FaArrowDown,
  FaChartLine,
  FaPlus,
  FaDownload,
  FaChartPie,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaCheckCircle,
  FaClock,
  FaExchangeAlt,
  FaBell,
  FaCalendarAlt,
  FaTrophy,
  FaUsers,
  FaTachometerAlt,
  FaUserClock,
  FaSync,
  FaCog
} from 'react-icons/fa'
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { MESSAGES, formatErrorMessage } from '../../utils/messages'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      light: 'bg-blue-50',
      text: 'text-blue-600',
      icon: 'text-blue-600'
    },
    green: {
      bg: 'from-green-500 to-green-600',
      light: 'bg-green-50',
      text: 'text-green-600',
      icon: 'text-green-600'
    },
    red: {
      bg: 'from-red-500 to-red-600',
      light: 'bg-red-50',
      text: 'text-red-600',
      icon: 'text-red-600'
    },
    yellow: {
      bg: 'from-yellow-500 to-yellow-600',
      light: 'bg-yellow-50',
      text: 'text-yellow-600',
      icon: 'text-yellow-600'
    },
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 card-hover border border-gray-100 animate-scale-in">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
          <h3 className="text-4xl font-bold text-gray-800 mb-2">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1">
              {trend === 'up' ? (
                <FaArrowUp className="text-green-500 text-sm" />
              ) : (
                <FaArrowDown className="text-red-500 text-sm" />
              )}
              <span className={`text-sm font-semibold ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {trendValue}
              </span>
              <span className="text-gray-500 text-sm">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color].bg} shadow-lg`}>
          <Icon className="text-3xl text-white" />
        </div>
      </div>
    </div>
  )
}

const QuickActionCard = ({ icon: Icon, title, onClick, color }) => (
  <button
    onClick={onClick}
    className="w-full text-left bg-white rounded-lg p-4 hover:shadow-md transition-all duration-300 border border-gray-200 hover:border-blue-500 group"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="text-lg text-white" />
      </div>
      <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
        {title}
      </h4>
    </div>
  </button>
)

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const { showSuccess, showError } = useToast()
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const exportMenuRef = useRef(null)

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

  // Redirect owners to their specific dashboard
  useEffect(() => {
    if (user?.role === 'OWNER') {
      navigate('/dashboard/owner')
    }
  }, [user, navigate])

  // Redirect supervisors to their specific dashboard
  useEffect(() => {
    if (user?.role === 'MAINTENANCE_SUPERVISOR') {
      navigate('/dashboard/supervisor', { replace: true })
    }
  }, [user, navigate])

  // Redirect technicians to their specific dashboard
  useEffect(() => {
    if (user?.role === 'MAINTENANCE_TECHNICIAN') {
      navigate('/dashboard/technician', { replace: true })
    }
  }, [user, navigate])

  // Redirect admins to their specific dashboard
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      navigate('/dashboard/admin', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    fetchDashboardStats()
    fetchRecentActivity()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchDashboardStats(),
      fetchRecentActivity()
    ])
    setRefreshing(false)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reports/dashboard-stats/')
      setStats(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load dashboard statistics')
      showError(formatErrorMessage(err))
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent transfers, requests, etc.
      const [transfersRes, requestsRes] = await Promise.all([
        api.get('/assets/transfers/?ordering=-transfer_date').catch(() => ({ data: { results: [] } })),
        api.get('/maintenance/requests/?ordering=-created_at').catch(() => ({ data: { results: [] } }))
      ])
      
      const transfers = (transfersRes.data.results || transfersRes.data || []).slice(0, 5)
      const requests = (requestsRes.data.results || requestsRes.data || []).slice(0, 5)
      
      const combined = [
        ...transfers.map(t => ({
          type: 'transfer',
          title: `Asset Transfer: ${t.asset_name || 'Asset'}`,
          time: new Date(t.transfer_date),
          icon: FaExchangeAlt,
          color: 'text-blue-600'
        })),
        ...requests.map(r => ({
          type: 'request',
          title: `Maintenance: ${r.title || 'Request'}`,
          time: new Date(r.created_at),
          icon: FaTools,
          color: 'text-purple-600'
        }))
      ].sort((a, b) => b.time - a.time).slice(0, 8)
      
      setRecentActivity(combined)
    } catch (err) {
      console.error('Error fetching activity:', err)
    }
  }

  const exportDashboardData = (format = 'csv') => {
    if (!stats) return

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `dashboard-report-${timestamp}`

    if (format === 'csv') {
      exportAsCSV(filename)
      showSuccess(MESSAGES.REPORT.EXPORT_CSV_SUCCESS)
    } else if (format === 'excel') {
      exportAsExcel(filename)
      showSuccess(MESSAGES.REPORT.EXPORT_EXCEL_SUCCESS)
    } else if (format === 'pdf') {
      exportAsPDF(filename)
      showSuccess(MESSAGES.REPORT.EXPORT_PDF_SUCCESS)
    }

    setShowExportMenu(false)
  }

  const exportAsCSV = (filename) => {
    let csvContent = 'Dashboard Statistics Report\n'
    csvContent += `Generated: ${new Date().toLocaleString()}\n`
    csvContent += `User: ${user?.first_name} ${user?.last_name}\n`
    csvContent += `Role: ${user?.role?.replace('_', ' ')}\n\n`
    
    csvContent += 'Metric,Value\n'
    csvContent += `Total Assets,${stats.total_assets || 0}\n`
    csvContent += `Pending Requests,${stats.pending_requests || 0}\n`
    csvContent += `Overdue Requests,${stats.overdue_requests || 0}\n`
    csvContent += `Total Maintenance Cost,ETB ${(stats.total_maintenance_cost || 0).toLocaleString()}\n\n`
    
    csvContent += 'Assets by Status\n'
    csvContent += 'Status,Count,Percentage\n'
    if (stats.assets_by_status) {
      Object.entries(stats.assets_by_status).forEach(([status, count]) => {
        const percentage = ((count / stats.total_assets) * 100).toFixed(1)
        csvContent += `${status.replace('_', ' ')},${count},${percentage}%\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportAsExcel = (filename) => {
    // Create workbook
    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryData = [
      ['Dashboard Statistics Report'],
      ['Generated:', new Date().toLocaleString()],
      ['User:', `${user?.first_name} ${user?.last_name}`],
      ['Role:', user?.role?.replace('_', ' ')],
      [],
      ['Metric', 'Value'],
      ['Total Assets', stats.total_assets || 0],
      ['Pending Requests', stats.pending_requests || 0],
      ['Overdue Requests', stats.overdue_requests || 0],
      ['Total Maintenance Cost', `ETB ${(stats.total_maintenance_cost || 0).toLocaleString()}`]
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

    // Assets by Status sheet
    if (stats.assets_by_status) {
      const statusData = [
        ['Assets by Status'],
        [],
        ['Status', 'Count', 'Percentage']
      ]
      Object.entries(stats.assets_by_status).forEach(([status, count]) => {
        const percentage = ((count / stats.total_assets) * 100).toFixed(1)
        statusData.push([status.replace('_', ' '), count, `${percentage}%`])
      })
      const statusSheet = XLSX.utils.aoa_to_sheet(statusData)
      XLSX.utils.book_append_sheet(wb, statusSheet, 'Assets by Status')
    }

    // Write file
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  const exportAsPDF = (filename) => {
    try {
      const doc = new jsPDF()
      
      // Title
      doc.setFontSize(20)
      doc.setTextColor(37, 99, 235) // Blue color
      doc.text('Dashboard Statistics Report', 14, 20)
      
      // Metadata
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
      doc.text(`User: ${user?.first_name} ${user?.last_name}`, 14, 36)
      doc.text(`Role: ${user?.role?.replace('_', ' ')}`, 14, 42)
      
      // Summary Statistics
      doc.setFontSize(14)
      doc.setTextColor(0)
      doc.text('Summary Statistics', 14, 55)
      
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Assets', (stats.total_assets || 0).toString()],
        ['Pending Requests', (stats.pending_requests || 0).toString()],
        ['Overdue Requests', (stats.overdue_requests || 0).toString()],
        ['Total Maintenance Cost', `ETB ${(stats.total_maintenance_cost || 0).toLocaleString()}`]
      ]
      
      autoTable(doc, {
        startY: 60,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 14 }
      })
      
      // Assets by Status
      if (stats.assets_by_status) {
        doc.setFontSize(14)
        const finalY = doc.lastAutoTable?.finalY || 100
        doc.text('Assets by Status', 14, finalY + 15)
        
        const statusData = [
          ['Status', 'Count', 'Percentage']
        ]
        Object.entries(stats.assets_by_status).forEach(([status, count]) => {
          const percentage = ((count / stats.total_assets) * 100).toFixed(1)
          statusData.push([
            status.replace('_', ' '),
            count.toString(),
            `${percentage}%`
          ])
        })
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [statusData[0]],
          body: statusData.slice(1),
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235] },
          margin: { left: 14 }
        })
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150)
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }
      
      doc.save(`${filename}.pdf`)
    } catch (error) {
      console.error('PDF Export Error:', error)
      showError('Failed to export PDF. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16 mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-md">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-2xl" />
            <div>
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const quickActions = {
    PROPERTY_MANAGER: [
      { icon: FaPlus, title: 'Create New Asset', onClick: () => navigate('/dashboard/assets/new'), color: 'from-blue-500 to-blue-600' },
      { icon: FaTools, title: 'Submit Maintenance Request', onClick: () => navigate('/dashboard/maintenance/requests/new'), color: 'from-purple-500 to-purple-600' },
      { icon: FaBox, title: 'View Asset Inventory', onClick: () => navigate('/dashboard/assets'), color: 'from-green-500 to-green-600' },
      { icon: FaExchangeAlt, title: 'Transfer Assets', onClick: () => navigate('/dashboard/assets/transfers'), color: 'from-orange-500 to-orange-600' },
      { icon: FaChartLine, title: 'View Reports', onClick: () => navigate('/dashboard/reports'), color: 'from-indigo-500 to-indigo-600' },
      { icon: FaUsers, title: 'Asset Assignments', onClick: () => navigate('/dashboard/assets/assignments'), color: 'from-pink-500 to-pink-600' },
    ],
    MAINTENANCE_SUPERVISOR: [
      { icon: FaTools, title: 'Assign Maintenance Requests', onClick: () => navigate('/dashboard/maintenance/requests'), color: 'from-orange-500 to-orange-600' },
      { icon: FaChartLine, title: 'Review Work Orders', onClick: () => navigate('/dashboard/maintenance/work-orders'), color: 'from-blue-500 to-blue-600' },
      { icon: FaTools, title: 'Schedule Preventive Maintenance', onClick: () => {}, color: 'from-purple-500 to-purple-600' },
    ],
    MAINTENANCE_TECHNICIAN: [
      { icon: FaTools, title: 'View Assigned Work Orders', onClick: () => navigate('/dashboard/maintenance/work-orders'), color: 'from-blue-500 to-blue-600' },
      { icon: FaChartLine, title: 'Update Work Order Status', onClick: () => navigate('/dashboard/maintenance/work-orders'), color: 'from-green-500 to-green-600' },
      { icon: FaMoneyBillWave, title: 'Record Maintenance Costs', onClick: () => {}, color: 'from-yellow-500 to-yellow-600' },
    ],
    SUPER_ADMIN: [
      { icon: FaBox, title: 'Manage Users', onClick: () => navigate('/dashboard/admin/users'), color: 'from-purple-500 to-purple-600' },
      { icon: FaChartLine, title: 'View All Reports', onClick: () => navigate('/dashboard/reports'), color: 'from-blue-500 to-blue-600' },
      { icon: FaTools, title: 'System Configuration', onClick: () => {}, color: 'from-red-500 to-red-600' },
    ],
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Welcome Header - Compact Admin Style */}
      <div className="mb-6 animate-slide-up">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white relative overflow-hidden border border-blue-700">
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
                    Property Manager Dashboard
                  </h1>
                  <p className="text-blue-100 text-sm flex items-center gap-2 mt-1">
                    <FaBox className="text-base" />
                    Asset Management & Operations
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
                    {user?.first_name || user?.username}
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
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all flex items-center gap-2 text-sm"
                >
                  <FaDownload />
                  Export
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-scale-in">
                    <div className="p-2">
                      <button
                        onClick={() => exportDashboardData('csv')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <FaFileCsv className="text-green-600 text-xl" />
                        <div>
                          <p className="font-semibold text-gray-800">Export as CSV</p>
                          <p className="text-xs text-gray-500">Comma-separated values</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => exportDashboardData('excel')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <FaFileExcel className="text-green-700 text-xl" />
                        <div>
                          <p className="font-semibold text-gray-800">Export as Excel</p>
                          <p className="text-xs text-gray-500">Microsoft Excel format</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => exportDashboardData('pdf')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <FaFilePdf className="text-red-600 text-xl" />
                        <div>
                          <p className="font-semibold text-gray-800">Export as PDF</p>
                          <p className="text-xs text-gray-500">Portable document format</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Assets"
          value={stats?.total_assets || 0}
          icon={FaBox}
          color="blue"
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="Pending Requests"
          value={stats?.pending_requests || 0}
          icon={FaTools}
          color="yellow"
          trend="down"
          trendValue="-5%"
        />
        <StatCard
          title="Overdue Requests"
          value={stats?.overdue_requests || 0}
          icon={FaExclamationTriangle}
          color="red"
        />
        <StatCard
          title="Maintenance Cost"
          value={`ETB ${(stats?.total_maintenance_cost || 0).toLocaleString()}`}
          icon={FaMoneyBillWave}
          color="green"
          trend="up"
          trendValue="+8%"
        />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Assets by Status with Better Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaChartPie className="text-blue-600" />
              Assets by Status
            </h2>
          </div>
          {stats?.assets_by_status && Object.keys(stats.assets_by_status).length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recharts Pie Chart */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.assets_by_status).map(([name, value]) => ({
                        name: name.replace('_', ' '),
                        value
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.keys(stats.assets_by_status).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend and Progress Bars - Scrollable */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                {Object.entries(stats.assets_by_status).map(([status, count], index) => {
                  const percentage = ((count / stats.total_assets) * 100).toFixed(1)
                  const statusColors = {
                    AVAILABLE: { bar: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
                    IN_USE: { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
                    UNDER_MAINTENANCE: { bar: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
                    CONDEMNED: { bar: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
                    PENDING_DISPOSAL: { bar: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
                    DISPOSED: { bar: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' },
                  }
                  const colors = statusColors[status] || { bar: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' }
                  
                  return (
                    <div key={status} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className={`p-3 rounded-lg ${colors.bg} border border-gray-200`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors.bar}`}></div>
                            <span className={`text-sm font-semibold ${colors.text}`}>
                              {status.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="font-bold text-gray-800 text-sm">{count}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${colors.bar} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{percentage}% of total</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FaBox className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No asset data available</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Actions</h2>
          <div className="space-y-3">
            {(quickActions[user?.role] || []).map((action, index) => (
              <QuickActionCard key={index} {...action} />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBell className="text-indigo-600" />
            Recent Activity
          </h2>
          <button
            onClick={() => navigate('/dashboard/notifications')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            View All →
          </button>
        </div>
        
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div className={`p-3 rounded-lg bg-gradient-to-br ${activity.type === 'transfer' ? 'from-blue-500 to-blue-600' : 'from-purple-500 to-purple-600'}`}>
                  <activity.icon className="text-white text-xl" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{activity.title}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <FaClock className="text-xs" />
                    {activity.time.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FaBell className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
