import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { 
  FaSearch, 
  FaTasks, 
  FaEye, 
  FaClock, 
  FaCheckCircle,
  FaTools,
  FaUser,
  FaCalendar,
  FaExclamationTriangle,
  FaDollarSign,
  FaFilter,
  FaFileExport,
  FaCheckSquare,
  FaSquare,
  FaUserCheck,
  FaTimes,
  FaChevronDown
} from 'react-icons/fa'
import api from '../../services/api'

const statusColors = {
  SUBMITTED: 'bg-gray-100 text-gray-800 border-gray-300',
  ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-300',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-300',
  WAITING_PARTS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
}

function WorkOrderList() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [technicianFilter, setTechnicianFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [costMin, setCostMin] = useState('')
  const [costMax, setCostMax] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedOrders, setSelectedOrders] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkAssignee, setBulkAssignee] = useState('')
  const [technicians, setTechnicians] = useState([])
  const [message, setMessage] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    pending: 0,
    totalCost: 0,
    emergency: 0,
    overdue: 0,
    avgCost: 0
  })

  useEffect(() => {
    fetchWorkOrders()
    fetchTechnicians()
  }, [])

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-dropdown')) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/users/users/?role=MAINTENANCE_TECHNICIAN')
      setTechnicians(response.data.results || response.data || [])
    } catch (err) {
      console.error('Error fetching technicians:', err)
    }
  }

  const fetchWorkOrders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/maintenance/work-orders/')
      const data = response.data.results || response.data
      const orders = Array.isArray(data) ? data : []
      setWorkOrders(orders)
      
      console.log('Work Orders Data:', orders) // Debug log
      
      // Calculate stats - handle both nested maintenance_request and flat request fields
      const inProgress = orders.filter(wo => {
        const status = wo.maintenance_request?.status || wo.request?.status || wo.status
        return ['IN_PROGRESS', 'ASSIGNED', 'WAITING_PARTS'].includes(status)
      }).length
      
      const completed = orders.filter(wo => {
        const status = wo.maintenance_request?.status || wo.request?.status || wo.status
        return status === 'COMPLETED'
      }).length
      
      const pending = orders.filter(wo => {
        const status = wo.maintenance_request?.status || wo.request?.status || wo.status
        return status === 'SUBMITTED'
      }).length
      
      const emergency = orders.filter(wo => {
        const priority = wo.maintenance_request?.priority || wo.request?.priority || wo.priority
        const status = wo.maintenance_request?.status || wo.request?.status || wo.status
        return priority === 'EMERGENCY' && !['COMPLETED', 'CANCELLED'].includes(status)
      }).length
      
      const totalCost = orders.reduce((sum, wo) => {
        const cost = parseFloat(wo.cost_total || 0)
        return sum + cost
      }, 0)
      
      const avgCost = orders.length > 0 ? totalCost / orders.length : 0
      
      // Overdue: scheduled_date in the past and not completed/cancelled
      const now = new Date()
      const overdue = orders.filter(wo => {
        const status = wo.maintenance_request?.status || wo.request?.status || wo.status
        if (status === 'COMPLETED' || status === 'CANCELLED') return false
        if (!wo.scheduled_date) return false
        return new Date(wo.scheduled_date) < now
      }).length
      
      console.log('Calculated Stats:', {
        total: orders.length,
        inProgress,
        completed,
        pending,
        totalCost,
        emergency,
        overdue,
        avgCost
      }) // Debug log
      
      setStats({
        total: orders.length,
        inProgress,
        completed,
        pending,
        totalCost,
        emergency,
        overdue,
        avgCost
      })
    } catch (err) {
      console.error('Work orders error:', err)
      setWorkOrders([])
      // Reset stats on error
      setStats({
        total: 0,
        inProgress: 0,
        completed: 0,
        pending: 0,
        totalCost: 0,
        emergency: 0,
        overdue: 0,
        avgCost: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch = 
      wo.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.assigned_to_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Get status from either maintenance_request or request field
    const woStatus = wo.maintenance_request?.status || wo.request?.status || wo.status
    
    const matchesStatus = statusFilter === 'all' || woStatus === statusFilter
    
    const matchesTechnician = technicianFilter === 'all' || wo.assigned_to === parseInt(technicianFilter)
    
    // Get priority from either maintenance_request or request field
    const woPriority = wo.maintenance_request?.priority || wo.request?.priority || wo.priority
    const matchesPriority = priorityFilter === 'all' || woPriority === priorityFilter
    
    const matchesDateFrom = !dateFrom || new Date(wo.created_at) >= new Date(dateFrom)
    const matchesDateTo = !dateTo || new Date(wo.created_at) <= new Date(dateTo + 'T23:59:59')
    
    const matchesCostMin = !costMin || parseFloat(wo.cost_total || 0) >= parseFloat(costMin)
    const matchesCostMax = !costMax || parseFloat(wo.cost_total || 0) <= parseFloat(costMax)
    
    return matchesSearch && matchesStatus && matchesTechnician && matchesPriority && matchesDateFrom && matchesDateTo && matchesCostMin && matchesCostMax
  })

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredWorkOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredWorkOrders.map(wo => wo.id))
    }
  }

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedOrders.length === 0) return
    
    try {
      setLoading(true)
      await Promise.all(
        selectedOrders.map(orderId => {
          const wo = workOrders.find(w => w.id === orderId)
          return api.patch(`/maintenance/requests/${wo.request}/`, { status: bulkStatus })
        })
      )
      setMessage({ type: 'success', text: `Updated ${selectedOrders.length} work orders` })
      setSelectedOrders([])
      setShowBulkActions(false)
      setBulkStatus('')
      fetchWorkOrders()
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update work orders' })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAssign = async () => {
    if (!bulkAssignee || selectedOrders.length === 0) return
    
    try {
      setLoading(true)
      await Promise.all(
        selectedOrders.map(orderId => 
          api.patch(`/maintenance/work-orders/${orderId}/`, { assigned_to: bulkAssignee })
        )
      )
      setMessage({ type: 'success', text: `Assigned ${selectedOrders.length} work orders` })
      setSelectedOrders([])
      setShowBulkActions(false)
      setBulkAssignee('')
      fetchWorkOrders()
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to assign work orders' })
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    setShowExportMenu(false)
    const headers = ['Work Order ID', 'Request ID', 'Asset', 'Priority', 'Status', 'Assigned To', 'Scheduled Date', 'Labor Cost', 'Materials Cost', 'Total Cost', 'Created At']
    const rows = filteredWorkOrders.map(wo => [
      `WO-${wo.id}`,
      wo.request_id || '',
      wo.asset_id || '',
      wo.maintenance_request?.priority || '',
      wo.maintenance_request?.status || '',
      wo.assigned_to_name || 'Unassigned',
      wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString() : '',
      wo.cost_labor || 0,
      wo.cost_materials || 0,
      wo.cost_total || 0,
      new Date(wo.created_at).toLocaleString()
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `work-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportExcel = async () => {
    setShowExportMenu(false)
    // Dynamic import for xlsx
    const XLSX = await import('xlsx')
    
    // Prepare data
    const data = filteredWorkOrders.map(wo => ({
      'Work Order ID': `WO-${wo.id}`,
      'Request ID': wo.request_id || '',
      'Asset': wo.asset_id || '',
      'Priority': wo.maintenance_request?.priority || '',
      'Status': wo.maintenance_request?.status || '',
      'Assigned To': wo.assigned_to_name || 'Unassigned',
      'Scheduled Date': wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString() : '',
      'Started At': wo.started_at ? new Date(wo.started_at).toLocaleDateString() : '',
      'Completed At': wo.completed_at ? new Date(wo.completed_at).toLocaleDateString() : '',
      'Labor Cost': wo.cost_labor || 0,
      'Materials Cost': wo.cost_materials || 0,
      'Total Cost': wo.cost_total || 0,
      'Created At': new Date(wo.created_at).toLocaleString()
    }))

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 12 }, { wch: 20 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Work Orders')

    // Add summary sheet
    const summaryData = [
      { Metric: 'Total Work Orders', Value: stats.total },
      { Metric: 'In Progress', Value: stats.inProgress },
      { Metric: 'Completed', Value: stats.completed },
      { Metric: 'Pending', Value: stats.pending },
      { Metric: 'Emergency', Value: stats.emergency },
      { Metric: 'Overdue', Value: stats.overdue },
      { Metric: 'Total Cost (ETB)', Value: stats.totalCost.toFixed(2) },
      { Metric: 'Average Cost (ETB)', Value: stats.avgCost.toFixed(2) },
      { Metric: 'Export Date', Value: new Date().toLocaleString() },
      { Metric: 'Exported By', Value: user?.username || 'Unknown' }
    ]
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

    // Download
    XLSX.writeFile(wb, `work-orders-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleExportPDF = async () => {
    try {
      setExporting(true)
      setShowExportMenu(false)
      
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Add DMU Logo
      try {
        const logoPath = '/src/assets/images/branding/dmu-logo.png'
        const logoWidth = 1.5 * 72 / 2.54
        const logoHeight = 1.5 * 72 / 2.54
        const logoX = (pageWidth - logoWidth) / 2
        doc.addImage(logoPath, 'PNG', logoX, 10, logoWidth, logoHeight)
      } catch (error) {
        console.warn('Could not load DMU logo:', error)
      }
      
      // University Name
      doc.setFontSize(18)
      doc.setTextColor(30, 64, 175)
      doc.setFont(undefined, 'bold')
      doc.text('DEBRE MARKOS UNIVERSITY', pageWidth / 2, 58, { align: 'center' })
      
      // Subtitle
      doc.setFontSize(11)
      doc.setTextColor(218, 165, 32)
      doc.setFont(undefined, 'normal')
      doc.text('Property Management System', pageWidth / 2, 64, { align: 'center' })
      
      // Report Title
      doc.setFontSize(16)
      doc.setTextColor(79, 70, 229)
      doc.setFont(undefined, 'bold')
      doc.text('WORK ORDERS REPORT', pageWidth / 2, 74, { align: 'center' })
      
      // Decorative line
      doc.setDrawColor(79, 70, 229)
      doc.setLineWidth(0.5)
      doc.line(20, 79, pageWidth - 20, 79)
      
      let yPos = 89
      
      // Report Information
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.setFont(undefined, 'bold')
      doc.text('REPORT INFORMATION', 14, yPos)
      
      yPos += 6
      doc.setFont(undefined, 'normal')
      doc.setFontSize(9)
      doc.text(`Generated Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, yPos)
      yPos += 5
      doc.text(`Generated Time: ${new Date().toLocaleTimeString('en-US')}`, 14, yPos)
      yPos += 5
      doc.text(`Total Work Orders: ${filteredWorkOrders.length}`, 14, yPos)
      yPos += 5
      doc.text(`Generated By: ${user?.username || 'Unknown'}`, 14, yPos)
      
      yPos += 10
      
      // Summary Statistics
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(100)
      doc.text('SUMMARY STATISTICS', 14, yPos)
      
      yPos += 6
      doc.setFont(undefined, 'normal')
      doc.setFontSize(9)
      doc.text(`Total Orders: ${stats.total}`, 14, yPos)
      yPos += 5
      doc.text(`In Progress: ${stats.inProgress}`, 14, yPos)
      yPos += 5
      doc.text(`Completed: ${stats.completed}`, 14, yPos)
      yPos += 5
      doc.text(`Pending: ${stats.pending}`, 14, yPos)
      yPos += 5
      doc.text(`Emergency: ${stats.emergency}`, 14, yPos)
      yPos += 5
      doc.text(`Overdue: ${stats.overdue}`, 14, yPos)
      yPos += 5
      doc.text(`Total Cost: ETB ${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos)
      yPos += 5
      doc.text(`Average Cost: ETB ${stats.avgCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos)
      
      yPos += 10
      
      // Work Orders Table
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(100)
      doc.text('WORK ORDERS DETAILS', 14, yPos)
      
      yPos += 5
      
      const tableData = filteredWorkOrders.map(wo => [
        `WO-${wo.id}`,
        wo.request_id || 'N/A',
        wo.asset_id || 'N/A',
        wo.maintenance_request?.priority || 'N/A',
        wo.maintenance_request?.status || 'N/A',
        wo.assigned_to_name || 'Unassigned',
        `ETB ${parseFloat(wo.cost_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ])
      
      autoTable(doc, {
        startY: yPos,
        head: [['WO ID', 'Request', 'Asset', 'Priority', 'Status', 'Assigned To', 'Cost']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: { 
          fontSize: 8,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { left: 14, right: 14 }
      })
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        
        // Footer separator line
        const footerStartY = doc.internal.pageSize.getHeight() - 20
        doc.setDrawColor(200)
        doc.setLineWidth(0.3)
        doc.line(14, footerStartY, pageWidth - 14, footerStartY)
        
        // Footer content
        doc.setFontSize(8)
        doc.setTextColor(100)
        
        // Left side - University info
        doc.text('Debre Markos University', 14, footerStartY + 5)
        doc.text('Property Management System', 14, footerStartY + 9)
        
        // Center - Page number
        doc.setFont(undefined, 'bold')
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          footerStartY + 7,
          { align: 'center' }
        )
        
        // Right side - Report type
        doc.setFont(undefined, 'normal')
        doc.text(
          'Work Orders Report',
          pageWidth - 14,
          footerStartY + 7,
          { align: 'right' }
        )
        
        // Bottom disclaimer
        doc.setFontSize(7)
        doc.setTextColor(120)
        doc.text(
          'Confidential - Generated electronically',
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'center' }
        )
      }
      
      doc.save(`work-orders-report-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setTechnicianFilter('all')
    setPriorityFilter('all')
    setDateFrom('')
    setDateTo('')
    setCostMin('')
    setCostMax('')
  }

  const isOverdue = (wo) => {
    const status = wo.maintenance_request?.status || wo.request?.status || wo.status
    if (status === 'COMPLETED' || status === 'CANCELLED') return false
    if (!wo.scheduled_date) return false
    return new Date(wo.scheduled_date) < new Date()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <FaTasks className="text-5xl" />
                Work Orders
              </h1>
              <p className="text-indigo-100 text-lg">Manage and track maintenance work orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6 mb-8 animate-scale-in">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaTasks className="text-3xl text-indigo-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaClock className="text-3xl text-purple-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">In Progress</p>
          <p className="text-3xl font-bold text-purple-600">{stats.inProgress}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaCheckCircle className="text-3xl text-green-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Completed</p>
          <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaExclamationTriangle className="text-3xl text-yellow-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-red-200 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaExclamationTriangle className="text-3xl text-red-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Emergency</p>
          <p className="text-3xl font-bold text-red-600">{stats.emergency}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-orange-200 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaClock className="text-3xl text-orange-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Overdue</p>
          <p className="text-3xl font-bold text-orange-600">{stats.overdue}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaDollarSign className="text-3xl text-emerald-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-emerald-600">ETB {stats.totalCost.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Avg: ETB {stats.avgCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8 animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Filters & Actions</h3>
          <div className="flex gap-3">
            <div className="relative export-dropdown">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 font-semibold shadow-lg"
              >
                <FaFileExport />
                {exporting ? 'Exporting...' : 'Export'}
                <FaChevronDown className="text-sm" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 text-gray-700"
                  >
                    <FaFileExport className="text-green-600" />
                    <span className="font-medium">Export as CSV</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 text-gray-700"
                  >
                    <FaFileExport className="text-green-600" />
                    <span className="font-medium">Export as Excel</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                  >
                    <FaFileExport className="text-red-600" />
                    <span className="font-medium">Export as PDF</span>
                  </button>
                </div>
              )}
            </div>
            {selectedOrders.length > 0 && (
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
              >
                <FaUserCheck />
                Bulk Actions ({selectedOrders.length})
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaSearch className="inline mr-2" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search by Request ID, Asset, or Technician"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaFilter className="inline mr-2" />
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="all">All Status</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_PARTS">Waiting Parts</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaExclamationTriangle className="inline mr-2" />
              Priority Filter
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaUser className="inline mr-2" />
              Technician Filter
            </label>
            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="all">All Technicians</option>
              {technicians.map(tech => (
                <option key={tech.id} value={tech.id}>
                  {tech.first_name} {tech.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendar className="inline mr-2" />
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendar className="inline mr-2" />
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaDollarSign className="inline mr-2" />
              Cost Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={costMin}
                onChange={(e) => setCostMin(e.target.value)}
                className="w-1/2 px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <input
                type="number"
                placeholder="Max"
                value={costMax}
                onChange={(e) => setCostMax(e.target.value)}
                className="w-1/2 px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {(searchTerm || statusFilter !== 'all' || technicianFilter !== 'all' || priorityFilter !== 'all' || dateFrom || dateTo || costMin || costMax) && (
          <button
            onClick={clearFilters}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && selectedOrders.length > 0 && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 mb-8 animate-slide-down">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-indigo-800">
              Bulk Actions - {selectedOrders.length} selected
            </h3>
            <button
              onClick={() => {
                setShowBulkActions(false)
                setSelectedOrders([])
              }}
              className="text-indigo-600 hover:text-indigo-800"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Status
              </label>
              <div className="flex gap-2">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="">Select Status</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_PARTS">Waiting Parts</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatus || loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Update
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Technician
              </label>
              <div className="flex gap-2">
                <select
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="">Select Technician</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.first_name} {tech.last_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkAssignee || loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Work Orders Grid */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">
          Work Orders ({filteredWorkOrders.length})
        </h3>
        {filteredWorkOrders.length > 0 && (
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {selectedOrders.length === filteredWorkOrders.length ? (
              <>
                <FaCheckSquare />
                Deselect All
              </>
            ) : (
              <>
                <FaSquare />
                Select All
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-slide-up">
        {filteredWorkOrders.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-lg">
            <FaTasks className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No work orders found</p>
          </div>
        ) : (
          filteredWorkOrders.map((wo) => {
            const overdueStatus = isOverdue(wo)
            const woPriority = wo.maintenance_request?.priority || wo.request?.priority || wo.priority
            const woStatus = wo.maintenance_request?.status || wo.request?.status || wo.status
            const isEmergency = woPriority === 'EMERGENCY'
            
            return (
            <div
              key={wo.id}
              className={`bg-white rounded-2xl shadow-lg border-2 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
                selectedOrders.includes(wo.id) ? 'border-indigo-500 ring-2 ring-indigo-200' : 
                overdueStatus ? 'border-orange-300 ring-2 ring-orange-100' :
                isEmergency ? 'border-red-300 ring-2 ring-red-100' :
                'border-gray-100 hover:border-indigo-300'
              }`}
            >
              {/* Header */}
              <div className={`bg-gradient-to-r p-4 text-white ${
                isEmergency ? 'from-red-500 to-orange-500' :
                overdueStatus ? 'from-orange-500 to-yellow-500' :
                'from-indigo-500 to-purple-500'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectOrder(wo.id)
                      }}
                      className="text-white hover:text-indigo-100 transition-colors"
                    >
                      {selectedOrders.includes(wo.id) ? (
                        <FaCheckSquare size={20} />
                      ) : (
                        <FaSquare size={20} />
                      )}
                    </button>
                    <span className="text-lg font-bold">WO-{wo.id}</span>
                    {overdueStatus && (
                      <span className="px-2 py-1 bg-orange-600 text-white text-xs font-bold rounded-full">
                        OVERDUE
                      </span>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[woStatus] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                    {woStatus?.replace('_', ' ') || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-indigo-100 text-sm">Request: {wo.request_id}</p>
                  {woPriority && (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      woPriority === 'EMERGENCY' ? 'bg-red-600 text-white' :
                      woPriority === 'HIGH' ? 'bg-orange-500 text-white' :
                      woPriority === 'MEDIUM' ? 'bg-blue-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {woPriority}
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                {/* Asset Info */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <FaTools className="text-indigo-600" />
                    <span className="font-semibold text-sm">Asset</span>
                  </div>
                  <p className="text-gray-800 font-medium ml-6">{wo.asset_id || 'N/A'}</p>
                </div>

                {/* Technician */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <FaUser className="text-purple-600" />
                    <span className="font-semibold text-sm">Assigned To</span>
                  </div>
                  <p className="text-gray-800 font-medium ml-6">{wo.assigned_to_name || 'Unassigned'}</p>
                </div>

                {/* Schedule */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <FaCalendar className="text-pink-600" />
                    <span className="font-semibold text-sm">Scheduled</span>
                  </div>
                  <p className={`font-medium ml-6 ${overdueStatus ? 'text-orange-600 font-bold' : 'text-gray-800'}`}>
                    {wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                  </p>
                </div>

                {/* Cost */}
                {wo.cost_total > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-gray-700 mb-2">
                      <FaDollarSign className="text-emerald-600" />
                      <span className="font-semibold text-sm">Total Cost</span>
                    </div>
                    <p className="text-emerald-600 font-bold text-lg ml-6">
                      ETB {parseFloat(wo.cost_total).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* View Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/dashboard/maintenance/work-orders/${wo.id}`)
                  }}
                  className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg"
                >
                  <FaEye />
                  View Details
                </button>
              </div>
            </div>
          )
          })
        )}
      </div>

      {/* Results Count */}
      {filteredWorkOrders.length > 0 && (
        <div className="mt-8 text-center text-gray-600">
          Showing {filteredWorkOrders.length} of {workOrders.length} work orders
        </div>
      )}
    </div>
  )
}

export default WorkOrderList
