/**
 * Utility functions for PDF exports with DMU branding
 */

/**
 * Add DMU branded header to PDF document
 * @param {jsPDF} doc - jsPDF document instance
 * @param {string} reportTitle - Title of the report
 * @param {object} metadata - Additional metadata to display
 * @returns {number} - Y position where content should start
 */
export const addDMUHeader = (doc, reportTitle, metadata = {}) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  
  const startY = metadata.startY || 0
  
  // Add DMU Logo
  try {
    const logoPath = '/src/assets/images/branding/dmu-logo.png'
    const logoWidth = 25
    const logoHeight = 25
    doc.addImage(logoPath, 'PNG', 14, 10 + startY, logoWidth, logoHeight)
  } catch (error) {
    console.warn('Could not load DMU logo:', error)
    // Fallback: Logo placeholder box
    doc.setFillColor(10, 37, 64)
    doc.rect(14, 10 + startY, 25, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('DMU', 26.5, 25 + startY, { align: 'center' })
  }
  
  // University Information
  doc.setTextColor(10, 37, 64)
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text('Debre Markos University', 45, 15 + startY)
  
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(100)
  doc.text('Property Management System', 45, 21 + startY)
  doc.text('Debre Markos, Ethiopia', 45, 27 + startY)
  doc.text('Email: admin@dmu.edu.et', 45, 33 + startY)
  
  // Horizontal line
  doc.setDrawColor(212, 175, 55) // Gold
  doc.setLineWidth(0.5)
  doc.line(14, 40 + startY, pageWidth - 14, 40 + startY)
  
  // Report Title
  doc.setFontSize(16)
  doc.setTextColor(10, 37, 64)
  doc.setFont(undefined, 'bold')
  doc.text(reportTitle.toUpperCase(), pageWidth / 2, 50 + startY, { align: 'center' })
  
  // Report Metadata
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(80)
  
  let yPos = 58 + startY
  const currentDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  doc.text(`Generated: ${currentDate}`, 14, yPos)
  yPos += 5
  
  // Add custom metadata
  if (metadata.totalRecords !== undefined) {
    doc.text(`Total Records: ${metadata.totalRecords}`, 14, yPos)
    yPos += 5
  }
  
  if (metadata.dateRange) {
    doc.text(`Date Range: ${metadata.dateRange}`, 14, yPos)
    yPos += 5
  }
  
  if (metadata.filters && metadata.filters.length > 0) {
    doc.text('Applied Filters:', 14, yPos)
    yPos += 4
    metadata.filters.forEach(filter => {
      doc.setFontSize(8)
      // Handle both string filters and object filters with label/value
      const filterText = typeof filter === 'string' 
        ? filter 
        : `${filter.label}: ${filter.value}`
      doc.text(`• ${filterText}`, 16, yPos)
      yPos += 4
    })
    doc.setFontSize(9)
    yPos += 2
  }
  
  // Exported by information
  if (metadata.exportedBy) {
    doc.text(`Exported by: ${metadata.exportedBy}`, 14, yPos)
    yPos += 5
  } else {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    doc.text(`Exported by: ${user.username || 'Admin'}`, 14, yPos)
    yPos += 5
  }
  
  return yPos + 5 // Return Y position where content should start
}

/**
 * Add DMU branded footer to PDF document
 * @param {jsPDF} doc - jsPDF document instance
 * @param {object} data - autoTable data object (optional)
 */
