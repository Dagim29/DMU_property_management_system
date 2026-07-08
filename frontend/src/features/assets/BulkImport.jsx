import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaUpload, 
  FaDownload, 
  FaFileExcel, 
  FaFileCsv,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowLeft,
  FaInfoCircle,
  FaTable
} from 'react-icons/fa'
import api from '../../services/api'

const BulkImport = () => {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [message, setMessage] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDownloadTemplate = (format) => {
    try {
      if (format === 'csv') {
        downloadCSVTemplate()
      } else if (format === 'xlsx') {
        downloadExcelTemplate()
      }
      
      setMessage({ 
        type: 'success', 
        text: `Template downloaded successfully! Fill it out and upload to import assets.` 
      })
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to download template' 
      })
    }
  }

  const downloadCSVTemplate = () => {
    // Template headers
    const headers = [
      'name',
      'asset_type', 
      'description',
      'serial_number',
      'model_number',
      'manufacturer',
      'purchase_date',
      'purchase_cost',
      'current_value',
      'campus_code',
      'building_code',
      'floor_number',
      'room_number',
      'status',
      'condition',
      'assigned_to_email',
      'notes'
    ]

    // Sample data
    const sampleData = [
      'Dell Laptop XPS 15',
      'EQP',
      'High-performance laptop for engineering department',
      'SN123456789',
      'XPS-15-9520',
      'Dell',
      '2024-01-15',
      '1500.00',
      '1500.00',
      'MAIN',
      'ENG',
      '3',
      '301',
      'AVAILABLE',
      'EXCELLENT',
      'user@example.com',
      'New purchase for Q1 2024'
    ]

    // Instructions
    const instructions = [
      'INSTRUCTIONS:',
      '1. Fill in asset data starting from row 4 (delete the sample row)',
      '2. Required fields: name, asset_type, campus_code, status',
      '3. asset_type values: EQP (Equipment), FUR (Furniture), VEH (Vehicle), BLD (Building), OTH (Other)',
      '4. status values: AVAILABLE, IN_USE, MAINTENANCE, RETIRED, DISPOSED',
      '5. condition values: EXCELLENT, GOOD, FAIR, POOR',
      '6. Date format: YYYY-MM-DD',
      '7. assigned_to_email must match an existing user email',
      '8. campus_code, building_code must exist in the system',
      '9. Numeric fields (purchase_cost, current_value) should be numbers without currency symbols'
    ]

    let csvContent = ''
    
    // Add headers
    csvContent += headers.join(',') + '\n'
    
    // Add sample data
    csvContent += sampleData.map(field => `"${field}"`).join(',') + '\n'
    
    // Add empty line
    csvContent += '\n'
    
    // Add instructions
    instructions.forEach(instruction => {
      csvContent += `"${instruction}"\n`
    })

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'asset_import_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadExcelTemplate = () => {
    // We'll need to import XLSX for this
    import('xlsx').then(XLSX => {
      const wb = XLSX.utils.book_new()
      
      // Template headers
      const headers = [
        'name',
        'asset_type', 
        'description',
        'serial_number',
        'model_number',
        'manufacturer',
        'purchase_date',
        'purchase_cost',
        'current_value',
        'campus_code',
        'building_code',
        'floor_number',
        'room_number',
        'status',
        'condition',
        'assigned_to_email',
        'notes'
      ]

      // Sample data
      const sampleData = [
        'Dell Laptop XPS 15',
        'EQP',
        'High-performance laptop for engineering department',
        'SN123456789',
        'XPS-15-9520',
        'Dell',
        '2024-01-15',
        1500.00,
        1500.00,
        'MAIN',
        'ENG',
        3,
        301,
        'AVAILABLE',
        'EXCELLENT',
        'user@example.com',
        'New purchase for Q1 2024'
      ]

      // Create main sheet data
      const sheetData = [
        headers,
        sampleData
      ]

      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      
      // Set column widths
      ws['!cols'] = headers.map(() => ({ wch: 20 }))
      
      XLSX.utils.book_append_sheet(wb, ws, 'Asset Import Template')

      // Create instructions sheet
      const instructions = [
        ['Asset Import Template - Instructions'],
        [''],
        ['REQUIRED FIELDS:'],
        ['• name - Asset name (text)'],
        ['• asset_type - Asset type code (see valid values below)'],
        ['• campus_code - Campus code where asset is located'],
        ['• status - Current status of the asset (see valid values below)'],
        [''],
        ['VALID ASSET TYPES:'],
        ['• EQP - Equipment'],
        ['• FUR - Furniture'],
        ['• VEH - Vehicle'],
        ['• BLD - Building'],
        ['• OTH - Other'],
        [''],
        ['VALID STATUS VALUES:'],
        ['• AVAILABLE - Asset is available for use'],
        ['• IN_USE - Asset is currently in use'],
        ['• MAINTENANCE - Asset is under maintenance'],
        ['• RETIRED - Asset is retired'],
        ['• DISPOSED - Asset has been disposed'],
        [''],
        ['VALID CONDITION VALUES:'],
        ['• EXCELLENT - Like new condition'],
        ['• GOOD - Minor wear and tear'],
        ['• FAIR - Noticeable wear, fully functional'],
        ['• POOR - Significant wear, may need repair'],
        [''],
        ['DATE FORMAT:'],
        ['• Use YYYY-MM-DD format (e.g., 2024-01-15)'],
        [''],
        ['NOTES:'],
        ['• Delete the sample data row before importing'],
        ['• assigned_to_email must match an existing user in the system'],
        ['• campus_code, building_code must exist in the system'],
        ['• Numeric fields (purchase_cost, current_value) should be numbers without currency symbols'],
      ]

      const wsInstructions = XLSX.utils.aoa_to_sheet(instructions)
      wsInstructions['!cols'] = [{ wch: 80 }]
      
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions')

      // Download file
      XLSX.writeFile(wb, 'asset_import_template.xlsx')
    }).catch(error => {
      console.error('Error loading XLSX library:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to download Excel template. Please try CSV format.' 
      })
    })
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (selectedFile) => {
    const validExtensions = ['csv', 'xls', 'xlsx']
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase()
    
    if (!validExtensions.includes(fileExtension)) {
      setMessage({ 
        type: 'error', 
        text: 'Invalid file type. Please upload CSV or Excel file.' 
      })
      return
    }
    
    setFile(selectedFile)
    setPreviewData(null)
    setImportResult(null)
    setMessage(null)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handlePreview = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first' })
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('preview', 'true')

      const response = await api.post('/assets/assets/bulk_import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setPreviewData(response.data)
      
      if (response.data.invalid_rows > 0) {
        setMessage({ 
          type: 'warning', 
          text: `Preview loaded with ${response.data.invalid_rows} error(s). Fix errors before importing.` 
        })
      } else {
        setMessage({ 
          type: 'success', 
          text: `Preview loaded successfully! ${response.data.valid_rows} assets ready to import.` 
        })
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to preview file' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first' })
      return
    }

    if (previewData && previewData.invalid_rows > 0) {
      setMessage({ 
        type: 'error', 
        text: 'Cannot import file with errors. Please fix all errors first.' 
      })
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/assets/assets/bulk_import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setImportResult(response.data)
      setMessage({ 
        type: 'success', 
        text: `Successfully imported ${response.data.created} assets!` 
      })
      
      // Clear file after successful import
      setFile(null)
      setPreviewData(null)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to import assets' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <button
            onClick={() => navigate('/dashboard/assets')}
            className="mb-4 flex items-center gap-2 text-white hover:text-blue-100 transition-colors"
          >
            <FaArrowLeft />
            Back to Assets
          </button>
          <h1 className="text-4xl font-bold mb-2">Import Assets</h1>
          <p className="text-blue-100 text-lg">Import multiple assets from CSV or Excel files</p>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 animate-slide-down ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' && <FaCheckCircle className="text-2xl" />}
          {message.type === 'warning' && <FaExclamationTriangle className="text-2xl" />}
          {message.type === 'error' && <FaTimes className="text-2xl" />}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="hover:opacity-70">
            <FaTimes />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Instructions & Templates */}
        <div className="lg:col-span-1 space-y-6">
          {/* Download Templates */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaDownload className="text-blue-600" />
              Download Template
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Download a template file with sample data and instructions to get started.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleDownloadTemplate('xlsx')}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <FaFileExcel className="text-xl" />
                Download Excel Template
              </button>
              
              <button
                onClick={() => handleDownloadTemplate('csv')}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <FaFileCsv className="text-xl" />
                Download CSV Template
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaInfoCircle className="text-blue-600" />
              Instructions
            </h3>
            
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span>Download the template (Excel or CSV)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span>Fill in your asset data following the format</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span>Upload the completed file</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">4.</span>
                <span>Preview to check for errors</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">5.</span>
                <span>Import when ready</span>
              </li>
            </ol>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800 font-semibold mb-2">Required Fields:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• name</li>
                <li>• asset_type (EQP, FUR, VEH, BLD, OTH)</li>
                <li>• campus_code</li>
                <li>• status (AVAILABLE, IN_USE, etc.)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column - Upload & Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Upload */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaUpload className="text-blue-600" />
              Upload File
            </h3>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 text-green-600">
                    <FaCheckCircle className="text-3xl" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null)
                      setPreviewData(null)
                      setImportResult(null)
                    }}
                    className="text-red-600 hover:text-red-800 transition-colors font-semibold"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <>
                  <FaUpload className="text-5xl text-gray-400 mx-auto mb-4" />
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-lg"
                  >
                    Click to upload or drag and drop
                  </label>
                  <p className="text-sm text-gray-500 mt-2">CSV or Excel files only</p>
                </>
              )}
            </div>

            {file && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={handlePreview}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                >
                  <FaTable />
                  {loading ? 'Loading Preview...' : 'Preview Data'}
                </button>
                
                <button
                  onClick={handleImport}
                  disabled={loading || !previewData || previewData.invalid_rows > 0}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                >
                  <FaUpload />
                  {loading ? 'Importing...' : 'Import'}
                </button>
              </div>
            )}
          </div>

          {/* Preview Data */}
          {previewData && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Preview Data</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">Total Rows</p>
                  <p className="text-2xl font-bold text-blue-800">{previewData.total_rows}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-600 mb-1">Valid Rows</p>
                  <p className="text-2xl font-bold text-green-800">{previewData.valid_rows}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-sm text-red-600 mb-1">Invalid Rows</p>
                  <p className="text-2xl font-bold text-red-800">{previewData.invalid_rows}</p>
                </div>
              </div>

              {/* Errors */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                    <FaExclamationTriangle />
                    Errors Found ({previewData.errors.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {previewData.errors.map((error, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="font-semibold text-red-800 mb-1">Row {error.row}:</p>
                        <ul className="text-sm text-red-700 space-y-1">
                          {error.errors.map((err, errIdx) => (
                            <li key={errIdx}>• {err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Row</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Campus</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Valid</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.preview.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className={row.valid ? '' : 'bg-red-50'}>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.row}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.asset_type}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.campus_code}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.status}</td>
                        <td className="px-4 py-3 text-sm">
                          {row.valid ? (
                            <FaCheckCircle className="text-green-600" />
                          ) : (
                            <FaTimes className="text-red-600" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.preview.length > 10 && (
                  <p className="text-sm text-gray-600 mt-3 text-center">
                    Showing first 10 of {previewData.preview.length} rows
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaCheckCircle className="text-green-600" />
                Import Successful
              </h3>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-semibold mb-2">
                  Successfully imported {importResult.created} assets!
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {importResult.assets.map((asset, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
                    <span className="text-sm text-gray-700">
                      Row {asset.row}: {asset.name}
                    </span>
                    <span className="text-sm font-mono text-blue-600">{asset.asset_id}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/dashboard/assets')}
                className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                View All Assets
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BulkImport
