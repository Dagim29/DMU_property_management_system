import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaSearch, FaEye, FaPlus, FaQrcode, FaDownload, FaFileImport, FaChevronDown, FaCheckCircle, FaWrench, FaCar, FaBuilding, FaBox, FaCube, FaThLarge, FaList } from 'react-icons/fa'
import api from '../../services/api'

const statusColors = {
  AVAILABLE: 'bg-green-50 text-green-700 border border-green-200',
  IN_USE: 'bg-blue-50 text-blue-700 border border-blue-200',
  UNDER_MAINTENANCE: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  CONDEMNED: 'bg-red-50 text-red-700 border border-red-200',
}

const typeIcons = {
  EQP: <FaWrench className="text-blue-500" />,
  FUR: <FaCube className="text-amber-500" />,
  VEH: <FaCar className="text-purple-500" />,
  BLD: <FaBuilding className="text-emerald-500" />,
  OTH: <FaBox className="text-gray-500" />
}

const AssetList = () => {
  const navigate = useNavigate()
  const currentUser = useSelector((state) => state.auth.user)
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [campusFilter, setCampusFilter] = useState('')
  const [exportMessage, setExportMessage] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [viewMode, setViewMode] = useState('table')

  useEffect(() => {
    fetchAssets()
  }, [statusFilter, typeFilter])

  useEffect(() => {
    // Close export menu when clicking outside
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-menu-container')) {
        setShowExportMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  const fetchAssets = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.asset_type = typeFilter
      
      const response = await api.get('/assets/assets/', { params })
      // Handle both paginated and non-paginated responses
      const data = response.data.results || response.data
      setAssets(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError('Failed to load assets')
      console.error('Assets error:', err)
      setAssets([])
    } finally {
      setLoading(false)
    }
  }

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCampus = !campusFilter || asset.campus_name === campusFilter
    
    return matchesSearch && matchesCampus
  })

  const paginatedAssets = filteredAssets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  const totalPages = Math.ceil(filteredAssets.length / rowsPerPage)

  const exportAssets = async (format) => {
    try {
      setExporting(true)
      setShowExportMenu(false)
      
      if (format === 'csv') {
        // Enhanced CSV generation with metadata
        const now = new Date()
        const exportedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name} (${currentUser.username})` : 'Unknown User'
        
        let csvContent = '═══════════════════════════════════════════════════════════════\n'
        csvContent += '                    ASSET INVENTORY REPORT\n'
        csvContent += '═══════════════════════════════════════════════════════════════\n\n'
        
        // Export Metadata
        csvContent += 'EXPORT INFORMATION\n'
        csvContent += '─────────────────────────────────────────────────────────────\n'
        csvContent += `Generated Date:,${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`
        csvContent += `Generated Time:,${now.toLocaleTimeString('en-US')}\n`
        csvContent += `Exported By:,${exportedBy}\n`
        csvContent += `Export Format:,CSV (Comma-Separated Values)\n`
        csvContent += `System:,Property Management System\n`
        csvContent += `Total Records:,${assets.length}\n\n`
        
        // Filter Information
        csvContent += 'APPLIED FILTERS\n'
        csvContent += '─────────────────────────────────────────────────────────────\n'
        csvContent += `Search Term:,${searchTerm || 'None'}\n`
        csvContent += `Status Filter:,${statusFilter || 'All Status'}\n`
        csvContent += `Type Filter:,${typeFilter || 'All Types'}\n\n`
        
        // Summary Statistics
        csvContent += 'SUMMARY STATISTICS\n'
        csvContent += '─────────────────────────────────────────────────────────────\n'
        csvContent += `Total Assets:,${assets.length}\n`
        csvContent += `Available Assets:,${assets.filter(a => a.status === 'AVAILABLE').length}\n`
        csvContent += `In Use Assets:,${assets.filter(a => a.status === 'IN_USE').length}\n`
        csvContent += `Under Maintenance:,${assets.filter(a => a.status === 'UNDER_MAINTENANCE').length}\n`
        csvContent += `Condemned Assets:,${assets.filter(a => a.status === 'CONDEMNED').length}\n\n`
        
        // Asset Type Breakdown
        const typeStats = {}
        assets.forEach(asset => {
          typeStats[asset.asset_type] = (typeStats[asset.asset_type] || 0) + 1
        })
        csvContent += 'ASSETS BY TYPE\n'
        csvContent += '─────────────────────────────────────────────────────────────\n'
        Object.entries(typeStats).forEach(([type, count]) => {
          const typeName = type === 'EQP' ? 'Equipment' : 
                          type === 'FUR' ? 'Furniture' : 
                          type === 'VEH' ? 'Vehicle' : 
                          type === 'BLD' ? 'Building Component' : 'Other'
          csvContent += `${typeName}:,${count}\n`
        })
        csvContent += '\n'
        
        // Total Value Calculation
        const totalPurchaseCost = assets.reduce((sum, asset) => sum + (parseFloat(asset.purchase_cost) || 0), 0)
        const totalCurrentValue = assets.reduce((sum, asset) => sum + (parseFloat(asset.current_value) || 0), 0)
        csvContent += 'FINANCIAL SUMMARY\n'
        csvContent += '─────────────────────────────────────────────────────────────\n'
        csvContent += `Total Purchase Cost:,${totalPurchaseCost.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}\n`
        csvContent += `Total Current Value:,${totalCurrentValue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}\n`
        csvContent += `Depreciation:,${(totalPurchaseCost - totalCurrentValue).toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}\n\n`
        
        // Asset Data
        csvContent += '═══════════════════════════════════════════════════════════════\n'
        csvContent += '                        ASSET DATA\n'
        csvContent += '═══════════════════════════════════════════════════════════════\n\n'
        csvContent += 'Asset ID,Name,Type,Status,Campus,Location,Purchase Cost,Current Value,Purchase Date,Manufacturer,Serial Number\n'
        
        assets.forEach(asset => {
          csvContent += `"${asset.asset_id}",`
          csvContent += `"${asset.name}",`
          csvContent += `"${asset.asset_type}",`
          csvContent += `"${asset.status}",`
          csvContent += `"${asset.campus_name || '-'}",`
          csvContent += `"${asset.room_info || '-'}",`
          csvContent += `"${asset.purchase_cost || '-'}",`
          csvContent += `"${asset.current_value || '-'}",`
          csvContent += `"${asset.purchase_date || '-'}",`
          csvContent += `"${asset.manufacturer || '-'}",`
          csvContent += `"${asset.serial_number || '-'}"\n`
        })
        
        csvContent += '\n═══════════════════════════════════════════════════════════════\n'
        csvContent += `Report End - ${assets.length} assets exported\n`
        csvContent += '═══════════════════════════════════════════════════════════════\n'

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `assets-${now.toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        setExportMessage({ type: 'success', text: 'Assets exported successfully as CSV!' })
        
      } else if (format === 'excel') {
        // Enhanced Excel generation with multiple sheets and metadata
        const XLSX = await import('xlsx')
        const now = new Date()
        const exportedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name} (${currentUser.username})` : 'Unknown User'
        const wb = XLSX.utils.book_new()

        // ===== COVER SHEET =====
        const coverData = [
          ['ASSET INVENTORY REPORT'],
          [''],
          ['EXPORT INFORMATION'],
          ['Generated Date:', now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
          ['Generated Time:', now.toLocaleTimeString('en-US')],
          ['Exported By:', exportedBy],
          ['Export Format:', 'Microsoft Excel'],
          ['System:', 'Property Management System'],
          ['Total Records:', assets.length],
          [''],
          ['APPLIED FILTERS'],
          ['Search Term:', searchTerm || 'None'],
          ['Status Filter:', statusFilter || 'All Status'],
          ['Type Filter:', typeFilter || 'All Types'],
          [''],
          ['SUMMARY STATISTICS'],
          ['Total Assets:', assets.length],
          ['Available Assets:', assets.filter(a => a.status === 'AVAILABLE').length],
          ['In Use Assets:', assets.filter(a => a.status === 'IN_USE').length],
          ['Under Maintenance:', assets.filter(a => a.status === 'UNDER_MAINTENANCE').length],
          ['Condemned Assets:', assets.filter(a => a.status === 'CONDEMNED').length],
          [''],
          ['FINANCIAL SUMMARY'],
          ['Total Purchase Cost:', `${assets.reduce((sum, asset) => sum + (parseFloat(asset.purchase_cost) || 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`],
          ['Total Current Value:', `${assets.reduce((sum, asset) => sum + (parseFloat(asset.current_value) || 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`],
          ['Total Depreciation:', `${(assets.reduce((sum, asset) => sum + (parseFloat(asset.purchase_cost) || 0), 0) - assets.reduce((sum, asset) => sum + (parseFloat(asset.current_value) || 0), 0)).toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`]
        ]

        const coverSheet = XLSX.utils.aoa_to_sheet(coverData)
        coverSheet['!cols'] = [{ wch: 30 }, { wch: 50 }]
        XLSX.utils.book_append_sheet(wb, coverSheet, 'Report Info')

        // ===== ASSET DATA SHEET =====
        const assetData = [
          ['Asset ID', 'Name', 'Type', 'Status', 'Campus', 'Location', 'Purchase Cost', 'Current Value', 'Purchase Date', 'Manufacturer', 'Serial Number', 'Condition', 'Warranty Expiry']
        ]

        assets.forEach(asset => {
          const typeName = asset.asset_type === 'EQP' ? 'Equipment' : 
                          asset.asset_type === 'FUR' ? 'Furniture' : 
                          asset.asset_type === 'VEH' ? 'Vehicle' : 
                          asset.asset_type === 'BLD' ? 'Building Component' : 'Other'
          
          assetData.push([
            asset.asset_id,
            asset.name,
            typeName,
            asset.status.replace('_', ' '),
            asset.campus_name || '-',
            asset.room_info || '-',
            asset.purchase_cost || '-',
            asset.current_value || '-',
            asset.purchase_date || '-',
            asset.manufacturer || '-',
            asset.serial_number || '-',
            asset.condition || '-',
            asset.warranty_expiry || '-'
          ])
        })

        const assetSheet = XLSX.utils.aoa_to_sheet(assetData)
        assetSheet['!cols'] = [
          { wch: 15 }, // Asset ID
          { wch: 25 }, // Name
          { wch: 20 }, // Type
          { wch: 18 }, // Status
          { wch: 20 }, // Campus
          { wch: 25 }, // Location
          { wch: 15 }, // Purchase Cost
          { wch: 15 }, // Current Value
          { wch: 15 }, // Purchase Date
          { wch: 20 }, // Manufacturer
          { wch: 20 }, // Serial Number
          { wch: 12 }, // Condition
          { wch: 15 }  // Warranty Expiry
        ]
        XLSX.utils.book_append_sheet(wb, assetSheet, 'Asset Data')

        // ===== STATISTICS BY TYPE SHEET =====
        const typeStats = {}
        assets.forEach(asset => {
          const typeName = asset.asset_type === 'EQP' ? 'Equipment' : 
                          asset.asset_type === 'FUR' ? 'Furniture' : 
                          asset.asset_type === 'VEH' ? 'Vehicle' : 
                          asset.asset_type === 'BLD' ? 'Building Component' : 'Other'
          typeStats[typeName] = (typeStats[typeName] || 0) + 1
        })

        const typeStatsData = [
          ['Asset Type Statistics'],
          [''],
          ['Asset Type', 'Count', 'Percentage']
        ]
        
        Object.entries(typeStats).forEach(([type, count]) => {
          const percentage = ((count / assets.length) * 100).toFixed(1)
          typeStatsData.push([type, count, `${percentage}%`])
        })
        
        typeStatsData.push(['', '', ''])
        typeStatsData.push(['Total', assets.length, '100%'])

        const typeStatsSheet = XLSX.utils.aoa_to_sheet(typeStatsData)
        typeStatsSheet['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }]
        XLSX.utils.book_append_sheet(wb, typeStatsSheet, 'Type Statistics')

        // ===== STATUS BREAKDOWN SHEET =====
        const statusCounts = {
          'Available': assets.filter(a => a.status === 'AVAILABLE').length,
          'In Use': assets.filter(a => a.status === 'IN_USE').length,
          'Under Maintenance': assets.filter(a => a.status === 'UNDER_MAINTENANCE').length,
          'Condemned': assets.filter(a => a.status === 'CONDEMNED').length
        }

        const statusData = [
          ['Asset Status Analysis'],
          [''],
          ['Status', 'Count', 'Percentage']
        ]
        
        Object.entries(statusCounts).forEach(([status, count]) => {
          const percentage = ((count / assets.length) * 100).toFixed(1)
          statusData.push([status, count, `${percentage}%`])
        })
        
        statusData.push(['', '', ''])
        statusData.push(['Total', assets.length, '100%'])

        const statusSheet = XLSX.utils.aoa_to_sheet(statusData)
        statusSheet['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }]
        XLSX.utils.book_append_sheet(wb, statusSheet, 'Status Analysis')

        // ===== FINANCIAL ANALYSIS SHEET =====
        const totalPurchaseCost = assets.reduce((sum, asset) => sum + (parseFloat(asset.purchase_cost) || 0), 0)
        const totalCurrentValue = assets.reduce((sum, asset) => sum + (parseFloat(asset.current_value) || 0), 0)
        const totalDepreciation = totalPurchaseCost - totalCurrentValue

        const financialData = [
          ['Financial Analysis'],
          [''],
          ['Metric', 'Amount (ETB)', 'Percentage'],
          ['Total Purchase Cost', totalPurchaseCost.toFixed(2), '100%'],
          ['Total Current Value', totalCurrentValue.toFixed(2), `${((totalCurrentValue / totalPurchaseCost) * 100).toFixed(1)}%`],
          ['Total Depreciation', totalDepreciation.toFixed(2), `${((totalDepreciation / totalPurchaseCost) * 100).toFixed(1)}%`],
          [''],
          ['Average Values'],
          ['Average Purchase Cost', (totalPurchaseCost / assets.length).toFixed(2), ''],
          ['Average Current Value', (totalCurrentValue / assets.length).toFixed(2), ''],
          ['Average Depreciation', (totalDepreciation / assets.length).toFixed(2), '']
        ]

        const financialSheet = XLSX.utils.aoa_to_sheet(financialData)
        financialSheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }]
        XLSX.utils.book_append_sheet(wb, financialSheet, 'Financial Analysis')

        XLSX.writeFile(wb, `assets-${now.toISOString().split('T')[0]}.xlsx`)
        
        setExportMessage({ type: 'success', text: 'Assets exported successfully as Excel with comprehensive data!' })
        
      } else if (format === 'pdf') {
        // Enhanced PDF generation with comprehensive information
        const { jsPDF } = await import('jspdf')
        await import('jspdf-autotable')
        
        const now = new Date()
        const exportedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name} (${currentUser.username})` : 'Unknown User'
        const doc = new jsPDF()
        let yPos = 20
        
        // ===== HEADER =====
        doc.setFontSize(22)
        doc.setTextColor(37, 99, 235)
        doc.setFont(undefined, 'bold')
        doc.text('ASSET INVENTORY REPORT', 105, yPos, { align: 'center' })
        
        // Decorative line
        doc.setDrawColor(37, 99, 235)
        doc.setLineWidth(0.5)
        doc.line(20, yPos + 5, 190, yPos + 5)
        
        yPos += 15
        
        // ===== EXPORT INFORMATION =====
        doc.setFontSize(12)
        doc.setTextColor(100)
        doc.setFont(undefined, 'bold')
        doc.text('EXPORT INFORMATION', 14, yPos)
        
        yPos += 7
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.text(`Generated: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString('en-US')}`, 14, yPos)
        yPos += 5
        doc.text(`Exported By: ${exportedBy}`, 14, yPos)
        yPos += 5
        doc.text(`System: Property Management System`, 14, yPos)
        yPos += 5
        doc.text(`Total Records: ${assets.length}`, 14, yPos)
        
        yPos += 10
        
        // ===== APPLIED FILTERS =====
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(100)
        doc.text('APPLIED FILTERS', 14, yPos)
        
        yPos += 7
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.text(`Search Term: ${searchTerm || 'None'}`, 14, yPos)
        yPos += 5
        doc.text(`Status Filter: ${statusFilter || 'All Status'}`, 14, yPos)
        yPos += 5
        doc.text(`Type Filter: ${typeFilter || 'All Types'}`, 14, yPos)
        
        yPos += 10
        
        // ===== SUMMARY STATISTICS =====
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(100)
        doc.text('SUMMARY STATISTICS', 14, yPos)
        
        yPos += 7
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        
        const stats = [
          ['Total Assets:', assets.length],
          ['Available Assets:', assets.filter(a => a.status === 'AVAILABLE').length],
          ['In Use Assets:', assets.filter(a => a.status === 'IN_USE').length],
          ['Under Maintenance:', assets.filter(a => a.status === 'UNDER_MAINTENANCE').length],
          ['Condemned Assets:', assets.filter(a => a.status === 'CONDEMNED').length]
        ]
        
        stats.forEach(([label, value]) => {
          doc.text(`${label} ${value}`, 14, yPos)
          yPos += 5
        })
        
        yPos += 5
        
        // ===== ASSET TYPE BREAKDOWN =====
        if (yPos > 240) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(100)
        doc.text('ASSET TYPE BREAKDOWN', 14, yPos)
        
        yPos += 7
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        
        const typeStats = {}
        assets.forEach(asset => {
          const typeName = asset.asset_type === 'EQP' ? 'Equipment' : 
                          asset.asset_type === 'FUR' ? 'Furniture' : 
                          asset.asset_type === 'VEH' ? 'Vehicle' : 
                          asset.asset_type === 'BLD' ? 'Building Component' : 'Other'
          typeStats[typeName] = (typeStats[typeName] || 0) + 1
        })
        
        Object.entries(typeStats).forEach(([type, count]) => {
          const percentage = ((count / assets.length) * 100).toFixed(1)
          doc.text(`${type}: ${count} (${percentage}%)`, 14, yPos)
          yPos += 5
        })
        
        yPos += 5
        
        // ===== FINANCIAL SUMMARY =====
        if (yPos > 240) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(100)
        doc.text('FINANCIAL SUMMARY', 14, yPos)
        
        yPos += 7
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        
        const totalPurchaseCost = assets.reduce((sum, asset) => sum + (parseFloat(asset.purchase_cost) || 0), 0)
        const totalCurrentValue = assets.reduce((sum, asset) => sum + (parseFloat(asset.current_value) || 0), 0)
        const totalDepreciation = totalPurchaseCost - totalCurrentValue
        
        const financialStats = [
          [`Total Purchase Cost: ${totalPurchaseCost.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`],
          [`Total Current Value: ${totalCurrentValue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`],
          [`Total Depreciation: ${totalDepreciation.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`],
          [`Average Purchase Cost: ${(totalPurchaseCost / assets.length).toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`],
          [`Average Current Value: ${(totalCurrentValue / assets.length).toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`]
        ]
        
        financialStats.forEach(([text]) => {
          doc.text(text, 14, yPos)
          yPos += 5
        })
        
        yPos += 10
        
        // ===== ASSET DATA TABLE =====
        if (yPos > 200) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(100)
        doc.text('ASSET DATA', 14, yPos)
        yPos += 5
        
        const tableData = assets.map(asset => {
          const typeName = asset.asset_type === 'EQP' ? 'Equipment' : 
                          asset.asset_type === 'FUR' ? 'Furniture' : 
                          asset.asset_type === 'VEH' ? 'Vehicle' : 
                          asset.asset_type === 'BLD' ? 'Building Component' : 'Other'
          
          return [
            asset.asset_id,
            asset.name.length > 20 ? asset.name.substring(0, 17) + '...' : asset.name,
            typeName,
            asset.status.replace('_', ' '),
            asset.campus_name || '-',
            asset.purchase_cost ? `${parseFloat(asset.purchase_cost).toLocaleString()}` : '-'
          ]
        })
        
        const autoTable = (await import('jspdf-autotable')).default
        autoTable(doc, {
          startY: yPos,
          head: [['Asset ID', 'Name', 'Type', 'Status', 'Campus', 'Cost (ETB)']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [37, 99, 235],
            fontSize: 8,
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 7,
            cellPadding: 2
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 35 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 }
          },
          margin: { left: 14, right: 14 },
          didDrawPage: (data) => {
            // Footer on each page
            const pageCount = doc.internal.getNumberOfPages()
            doc.setFontSize(8)
            doc.setTextColor(150)
            doc.text(
              `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
              doc.internal.pageSize.getWidth() / 2,
              doc.internal.pageSize.getHeight() - 10,
              { align: 'center' }
            )
            doc.text(
              `Generated: ${now.toLocaleDateString()}`,
              14,
              doc.internal.pageSize.getHeight() - 10
            )
            doc.text(
              `By: ${exportedBy.split('(')[0].trim()}`,
              doc.internal.pageSize.getWidth() - 14,
              doc.internal.pageSize.getHeight() - 10,
              { align: 'right' }
            )
          }
        })
        
        doc.save(`assets-${now.toISOString().split('T')[0]}.pdf`)
        
        setExportMessage({ type: 'success', text: 'Assets exported successfully as comprehensive PDF!' })
      }
      
      setTimeout(() => setExportMessage(null), 3000)
    } catch (error) {
      setExportMessage({ 
        type: 'error', 
        text: 'Failed to export assets. Please try again.' 
      })
      console.error('Export error:', error)
    } finally {
      setExporting(false)
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2">Asset Inventory</h1>
              <p className="text-blue-100 text-lg">Manage and track all system assets</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => navigate('/dashboard/assets/bulk-import')}
                className="bg-white text-green-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-green-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <FaFileImport />
                Import
              </button>
              
              <div className="relative export-menu-container">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting}
                  className="bg-white text-blue-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaDownload />
                  {exporting ? 'Exporting...' : 'Export'}
                  <FaChevronDown className="text-sm" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <button
                      onClick={() => exportAssets('csv')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 text-gray-700 font-medium"
                    >
                      <FaDownload className="text-green-600" />
                      Export as CSV
                    </button>
                    <button
                      onClick={() => exportAssets('excel')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 text-gray-700 font-medium"
                    >
                      <FaDownload className="text-green-600" />
                      Export as Excel
                    </button>
                    <button
                      onClick={() => exportAssets('pdf')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700 font-medium"
                    >
                      <FaDownload className="text-red-600" />
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => navigate('/dashboard/assets/new')}
                className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <FaPlus />
                Add Asset
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {exportMessage && (
        <div className={`px-4 py-3 rounded-lg mb-6 border-2 ${
          exportMessage.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {exportMessage.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[250px] relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Asset ID or Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In Use</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="CONDEMNED">Condemned</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Types</option>
              <option value="EQP">Equipment</option>
              <option value="FUR">Furniture</option>
              <option value="VEH">Vehicle</option>
              <option value="BLD">Building Component</option>
              <option value="OTH">Other</option>
            </select>
            <select
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Campuses</option>
              {[...new Set(assets.map(a => a.campus_name).filter(Boolean))].map(campus => (
                <option key={campus} value={campus}>{campus}</option>
              ))}
            </select>

            <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 flex items-center gap-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600 font-semibold' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <FaList /> Table
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 flex items-center gap-2 border-l border-gray-300 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600 font-semibold' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <FaThLarge /> Grid
              </button>
            </div>
          </div>

          {/* View Content */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Asset ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Campus</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedAssets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      No assets found
                    </td>
                  </tr>
                ) : (
                  paginatedAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-blue-50 hover:bg-opacity-30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{asset.asset_id}</span>
                          {asset.verification_status === 'VERIFIED' && (
                            <FaCheckCircle 
                              className="text-green-600" 
                              title="Verified Asset"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-800">{asset.name}</td>
                      <td className="px-4 py-4 text-gray-700">
                        <div className="flex items-center gap-2">
                          {typeIcons[asset.asset_type] || <FaBox className="text-gray-500" />}
                          <span>
                            {asset.asset_type === 'EQP' ? 'Equipment' : 
                             asset.asset_type === 'FUR' ? 'Furniture' : 
                             asset.asset_type === 'VEH' ? 'Vehicle' : 
                             asset.asset_type === 'BLD' ? 'Building' : 'Other'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[asset.status]}`}>
                          <span className={`h-2 w-2 rounded-full ${
                            asset.status === 'AVAILABLE' ? 'bg-green-500' :
                            asset.status === 'IN_USE' ? 'bg-blue-500' :
                            asset.status === 'UNDER_MAINTENANCE' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}></span>
                          {asset.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-700">{asset.campus_name}</td>
                      <td className="px-4 py-4 text-gray-700">
                        <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                          {asset.room_info || 'Not assigned'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => navigate(`/dashboard/assets/${asset.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="View Details"
                          >
                            <FaEye className="text-lg" />
                          </button>
                          {asset.qr_code && (
                            <button
                              onClick={() => window.open(asset.qr_code, '_blank')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                              title="View QR Code"
                            >
                              <FaQrcode className="text-lg" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedAssets.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                  <FaBox className="mx-auto text-4xl mb-3 text-gray-300" />
                  No assets found
                </div>
              ) : (
                paginatedAssets.map((asset) => (
                  <div key={asset.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col group">
                    <div className="relative h-48 bg-gray-100 flex items-center justify-center overflow-hidden border-b border-gray-100">
                      {asset.photo ? (
                        <img src={asset.photo} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="text-gray-300 text-6xl group-hover:scale-110 transition-transform duration-500">
                          {typeIcons[asset.asset_type] || <FaBox />}
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${statusColors[asset.status]}`}>
                          <span className={`h-2 w-2 rounded-full ${
                            asset.status === 'AVAILABLE' ? 'bg-green-500' :
                            asset.status === 'IN_USE' ? 'bg-blue-500' :
                            asset.status === 'UNDER_MAINTENANCE' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}></span>
                          {asset.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Verification Badge */}
                      {asset.verification_status === 'VERIFIED' && (
                        <div className="absolute top-3 left-3 bg-white rounded-full p-1.5 shadow-md">
                          <FaCheckCircle className="text-green-600 text-lg" title="Verified Asset" />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs font-bold text-gray-400 tracking-wider uppercase">
                          {asset.asset_id}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                          {typeIcons[asset.asset_type]}
                          {asset.asset_type === 'EQP' ? 'Equipment' : 
                           asset.asset_type === 'FUR' ? 'Furniture' : 
                           asset.asset_type === 'VEH' ? 'Vehicle' : 
                           asset.asset_type === 'BLD' ? 'Building' : 'Other'}
                        </div>
                      </div>
                      
                      <h3 className="font-bold text-gray-900 text-lg mb-4 line-clamp-2 leading-tight" title={asset.name}>
                        {asset.name}
                      </h3>
                      
                      <div className="mt-auto space-y-3">
                        <div className="flex items-start gap-2.5 text-sm text-gray-600">
                          <div className="mt-0.5 p-1.5 bg-gray-50 rounded-lg text-gray-400">
                            <FaBuilding />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">{asset.campus_name || 'No Campus'}</span>
                            <span className="text-xs text-gray-500">{asset.room_info || 'Unassigned location'}</span>
                          </div>
                        </div>
                        
                        {asset.purchase_cost && (
                          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</span>
                            <span className="font-bold text-green-600">
                              {parseFloat(asset.purchase_cost).toLocaleString()} ETB
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => navigate(`/dashboard/assets/${asset.id}`)}
                        className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <FaEye /> Details
                      </button>
                      {asset.qr_code ? (
                        <button
                          onClick={() => window.open(asset.qr_code, '_blank')}
                          className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <FaQrcode /> QR Code
                        </button>
                      ) : (
                        <div className="flex items-center justify-center py-2 text-sm text-gray-400">
                          No QR Code
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pagination */}
          {filteredAssets.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 flex items-center gap-4">
                <span>
                  Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredAssets.length)} of {filteredAssets.length} assets
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value))
                      setPage(0) // Reset to first page
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AssetList
