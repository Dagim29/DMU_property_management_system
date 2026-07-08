import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaChartBar,
  FaChartPie,
  FaChartLine,
  FaDollarSign,
  FaTools,
  FaExclamationTriangle,
  FaCheckCircle,
  FaArrowUp,
  FaArrowDown,
  FaDownload,
  FaFilter,
  FaClock,
  FaBox,
  FaTrophy,
  FaExclamationCircle,
  FaChevronDown
} from 'react-icons/fa'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import api from '../../services/api'
import useToast from '../../hooks/useToast'

const AssetAnalytics = () => {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState([])
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  const [analytics, setAnalytics] = useState({
    totalAssets: 0,
    totalValue: 0,
    averageAge: 0,
    maintenanceCost: 0,
    byStatus: {},
    byType: {},
    byCampus: {},
    depreciationRate: 0,
    utilizationRate: 0
  })
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [assetsRes, maintenanceRes] = await Promise.all([
        api.get('/assets/assets/'),
        api.get('/maintenance/requests/')
      ])

      const assetsData = assetsRes.data.results || assetsRes.data
      const maintenanceData = maintenanceRes.data.results || maintenanceRes.data

      setAssets(Array.isArray(assetsData) ? assetsData : [])
      setMaintenanceRequests(Array.isArray(maintenanceData) ? maintenanceData : [])

      calculateAnalytics(assetsData, maintenanceData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (assetsData, maintenanceData) => {
    const totalAssets = assetsData.length
    const totalValue = assetsData.reduce((sum, asset) => 
      sum + parseFloat(asset.current_value || 0), 0
    )

    // Calculate average age
    const today = new Date()
    const agesInDays = assetsData
      .filter(a => a.purchase_date)
      .map(a => {
        const purchaseDate = new Date(a.purchase_date)
        return Math.floor((today - purchaseDate) / (1000 * 60 * 60 * 24))
      })
    const averageAge = agesInDays.length > 0 
      ? agesInDays.reduce((sum, age) => sum + age, 0) / agesInDays.length / 365
      : 0

    // Calculate maintenance cost from work orders if available
    const maintenanceCost = maintenanceData.reduce((sum, req) => {
      const cost = req.work_order_signoff ? parseFloat(req.work_order_signoff.cost_total || 0) : 0
      return sum + cost
    }, 0)

    // Group by status
    const byStatus = assetsData.reduce((acc, asset) => {
      acc[asset.status] = (acc[asset.status] || 0) + 1
      return acc
    }, {})

    // Group by type
    const byType = assetsData.reduce((acc, asset) => {
      acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1
      return acc
    }, {})

    // Group by campus
    const byCampus = assetsData.reduce((acc, asset) => {
      const campus = asset.campus_name || 'Unknown'
      acc[campus] = (acc[campus] || 0) + 1
      return acc
    }, {})

    // Calculate depreciation rate
    const totalPurchaseCost = assetsData.reduce((sum, asset) => 
      sum + parseFloat(asset.purchase_cost || 0), 0
    )
    const depreciationRate = totalPurchaseCost > 0 
      ? ((totalPurchaseCost - totalValue) / totalPurchaseCost) * 100
      : 0

    // Calculate utilization rate
    const inUseCount = byStatus['IN_USE'] || 0
    const utilizationRate = totalAssets > 0 ? (inUseCount / totalAssets) * 100 : 0

    setAnalytics({
      totalAssets,
      totalValue,
      averageAge,
      maintenanceCost,
      byStatus,
      byType,
      byCampus,
      depreciationRate,
      utilizationRate
    })
  }

  const exportToCSV = () => {
    let csvContent = 'Asset Analytics Report\n'
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`
    
    csvContent += 'Summary Statistics\n'
    csvContent += `Total Assets,${analytics.totalAssets}\n`
    csvContent += `Total Value,ETB ${analytics.totalValue.toLocaleString()}\n`
    csvContent += `Average Age,${analytics.averageAge.toFixed(1)} years\n`
    csvContent += `Maintenance Cost,ETB ${analytics.maintenanceCost.toLocaleString()}\n`
    csvContent += `Depreciation Rate,${analytics.depreciationRate.toFixed(1)}%\n`
    csvContent += `Utilization Rate,${analytics.utilizationRate.toFixed(1)}%\n\n`
    
    csvContent += 'Assets by Status\n'
    Object.entries(analytics.byStatus).forEach(([status, count]) => {
      csvContent += `${status},${count}\n`
    })
    csvContent += '\n'
    
    csvContent += 'Assets by Type\n'
    Object.entries(analytics.byType).forEach(([type, count]) => {
      csvContent += `${type},${count}\n`
    })
    csvContent += '\n'
    
    csvContent += 'Assets by Campus\n'
    Object.entries(analytics.byCampus).forEach(([campus, count]) => {
      csvContent += `${campus},${count}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `asset-analytics-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showSuccess('CSV exported successfully!')
  }

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      
      // Summary Sheet
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Assets', analytics.totalAssets],
        ['Total Value', `ETB ${analytics.totalValue.toLocaleString()}`],
        ['Average Age', `${analytics.averageAge.toFixed(1)} years`],
        ['Maintenance Cost', `ETB ${analytics.maintenanceCost.toLocaleString()}`],
        ['Depreciation Rate', `${analytics.depreciationRate.toFixed(1)}%`],
        ['Utilization Rate', `${analytics.utilizationRate.toFixed(1)}%`]
      ]
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
      
      // Breakdown Sheet
      const breakdownData = [['Category', 'Item', 'Count']]
      Object.entries(analytics.byStatus).forEach(([status, count]) => {
        breakdownData.push(['Status', status, count])
      })
      Object.entries(analytics.byType).forEach(([type, count]) => {
        breakdownData.push(['Type', type, count])
      })
      Object.entries(analytics.byCampus).forEach(([campus, count]) => {
        breakdownData.push(['Campus', campus, count])
      })
      const wsBreakdown = XLSX.utils.aoa_to_sheet(breakdownData)
      XLSX.utils.book_append_sheet(wb, wsBreakdown, 'Breakdowns')
      
      XLSX.writeFile(wb, `asset-analytics-${new Date().toISOString().split('T')[0]}.xlsx`)
      showSuccess('Excel file exported successfully!')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      showError('Failed to export Excel file')
    }
  }

  const exportToPDF = async () => {
    try {
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
      doc.setTextColor(30, 64, 175) // Indigo-700
      doc.text('Asset Analytics Report', pageWidth / 2, startY, { align: 'center' })
      
      // Add subtitle
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128)
      doc.text('Debre Markos University - Property Management System', pageWidth / 2, startY + 8, { align: 'center' })
      
      // Add metadata
      doc.setFontSize(10)
      doc.setTextColor(31, 41, 55)
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, startY + 18, { align: 'center' })
      
      startY += 28
 
       // Summary Table
       const summaryData = [
         ['Metric', 'Value'],
         ['Total Assets', analytics.totalAssets.toString()],
         ['Total Value', `ETB ${analytics.totalValue.toLocaleString()}`],
         ['Average Age', `${analytics.averageAge.toFixed(1)} years`],
         ['Maintenance Cost', `ETB ${analytics.maintenanceCost.toLocaleString()}`],
         ['Depreciation Rate', `${analytics.depreciationRate.toFixed(1)}%`],
         ['Utilization Rate', `${analytics.utilizationRate.toFixed(1)}%`]
       ]
       
       autoTable(doc, {
         startY: startY,
        head: [['Summary Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        alternateRowStyles: { fillColor: [243, 244, 246] }
      })
      
      let nextY = doc.lastAutoTable.finalY + 15
      
      // Breakdowns Table
      const breakdownData = []
      Object.entries(analytics.byStatus).forEach(([status, count]) => {
        breakdownData.push(['Status', status, count.toString()])
      })
      Object.entries(analytics.byType).forEach(([type, count]) => {
        breakdownData.push(['Type', type, count.toString()])
      })
      Object.entries(analytics.byCampus).forEach(([campus, count]) => {
        breakdownData.push(['Campus', campus, count.toString()])
      })
      
      autoTable(doc, {
        startY: nextY,
        head: [['Category', 'Item', 'Count']],
        body: breakdownData,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        alternateRowStyles: { fillColor: [243, 244, 246] }
      })
      
      let nextYCondition = doc.lastAutoTable.finalY + 15
      
      // Condition Breakdown
      const conditionData = []
      ;['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].forEach(condition => {
        const count = assets.filter(a => a.condition === condition).length
        const percentage = analytics.totalAssets > 0 ? (count / analytics.totalAssets) * 100 : 0
        conditionData.push([condition, count.toString(), `${percentage.toFixed(1)}%`])
      })
      
      autoTable(doc, {
        startY: nextYCondition,
        head: [['Condition', 'Count', 'Percentage']],
        body: conditionData,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        alternateRowStyles: { fillColor: [243, 244, 246] }
      })
      
      let nextYAge = doc.lastAutoTable.finalY + 15
      
      // Age Distribution
      const ageGroups = { '0-1 years': 0, '1-3 years': 0, '3-5 years': 0, '5-10 years': 0, '10+ years': 0 }
      const today = new Date()
      assets.forEach(asset => {
        if (asset.purchase_date) {
          const purchaseDate = new Date(asset.purchase_date)
          const ageInYears = (today - purchaseDate) / (1000 * 60 * 60 * 24 * 365)
          if (ageInYears < 1) ageGroups['0-1 years']++
          else if (ageInYears < 3) ageGroups['1-3 years']++
          else if (ageInYears < 5) ageGroups['3-5 years']++
          else if (ageInYears < 10) ageGroups['5-10 years']++
          else ageGroups['10+ years']++
        }
      })
      
      const ageData = Object.entries(ageGroups).map(([age, count]) => [age, count.toString()])
      
      autoTable(doc, {
        startY: nextYAge,
        head: [['Age Range', 'Count']],
        body: ageData,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        alternateRowStyles: { fillColor: [243, 244, 246] }
      })
      
      let nextYTop = doc.lastAutoTable.finalY + 15
      
      // Top 10 Assets
      const topAssetsData = assets
        .sort((a, b) => (parseFloat(b.current_value) || 0) - (parseFloat(a.current_value) || 0))
        .slice(0, 10)
        .map((asset, index) => [
          (index + 1).toString(),
          asset.asset_id,
          asset.name,
          asset.asset_type,
          `ETB ${parseFloat(asset.current_value || 0).toLocaleString()}`,
          asset.status
        ])
        
      autoTable(doc, {
        startY: nextYTop,
        head: [['Rank', 'Asset ID', 'Name', 'Type', 'Value', 'Status']],
        body: topAssetsData,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [243, 244, 246] }
      })
      
      // Save PDF
      doc.save(`asset-analytics-${new Date().toISOString().split('T')[0]}.pdf`)
      showSuccess('PDF exported successfully!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showError('Failed to generate PDF')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">Asset Analytics</h1>
              <p className="text-purple-100 text-lg">Comprehensive insights and metrics</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all flex items-center gap-2"
              >
                <FaDownload />
                Export Report
                <FaChevronDown className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
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
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Assets</p>
              <p className="text-3xl font-bold text-gray-800">{analytics.totalAssets}</p>
            </div>
            <FaChartBar className="text-5xl text-blue-500 opacity-20" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FaArrowUp className="text-green-500" />
            <span className="text-green-600 font-semibold">Active inventory</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Value</p>
              <p className="text-3xl font-bold text-gray-800">
                ETB {analytics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <FaDollarSign className="text-5xl text-green-500 opacity-20" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Current valuation</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg. Depreciation</p>
              <p className="text-3xl font-bold text-gray-800">
                {analytics.depreciationRate.toFixed(1)}%
              </p>
            </div>
            <FaChartLine className="text-5xl text-orange-500 opacity-20" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FaArrowDown className="text-orange-500" />
            <span className="text-orange-600 font-semibold">Value decline</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Utilization Rate</p>
              <p className="text-3xl font-bold text-gray-800">
                {analytics.utilizationRate.toFixed(1)}%
              </p>
            </div>
            <FaCheckCircle className="text-5xl text-purple-500 opacity-20" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Assets in use</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Assets by Status */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaChartPie className="text-blue-600" />
            Assets by Status
          </h3>
          
          <div className="space-y-4">
            {Object.entries(analytics.byStatus).map(([status, count]) => {
              const percentage = (count / analytics.totalAssets) * 100
              const colors = {
                AVAILABLE: { bg: 'bg-green-500', text: 'text-green-600' },
                IN_USE: { bg: 'bg-blue-500', text: 'text-blue-600' },
                UNDER_MAINTENANCE: { bg: 'bg-yellow-500', text: 'text-yellow-600' },
                CONDEMNED: { bg: 'bg-red-500', text: 'text-red-600' }
              }
              const color = colors[status] || { bg: 'bg-gray-500', text: 'text-gray-600' }

              return (
                <div key={status}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {status.replace('_', ' ')}
                    </span>
                    <span className={`text-sm font-bold ${color.text}`}>
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${color.bg} transition-all`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Assets by Type */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaChartBar className="text-purple-600" />
            Assets by Type
          </h3>
          
          <div className="space-y-4">
            {Object.entries(analytics.byType).map(([type, count]) => {
              const percentage = (count / analytics.totalAssets) * 100
              const typeLabels = {
                EQP: 'Equipment',
                FUR: 'Furniture',
                VEH: 'Vehicle',
                BLD: 'Building Component',
                OTH: 'Other'
              }

              return (
                <div key={type}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {typeLabels[type] || type}
                    </span>
                    <span className="text-sm font-bold text-purple-600">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Campus Distribution */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FaChartLine className="text-teal-600" />
          Campus Distribution
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(analytics.byCampus).map(([campus, count]) => {
            const percentage = (count / analytics.totalAssets) * 100

            return (
              <div key={campus} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">{campus}</span>
                  <span className="text-sm font-bold text-teal-600">{count}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500 transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">{percentage.toFixed(1)}% of total</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaChartPie className="text-indigo-600" />
            Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(analytics.byStatus).map(([name, value]) => ({
                  name: name.replace('_', ' '),
                  value
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.keys(analytics.byStatus).map((entry, index) => {
                  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                })}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Type Bar Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaChartBar className="text-purple-600" />
            Asset Types
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={Object.entries(analytics.byType).map(([name, value]) => {
                const typeLabels = {
                  EQP: 'Equipment',
                  FUR: 'Furniture',
                  VEH: 'Vehicle',
                  BLD: 'Building',
                  OTH: 'Other'
                }
                return {
                  name: typeLabels[name] || name,
                  count: value
                }
              })}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Asset Condition Analysis */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FaBox className="text-blue-600" />
          Asset Condition Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].map((condition) => {
            const count = assets.filter(a => a.condition === condition).length
            const percentage = analytics.totalAssets > 0 ? (count / analytics.totalAssets) * 100 : 0
            const colors = {
              EXCELLENT: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-500' },
              GOOD: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
              FAIR: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-500' },
              POOR: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-500' }
            }
            const color = colors[condition]

            return (
              <div key={condition} className={`p-4 ${color.bg} rounded-lg border-l-4 ${color.border}`}>
                <p className="text-sm font-semibold text-gray-700 mb-2">{condition}</p>
                <p className={`text-3xl font-bold ${color.text} mb-1`}>{count}</p>
                <p className="text-xs text-gray-600">{percentage.toFixed(1)}% of total</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Assets by Value */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FaTrophy className="text-yellow-600" />
          Top 10 Assets by Value
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Asset ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Value</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {assets
                .sort((a, b) => (parseFloat(b.current_value) || 0) - (parseFloat(a.current_value) || 0))
                .slice(0, 10)
                .map((asset, index) => (
                  <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? 'bg-yellow-100 text-yellow-600' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-50 text-blue-600'
                      } font-bold text-sm`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-gray-600">{asset.asset_id}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{asset.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{asset.asset_type}</td>
                    <td className="py-3 px-4 text-right font-bold text-green-600">
                      ETB {parseFloat(asset.current_value || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        asset.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                        asset.status === 'IN_USE' ? 'bg-blue-100 text-blue-700' :
                        asset.status === 'UNDER_MAINTENANCE' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Age Distribution */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FaClock className="text-indigo-600" />
          Asset Age Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={(() => {
              const ageGroups = { '0-1': 0, '1-3': 0, '3-5': 0, '5-10': 0, '10+': 0 }
              const today = new Date()
              
              assets.forEach(asset => {
                if (asset.purchase_date) {
                  const purchaseDate = new Date(asset.purchase_date)
                  const ageInYears = (today - purchaseDate) / (1000 * 60 * 60 * 24 * 365)
                  
                  if (ageInYears < 1) ageGroups['0-1']++
                  else if (ageInYears < 3) ageGroups['1-3']++
                  else if (ageInYears < 5) ageGroups['3-5']++
                  else if (ageInYears < 10) ageGroups['5-10']++
                  else ageGroups['10+']++
                }
              })
              
              return Object.entries(ageGroups).map(([age, count]) => ({
                age: `${age} years`,
                count
              }))
            })()}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="age" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#818cf8" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Financial Overview & Maintenance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Financial Overview */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 transition-all hover:shadow-2xl">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl text-green-600">
              <FaDollarSign className="text-xl" />
            </div>
            Financial Overview
          </h3>
          
          <div className="space-y-5">
            <div className="flex justify-between items-center p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500 rounded-xl text-white shadow-lg shadow-green-200">
                  <FaDollarSign className="text-lg" />
                </div>
                <span className="text-gray-700 font-bold text-lg">Total Asset Value</span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                ETB {analytics.totalValue.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center p-5 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-200">
                  <FaTools className="text-lg" />
                </div>
                <span className="text-gray-700 font-bold text-lg">Maintenance Cost</span>
              </div>
              <span className="text-2xl font-bold text-orange-600">
                ETB {analytics.maintenanceCost.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-200">
                  <FaBox className="text-lg" />
                </div>
                <span className="text-gray-700 font-bold text-lg">Cost per Asset</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                ETB {analytics.totalAssets > 0 
                  ? (analytics.totalValue / analytics.totalAssets).toLocaleString(undefined, {maximumFractionDigits: 0})
                  : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Maintenance Insights */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 transition-all hover:shadow-2xl">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
              <FaTools className="text-xl" />
            </div>
            Maintenance Insights
          </h3>
          
          <div className="space-y-5">
            <div className="flex justify-between items-center p-5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500 rounded-xl text-white shadow-lg shadow-purple-200">
                  <FaChartBar className="text-lg" />
                </div>
                <span className="text-gray-700 font-bold text-lg">Total Requests</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">
                {maintenanceRequests.length}
              </span>
            </div>

            <div className="flex justify-between items-center p-5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-200">
                  <FaDollarSign className="text-lg" />
                </div>
                <span className="text-gray-700 font-bold text-lg">Avg. Cost per Request</span>
              </div>
              <span className="text-2xl font-bold text-amber-600">
                ETB {maintenanceRequests.length > 0 
                  ? (analytics.maintenanceCost / maintenanceRequests.length).toLocaleString(undefined, {maximumFractionDigits: 0})
                  : 0}
              </span>
            </div>

            <div className="flex justify-between items-center p-5 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500 rounded-xl text-white shadow-lg shadow-red-200">
                  <FaExclamationCircle className="text-lg" />
                </div>
                <span className="text-gray-700 font-bold text-lg">Maintenance Rate</span>
              </div>
              <span className="text-2xl font-bold text-red-600">
                {analytics.totalAssets > 0 
                  ? (maintenanceRequests.length / analytics.totalAssets).toFixed(2)
                  : 0} per asset
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(analytics.depreciationRate > 50 || analytics.utilizationRate < 50) && (
        <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <div className="flex items-start gap-4">
            <FaExclamationTriangle className="text-yellow-600 text-2xl flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-gray-800 mb-2">Attention Required</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {analytics.depreciationRate > 50 && (
                  <li>• High depreciation rate detected ({analytics.depreciationRate.toFixed(1)}%). Consider asset replacement planning.</li>
                )}
                {analytics.utilizationRate < 50 && (
                  <li>• Low utilization rate ({analytics.utilizationRate.toFixed(1)}%). Review asset allocation and consider redistribution.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssetAnalytics
