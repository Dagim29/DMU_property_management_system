import { useEffect, useState, useMemo } from 'react'
import { 
  FaHistory, 
  FaSearch,
  FaUserCircle,
  FaCalendarAlt,
  FaDownload,
  FaEye,
  FaSync,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaFilter
} from 'react-icons/fa'
import api from '../../services/api'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  addDMUHeader, 
  addDMUFooter, 
  getDMUTableStyles,
  addDMUCSVHeader,
  addDMUCSVFooter,
  getDMUExcelCover
} from '../../utils/pdfExportUtils'

const AuditLog = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [viewMode, setViewMode] = useState('table') // 'table' or 'timeline'

  const actionTypes = [
    { value: 'CREATE', label: 'Create', color: 'green' },
    { value: 'UPDATE', label: 'Update', color: 'blue' },
    { value: 'DELETE', label: 'Delete', color: 'red' },
    { value: 'LOGIN', label: 'Login', color: 'purple' },
    { value: 'LOGOUT', label: 'Logout', color: 'gray' },
    { value: 'TRANSFER', label: 'Transfer', color: 'yellow' },
    { value: 'ASSIGN', label: 'Assign', color: 'indigo' },
    { value: 'STATUS_CHANGE', label: 'Status Change', color: 'orange' }
  ]

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      // Fetch all logs without pagination limit
      const response = await api.get('/core/audit-logs/?page_size=10000')
      const data = response.data
      // Handle both paginated and non-paginated responses
      const logsData = data.results || data
      setLogs(Array.isArray(logsData) ? logsData : [])
      console.log('Fetched audit logs:', logsData.length, 'entries')
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action) => {
    const actionObj = actionTypes.find(a => a.value === action)
    return actionObj?.color || 'gray'
  }

  const getActionBadgeClasses = (action) => {
    const colors = {
      green: 'bg-green-100 text-green-800 border-green-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200'
    }
    return colors[getActionColor(action)] || colors.gray
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800)
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000)
      return `${months} month${months > 1 ? 's' : ''} ago`
    } else {
      const years = Math.floor(diffInSeconds / 31536000)
      return `${years} year${years > 1 ? 's' : ''} ago`
    }
  }

  const handleViewDetails = (log) => {
    setSelectedLog(log)
    setShowDetailsModal(true)
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.object_id?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = !filterAction || log.action === filterAction
    const matchesModel = !filterModel || log.model_name === filterModel
    
    // Date range filtering
    let matchesDateRange = true
    if (dateRange.startDate || dateRange.endDate) {
      const logDate = new Date(log.timestamp)
      if (dateRange.startDate) {
        const startDate = new Date(dateRange.startDate)
        matchesDateRange = matchesDateRange && logDate >= startDate
      }
      if (dateRange.endDate) {
        const endDate = new Date(dateRange.endDate)
        endDate.setHours(23, 59, 59, 999) // End of day
        matchesDateRange = matchesDateRange && logDate <= endDate
      }
    }
    
    return matchesSearch && matchesAction && matchesModel && matchesDateRange
  })

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterAction, filterModel, dateRange])

  const exportData = (format) => {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `audit-log-${timestamp}`

    if (format === 'csv') {
      exportAsCSV(filename)
    } else if (format === 'excel') {
      exportAsExcel(filename)
    } else if (format === 'pdf') {
      exportAsPDF(filename)
    }

    setShowExportMenu(false)
  }

  const exportAsCSV = (filename) => {
    const filters = []
    if (filterAction) filters.push(`Action: ${actionTypes.find(a => a.value === filterAction)?.label || filterAction}`)
    if (filterModel) filters.push(`Model: ${filterModel}`)
    if (dateRange.startDate || dateRange.endDate) filters.push(`Date Range: ${dateRange.startDate || 'Start'} to ${dateRange.endDate || 'End'}`)
    
    let csvContent = addDMUCSVHeader('Audit Log Report', {
      totalRecords: filteredLogs.length,
      filters
    })
    
    csvContent += 'Timestamp,User,Action,Model,Object ID,IP Address,Details\n'
    
    filteredLogs.forEach(log => {
      const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '-'
      csvContent += `"${formatDate(log.timestamp)}","${log.user?.username || 'System'}","${log.action}","${log.model_name}","${log.object_id}","${log.ip_address || '-'}","${details}"\n`
    })
    
    csvContent += addDMUCSVFooter()

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
    const wb = XLSX.utils.book_new()

    // Cover Sheet with DMU branding
    const coverData = getDMUExcelCover('Audit Log Report', {
      totalRecords: filteredLogs.length
    })
    const coverSheet = XLSX.utils.aoa_to_sheet(coverData)
    coverSheet['!cols'] = [{ wch: 20 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, coverSheet, 'Cover')

    // Audit Log Data Sheet
    const logData = [
      ['Timestamp', 'User', 'Action', 'Model', 'Object ID', 'IP Address', 'Details']
    ]

    filteredLogs.forEach(log => {
      logData.push([
        formatDate(log.timestamp),
        log.user?.username || 'System',
        log.action,
        log.model_name,
        log.object_id,
        log.ip_address || '-',
        log.details ? JSON.stringify(log.details) : '-'
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(logData)
    ws['!cols'] = [
      { wch: 20 }, // Timestamp
      { wch: 15 }, // User
      { wch: 12 }, // Action
      { wch: 15 }, // Model
      { wch: 12 }, // Object ID
      { wch: 15 }, // IP Address
      { wch: 40 }  // Details
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs')

    // Statistics Sheet
    const statsData = [
      ['AUDIT LOG STATISTICS'],
      [''],
      ['Metric', 'Value'],
      ['Total Logs', stats.total],
      ['Today', stats.today],
      ['Creates', stats.creates],
      ['Updates', stats.updates],
      ['Deletes', stats.deletes],
      [''],
      ['Action Breakdown:'],
      ...actionTypes.map(action => [
        action.label,
        logs.filter(log => log.action === action.value).length
      ]),
      [''],
      ['Model Breakdown:'],
      ...uniqueModels.map(model => [
        model,
        logs.filter(log => log.model_name === model).length
      ])
    ]
    const statsSheet = XLSX.utils.aoa_to_sheet(statsData)
    statsSheet['!cols'] = [{ wch: 25 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, statsSheet, 'Statistics')

    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  const exportAsPDF = (filename) => {
    try {
      const doc = new jsPDF()
      
      // Build filters array
      const filters = []
      if (filterAction) filters.push(`Action: ${actionTypes.find(a => a.value === filterAction)?.label || filterAction}`)
      if (filterModel) filters.push(`Model: ${filterModel}`)
      if (dateRange.startDate || dateRange.endDate) filters.push(`Date Range: ${dateRange.startDate || 'Start'} to ${dateRange.endDate || 'End'}`)
      
      // Add DMU Header
      const startY = addDMUHeader(doc, 'Audit Log Report', {
        totalRecords: filteredLogs.length,
        filters
      })
      
      // Table
      const tableData = filteredLogs.slice(0, 100).map(log => [
        formatDate(log.timestamp),
        log.user?.username || 'System',
        actionTypes.find(a => a.value === log.action)?.label || log.action,
        log.model_name,
        log.object_id,
        log.ip_address || '-'
      ])
      
      autoTable(doc, {
        startY,
        head: [['Timestamp', 'User', 'Action', 'Model', 'Object ID', 'IP Address']],
        body: tableData,
        ...getDMUTableStyles(),
        didDrawPage: addDMUFooter
      })

      if (filteredLogs.length > 100) {
        const finalY = doc.lastAutoTable?.finalY || 100
        doc.setFontSize(9)
        doc.setTextColor(200, 100, 0)
        doc.setFont(undefined, 'italic')
        doc.text(`Note: Showing first 100 of ${filteredLogs.length} records. Export to Excel for complete data.`, 14, finalY + 8)
      }
      
      doc.save(`${filename}.pdf`)
    } catch (error) {
      console.error('PDF Export Error:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterAction('')
    setFilterModel('')
    setDateRange({ startDate: '', endDate: '' })
  }

  const uniqueModels = [...new Set(logs.map(log => log.model_name))].filter(Boolean)

  // Calculate stats from all logs using useMemo to ensure recalculation
  const stats = useMemo(() => {
    const calculated = {
      total: logs.length,
      today: logs.filter(log => {
        const logDate = new Date(log.timestamp)
        const today = new Date()
        return logDate.toDateString() === today.toDateString()
      }).length,
      creates: logs.filter(log => log.action === 'CREATE').length,
      updates: logs.filter(log => log.action === 'UPDATE').length,
      deletes: logs.filter(log => log.action === 'DELETE').length
    }
    console.log('Stats recalculated:', calculated)
    return calculated
  }, [logs])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Audit Log</h1>
              <p className="text-indigo-100 text-lg">Track all system activities and changes</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchAuditLogs}
                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <FaDownload />
                  Export Logs
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-scale-in">
                    <div className="p-2">
                      <button
                        onClick={() => exportData('csv')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <FaFileCsv className="text-green-600 text-xl" />
                        <div>
                          <p className="font-semibold text-gray-800">Export as CSV</p>
                          <p className="text-xs text-gray-500">Comma-separated values</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => exportData('excel')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <FaFileExcel className="text-green-700 text-xl" />
                        <div>
                          <p className="font-semibold text-gray-800">Export as Excel</p>
                          <p className="text-xs text-gray-500">Microsoft Excel format</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => exportData('pdf')}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Logs</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.total}</h3>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <FaHistory className="text-xl text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Today</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.today}</h3>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
              <FaCalendarAlt className="text-xl text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Creates</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.creates}</h3>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
              <FaHistory className="text-xl text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Updates</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.updates}</h3>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <FaHistory className="text-xl text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Deletes</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.deletes}</h3>
            </div>
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
              <FaHistory className="text-xl text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FaFilter className="text-indigo-600" />
            Filters
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 font-semibold"
            >
              <FaCalendarAlt />
              {showAdvancedFilters ? 'Hide' : 'Show'} Date Range
            </button>
            {(searchTerm || filterAction || filterModel || dateRange.startDate || dateRange.endDate) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="">All Actions</option>
              {actionTypes.map(action => (
                <option key={action.value} value={action.value}>{action.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="">All Models</option>
              {uniqueModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filters - Date Range */}
        {showAdvancedFilters && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200 animate-slide-down">
            <h4 className="font-semibold text-indigo-800 mb-3">Date Range Filter</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            {(dateRange.startDate || dateRange.endDate) && (
              <p className="text-sm text-indigo-700 mt-2">
                Showing logs {dateRange.startDate && `from ${new Date(dateRange.startDate).toLocaleDateString()}`} 
                {dateRange.endDate && ` to ${new Date(dateRange.endDate).toLocaleDateString()}`}
              </p>
            )}
          </div>
        )}

        {/* Results Count */}
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing <span className="font-bold text-indigo-600">{filteredLogs.length}</span> of <span className="font-bold">{logs.length}</span> logs
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">View:</label>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  viewMode === 'timeline' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Timeline
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Display - Table or Timeline */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Object ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedLogs.map((log, index) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-gray-50 transition-colors animate-slide-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaUserCircle className="text-gray-400 text-xl" />
                        <span className="text-gray-700 font-medium">
                          {log.user?.username || 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getActionBadgeClasses(log.action)}`}>
                        {actionTypes.find(a => a.value === log.action)?.label || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{log.model_name}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">{log.object_id}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">{log.ip_address || '-'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewDetails(log)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <FaHistory className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No audit logs found</p>
            </div>
          )}
        </div>
      ) : (
        /* Timeline View */
        <div className="space-y-4">
          {paginatedLogs.map((log, index) => (
            <div key={log.id} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500 hover:shadow-xl transition-all animate-slide-up" style={{ animationDelay: `${index * 30}ms` }}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getActionBadgeClasses(log.action)}`}>
                      {actionTypes.find(a => a.value === log.action)?.label || log.action}
                    </span>
                    <span className="text-sm text-gray-600">{formatDate(log.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <FaUserCircle className="text-gray-400 text-xl" />
                    <span className="font-semibold text-gray-800">{log.user?.username || 'System'}</span>
                    <span className="text-gray-600">performed</span>
                    <span className="font-semibold text-indigo-600">{actionTypes.find(a => a.value === log.action)?.label || log.action}</span>
                    <span className="text-gray-600">on</span>
                    <span className="font-semibold text-gray-800">{log.model_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Object ID: <span className="font-mono text-gray-800">{log.object_id}</span></span>
                    {log.ip_address && (
                      <span>IP: <span className="font-mono text-gray-800">{log.ip_address}</span></span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleViewDetails(log)}
                  className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <FaEye className="text-xl" />
                </button>
              </div>
            </div>
          ))}
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl shadow-lg">
              <FaHistory className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No audit logs found</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredLogs.length > 0 && (
        <div className="mt-6 flex justify-between items-center bg-white rounded-xl shadow-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Audit Log Details</h2>
                  <p className="text-indigo-100 text-sm">Complete information about this system activity</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Action Summary Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-4 rounded-xl ${
                    getActionColor(selectedLog.action) === 'green' ? 'bg-green-100' :
                    getActionColor(selectedLog.action) === 'blue' ? 'bg-blue-100' :
                    getActionColor(selectedLog.action) === 'red' ? 'bg-red-100' :
                    getActionColor(selectedLog.action) === 'purple' ? 'bg-purple-100' :
                    'bg-gray-100'
                  }`}>
                    <FaHistory className={`text-3xl ${
                      getActionColor(selectedLog.action) === 'green' ? 'text-green-600' :
                      getActionColor(selectedLog.action) === 'blue' ? 'text-blue-600' :
                      getActionColor(selectedLog.action) === 'red' ? 'text-red-600' :
                      getActionColor(selectedLog.action) === 'purple' ? 'text-purple-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getActionBadgeClasses(selectedLog.action)}`}>
                        {actionTypes.find(a => a.value === selectedLog.action)?.label || selectedLog.action}
                      </span>
                      <span className="text-gray-600 text-sm">on</span>
                      <span className="px-3 py-1 bg-white rounded-lg text-sm font-semibold text-gray-800 border border-gray-300">
                        {selectedLog.model_name}
                      </span>
                    </div>
                    <p className="text-gray-700">
                      <span className="font-semibold">{selectedLog.user?.username || 'System'}</span> performed this action
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Information */}
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-indigo-300 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FaUserCircle className="text-2xl text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">User Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                      <p className="text-gray-900 font-semibold text-lg">{selectedLog.user?.username || 'System'}</p>
                    </div>
                    {selectedLog.user?.email && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                        <p className="text-gray-700">{selectedLog.user.email}</p>
                      </div>
                    )}
                    {selectedLog.user?.first_name && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                        <p className="text-gray-700">{selectedLog.user.first_name} {selectedLog.user.last_name}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamp Information */}
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FaCalendarAlt className="text-2xl text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Timestamp</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date & Time</label>
                      <p className="text-gray-900 font-semibold text-lg">{formatDate(selectedLog.timestamp)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Relative Time</label>
                      <p className="text-gray-700">{getRelativeTime(selectedLog.timestamp)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="bg-white rounded-xl p-5 border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Technical Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Model Name</label>
                    <p className="text-gray-900 font-mono text-sm">{selectedLog.model_name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Object ID</label>
                    <p className="text-gray-900 font-mono text-sm">{selectedLog.object_id}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">IP Address</label>
                    <p className="text-gray-900 font-mono text-sm">{selectedLog.ip_address || 'Not recorded'}</p>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Additional Information
                  </h3>
                  
                  {/* Render details in a structured way */}
                  <div className="space-y-3">
                    {Object.entries(selectedLog.details).map(([key, value]) => (
                      <div key={key} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                          {key.replace(/_/g, ' ')}
                        </label>
                        <div className="text-gray-900">
                          {typeof value === 'object' ? (
                            <pre className="text-sm font-mono bg-white p-3 rounded border border-gray-300 overflow-x-auto">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-sm font-medium">{String(value)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Log Data (Collapsible) */}
              <div className="bg-white rounded-xl p-5 border-2 border-gray-200">
                <button
                  onClick={() => {
                    const element = document.getElementById('complete-log-data')
                    element.classList.toggle('hidden')
                  }}
                  className="w-full flex items-center justify-between text-left mb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    View Complete Details
                  </h3>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div id="complete-log-data" className="hidden space-y-4">
                  {/* Action Details */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-200">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      System Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Log ID</p>
                        <p className="text-gray-900 font-mono">#{selectedLog.id}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Action Display</p>
                        <p className="text-gray-900">{selectedLog.action_display || selectedLog.action}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-200 col-span-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Full Timestamp</p>
                        <p className="text-gray-900 font-mono text-sm">{selectedLog.timestamp}</p>
                      </div>
                    </div>
                  </div>

                  {/* Extended Details from details field - only show if not already displayed */}
                  {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                    <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-5 border border-green-200">
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Session & Device Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(selectedLog.details)
                          .filter(([key]) => !['username', 'ip_address'].includes(key)) // Remove redundant fields
                          .map(([key, value]) => (
                            <div key={key} className="bg-white rounded-lg p-3 border border-green-200">
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="text-gray-900 font-medium break-words">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2))
                    alert('Log details copied to clipboard!')
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Details
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLog
