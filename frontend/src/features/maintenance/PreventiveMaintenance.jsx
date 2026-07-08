import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaCalendarCheck, 
  FaPlus, 
  FaEdit, 
  FaTrash,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFileExport,
  FaFilter,
  FaSearch,
  FaCalendar,
  FaChartLine,
  FaHistory,
  FaPlay,
  FaPause,
  FaChevronDown
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

const PreventiveMaintenance = () => {
  const navigate = useNavigate()
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, overdue, due_soon, on_schedule
  const [activeFilter, setActiveFilter] = useState('active') // all, active, inactive
  const [sortBy, setSortBy] = useState('next_due_date') // next_due_date, asset_id, interval_days
  const [message, setMessage] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchSchedules()
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

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const response = await api.get('/maintenance/preventive/')
      setSchedules(response.data.results || response.data)
    } catch (err) {
      console.error('Error fetching schedules:', err)
      showError('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return
    
    try {
      await api.delete(`/maintenance/preventive/${id}/`)
      showSuccess('Schedule deleted successfully!')
      fetchSchedules()
    } catch (err) {
      console.error('Error deleting schedule:', err)
      showError('Failed to delete schedule')
    }
  }

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await api.patch(`/maintenance/preventive/${id}/`, {
        is_active: !currentStatus
      })
      showSuccess(`Schedule ${!currentStatus ? 'activated' : 'deactivated'} successfully!`)
      fetchSchedules()
    } catch (err) {
      console.error('Error toggling schedule:', err)
      showError('Failed to update schedule')
    }
  }

  const handleMarkComplete = async (schedule) => {
    if (!window.confirm(`Mark maintenance for ${schedule.asset_id} as complete?`)) return
    
    try {
      // Update next due date
      const nextDueDate = new Date(schedule.next_due_date)
      nextDueDate.setDate(nextDueDate.getDate() + schedule.interval_days)
      
      await api.patch(`/maintenance/preventive/${schedule.id}/`, {
        next_due_date: nextDueDate.toISOString().split('T')[0]
      })
      
      showSuccess('Maintenance marked complete! Next due date updated.')
      fetchSchedules()
    } catch (err) {
      console.error('Error marking complete:', err)
      showError('Failed to mark complete')
    }
  }

  const getDaysUntilDue = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusBadge = (daysUntil) => {
    if (daysUntil < 0) {
      return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold flex items-center gap-1">
        <FaExclamationTriangle /> Overdue
      </span>
    } else if (daysUntil <= 7) {
      return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold flex items-center gap-1">
        <FaClock /> Due Soon
      </span>
    } else {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1">
        <FaCheckCircle /> On Schedule
      </span>
    }
  }

  const handleExportCSV = () => {
    setShowExportMenu(false)
    const headers = ['Asset ID', 'Asset Name', 'Description', 'Interval (Days)', 'Next Due Date', 'Days Until Due', 'Status', 'Team', 'Active']
    const rows = filteredSchedules.map(s => {
      const daysUntil = getDaysUntilDue(s.next_due_date)
      const status = daysUntil < 0 ? 'Overdue' : daysUntil <= 7 ? 'Due Soon' : 'On Schedule'
      return [
        s.asset_id || '',
        s.asset_name || '',
        s.description || '',
        s.interval_days,
        new Date(s.next_due_date).toLocaleDateString(),
        daysUntil,
        status,
        s.assigned_team || 'Unassigned',
        s.is_active ? 'Yes' : 'No'
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `preventive-maintenance-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportExcel = async () => {
    setShowExportMenu(false)
    const XLSX = await import('xlsx')
    
    const data = filteredSchedules.map(s => {
      const daysUntil = getDaysUntilDue(s.next_due_date)
      const status = daysUntil < 0 ? 'Overdue' : daysUntil <= 7 ? 'Due Soon' : 'On Schedule'
      return {
        'Asset ID': s.asset_id || '',
        'Asset Name': s.asset_name || '',
        'Description': s.description || '',
        'Interval (Days)': s.interval_days,
        'Next Due Date': new Date(s.next_due_date).toLocaleDateString(),
        'Days Until Due': daysUntil,
        'Status': status,
        'Team': s.assigned_team || 'Unassigned',
        'Active': s.is_active ? 'Yes' : 'No',
        'Created': new Date(s.created_at).toLocaleDateString()
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 15 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Preventive Maintenance')

    // Summary sheet
    const summaryData = [
      { Metric: 'Total Schedules', Value: schedules.length },
      { Metric: 'Active Schedules', Value: activeSchedules.length },
      { Metric: 'Inactive Schedules', Value: inactiveSchedules.length },
      { Metric: 'Due This Week', Value: dueThisWeek },
      { Metric: 'Overdue', Value: overdueCount },
      { Metric: 'On Schedule', Value: onScheduleCount },
      { Metric: 'Export Date', Value: new Date().toLocaleString() }
    ]
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

    XLSX.writeFile(wb, `preventive-maintenance-${new Date().toISOString().split('T')[0]}.xlsx`)
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
      doc.text('PREVENTIVE MAINTENANCE SCHEDULE', pageWidth / 2, 74, { align: 'center' })
      
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
      doc.text(`Total Schedules: ${sortedSchedules.length}`, 14, yPos)
      
      yPos += 10
      
      // Summary Statistics
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(100)
      doc.text('SUMMARY STATISTICS', 14, yPos)
      
      yPos += 6
      doc.setFont(undefined, 'normal')
      doc.setFontSize(9)
      doc.text(`Total Schedules: ${schedules.length}`, 14, yPos)
      yPos += 5
      doc.text(`Active Schedules: ${activeSchedules.length}`, 14, yPos)
      yPos += 5
      doc.text(`Inactive Schedules: ${inactiveSchedules.length}`, 14, yPos)
      yPos += 5
      doc.text(`Due This Week: ${dueThisWeek}`, 14, yPos)
      yPos += 5
      doc.text(`Overdue: ${overdueCount}`, 14, yPos)
      yPos += 5
      doc.text(`On Schedule: ${onScheduleCount}`, 14, yPos)
      
      yPos += 10
      
      // Schedules Table
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(100)
      doc.text('MAINTENANCE SCHEDULES', 14, yPos)
      
      yPos += 5
      
      const tableData = sortedSchedules.map(s => {
        const daysUntil = getDaysUntilDue(s.next_due_date)
        const status = daysUntil < 0 ? 'Overdue' : daysUntil <= 7 ? 'Due Soon' : 'On Schedule'
        return [
          s.asset_id || 'N/A',
          s.description || 'N/A',
          `${s.interval_days} days`,
          new Date(s.next_due_date).toLocaleDateString(),
          daysUntil >= 0 ? `${daysUntil} days` : `${Math.abs(daysUntil)} days overdue`,
          status,
          s.assigned_team || 'Unassigned'
        ]
      })
      
      autoTable(doc, {
        startY: yPos,
        head: [['Asset', 'Description', 'Interval', 'Next Due', 'Days Until', 'Status', 'Team']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: { 
          fontSize: 7,
          cellPadding: 2
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          1: { cellWidth: 40 }
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
          'Preventive Maintenance',
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
      
      doc.save(`preventive-maintenance-${new Date().toISOString().split('T')[0]}.pdf`)
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
    setActiveFilter('active')
    setSortBy('next_due_date')
  }

  const activeSchedules = schedules.filter(s => s.is_active)
  const inactiveSchedules = schedules.filter(s => !s.is_active)
  const overdueCount = activeSchedules.filter(s => getDaysUntilDue(s.next_due_date) < 0).length
  const dueThisWeek = activeSchedules.filter(s => {
    const days = getDaysUntilDue(s.next_due_date)
    return days >= 0 && days <= 7
  }).length
  const onScheduleCount = activeSchedules.filter(s => getDaysUntilDue(s.next_due_date) > 7).length

  // Filtering
  const filteredSchedules = schedules.filter(s => {
    // Active filter
    if (activeFilter === 'active' && !s.is_active) return false
    if (activeFilter === 'inactive' && s.is_active) return false
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesAsset = s.asset_id?.toLowerCase().includes(search)
      const matchesName = s.asset_name?.toLowerCase().includes(search)
      const matchesDesc = s.description?.toLowerCase().includes(search)
      const matchesTeam = s.assigned_team?.toLowerCase().includes(search)
      if (!matchesAsset && !matchesName && !matchesDesc && !matchesTeam) return false
    }
    
    // Status filter
    if (statusFilter !== 'all' && s.is_active) {
      const daysUntil = getDaysUntilDue(s.next_due_date)
      if (statusFilter === 'overdue' && daysUntil >= 0) return false
      if (statusFilter === 'due_soon' && (daysUntil < 0 || daysUntil > 7)) return false
      if (statusFilter === 'on_schedule' && daysUntil <= 7) return false
    }
    
    return true
  })

  // Sorting
  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    if (sortBy === 'next_due_date') {
      return new Date(a.next_due_date) - new Date(b.next_due_date)
    } else if (sortBy === 'asset_id') {
      return (a.asset_id || '').localeCompare(b.asset_id || '')
    } else if (sortBy === 'interval_days') {
      return a.interval_days - b.interval_days
    }
    return 0
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <FaCalendarCheck className="text-5xl" />
                Preventive Maintenance
              </h1>
              <p className="text-indigo-100 text-lg">Schedule and manage preventive maintenance tasks</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/maintenance/preventive/new')}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg"
            >
              <FaPlus />
              New Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8 animate-scale-in">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaCalendarCheck className="text-3xl text-indigo-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Schedules</p>
          <p className="text-3xl font-bold text-gray-800">{schedules.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaCheckCircle className="text-3xl text-green-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Active</p>
          <p className="text-3xl font-bold text-green-600">{activeSchedules.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaClock className="text-3xl text-orange-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Due This Week</p>
          <p className="text-3xl font-bold text-orange-600">{dueThisWeek}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-red-200 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaExclamationTriangle className="text-3xl text-red-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Overdue</p>
          <p className="text-3xl font-bold text-red-600">{overdueCount}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaChartLine className="text-3xl text-blue-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">On Schedule</p>
          <p className="text-3xl font-bold text-blue-600">{onScheduleCount}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaPause className="text-3xl text-gray-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Inactive</p>
          <p className="text-3xl font-bold text-gray-600">{inactiveSchedules.length}</p>
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

      {/* Filters & Actions */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8 animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Filters & Actions</h3>
          <div className="relative export-dropdown">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaFileExport />
              {exporting ? 'Exporting...' : 'Export'}
              <FaChevronDown className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <FaFileExport className="text-green-600" />
                  Export as CSV
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <FaFileExport className="text-emerald-600" />
                  Export as Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <FaFileExport className="text-red-600" />
                  Export as PDF
                </button>
              </div>
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
              placeholder="Search by asset, description, or team"
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
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due Soon (7 days)</option>
              <option value="on_schedule">On Schedule</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaFilter className="inline mr-2" />
              Active Filter
            </label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="all">All Schedules</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendar className="inline mr-2" />
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="next_due_date">Next Due Date</option>
              <option value="asset_id">Asset ID</option>
              <option value="interval_days">Interval</option>
            </select>
          </div>
        </div>

        {(searchTerm || statusFilter !== 'all' || activeFilter !== 'active' || sortBy !== 'next_due_date') && (
          <button
            onClick={clearFilters}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Schedules Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8 animate-slide-up">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              Preventive Maintenance Schedules ({sortedSchedules.length})
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Asset</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Interval</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Next Due</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Team</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedSchedules.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <FaCalendarCheck className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-lg">No schedules found</p>
                    <p className="text-sm text-gray-400 mt-2">Try adjusting your filters or create a new schedule</p>
                  </td>
                </tr>
              ) : (
                sortedSchedules.map((schedule) => {
                  const daysUntil = getDaysUntilDue(schedule.next_due_date)
                  const isOverdue = daysUntil < 0
                  const isDueSoon = daysUntil >= 0 && daysUntil <= 7
                  
                  return (
                    <tr 
                      key={schedule.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        !schedule.is_active ? 'opacity-60' : ''
                      } ${isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-orange-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-medium text-gray-900">{schedule.asset_id}</span>
                          {schedule.asset_name && (
                            <p className="text-sm text-gray-500">{schedule.asset_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700">{schedule.description}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FaHistory className="text-indigo-600" />
                          <span className="text-gray-700 font-medium">{schedule.interval_days} days</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className={`font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                            {new Date(schedule.next_due_date).toLocaleDateString()}
                          </span>
                          <p className={`text-sm ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                            {daysUntil >= 0 ? `${daysUntil} days` : `${Math.abs(daysUntil)} days overdue`}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(daysUntil)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700">{schedule.assigned_team || 'Unassigned'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {schedule.is_active && (
                            <button
                              onClick={() => handleMarkComplete(schedule)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Mark Complete"
                            >
                              <FaCheckCircle />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleActive(schedule.id, schedule.is_active)}
                            className={`p-2 rounded-lg transition-colors ${
                              schedule.is_active 
                                ? 'text-orange-600 hover:bg-orange-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={schedule.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {schedule.is_active ? <FaPause /> : <FaPlay />}
                          </button>
                          <button
                            onClick={() => navigate(`/dashboard/maintenance/preventive/edit/${schedule.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PreventiveMaintenance