export const addDMUFooter = (docOrData, data = null) => {
  const doc = docOrData.doc || docOrData
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Footer on each page
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text(
    'This is a confidential document. Unauthorized access or distribution is prohibited.',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  )
  
  // Page number
  const pageNum = doc.internal.getCurrentPageInfo().pageNumber
  const totalPages = doc.internal.getNumberOfPages()
  doc.text(
    `Page ${pageNum} of ${totalPages}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )
  
  // DMU Footer
  doc.setTextColor(100)
  doc.text(
    '© ' + new Date().getFullYear() + ' Debre Markos University',
    14,
    pageHeight - 10
  )
}

/**
 * Get DMU branded table styles for autoTable
 * @returns {object} - autoTable style configuration
 */
export const getDMUTableStyles = () => ({
  theme: 'striped',
  headStyles: { 
    fillColor: [10, 37, 64], // DMU Blue
    textColor: [255, 255, 255],
    fontStyle: 'bold',
    fontSize: 9
  },
  styles: { 
    fontSize: 8,
    cellPadding: 3
  },
  alternateRowStyles: {
    fillColor: [245, 247, 250]
  },
  margin: { left: 14, right: 14 }
})

/**
 * Add CSV header with DMU branding
 * @param {string} reportTitle - Title of the report
 * @param {object} metadata - Additional metadata
 * @returns {string} - CSV header content
 */
export const addDMUCSVHeader = (reportTitle, metadata = {}) => {
  let csvContent = '=== DEBRE MARKOS UNIVERSITY ===\n'
  csvContent += 'Property Management System\n'
  csvContent += `${reportTitle}\n`
  csvContent += '================================\n\n'
  csvContent += `Generated: ${new Date().toLocaleString()}\n`
  
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  csvContent += `Exported by: ${user.username || 'Admin'}\n`
  
  if (metadata.totalRecords !== undefined) {
    csvContent += `Total Records: ${metadata.totalRecords}\n`
  }
  
  if (metadata.dateRange) {
    csvContent += `Date Range: ${metadata.dateRange}\n`
  }
  
  if (metadata.filters && metadata.filters.length > 0) {
    csvContent += '\nApplied Filters:\n'
    metadata.filters.forEach(filter => {
      csvContent += `- ${filter}\n`
    })
  }
  
  csvContent += '\n================================\n\n'
  
  return csvContent
}

/**
 * Add CSV footer with DMU branding
 * @returns {string} - CSV footer content
 */
export const addDMUCSVFooter = () => {
  let csvContent = '\n================================\n'
  csvContent += `© ${new Date().getFullYear()} Debre Markos University\n`
  csvContent += 'This is a confidential document.\n'
  return csvContent
}

/**
 * Add Excel cover sheet with DMU branding
 * @param {string} reportTitle - Title of the report
 * @param {object} metadata - Additional metadata
 * @returns {Array} - Cover sheet data array
 */
export const getDMUExcelCover = (reportTitle, metadata = {}) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  const coverData = [
    ['DEBRE MARKOS UNIVERSITY'],
    ['Property Management System'],
    [''],
    [reportTitle.toUpperCase()],
    [''],
    ['Report Information:'],
    ['Generated:', new Date().toLocaleString()],
    ['Exported by:', user.username || 'Admin']
  ]
  
  if (metadata.totalRecords !== undefined) {
    coverData.push(['Total Records:', metadata.totalRecords])
  }
  
  if (metadata.dateRange) {
    coverData.push(['Date Range:', metadata.dateRange])
  }
  
  coverData.push(
    [''],
    ['Contact Information:'],
    ['Email:', 'admin@dmu.edu.et'],
    ['Location:', 'Debre Markos, Ethiopia'],
    [''],
    [''],
    ['CONFIDENTIAL DOCUMENT'],
    ['Unauthorized access or distribution is prohibited'],
    [''],
    [`© ${new Date().getFullYear()} Debre Markos University`]
  )
  
  return coverData
}

import { jsPDF } from 'jspdf'

/**
 * Generate a downloadable Disposal Certificate PDF
 * @param {object} disposal - Disposal object containing details
 */
export const generateDisposalCertificate = (disposal) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Add a nice border
  doc.setDrawColor(10, 37, 64)
  doc.setLineWidth(1)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20)
  
  // Inner border
  doc.setDrawColor(212, 175, 55)
  doc.setLineWidth(0.5)
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24)

  // Use the existing DMU header utility
  let yPos = addDMUHeader(doc, 'Asset Disposal Certificate', {
    exportedBy: 'Property Management System',
    startY: 10
  })

  // Title
  doc.setFontSize(22)
  doc.setTextColor(10, 37, 64)
  doc.setFont(undefined, 'bold')
  doc.text('CERTIFICATE OF DISPOSAL', pageWidth / 2, yPos + 10, { align: 'center' })
  
  doc.setDrawColor(212, 175, 55)
  doc.line(60, yPos + 12, pageWidth - 60, yPos + 12)

  yPos += 25

  // Certificate Content
  doc.setFontSize(12)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(50)
  
  const textBody = [
    `This is to certify that the asset bearing the ID ${disposal.asset_id} `,
    `has been officially disposed of from the Debre Markos University property registry `,
    `in accordance with the institutional property management regulations.`
  ]
  doc.text(textBody, 20, yPos, { maxWidth: pageWidth - 40, align: 'justify', lineHeightFactor: 1.5 })

  yPos += 30

  // Details box
  doc.setFillColor(245, 247, 250)
  doc.rect(20, yPos, pageWidth - 40, 80, 'F')
  doc.setDrawColor(200)
  doc.rect(20, yPos, pageWidth - 40, 80, 'S')

  doc.setFontSize(11)
  
  const details = [
    ['Asset Name:', disposal.asset_name || 'N/A'],
    ['Disposal Method:', disposal.disposal_method],
    ['Reason for Disposal:', disposal.reason],
    ['Date of Disposal:', disposal.disposal_date || new Date(disposal.manager_approval_date || disposal.request_date).toLocaleDateString()],
    ['Status:', 'COMPLETED'],
    ['Approved By:', disposal.property_manager_name || 'Property Manager']
  ]

  let boxY = yPos + 10
  details.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold')
    doc.setTextColor(10, 37, 64)
    doc.text(label, 25, boxY)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(50)
    // Handle long values (e.g. reason)
    const splitValue = doc.splitTextToSize(value, pageWidth - 90)
    doc.text(splitValue, 70, boxY)
    boxY += (splitValue.length * 6) + 4
  })

  // Signatures
  yPos = pageHeight - 50
  
  doc.setDrawColor(10, 37, 64)
  doc.line(30, yPos, 80, yPos)
  doc.setFontSize(10)
  doc.text('Authorized Signature', 55, yPos + 5, { align: 'center' })
  doc.setFont(undefined, 'bold')
  doc.text(disposal.property_manager_name || 'Property Manager', 55, yPos + 10, { align: 'center' })
  
  doc.line(pageWidth - 80, yPos, pageWidth - 30, yPos)
  doc.setFont(undefined, 'normal')
  doc.text('Official Stamp', pageWidth - 55, yPos + 5, { align: 'center' })

  // Save the PDF
  doc.save(`DMU_Disposal_Certificate_${disposal.asset_id}.pdf`)
}
