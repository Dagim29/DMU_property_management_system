import { useState, useEffect } from 'react'
import { 
  FaDollarSign, 
  FaTools, 
  FaBox, 
  FaChartLine, 
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaSearch,
  FaChevronDown
} from 'react-icons/fa'
import api from '../../services/api'

const CostTracking = () => {
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    search: ''
  })
  const [stats, setStats] = useState({
    totalCost: 0,
    laborCost: 0,
    materialsCost: 0,
    avgCost: 0,
    completedOrders: 0
  })

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  const fetchWorkOrders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/maintenance/work-orders/')
      const orders = response.data.results || response.data
      setWorkOrders(orders)
      calculateStats(orders)
    } catch (error) {
      console.error('Error fetching work orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (orders) => {
    const completed = orders.filter(wo => wo.completed_at)
    const totalCost = completed.reduce((sum, wo) => sum + parseFloat(wo.cost_total || 0), 0)
    const laborCost = completed.reduce((sum, wo) => sum + parseFloat(wo.cost_labor || 0), 0)
    const materialsCost = completed.reduce((sum, wo) => sum + parseFloat(wo.cost_materials || 0), 0)
    
    setStats({
      totalCost,
      laborCost,
      materialsCost,
      avgCost: completed.length > 0 ? totalCost / completed.length : 0,
      completedOrders: completed.length
    })
  }

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = !filters.search || 
      wo.request_id?.toLowerCase().includes(filters.search.toLowerCase()) ||
      wo.asset_id?.toLowerCase().includes(filters.search.toLowerCase())
    
    const matchesDateRange = (!filters.startDate || new Date(wo.completed_at) >= new Date(filters.startDate)) &&
                             (!filters.endDate || new Date(wo.completed_at) <= new Date(filters.endDate))
    
    return matchesSearch && matchesDateRange && wo.completed_at
  })

  const exportData = async (format) => {
    try {
      setExporting(true)
      setShowExportMenu(false)
      
      if (format === 'csv') {
        // Client-side CSV generation
        const headers = ['Work Order ID', 'Request ID', 'Asset ID', 'Labor Cost', 'Materials Cost', 'Total Cost', 'Completed Date']
        const csvData = [
          headers,
          ...filteredWorkOrders.map(wo => [
            `WO-${wo.id}`,
            wo.request_id || '',
            wo.asset_id || '',
            wo.cost_labor || 0,
            wo.cost_materials || 0,
            wo.cost_total || 0,
            wo.completed_at ? new Date(wo.completed_at).toLocaleDateString() : ''
          ])
        ]
        
        const csvContent = csvData.map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `cost-tracking-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
      } else if (format === 'excel') {
        // Client-side Excel generation
        const XLSX = await import('xlsx')
        const worksheet = XLSX.utils.json_to_sheet(
          filteredWorkOrders.map(wo => ({
            'Work Order ID': `WO-${wo.id}`,
            'Request ID': wo.request_id || '',
            'Asset ID': wo.asset_id || '',
            'Labor Cost': parseFloat(wo.cost_labor || 0).toFixed(2),
            'Materials Cost': parseFloat(wo.cost_materials || 0).toFixed(2),
            'Total Cost': parseFloat(wo.cost_total || 0).toFixed(2),
            'Completed Date': wo.completed_at ? new Date(wo.completed_at).toLocaleDateString() : ''
          }))
        )
        
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Tracking')
        XLSX.writeFile(workbook, `cost-tracking-${new Date().toISOString().split('T')[0]}.xlsx`)
        
      } else if (format === 'pdf') {
        // Client-side PDF generation with DMU branding
        const { jsPDF } = await import('jspdf')
        await import('jspdf-autotable')
        
        const doc = new jsPDF()
        
        // Add DMU Logo
        try {
          const logoPath = '/src/assets/images/branding/dmu-logo.png'
          const logoWidth = 1.5 * 72 / 2.54  // 1.5 inches to points
          const logoHeight = 1.5 * 72 / 2.54
          const pageWidth = doc.internal.pageSize.getWidth()
          const logoX = (pageWidth - logoWidth) / 2
          
          doc.addImage(logoPath, 'PNG', logoX, 10, logoWidth, logoHeight)
        } catch (error) {
          console.warn('Could not load DMU logo:', error)
        }
        
        // University Name - Bold and Prominent
        doc.setFontSize(18)
        doc.setTextColor(30, 64, 175) // Indigo color
        doc.setFont(undefined, 'bold')
        doc.text('DEBRE MARKOS UNIVERSITY', doc.internal.pageSize.getWidth() / 2, 58, { align: 'center' })
        
        // Subtitle - Property Management System (Gold)
        doc.setFontSize(11)
        doc.setTextColor(218, 165, 32) // Gold color
        doc.setFont(undefined, 'normal')
        doc.text('Property Management System', doc.internal.pageSize.getWidth() / 2, 64, { align: 'center' })
        
        // Report Title
        doc.setFontSize(16)
        doc.setTextColor(22, 163, 74) // Green color
        doc.setFont(undefined, 'bold')
        doc.text('MAINTENANCE COST TRACKING REPORT', doc.internal.pageSize.getWidth() / 2, 74, { align: 'center' })
        
        // Decorative line
        doc.setDrawColor(22, 163, 74)
        doc.setLineWidth(0.5)
        doc.line(20, 79, doc.internal.pageSize.getWidth() - 20, 79)
        
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
        doc.text(`Report Period: ${filters.startDate || 'All Time'} to ${filters.endDate || 'Present'}`, 14, yPos)
        yPos += 5
        doc.text(`Total Work Orders: ${filteredWorkOrders.length}`, 14, yPos)
        
        yPos += 10
        
        // Cost Summary
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(100)
        doc.text('COST SUMMARY', 14, yPos)
        
        yPos += 6
        doc.setFont(undefined, 'normal')
        doc.setFontSize(9)
        doc.text(`Total Cost: ETB ${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos)
        yPos += 5
        doc.text(`Labor Cost: ETB ${stats.laborCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos)
        yPos += 5
        doc.text(`Materials Cost: ETB ${stats.materialsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos)
        yPos += 5
        doc.text(`Average Cost per Work Order: ETB ${stats.avgCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos)
        
        yPos += 10
        
        // Work Orders Table
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(100)
        doc.text('DETAILED COST BREAKDOWN', 14, yPos)
        
        yPos += 5
        
        const tableData = filteredWorkOrders.map(wo => [
          `WO-${wo.id}`,
          wo.request_id || 'N/A',
          wo.asset_id || 'N/A',
          `ETB ${parseFloat(wo.cost_labor || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `ETB ${parseFloat(wo.cost_materials || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `ETB ${parseFloat(wo.cost_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ])
        
        const autoTable = (await import('jspdf-autotable')).default
        autoTable(doc, {
          startY: yPos,
          head: [['Work Order', 'Request ID', 'Asset ID', 'Labor Cost', 'Materials Cost', 'Total Cost']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [22, 163, 74],
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
          doc.line(14, footerStartY, doc.internal.pageSize.getWidth() - 14, footerStartY)
          
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
            doc.internal.pageSize.getWidth() / 2,
            footerStartY + 7,
            { align: 'center' }
          )
          
          // Right side - Report type
          doc.setFont(undefined, 'normal')
          doc.text(
            'Maintenance Cost Report',
            doc.internal.pageSize.getWidth() - 14,
            footerStartY + 7,
            { align: 'right' }
          )
          
          // Bottom disclaimer
          doc.setFontSize(7)
          doc.setTextColor(120)
          doc.text(
            'Confidential - Generated electronically',
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 5,
            { align: 'center' }
          )
        }
        
        doc.save(`cost-tracking-report-${new Date().toISOString().split('T')[0]}.pdf`)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export. Please try again.')
    } finally {
      setExporting(false)
    }
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
      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <FaDollarSign className="text-5xl" />
                Cost Tracking
              </h1>
              <p className="text-green-100 text-lg">Monitor maintenance costs and budget</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                className="px-6 py-3 bg-white text-green-600 rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <FaDownload />
                {exporting ? 'Exporting...' : 'Export'}
                <FaChevronDown className="text-sm" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <button
                    onClick={() => exportData('csv')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 text-gray-700"
                  >
                    <FaDownload className="text-green-600" />
                    <span className="font-medium">Export as CSV</span>
                  </button>
                  <button
                    onClick={() => exportData('excel')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 text-gray-700"
                  >
                    <FaDownload className="text-green-600" />
                    <span className="font-medium">Export as Excel</span>
                  </button>
                  <button
                    onClick={() => exportData('pdf')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                  >
                    <FaDownload className="text-red-600" />
                    <span className="font-medium">Export as PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 animate-scale-in">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaDollarSign className="text-3xl text-green-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Cost</p>
          <p className="text-3xl font-bold text-gray-800">ETB {stats.totalCost.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaTools className="text-3xl text-blue-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Labor Cost</p>
          <p className="text-3xl font-bold text-gray-800">ETB {stats.laborCost.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaBox className="text-3xl text-orange-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Materials Cost</p>
          <p className="text-3xl font-bold text-gray-800">ETB {stats.materialsCost.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaChartLine className="text-3xl text-purple-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Average Cost</p>
          <p className="text-3xl font-bold text-gray-800">ETB {stats.avgCost.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <FaCalendarAlt className="text-3xl text-indigo-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Completed Orders</p>
          <p className="text-3xl font-bold text-gray-800">{stats.completedOrders}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8 animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="text-green-600" />
          <h2 className="text-xl font-bold text-gray-800">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaSearch className="inline mr-2" />
              Search
            </label>
            <input
              type="text"
              placeholder="Request ID or Asset ID"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendarAlt className="inline mr-2" />
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendarAlt className="inline mr-2" />
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {(filters.search || filters.startDate || filters.endDate) && (
          <button
            onClick={() => setFilters({ search: '', startDate: '', endDate: '' })}
            className="mt-4 text-green-600 hover:text-green-700 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Cost Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Work Order</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Request ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Asset</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Labor Cost</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Materials Cost</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total Cost</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredWorkOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No completed work orders found
                  </td>
                </tr>
              ) : (
                filteredWorkOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">WO-{wo.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">{wo.request_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">{wo.asset_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-blue-600 font-semibold">ETB {parseFloat(wo.cost_labor || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-orange-600 font-semibold">ETB {parseFloat(wo.cost_materials || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-green-600 font-bold text-lg">ETB {parseFloat(wo.cost_total || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 text-sm">
                        {wo.completed_at ? new Date(wo.completed_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CostTracking
