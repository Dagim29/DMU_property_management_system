import { useState, useEffect } from 'react'
import { 
  FaFileAlt, 
  FaDownload, 
  FaChartBar,
  FaMoneyBillWave,
  FaTools,
  FaBox,
  FaCalendar,
  FaSync,
  FaCalendarAlt,
  FaChartLine,
  FaChevronDown
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import ScheduledReports from './ScheduledReports'
import GeneratedReports from './GeneratedReports'
import MaintenanceMetrics from './MaintenanceMetrics'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const ReportsPage = () => {
  const { showSuccess, showError } = useToast()
  const [activeTab, setActiveTab] = useState('generate')
  const [activeReport, setActiveReport] = useState('asset-status')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  })

  const reports = [
    {
      id: 'asset-status',
      name: 'Asset Status Summary',
      description: 'Overview of all assets by status and type',
      icon: FaBox,
      color: 'from-blue-500 to-blue-600',
      endpoint: '/reports/assets/'
    },
    {
      id: 'maintenance-cost',
      name: 'Maintenance Cost Analysis',
      description: 'Breakdown of maintenance costs by asset and category',
      icon: FaMoneyBillWave,
      color: 'from-green-500 to-green-600',
      endpoint: '/reports/maintenance-costs/'
    },
    {
      id: 'asset-utilization',
      name: 'Asset Utilization',
      description: 'Usage statistics and availability rates',
      icon: FaChartBar,
      color: 'from-purple-500 to-purple-600',
      endpoint: '/reports/assets/'
    },
    {
      id: 'preventive-compliance',
      name: 'Preventive Maintenance Compliance',
      description: 'Scheduled vs completed preventive maintenance',
      icon: FaTools,
      color: 'from-orange-500 to-orange-600',
      endpoint: '/reports/preventive-compliance/'
    }
  ]

  useEffect(() => {
    fetchReport()
  }, [activeReport])

  const fetchReport = async () => {
    const report = reports.find(r => r.id === activeReport)
    if (!report) return

    try {
      setLoading(true)
      const params = {}
      if (dateRange.start_date) params.start_date = dateRange.start_date
      if (dateRange.end_date) params.end_date = dateRange.end_date

      const response = await api.get(report.endpoint, { params })
      setReportData(response.data)
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData) return

    try {
      let csvContent = ''
      let filename = `${activeReport}-${new Date().toISOString().split('T')[0]}.csv`

      if (activeReport === 'asset-status' && Array.isArray(reportData)) {
        csvContent = 'Asset ID,Name,Type,Status,Campus,Purchase Date,Purchase Cost,Current Value\n'
        reportData.forEach(asset => {
          csvContent += `${asset.asset_id},${asset.name},${asset.asset_type},${asset.status},${asset.campus__name || ''},${asset.purchase_date || ''},${asset.purchase_cost || ''},${asset.current_value || ''}\n`
        })
      } else if (activeReport === 'maintenance-cost' && Array.isArray(reportData)) {
        csvContent = 'Asset ID,Asset Name,Category,Total Cost,Work Order Count\n'
        reportData.forEach(item => {
          csvContent += `${item.request__asset__asset_id},${item.request__asset__name},${item.request__category},${item.total_cost},${item.work_order_count}\n`
        })
      }

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      showSuccess('CSV exported successfully!')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      showError('Failed to export CSV')
    }
  }

  const exportToExcel = () => {
    if (!reportData) return

    try {
      const wb = XLSX.utils.book_new()
      const filename = `${activeReport}-${new Date().toISOString().split('T')[0]}.xlsx`

      if (activeReport === 'asset-status' && Array.isArray(reportData)) {
        const data = reportData.map(asset => ({
          'Asset ID': asset.asset_id,
          'Name': asset.name,
          'Type': asset.asset_type,
          'Status': asset.status,
          'Campus': asset.campus__name || '',
          'Purchase Date': asset.purchase_date || '',
          'Purchase Cost': asset.purchase_cost || '',
          'Current Value': asset.current_value || ''
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, 'Asset Status')
      } else if (activeReport === 'maintenance-cost' && Array.isArray(reportData)) {
        const data = reportData.map(item => ({
          'Asset ID': item.request__asset__asset_id,
          'Asset Name': item.request__asset__name,
          'Category': item.request__category,
          'Total Cost': item.total_cost,
          'Work Order Count': item.work_order_count
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Cost')
      }

      XLSX.writeFile(wb, filename)
      showSuccess('Excel file exported successfully!')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      showError('Failed to export Excel file')
    }
  }

  const exportToPDF = async () => {
    if (!reportData) return

    try {
      // Import jsPDF and autoTable plugin
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Try to add DMU logo
      let startY = 20
      try {
        const logoImg = new Image()
        logoImg.src = '/src/assets/images/branding/dmu-logo.png'
        
        // Wait for image to load
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve
          logoImg.onerror = reject
          setTimeout(reject, 1000) // Timeout after 1 second
        })
        
        // Add logo centered at top (1.5" x 1.5" = 38mm x 38mm)
        const logoSize = 38
        const logoX = (pageWidth - logoSize) / 2
        doc.addImage(logoImg, 'PNG', logoX, 10, logoSize, logoSize)
        startY = 55
      } catch (error) {
        console.log('Logo not loaded, continuing without it')
        startY = 20
      }
      
      // Add title with DMU branding
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 64, 175) // Indigo-700 (#1e40af)
      doc.text(selectedReport.name, pageWidth / 2, startY, { align: 'center' })
      
      // Add subtitle
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128) // gray-600
      doc.text('Debre Markos University - Property Management System', pageWidth / 2, startY + 8, { align: 'center' })
      
      // Add metadata section
      startY += 20
      doc.setFontSize(10)
      doc.setTextColor(31, 41, 55) // gray-800
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, startY, { align: 'center' })
      
      if (dateRange.start_date && dateRange.end_date) {
        doc.text(`Period: ${dateRange.start_date} to ${dateRange.end_date}`, pageWidth / 2, startY + 6, { align: 'center' })
        startY += 6
      }

      startY += 12

      // Generate table based on report type
      if (activeReport === 'asset-status' && Array.isArray(reportData)) {
        const tableData = reportData.map(asset => [
          asset.asset_id,
          asset.name,
          asset.asset_type,
          asset.status,
          asset.campus__name || 'N/A',
          asset.purchase_cost ? `ETB ${parseFloat(asset.purchase_cost).toLocaleString()}` : 'N/A',
          asset.current_value ? `ETB ${parseFloat(asset.current_value).toLocaleString()}` : 'N/A'
        ])

        autoTable(doc, {
          startY,
          head: [['Asset ID', 'Name', 'Type', 'Status', 'Campus', 'Purchase Cost', 'Current Value']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [30, 64, 175], // Indigo-700 (#1e40af)
            textColor: 255, 
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'left'
          },
          styles: { 
            fontSize: 8, 
            cellPadding: 3,
            lineColor: [156, 163, 175], // gray-400
            lineWidth: 0.5
          },
          alternateRowStyles: {
            fillColor: [243, 244, 246] // gray-100
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 30 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 25 },
            5: { cellWidth: 30, halign: 'right' },
            6: { cellWidth: 30, halign: 'right' }
          }
        })
      } else if (activeReport === 'maintenance-cost' && Array.isArray(reportData)) {
        const tableData = reportData.map(item => [
          item.request__asset__asset_id,
          item.request__asset__name,
          item.request__category,
          item.work_order_count.toString(),
          `ETB ${parseFloat(item.total_cost || 0).toLocaleString()}`
        ])

        autoTable(doc, {
          startY,
          head: [['Asset ID', 'Asset Name', 'Category', 'Work Orders', 'Total Cost']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [30, 64, 175], // Indigo-700 (#1e40af)
            textColor: 255, 
            fontStyle: 'bold',
            fontSize: 10
          },
          styles: { 
            fontSize: 9, 
            cellPadding: 4,
            lineColor: [156, 163, 175],
            lineWidth: 0.5
          },
          alternateRowStyles: {
            fillColor: [243, 244, 246]
          },
          columnStyles: {
            4: { halign: 'right', fontStyle: 'bold' }
          }
        })

        // Add summary with better styling
        const totalCost = reportData.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0)
        const finalY = doc.lastAutoTable.finalY + 15
        
        // Draw summary box
        doc.setFillColor(224, 231, 255) // Indigo-100
        doc.roundedRect(14, finalY - 5, pageWidth - 28, 15, 3, 3, 'F')
        
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 64, 175)
        doc.text(`Total Maintenance Cost: ETB ${totalCost.toLocaleString()}`, pageWidth / 2, finalY + 3, { align: 'center' })
      } else if (activeReport === 'asset-utilization' && Array.isArray(reportData)) {
        const total = reportData.length || 1;
        const available = reportData.filter(a => a.status === 'AVAILABLE').length
        const inUse = reportData.filter(a => a.status === 'IN_USE').length
        const underMaintenance = reportData.filter(a => a.status === 'UNDER_MAINTENANCE').length
        const utilizationRate = ((inUse / total) * 100).toFixed(1)
        const availabilityRate = (((available + inUse) / total) * 100).toFixed(1)

        // Summary statistics with DMU branding
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 64, 175)
        doc.text('Asset Utilization & Availability Summary', 14, startY)
        
        const summaryData = [
          ['Total Registry Count', total.toString()],
          ['Active / In Use', `${inUse} (${((inUse/total)*100).toFixed(1)}%)`],
          ['Idle / Available', `${available} (${((available/total)*100).toFixed(1)}%)`],
          ['Under Maintenance', `${underMaintenance} (${((underMaintenance/total)*100).toFixed(1)}%)`],
          ['Key Indicator: Utilization Rate', `${utilizationRate}%`],
          ['Key Indicator: Availability Rate', `${availabilityRate}%`]
        ]

        autoTable(doc, {
          startY: startY + 8,
          head: [['Metric', 'Value']],
          body: summaryData,
          theme: 'grid',
          headStyles: { 
            fillColor: [30, 64, 175],
            textColor: 255, 
            fontStyle: 'bold',
            fontSize: 11
          },
          styles: { 
            fontSize: 10, 
            cellPadding: 6,
            lineColor: [156, 163, 175],
            lineWidth: 0.5
          },
          alternateRowStyles: {
            fillColor: [243, 244, 246]
          },
          columnStyles: {
            0: { cellWidth: 100, fontStyle: 'bold' },
            1: { cellWidth: 80, halign: 'right', fontStyle: 'bold', textColor: [30, 64, 175] }
          }
        })

        // Add the detailed list table
        const finalY = doc.lastAutoTable.finalY + 15
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 64, 175)
        doc.text('Detailed Asset Utilization Registry', 14, finalY)
        
        const tableData = reportData.map(asset => [
          asset.asset_id,
          asset.name,
          asset.asset_type,
          asset.status.replace(/_/g, ' '),
          asset.campus__name || 'Unassigned'
        ])

        autoTable(doc, {
          startY: finalY + 8,
          head: [['Asset ID', 'Name', 'Category', 'Current Status', 'Location']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [30, 64, 175],
            textColor: 255, 
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'left'
          },
          styles: { 
            fontSize: 8, 
            cellPadding: 3,
            lineColor: [156, 163, 175],
            lineWidth: 0.5
          },
          alternateRowStyles: {
            fillColor: [243, 244, 246]
          }
        })
      } else if (activeReport === 'preventive-compliance') {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 64, 175)
        doc.text('Preventive Maintenance Compliance Report', 14, startY)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(107, 114, 128)
        doc.text('This feature requires preventive maintenance scheduling to be implemented', 14, startY + 10)
      }

      // Add professional footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        const pageHeight = doc.internal.pageSize.getHeight()
        
        // Footer line
        doc.setDrawColor(224, 231, 255) // Indigo-100
        doc.setLineWidth(0.5)
        doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20)
        
        // Footer text
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(107, 114, 128)
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          pageWidth / 2,
          pageHeight - 14,
          { align: 'center' }
        )
        doc.text(
          'Debre Markos University - Property Management System',
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        )
      }

      // Save PDF
      const filename = `${activeReport}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      showSuccess('PDF exported successfully!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showError('Failed to generate PDF: ' + error.message)
    }
  }

  const selectedReport = reports.find(r => r.id === activeReport)

  const tabs = [
    { id: 'generate', name: 'Generate Reports', icon: FaFileAlt },
    { id: 'scheduled', name: 'Scheduled Reports', icon: FaCalendarAlt },
    { id: 'generated', name: 'Generated Reports', icon: FaChartBar },
    { id: 'metrics', name: 'Maintenance Metrics', icon: FaChartLine }
  ]

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Reports & Compliance</h1>
              <p className="text-indigo-100 text-lg">Comprehensive reporting and analytics system</p>
            </div>
            <FaFileAlt className="text-6xl opacity-20" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-lg p-2 border border-gray-100 flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'scheduled' && <ScheduledReports />}
      {activeTab === 'generated' && <GeneratedReports />}
      {activeTab === 'metrics' && <MaintenanceMetrics />}
      {activeTab === 'generate' && (
        <div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selection Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Available Reports</h3>
          {reports.map(report => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                activeReport === report.id
                  ? 'bg-white shadow-lg border-2 border-indigo-500'
                  : 'bg-white hover:shadow-md border-2 border-gray-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${report.color}`}>
                  <report.icon className="text-white text-xl" />
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold mb-1 ${
                    activeReport === report.id ? 'text-indigo-600' : 'text-gray-800'
                  }`}>
                    {report.name}
                  </h4>
                  <p className="text-xs text-gray-600">{report.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Report Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${selectedReport?.color}`}>
                  {selectedReport && <selectedReport.icon className="text-white text-2xl" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedReport?.name}</h2>
                  <p className="text-gray-600">{selectedReport?.description}</p>
                </div>
              </div>
              <button
                onClick={fetchReport}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Date Range Filter */}
          {(activeReport === 'maintenance-cost' || activeReport === 'preventive-compliance') && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <FaCalendar className="text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-800">Date Range</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start_date}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end_date}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchReport}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Export Options</h3>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={!reportData || loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
              >
                <FaDownload />
                Export Report
                <FaChevronDown className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <button
                    onClick={() => { exportToCSV(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 text-gray-700"
                  >
                    <FaDownload className="text-green-600" />
                    <span className="font-medium">Export as CSV</span>
                  </button>
                  <button
                    onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 text-gray-700"
                  >
                    <FaDownload className="text-green-600" />
                    <span className="font-medium">Export as Excel</span>
                  </button>
                  <button
                    onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                  >
                    <FaDownload className="text-red-600" />
                    <span className="font-medium">Export as PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Report Data */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Report Data</h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : reportData ? (
              <div className="overflow-x-auto">
                {activeReport === 'asset-status' && Array.isArray(reportData) && (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Campus</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Purchase Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Current Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.map((asset, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{asset.asset_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{asset.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{asset.asset_type}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              {asset.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{asset.campus__name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {asset.purchase_cost ? `ETB ${parseFloat(asset.purchase_cost).toLocaleString()}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {asset.current_value ? `ETB ${parseFloat(asset.current_value).toLocaleString()}` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeReport === 'maintenance-cost' && Array.isArray(reportData) && (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Work Orders</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{item.request__asset__asset_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.request__asset__name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.request__category}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.work_order_count}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">
                            ETB {parseFloat(item.total_cost || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeReport === 'asset-utilization' && Array.isArray(reportData) && (() => {
                  const total = reportData.length || 1;
                  const available = reportData.filter(a => a.status === 'AVAILABLE').length;
                  const inUse = reportData.filter(a => a.status === 'IN_USE').length;
                  const underMaintenance = reportData.filter(a => a.status === 'UNDER_MAINTENANCE').length;
                  const utilizationRate = ((inUse / total) * 100).toFixed(1);
                  const availabilityRate = (((available + inUse) / total) * 100).toFixed(1);

                  return (
                    <div className="space-y-8 animate-slide-up">
                      {/* Premium Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Tracked Assets</p>
                          <p className="text-4xl font-extrabold text-gray-800">{reportData.length}</p>
                          <p className="text-sm text-gray-400 mt-2">Entire system asset portfolio</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-emerald-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-10">
                            <FaChartBar className="text-8xl text-emerald-600" />
                          </div>
                          <div className="relative z-10">
                            <p className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-2">Deployed & Active</p>
                            <p className="text-4xl font-extrabold text-emerald-600 mb-1">{inUse}</p>
                            <p className="text-sm font-medium text-emerald-700">{((inUse/total)*100).toFixed(1)}% system share</p>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-blue-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-10">
                            <FaBox className="text-8xl text-blue-600" />
                          </div>
                          <div className="relative z-10">
                            <p className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-2">Idle & Ready</p>
                            <p className="text-4xl font-extrabold text-blue-600 mb-1">{available}</p>
                            <p className="text-sm font-medium text-blue-700">{((available/total)*100).toFixed(1)}% readiness capacity</p>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-amber-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-10">
                            <FaTools className="text-8xl text-amber-600" />
                          </div>
                          <div className="relative z-10">
                            <p className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-2">In Maintenance / Repair</p>
                            <p className="text-4xl font-extrabold text-amber-600 mb-1">{underMaintenance}</p>
                            <p className="text-sm font-medium text-amber-700">{((underMaintenance/total)*100).toFixed(1)}% currently servicing</p>
                          </div>
                        </div>
                      </div>

                      {/* Utilization Bars */}
                      <div className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-8">Key Performance Indicators</h3>
                        
                        <div className="space-y-8">
                          <div>
                            <div className="flex justify-between items-end mb-3">
                              <div>
                                <span className="block font-semibold text-gray-800 text-lg">Utilization Rate</span>
                                <span className="text-sm text-gray-500">Percentage of assets currently deployed and in use</span>
                              </div>
                              <span className="font-bold text-2xl text-emerald-600">{utilizationRate}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                              <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${utilizationRate}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-end mb-3">
                              <div>
                                <span className="block font-semibold text-gray-800 text-lg">Availability Rate</span>
                                <span className="text-sm text-gray-500">Percentage of assets either in use or ready to be deployed</span>
                              </div>
                              <span className="font-bold text-2xl text-blue-600">{availabilityRate}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                              <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${availabilityRate}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })()}

                {activeReport === 'preventive-compliance' && reportData && (() => {
                  const d = reportData.data || {}
                  const summary = d.summary || {}
                  const byType = d.by_asset_type || []
                  const overdueItems = d.overdue_items || []
                  const upcomingItems = d.upcoming_items || []
                  const rate = summary.compliance_rate ?? 0
                  const rateColor = rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-amber-600' : 'text-red-600'
                  const rateBg   = rate >= 90 ? 'bg-green-100' : rate >= 70 ? 'bg-amber-100' : 'bg-red-100'

                  return (
                    <div className="space-y-8">
                      {/* Summary KPI row */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                          { label: 'Total Schedules',      value: summary.total_active_schedules ?? '–', color: 'indigo' },
                          { label: 'Due In Period',         value: summary.scheduled_in_period    ?? '–', color: 'blue' },
                          { label: 'On Track',              value: summary.on_track               ?? '–', color: 'green' },
                          { label: 'Overdue',               value: summary.overdue_schedules      ?? '–', color: 'red' },
                          { label: 'Upcoming 30 Days',      value: summary.upcoming_30_days       ?? '–', color: 'amber' },
                          { label: 'Compliance Rate',       value: `${rate}%`,                            color: rate >= 90 ? 'green' : rate >= 70 ? 'amber' : 'red' },
                        ].map((kpi, i) => (
                          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                            <p className={`text-2xl font-bold text-${kpi.color}-600`}>{kpi.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Compliance rate bar */}
                      <div className={`rounded-xl p-5 ${rateBg} border border-gray-200`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-gray-700">Overall Compliance Rate</span>
                          <span className={`text-lg font-bold ${rateColor}`}>{rate}%</span>
                        </div>
                        <div className="w-full bg-white rounded-full h-4 overflow-hidden border border-gray-200">
                          <div
                            className={`h-4 rounded-full transition-all duration-700 ${rate >= 90 ? 'bg-green-500' : rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {summary.on_track ?? 0} of {summary.total_active_schedules ?? 0} active PM schedules are on track
                        </p>
                      </div>

                      {/* By Asset Type */}
                      {byType.length > 0 && (
                        <div>
                          <h3 className="text-base font-bold text-gray-800 mb-4">Compliance by Asset Type</h3>
                          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  {['Asset Type','Total','On Track','Overdue','Upcoming','Rate'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {byType.map((row, i) => {
                                  const r = row.compliance_rate ?? 0
                                  return (
                                    <tr key={i} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 font-medium text-gray-800">{row.asset_type}</td>
                                      <td className="px-4 py-3 text-gray-600">{row.total}</td>
                                      <td className="px-4 py-3 text-green-700 font-semibold">{row.total - row.overdue}</td>
                                      <td className="px-4 py-3 text-red-700 font-semibold">{row.overdue}</td>
                                      <td className="px-4 py-3 text-amber-700">{row.upcoming}</td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div className={`h-2 rounded-full ${r >= 90 ? 'bg-green-500' : r >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${r}%` }} />
                                          </div>
                                          <span className={`text-xs font-bold ${r >= 90 ? 'text-green-700' : r >= 70 ? 'text-amber-700' : 'text-red-700'}`}>{r}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Overdue Items */}
                      {overdueItems.length > 0 && (
                        <div>
                          <h3 className="text-base font-bold text-red-700 mb-4 flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Overdue Schedules ({overdueItems.length})
                          </h3>
                          <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-red-50 border-b border-red-100">
                                <tr>
                                  {['Asset ID','Asset Name','Type','Description','Due Date','Days Overdue','Interval','Team'].map(h => (
                                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-red-50">
                                {overdueItems.map((item, i) => (
                                  <tr key={i} className="hover:bg-red-50">
                                    <td className="px-3 py-3 font-mono text-xs text-gray-700">{item.asset_id}</td>
                                    <td className="px-3 py-3 font-medium text-gray-800">{item.asset_name}</td>
                                    <td className="px-3 py-3 text-gray-600">{item.asset_type}</td>
                                    <td className="px-3 py-3 text-gray-600 max-w-40 truncate" title={item.description}>{item.description}</td>
                                    <td className="px-3 py-3 text-red-600 font-semibold">{item.due_date}</td>
                                    <td className="px-3 py-3">
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">{item.days_overdue}d</span>
                                    </td>
                                    <td className="px-3 py-3 text-gray-500">Every {item.interval_days}d</td>
                                    <td className="px-3 py-3 text-gray-600">{item.assigned_team}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Upcoming Items */}
                      {upcomingItems.length > 0 && (
                        <div>
                          <h3 className="text-base font-bold text-amber-700 mb-4 flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                            Upcoming in Next 30 Days ({upcomingItems.length})
                          </h3>
                          <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-amber-50 border-b border-amber-100">
                                <tr>
                                  {['Asset ID','Asset Name','Type','Description','Due Date','Days Until','Interval','Team'].map(h => (
                                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-50">
                                {upcomingItems.map((item, i) => (
                                  <tr key={i} className="hover:bg-amber-50">
                                    <td className="px-3 py-3 font-mono text-xs text-gray-700">{item.asset_id}</td>
                                    <td className="px-3 py-3 font-medium text-gray-800">{item.asset_name}</td>
                                    <td className="px-3 py-3 text-gray-600">{item.asset_type}</td>
                                    <td className="px-3 py-3 text-gray-600 max-w-40 truncate" title={item.description}>{item.description}</td>
                                    <td className="px-3 py-3 text-amber-700 font-semibold">{item.due_date}</td>
                                    <td className="px-3 py-3">
                                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">in {item.days_until}d</span>
                                    </td>
                                    <td className="px-3 py-3 text-gray-500">Every {item.interval_days}d</td>
                                    <td className="px-3 py-3 text-gray-600">{item.assigned_team}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* No data fallback */}
                      {byType.length === 0 && overdueItems.length === 0 && upcomingItems.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                          <FaTools className="text-5xl text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-600 font-medium">No preventive maintenance schedules found</p>
                          <p className="text-sm text-gray-400 mt-1">Add PM schedules to assets to see compliance data here.</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="text-center py-12">
                <FaFileAlt className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No data available</p>
                <p className="text-sm text-gray-500 mt-2">Click refresh to load report data</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  )
}

export default ReportsPage
