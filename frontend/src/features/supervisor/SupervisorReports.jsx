import { useState, useEffect } from 'react'
import { 
  FaFileAlt, 
  FaDownload, 
  FaUsers,
  FaClipboardList,
  FaClock,
  FaDollarSign,
  FaCalendar,
  FaSync,
  FaChevronDown,
  FaStar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartLine
} from 'react-icons/fa'
import api from '../../services/api'
import * as XLSX from 'xlsx'

const SupervisorReports = () => {
  const [activeReport, setActiveReport] = useState('team-performance')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  })

  const reports = [
    {
      id: 'team-performance',
      name: 'Team Performance',
      description: 'Technician productivity and ratings',
      icon: FaUsers,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'request-summary',
      name: 'Request Summary',
      description: 'Maintenance requests overview',
      icon: FaClipboardList,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'sla-compliance',
      name: 'SLA Compliance',
      description: 'Service level metrics',
      icon: FaClock,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'cost-analysis',
      name: 'Cost Analysis',
      description: 'Cost breakdown and trends',
      icon: FaDollarSign,
      color: 'from-orange-500 to-orange-600'
    }
  ]

  useEffect(() => {
    fetchReport()
  }, [activeReport])

  const fetchReport = async () => {
    try {
      setLoading(true)
      
      // Fetch all necessary data
      const [techsRes, requestsRes, workOrdersRes] = await Promise.all([
        api.get('/users/users/?role=MAINTENANCE_TECHNICIAN'),
        api.get('/maintenance/requests/'),
        api.get('/maintenance/work-orders/')
      ])

      const technicians = techsRes.data.results || techsRes.data
      const allRequests = requestsRes.data.results || requestsRes.data
      const allWorkOrders = workOrdersRes.data.results || workOrdersRes.data

      // Filter by date range
      const startDate = dateRange.start_date ? new Date(dateRange.start_date) : null
      const endDate = dateRange.end_date ? new Date(dateRange.end_date + 'T23:59:59') : null

      const filteredRequests = allRequests.filter(r => {
        if (!startDate || !endDate) return true
        const createdDate = new Date(r.created_at)
        return createdDate >= startDate && createdDate <= endDate
      })

      const filteredWorkOrders = allWorkOrders.filter(wo => {
        if (!startDate || !endDate) return true
        const createdDate = new Date(wo.created_at)
        return createdDate >= startDate && createdDate <= endDate
      })

      // Generate report based on type
      let data = null

      if (activeReport === 'team-performance') {
        data = technicians.map(tech => {
          const techId = tech.id
          const techRequests = filteredRequests.filter(r => {
            const assignedId = typeof r.assigned_to === 'object' ? r.assigned_to?.id : r.assigned_to
            return assignedId === techId
          })
          
          const completed = techRequests.filter(r => r.status === 'COMPLETED').length
          const total = techRequests.length
          const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

          return {
            name: `${tech.first_name} ${tech.last_name}`,
            specialization: tech.specialization || 'General',
            performance_score: Math.round(tech.performance_score || 0),
            total_ratings: tech.total_ratings || 0,
            total_requests: total,
            completed_requests: completed,
            success_rate: successRate,
            is_active: tech.is_active
          }
        })
      } else if (activeReport === 'request-summary') {
        // Group by status
        const byStatus = {}
        const byCategory = {}
        const byPriority = {}

        filteredRequests.forEach(r => {
          byStatus[r.status] = (byStatus[r.status] || 0) + 1
          byCategory[r.category] = (byCategory[r.category] || 0) + 1
          byPriority[r.priority] = (byPriority[r.priority] || 0) + 1
        })

        data = {
          total: filteredRequests.length,
          byStatus,
          byCategory,
          byPriority
        }
      } else if (activeReport === 'sla-compliance') {
        // Calculate SLA metrics
        const emergencyRequests = filteredRequests.filter(r => r.priority === 'EMERGENCY')
        const highRequests = filteredRequests.filter(r => r.priority === 'HIGH')
        const mediumRequests = filteredRequests.filter(r => r.priority === 'MEDIUM')
        const lowRequests = filteredRequests.filter(r => r.priority === 'LOW')

        const calculateSLA = (requests, slaHours) => {
          const withinSLA = requests.filter(r => {
            if (r.status !== 'COMPLETED') return false
            const created = new Date(r.created_at)
            const completed = new Date(r.updated_at)
            const hoursDiff = (completed - created) / (1000 * 60 * 60)
            return hoursDiff <= slaHours
          }).length
          return {
            total: requests.length,
            withinSLA,
            percentage: requests.length > 0 ? Math.round((withinSLA / requests.length) * 100) : 0
          }
        }

        data = {
          emergency: calculateSLA(emergencyRequests, 4),
          high: calculateSLA(highRequests, 24),
          medium: calculateSLA(mediumRequests, 72),
          low: calculateSLA(lowRequests, 168)
        }
      } else if (activeReport === 'cost-analysis') {
        // Calculate costs from work orders (using same fields as CostTracking page)
        const costByCategory = {}
        let totalCost = 0
        let laborCost = 0
        let materialsCost = 0

        // Create a map of request IDs to categories for quick lookup
        const requestCategoryMap = {}
        filteredRequests.forEach(req => {
          requestCategoryMap[req.id] = req.category || 'Unknown'
        })

        // Only count completed work orders (those with completed_at)
        const completedWorkOrders = filteredWorkOrders.filter(wo => wo.completed_at)

        completedWorkOrders.forEach(wo => {
          const cost = parseFloat(wo.cost_total || 0)
          totalCost += cost
          laborCost += parseFloat(wo.cost_labor || 0)
          materialsCost += parseFloat(wo.cost_materials || 0)
          
          // Try to get category from request object first, then from map, then default to Unknown
          let category = 'Unknown'
          if (wo.request && typeof wo.request === 'object') {
            category = wo.request.category || 'Unknown'
          } else if (wo.request && requestCategoryMap[wo.request]) {
            category = requestCategoryMap[wo.request]
          }
          
          costByCategory[category] = (costByCategory[category] || 0) + cost
        })

        data = {
          totalCost,
          laborCost,
          materialsCost,
          workOrderCount: completedWorkOrders.length,
          totalWorkOrders: filteredWorkOrders.length,
          avgCostPerOrder: completedWorkOrders.length > 0 ? totalCost / completedWorkOrders.length : 0,
          costByCategory
        }
      }

      setReportData(data)
    } catch (error) {
      console.error('Error fetching report:', error)
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData) return

    let csvContent = ''
    const filename = `${activeReport}-${new Date().toISOString().split('T')[0]}.csv`

    if (activeReport === 'team-performance' && Array.isArray(reportData)) {
      csvContent = 'Name,Specialization,Performance Score,Total Ratings,Total Requests,Completed,Success Rate,Status\n'
      reportData.forEach(tech => {
        csvContent += `${tech.name},${tech.specialization},${tech.performance_score},${tech.total_ratings},${tech.total_requests},${tech.completed_requests},${tech.success_rate}%,${tech.is_active ? 'Active' : 'Inactive'}\n`
      })
    } else if (activeReport === 'request-summary') {
      csvContent = 'Metric,Value\n'
      csvContent += `Total Requests,${reportData.total}\n\n`
      csvContent += 'Status,Count\n'
      Object.entries(reportData.byStatus).forEach(([status, count]) => {
        csvContent += `${status},${count}\n`
      })
      csvContent += '\nCategory,Count\n'
      Object.entries(reportData.byCategory).forEach(([category, count]) => {
        csvContent += `${category},${count}\n`
      })
      csvContent += '\nPriority,Count\n'
      Object.entries(reportData.byPriority).forEach(([priority, count]) => {
        csvContent += `${priority},${count}\n`
      })
    } else if (activeReport === 'sla-compliance') {
      csvContent = 'Priority,Total Requests,Within SLA,Compliance %\n'
      csvContent += `Emergency,${reportData.emergency.total},${reportData.emergency.withinSLA},${reportData.emergency.percentage}%\n`
      csvContent += `High,${reportData.high.total},${reportData.high.withinSLA},${reportData.high.percentage}%\n`
      csvContent += `Medium,${reportData.medium.total},${reportData.medium.withinSLA},${reportData.medium.percentage}%\n`
      csvContent += `Low,${reportData.low.total},${reportData.low.withinSLA},${reportData.low.percentage}%\n`
    } else if (activeReport === 'cost-analysis') {
      csvContent = 'Metric,Value\n'
      csvContent += `Total Cost,ETB ${(reportData.totalCost || 0).toFixed(2)}\n`
      csvContent += `Labor Cost,ETB ${(reportData.laborCost || 0).toFixed(2)}\n`
      csvContent += `Materials Cost,ETB ${(reportData.materialsCost || 0).toFixed(2)}\n`
      csvContent += `Completed Work Orders,${reportData.workOrderCount || 0}\n`
      csvContent += `Average Cost,ETB ${(reportData.avgCostPerOrder || 0).toFixed(2)}\n\n`
      csvContent += 'Category,Cost\n'
      Object.entries(reportData.costByCategory || {}).forEach(([category, cost]) => {
        csvContent += `${category},ETB ${(cost || 0).toFixed(2)}\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  const exportToExcel = () => {
    if (!reportData) return

    const wb = XLSX.utils.book_new()
    const filename = `${activeReport}-${new Date().toISOString().split('T')[0]}.xlsx`

    if (activeReport === 'team-performance' && Array.isArray(reportData)) {
      const data = reportData.map(tech => ({
        'Name': tech.name,
        'Specialization': tech.specialization,
        'Performance Score': tech.performance_score,
        'Total Ratings': tech.total_ratings,
        'Total Requests': tech.total_requests,
        'Completed': tech.completed_requests,
        'Success Rate': `${tech.success_rate}%`,
        'Status': tech.is_active ? 'Active' : 'Inactive'
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, 'Team Performance')
    } else if (activeReport === 'request-summary') {
      const statusData = Object.entries(reportData.byStatus).map(([status, count]) => ({
        'Status': status,
        'Count': count
      }))
      const categoryData = Object.entries(reportData.byCategory).map(([category, count]) => ({
        'Category': category,
        'Count': count
      }))
      const priorityData = Object.entries(reportData.byPriority).map(([priority, count]) => ({
        'Priority': priority,
        'Count': count
      }))
      
      const ws1 = XLSX.utils.json_to_sheet(statusData)
      const ws2 = XLSX.utils.json_to_sheet(categoryData)
      const ws3 = XLSX.utils.json_to_sheet(priorityData)
      
      XLSX.utils.book_append_sheet(wb, ws1, 'By Status')
      XLSX.utils.book_append_sheet(wb, ws2, 'By Category')
      XLSX.utils.book_append_sheet(wb, ws3, 'By Priority')
    } else if (activeReport === 'sla-compliance') {
      const data = [
        { 'Priority': 'Emergency', 'Total': reportData.emergency.total, 'Within SLA': reportData.emergency.withinSLA, 'Compliance %': reportData.emergency.percentage },
        { 'Priority': 'High', 'Total': reportData.high.total, 'Within SLA': reportData.high.withinSLA, 'Compliance %': reportData.high.percentage },
        { 'Priority': 'Medium', 'Total': reportData.medium.total, 'Within SLA': reportData.medium.withinSLA, 'Compliance %': reportData.medium.percentage },
        { 'Priority': 'Low', 'Total': reportData.low.total, 'Within SLA': reportData.low.withinSLA, 'Compliance %': reportData.low.percentage }
      ]
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, 'SLA Compliance')
    } else if (activeReport === 'cost-analysis') {
      const data = Object.entries(reportData.costByCategory || {}).map(([category, cost]) => ({
        'Category': category,
        'Cost (ETB)': (cost || 0).toFixed(2)
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, 'Cost by Category')
      
      // Add summary sheet
      const summaryData = [
        { 'Metric': 'Total Cost', 'Value': `ETB ${(reportData.totalCost || 0).toFixed(2)}` },
        { 'Metric': 'Labor Cost', 'Value': `ETB ${(reportData.laborCost || 0).toFixed(2)}` },
        { 'Metric': 'Materials Cost', 'Value': `ETB ${(reportData.materialsCost || 0).toFixed(2)}` },
        { 'Metric': 'Completed Work Orders', 'Value': reportData.workOrderCount || 0 },
        { 'Metric': 'Average Cost', 'Value': `ETB ${(reportData.avgCostPerOrder || 0).toFixed(2)}` }
      ]
      const wsSummary = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
    }

    XLSX.writeFile(wb, filename)
  }

  const exportToPDF = async () => {
    if (!reportData) return

    try {
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
      const selectedReport = reports.find(r => r.id === activeReport)
      doc.setFontSize(16)
      doc.setTextColor(79, 70, 229)
      doc.setFont(undefined, 'bold')
      doc.text(selectedReport.name.toUpperCase(), pageWidth / 2, 74, { align: 'center' })
      
      // Decorative line
      doc.setDrawColor(79, 70, 229)
      doc.setLineWidth(0.5)
      doc.line(20, 79, pageWidth - 20, 79)
      
      let yPos = 89
      
      // Report Information
      doc.setFontSize(9)
      doc.setTextColor(100)
      doc.setFont(undefined, 'normal')
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US')}`, 14, yPos)
      yPos += 5
      
      if (dateRange.start_date && dateRange.end_date) {
        doc.text(`Period: ${dateRange.start_date} to ${dateRange.end_date}`, 14, yPos)
        yPos += 5
      }

      yPos += 5

      if (activeReport === 'team-performance' && Array.isArray(reportData)) {
        const tableData = reportData.map(tech => [
          tech.name,
          tech.specialization,
          tech.performance_score.toString(),
          tech.total_ratings.toString(),
          tech.total_requests.toString(),
          tech.completed_requests.toString(),
          `${tech.success_rate}%`,
          tech.is_active ? 'Active' : 'Inactive'
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Name', 'Specialization', 'Score', 'Ratings', 'Total', 'Completed', 'Success', 'Status']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [79, 70, 229], 
            textColor: 255, 
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
      } else if (activeReport === 'request-summary') {
        // Executive Summary Section
        doc.setFontSize(11)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('EXECUTIVE SUMMARY', 14, yPos)
        
        yPos += 7
        doc.setFontSize(9)
        doc.setTextColor(100)
        doc.setFont(undefined, 'normal')
        doc.text(`Total Maintenance Requests: ${reportData.total}`, 14, yPos)
        yPos += 5
        doc.text(`Status Categories: ${Object.keys(reportData.byStatus).length}`, 14, yPos)
        yPos += 5
        doc.text(`Request Categories: ${Object.keys(reportData.byCategory).length}`, 14, yPos)
        yPos += 5
        doc.text(`Priority Levels: ${Object.keys(reportData.byPriority).length}`, 14, yPos)
        
        yPos += 10
        
        // Status Breakdown Table
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('STATUS BREAKDOWN', 14, yPos)
        
        yPos += 5
        const statusData = Object.entries(reportData.byStatus).map(([status, count]) => {
          const percentage = ((count / reportData.total) * 100).toFixed(1)
          return [status, count.toString(), `${percentage}%`]
        })
        
        autoTable(doc, {
          startY: yPos,
          head: [['Status', 'Count', 'Percentage']],
          body: statusData,
          theme: 'grid',
          headStyles: { 
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { 
            fontSize: 8,
            cellPadding: 3,
            halign: 'center'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          margin: { left: 14, right: 14 }
        })
        
        yPos = doc.lastAutoTable.finalY + 10
        
        // Category Breakdown Table
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('CATEGORY BREAKDOWN', 14, yPos)
        
        yPos += 5
        const categoryData = Object.entries(reportData.byCategory).map(([category, count]) => {
          const percentage = ((count / reportData.total) * 100).toFixed(1)
          return [category, count.toString(), `${percentage}%`]
        })
        
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Count', 'Percentage']],
          body: categoryData,
          theme: 'grid',
          headStyles: { 
            fillColor: [22, 163, 74],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { 
            fontSize: 8,
            cellPadding: 3,
            halign: 'center'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          margin: { left: 14, right: 14 }
        })
        
        yPos = doc.lastAutoTable.finalY + 10
        
        // Priority Breakdown Table
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('PRIORITY BREAKDOWN', 14, yPos)
        
        yPos += 5
        const priorityData = Object.entries(reportData.byPriority).map(([priority, count]) => {
          const percentage = ((count / reportData.total) * 100).toFixed(1)
          return [priority, count.toString(), `${percentage}%`]
        })
        
        autoTable(doc, {
          startY: yPos,
          head: [['Priority', 'Count', 'Percentage']],
          body: priorityData,
          theme: 'grid',
          headStyles: { 
            fillColor: [249, 115, 22],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { 
            fontSize: 8,
            cellPadding: 3,
            halign: 'center'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          margin: { left: 14, right: 14 }
        })
      } else if (activeReport === 'sla-compliance') {
        // Executive Summary
        doc.setFontSize(11)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('EXECUTIVE SUMMARY', 14, yPos)
        
        yPos += 7
        const totalRequests = reportData.emergency.total + reportData.high.total + reportData.medium.total + reportData.low.total
        const totalWithinSLA = reportData.emergency.withinSLA + reportData.high.withinSLA + reportData.medium.withinSLA + reportData.low.withinSLA
        const overallCompliance = totalRequests > 0 ? ((totalWithinSLA / totalRequests) * 100).toFixed(1) : 0
        
        doc.setFontSize(9)
        doc.setTextColor(100)
        doc.setFont(undefined, 'normal')
        doc.text(`Total Completed Requests: ${totalRequests}`, 14, yPos)
        yPos += 5
        doc.text(`Requests Within SLA: ${totalWithinSLA}`, 14, yPos)
        yPos += 5
        doc.text(`Overall SLA Compliance: ${overallCompliance}%`, 14, yPos)
        yPos += 5
        
        // Compliance Status
        const complianceStatus = overallCompliance >= 90 ? 'Excellent' : overallCompliance >= 75 ? 'Good' : overallCompliance >= 60 ? 'Fair' : 'Needs Improvement'
        doc.setFont(undefined, 'bold')
        doc.text(`Compliance Status: ${complianceStatus}`, 14, yPos)
        
        yPos += 10
        
        // SLA Compliance Table
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('DETAILED SLA COMPLIANCE ANALYSIS', 14, yPos)
        
        yPos += 5
        const tableData = [
          ['Emergency', '4 hours', reportData.emergency.total, reportData.emergency.withinSLA, reportData.emergency.total - reportData.emergency.withinSLA, `${reportData.emergency.percentage}%`],
          ['High', '24 hours', reportData.high.total, reportData.high.withinSLA, reportData.high.total - reportData.high.withinSLA, `${reportData.high.percentage}%`],
          ['Medium', '72 hours', reportData.medium.total, reportData.medium.withinSLA, reportData.medium.total - reportData.medium.withinSLA, `${reportData.medium.percentage}%`],
          ['Low', '168 hours', reportData.low.total, reportData.low.withinSLA, reportData.low.total - reportData.low.withinSLA, `${reportData.low.percentage}%`]
        ]

        autoTable(doc, {
          startY: yPos,
          head: [['Priority', 'SLA Target', 'Total', 'Within SLA', 'Breached', 'Compliance %']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { 
            fontSize: 8,
            cellPadding: 3,
            halign: 'center'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' },
            1: { halign: 'left' }
          },
          margin: { left: 14, right: 14 }
        })
        
        yPos = doc.lastAutoTable.finalY + 10
        
        // Recommendations Section
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('RECOMMENDATIONS', 14, yPos)
        
        yPos += 6
        doc.setFontSize(8)
        doc.setTextColor(100)
        doc.setFont(undefined, 'normal')
        
        if (reportData.emergency.percentage < 80) {
          doc.text('• Emergency requests require immediate attention - consider increasing technician availability', 16, yPos)
          yPos += 5
        }
        if (reportData.high.percentage < 85) {
          doc.text('• High priority requests need faster response - review resource allocation', 16, yPos)
          yPos += 5
        }
        if (overallCompliance >= 90) {
          doc.text('• Excellent SLA compliance maintained - continue current practices', 16, yPos)
          yPos += 5
        } else if (overallCompliance < 75) {
          doc.text('• Overall compliance below target - conduct process review and staff training', 16, yPos)
          yPos += 5
        }
      } else if (activeReport === 'cost-analysis') {
        // Executive Summary
        doc.setFontSize(11)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('EXECUTIVE SUMMARY', 14, yPos)
        
        yPos += 7
        const laborPercentage = reportData.totalCost > 0 ? ((reportData.laborCost / reportData.totalCost) * 100).toFixed(1) : 0
        const materialsPercentage = reportData.totalCost > 0 ? ((reportData.materialsCost / reportData.totalCost) * 100).toFixed(1) : 0
        
        doc.setFontSize(9)
        doc.setTextColor(100)
        doc.setFont(undefined, 'normal')
        doc.text(`Total Maintenance Cost: ETB ${(reportData.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos)
        yPos += 5
        doc.text(`Completed Work Orders: ${reportData.workOrderCount || 0} of ${reportData.totalWorkOrders || 0}`, 14, yPos)
        yPos += 5
        doc.text(`Average Cost per Work Order: ETB ${(reportData.avgCostPerOrder || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos)
        yPos += 5
        doc.text(`Cost Distribution: Labor ${laborPercentage}% | Materials ${materialsPercentage}%`, 14, yPos)
        
        yPos += 10
        
        // Cost Breakdown Table
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('COST BREAKDOWN SUMMARY', 14, yPos)
        
        yPos += 5
        const summaryData = [
          ['Labor Cost', `ETB ${(reportData.laborCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${laborPercentage}%`],
          ['Materials Cost', `ETB ${(reportData.materialsCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${materialsPercentage}%`],
          ['Total Cost', `ETB ${(reportData.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '100%']
        ]
        
        autoTable(doc, {
          startY: yPos,
          head: [['Cost Type', 'Amount', 'Percentage']],
          body: summaryData,
          theme: 'grid',
          headStyles: { 
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { 
            fontSize: 8,
            cellPadding: 3
          },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' },
            1: { halign: 'right' },
            2: { halign: 'center' }
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          margin: { left: 14, right: 14 }
        })
        
        yPos = doc.lastAutoTable.finalY + 10
        
        // Cost by Category Table
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text('COST BY MAINTENANCE CATEGORY', 14, yPos)
        
        yPos += 5
        const costData = Object.entries(reportData.costByCategory || {}).map(([category, cost]) => {
          const percentage = reportData.totalCost > 0 ? ((cost / reportData.totalCost) * 100).toFixed(1) : 0
          return [
            category,
            `ETB ${(cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `${percentage}%`
          ]
        })
        
        // Add total row
        costData.push([
          'TOTAL',
          `ETB ${(reportData.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          '100%'
        ])
        
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Cost', 'Percentage']],
          body: costData,
          theme: 'grid',
          headStyles: { 
            fillColor: [22, 163, 74],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { 
            fontSize: 8,
            cellPadding: 3
          },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'right' },
            2: { halign: 'center' }
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          bodyStyles: {
            fontSize: 8
          },
          didParseCell: function(data) {
            // Make the total row bold
            if (data.row.index === costData.length - 1) {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fillColor = [229, 231, 235]
            }
          },
          margin: { left: 14, right: 14 }
        })
        
        yPos = doc.lastAutoTable.finalY + 10
        
        // Cost Insights
        if (yPos < doc.internal.pageSize.getHeight() - 40) {
          doc.setFontSize(10)
          doc.setFont(undefined, 'bold')
          doc.setTextColor(79, 70, 229)
          doc.text('COST INSIGHTS', 14, yPos)
          
          yPos += 6
          doc.setFontSize(8)
          doc.setTextColor(100)
          doc.setFont(undefined, 'normal')
          
          if (laborPercentage > 60) {
            doc.text('• Labor costs represent majority of expenses - consider efficiency improvements', 16, yPos)
            yPos += 5
          }
          if (materialsPercentage > 50) {
            doc.text('• Materials costs are high - review supplier contracts and bulk purchasing options', 16, yPos)
            yPos += 5
          }
          if (reportData.avgCostPerOrder > 1000) {
            doc.text('• Average work order cost is elevated - investigate high-cost categories', 16, yPos)
            yPos += 5
          }
        }
      }

      // Add professional footer
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
          selectedReport.name,
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

      const filename = `${activeReport}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF: ' + error.message)
    }
  }

  const renderStarRating = (score) => {
    const stars = (score / 100) * 5
    const fullStars = Math.floor(stars)
    const hasHalfStar = stars % 1 >= 0.5
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <FaStar
            key={i}
            className={`text-sm ${
              i < fullStars
                ? 'text-yellow-400'
                : i === fullStars && hasHalfStar
                ? 'text-yellow-300'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const selectedReport = reports.find(r => r.id === activeReport)

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Supervisor Reports</h1>
              <p className="text-indigo-100 text-lg">Team performance and analytics</p>
            </div>
            <FaFileAlt className="text-6xl opacity-20" />
          </div>
        </div>
      </div>

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
                {/* Team Performance Report */}
                {activeReport === 'team-performance' && Array.isArray(reportData) && (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Specialization</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Performance</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rating</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Completed</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Success Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.map((tech, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{tech.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{tech.specialization}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`text-lg font-bold ${getPerformanceColor(tech.performance_score)}`}>
                              {tech.performance_score}
                            </span>
                            <span className="text-xs text-gray-400">/100</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-1">
                              {renderStarRating(tech.performance_score)}
                              <span className="text-xs text-gray-500 ml-1">({tech.total_ratings})</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{tech.total_requests}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">{tech.completed_requests}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              tech.success_rate >= 80 ? 'bg-green-100 text-green-800' :
                              tech.success_rate >= 60 ? 'bg-blue-100 text-blue-800' :
                              tech.success_rate >= 40 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {tech.success_rate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              tech.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {tech.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Request Summary Report */}
                {activeReport === 'request-summary' && reportData && (
                  <div className="space-y-6">
                    {/* Executive Summary */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <FaClipboardList className="text-indigo-600" />
                        Executive Summary
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                          <p className="text-3xl font-bold text-indigo-600">{reportData.total || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Status Categories</p>
                          <p className="text-3xl font-bold text-purple-600">{reportData.byStatus ? Object.keys(reportData.byStatus).length : 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Request Categories</p>
                          <p className="text-3xl font-bold text-green-600">{reportData.byCategory ? Object.keys(reportData.byCategory).length : 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Priority Levels</p>
                          <p className="text-3xl font-bold text-orange-600">{reportData.byPriority ? Object.keys(reportData.byPriority).length : 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* By Status */}
                      <div className="bg-white border-2 border-indigo-100 rounded-xl p-5">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                          <FaCheckCircle className="text-indigo-600" />
                          Status Breakdown
                        </h4>
                        {reportData.byStatus && Object.keys(reportData.byStatus).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(reportData.byStatus).map(([status, count]) => {
                              const percentage = ((count / reportData.total) * 100).toFixed(1)
                              return (
                                <div key={status} className="bg-gradient-to-r from-indigo-50 to-white p-3 rounded-lg border border-indigo-100">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-semibold text-gray-800">{status}</span>
                                    <span className="text-sm font-bold text-indigo-600">{count}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{percentage}% of total</p>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">No data</p>
                        )}
                      </div>

                      {/* By Category */}
                      <div className="bg-white border-2 border-green-100 rounded-xl p-5">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                          <FaClipboardList className="text-green-600" />
                          Category Breakdown
                        </h4>
                        {reportData.byCategory && Object.keys(reportData.byCategory).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(reportData.byCategory).map(([category, count]) => {
                              const percentage = ((count / reportData.total) * 100).toFixed(1)
                              return (
                                <div key={category} className="bg-gradient-to-r from-green-50 to-white p-3 rounded-lg border border-green-100">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-semibold text-gray-800">{category}</span>
                                    <span className="text-sm font-bold text-green-600">{count}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{percentage}% of total</p>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">No data</p>
                        )}
                      </div>

                      {/* By Priority */}
                      <div className="bg-white border-2 border-orange-100 rounded-xl p-5">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                          <FaExclamationTriangle className="text-orange-600" />
                          Priority Breakdown
                        </h4>
                        {reportData.byPriority && Object.keys(reportData.byPriority).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(reportData.byPriority).map(([priority, count]) => {
                              const percentage = ((count / reportData.total) * 100).toFixed(1)
                              return (
                                <div key={priority} className="bg-gradient-to-r from-orange-50 to-white p-3 rounded-lg border border-orange-100">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-semibold text-gray-800">{priority}</span>
                                    <span className="text-sm font-bold text-orange-600">{count}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{percentage}% of total</p>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">No data</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SLA Compliance Report */}
                {activeReport === 'sla-compliance' && reportData && (
                  <div className="space-y-6">
                    {/* Executive Summary */}
                    {(() => {
                      const em  = reportData?.emergency  || { total: 0, withinSLA: 0, percentage: 0 }
                      const hi  = reportData?.high       || { total: 0, withinSLA: 0, percentage: 0 }
                      const med = reportData?.medium     || { total: 0, withinSLA: 0, percentage: 0 }
                      const lo  = reportData?.low        || { total: 0, withinSLA: 0, percentage: 0 }
                      const totalRequests  = em.total + hi.total + med.total + lo.total
                      const totalWithinSLA = em.withinSLA + hi.withinSLA + med.withinSLA + lo.withinSLA
                      const overallCompliance = totalRequests > 0 ? ((totalWithinSLA / totalRequests) * 100).toFixed(1) : 0
                      const complianceStatus  = overallCompliance >= 90 ? 'Excellent' : overallCompliance >= 75 ? 'Good' : overallCompliance >= 60 ? 'Fair' : 'Needs Improvement'
                      
                      return (
                        <>
                          <div className={
                            overallCompliance >= 90 ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6' :
                            overallCompliance >= 75 ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6' :
                            overallCompliance >= 60 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-6' :
                            'bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6'
                          }>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <FaClock className={
                                overallCompliance >= 90 ? 'text-green-600' :
                                overallCompliance >= 75 ? 'text-blue-600' :
                                overallCompliance >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              } />
                              Executive Summary
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center bg-white rounded-lg p-3">
                                <p className="text-sm text-gray-600 mb-1">Total Completed</p>
                                <p className="text-3xl font-bold text-indigo-600">{totalRequests}</p>
                              </div>
                              <div className="text-center bg-white rounded-lg p-3">
                                <p className="text-sm text-gray-600 mb-1">Within SLA</p>
                                <p className="text-3xl font-bold text-green-600">{totalWithinSLA}</p>
                              </div>
                              <div className="text-center bg-white rounded-lg p-3">
                                <p className="text-sm text-gray-600 mb-1">Overall Compliance</p>
                                <p className={
                                  overallCompliance >= 90 ? 'text-3xl font-bold text-green-600' :
                                  overallCompliance >= 75 ? 'text-3xl font-bold text-blue-600' :
                                  overallCompliance >= 60 ? 'text-3xl font-bold text-yellow-600' :
                                  'text-3xl font-bold text-red-600'
                                }>{overallCompliance}%</p>
                              </div>
                              <div className="text-center bg-white rounded-lg p-3">
                                <p className="text-sm text-gray-600 mb-1">Status</p>
                                <p className={
                                  overallCompliance >= 90 ? 'text-lg font-bold text-green-600' :
                                  overallCompliance >= 75 ? 'text-lg font-bold text-blue-600' :
                                  overallCompliance >= 60 ? 'text-lg font-bold text-yellow-600' :
                                  'text-lg font-bold text-red-600'
                                }>{complianceStatus}</p>
                              </div>
                            </div>
                          </div>

                          {/* Detailed SLA Table */}
                          <div className="bg-white border-2 border-indigo-100 rounded-xl p-6">
                            <h4 className="text-lg font-bold text-gray-800 mb-4">Detailed SLA Compliance Analysis</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-indigo-600 text-white">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-sm font-bold">Priority Level</th>
                                    <th className="px-4 py-3 text-center text-sm font-bold">SLA Target</th>
                                    <th className="px-4 py-3 text-center text-sm font-bold">Total</th>
                                    <th className="px-4 py-3 text-center text-sm font-bold">Within SLA</th>
                                    <th className="px-4 py-3 text-center text-sm font-bold">Breached</th>
                                    <th className="px-4 py-3 text-center text-sm font-bold">Compliance %</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  <tr className="hover:bg-red-50">
                                    <td className="px-4 py-3 font-semibold text-gray-800">Emergency</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">4 hours</td>
                                    <td className="px-4 py-3 text-center font-semibold">{em.total}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-green-600">{em.withinSLA}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-red-600">{em.total - em.withinSLA}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        em.percentage >= 80 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                        {em.percentage}%
                                      </span>
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-orange-50">
                                    <td className="px-4 py-3 font-semibold text-gray-800">High</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">24 hours</td>
                                    <td className="px-4 py-3 text-center font-semibold">{hi.total}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-green-600">{hi.withinSLA}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-red-600">{hi.total - hi.withinSLA}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        hi.percentage >= 85 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                      }`}>
                                        {hi.percentage}%
                                      </span>
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-blue-50">
                                    <td className="px-4 py-3 font-semibold text-gray-800">Medium</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">72 hours</td>
                                    <td className="px-4 py-3 text-center font-semibold">{med.total}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-green-600">{med.withinSLA}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-red-600">{med.total - med.withinSLA}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        med.percentage >= 90 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {med.percentage}%
                                      </span>
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-green-50">
                                    <td className="px-4 py-3 font-semibold text-gray-800">Low</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">168 hours</td>
                                    <td className="px-4 py-3 text-center font-semibold">{lo.total}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-green-600">{lo.withinSLA}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-red-600">{lo.total - lo.withinSLA}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        lo.percentage >= 95 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {lo.percentage}%
                                      </span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Recommendations */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
                            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <FaStar className="text-blue-600" />
                              Recommendations
                            </h4>
                            <div className="space-y-3">
                              {em.percentage < 80 && (
                                <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-red-200">
                                  <FaExclamationTriangle className="text-red-600 mt-1 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">
                                    <strong className="text-red-600">Emergency Priority:</strong> Requests require immediate attention - consider increasing technician availability
                                  </p>
                                </div>
                              )}
                              {hi.percentage < 85 && (
                                <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-orange-200">
                                  <FaExclamationTriangle className="text-orange-600 mt-1 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">
                                    <strong className="text-orange-600">High Priority:</strong> Requests need faster response - review resource allocation
                                  </p>
                                </div>
                              )}
                              {overallCompliance >= 90 && (
                                <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-green-200">
                                  <FaCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">
                                    <strong className="text-green-600">Excellent Performance:</strong> SLA compliance maintained - continue current practices
                                  </p>
                                </div>
                              )}
                              {overallCompliance < 75 && (
                                <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-red-200">
                                  <FaExclamationTriangle className="text-red-600 mt-1 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">
                                    <strong className="text-red-600">Action Required:</strong> Overall compliance below target - conduct process review and staff training
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

                {/* Cost Analysis Report */}
                {activeReport === 'cost-analysis' && reportData && (
                  <div className="space-y-6">
                    {reportData.totalCost === 0 && reportData.totalWorkOrders > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> {reportData.totalWorkOrders} work order(s) found, but only {reportData.workOrderCount} completed with cost data. 
                          Costs are recorded when work orders are completed.
                        </p>
                      </div>
                    )}

                    {/* Executive Summary */}
                    {(() => {
                      const laborPercentage = reportData.totalCost > 0 ? ((reportData.laborCost / reportData.totalCost) * 100).toFixed(1) : 0
                      const materialsPercentage = reportData.totalCost > 0 ? ((reportData.materialsCost / reportData.totalCost) * 100).toFixed(1) : 0
                      
                      return (
                        <>
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <FaDollarSign className="text-green-600" />
                              Executive Summary
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center bg-white rounded-lg p-3">
                                <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                                <p className="text-2xl font-bold text-green-600">
                                  ETB {(reportData.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div className="text-center bg-white rounded-lg p-3">
                                <p className="text-sm text-gray-600 mb-1">Completed Orders</p>
                                <p className="text-3xl font-bold text-indigo-600">{reportData.workOrderCount || 0}</p>
                                <p className="text-xs text-gray-500">of {reportData.totalWorkOrders || 0}</p>
                              </div>
                              <div className="text-center bg-white rounded-lg p-3">
                                <p className="text-sm text-gray-600 mb-1">Average Cost</p>
                                <p className="text-2xl font-bold text-purple-600">
                                  ETB {(reportData.avgCostPerOrder || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div className="text-center bg-white rounded-lg p-3">
                                <p className="text-sm text-gray-600 mb-1">Cost Distribution</p>
                                <p className="text-sm font-bold text-blue-600">Labor: {laborPercentage}%</p>
                                <p className="text-sm font-bold text-orange-600">Materials: {materialsPercentage}%</p>
                              </div>
                            </div>
                          </div>

                          {/* Cost Breakdown Table */}
                          <div className="bg-white border-2 border-indigo-100 rounded-xl p-6">
                            <h4 className="text-lg font-bold text-gray-800 mb-4">Cost Breakdown Summary</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-indigo-600 text-white">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-sm font-bold">Cost Type</th>
                                    <th className="px-4 py-3 text-right text-sm font-bold">Amount</th>
                                    <th className="px-4 py-3 text-center text-sm font-bold">Percentage</th>
                                    <th className="px-4 py-3 text-center text-sm font-bold">Visual</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  <tr className="hover:bg-blue-50">
                                    <td className="px-4 py-3 font-semibold text-gray-800">Labor Cost</td>
                                    <td className="px-4 py-3 text-right font-bold text-blue-600">
                                      ETB {(reportData.laborCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold">{laborPercentage}%</td>
                                    <td className="px-4 py-3">
                                      <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div 
                                          className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                          style={{ width: `${laborPercentage}%` }}
                                        ></div>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-orange-50">
                                    <td className="px-4 py-3 font-semibold text-gray-800">Materials Cost</td>
                                    <td className="px-4 py-3 text-right font-bold text-orange-600">
                                      ETB {(reportData.materialsCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold">{materialsPercentage}%</td>
                                    <td className="px-4 py-3">
                                      <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div 
                                          className="bg-orange-600 h-3 rounded-full transition-all duration-500"
                                          style={{ width: `${materialsPercentage}%` }}
                                        ></div>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr className="bg-gray-100 font-bold">
                                    <td className="px-4 py-3 text-gray-900">Total Cost</td>
                                    <td className="px-4 py-3 text-right text-green-600 text-lg">
                                      ETB {(reportData.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-center">100%</td>
                                    <td className="px-4 py-3">
                                      <div className="w-full bg-green-600 rounded-full h-3"></div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Cost by Category */}
                          <div className="bg-white border-2 border-green-100 rounded-xl p-6">
                            <h4 className="text-lg font-bold text-gray-800 mb-4">Cost by Maintenance Category</h4>
                            {reportData.costByCategory && Object.keys(reportData.costByCategory).length > 0 ? (
                              <div className="space-y-3">
                                {Object.entries(reportData.costByCategory).map(([category, cost]) => {
                                  const percentage = reportData.totalCost > 0 ? ((cost / reportData.totalCost) * 100).toFixed(1) : 0
                                  return (
                                    <div key={category} className="bg-gradient-to-r from-green-50 to-white p-4 rounded-lg border border-green-100">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-gray-800">{category}</span>
                                        <div className="text-right">
                                          <span className="text-lg font-bold text-green-600">
                                            ETB {(cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                          <span className="text-sm text-gray-500 ml-2">({percentage}%)</span>
                                        </div>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div 
                                          className="bg-green-600 h-3 rounded-full transition-all duration-500"
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )
                                })}
                                {/* Total Row */}
                                <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 rounded-lg border-2 border-gray-300">
                                  <div className="flex justify-between items-center">
                                    <span className="text-base font-bold text-gray-900">TOTAL</span>
                                    <div className="text-right">
                                      <span className="text-xl font-bold text-green-600">
                                        ETB {(reportData.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-sm text-gray-600 ml-2">(100%)</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-center text-gray-500 py-8">No cost data available for the selected period</p>
                            )}
                          </div>

                          {/* Cost Insights */}
                          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
                            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <FaChartLine className="text-purple-600" />
                              Cost Insights
                            </h4>
                            <div className="space-y-3">
                              {laborPercentage > 60 && (
                                <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-blue-200">
                                  <FaExclamationTriangle className="text-blue-600 mt-1 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">
                                    <strong className="text-blue-600">Labor Costs:</strong> Represent majority of expenses ({laborPercentage}%) - consider efficiency improvements
                                  </p>
                                </div>
                              )}
                              {materialsPercentage > 50 && (
                                <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-orange-200">
                                  <FaExclamationTriangle className="text-orange-600 mt-1 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">
                                    <strong className="text-orange-600">Materials Costs:</strong> Are high ({materialsPercentage}%) - review supplier contracts and bulk purchasing options
                                  </p>
                                </div>
                              )}
                              {reportData.avgCostPerOrder > 1000 && (
                                <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-purple-200">
                                  <FaExclamationTriangle className="text-purple-600 mt-1 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">
                                    <strong className="text-purple-600">Average Cost:</strong> Per work order is elevated (ETB {reportData.avgCostPerOrder.toFixed(2)}) - investigate high-cost categories
                                  </p>
                                </div>
                              )}
                              {laborPercentage <= 60 && materialsPercentage <= 50 && reportData.avgCostPerOrder <= 1000 && (
                                <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-green-200">
                                  <FaCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">
                                    <strong className="text-green-600">Balanced Costs:</strong> Cost distribution is well-balanced - maintain current practices
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}
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
  )
}

export default SupervisorReports
