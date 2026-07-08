import { useState, useEffect } from 'react'
import { 
  FaUpload, 
  FaDownload, 
  FaCheckCircle,
  FaExclamationTriangle,
  FaUndo,
  FaFileImport,
  FaEdit,
  FaTimes,
  FaSearch,
  FaTrash,
  FaFileExcel,
  FaFileCsv,
  FaClipboardList,
  FaHistory,
  FaInfoCircle,
  FaChartBar
} from 'react-icons/fa'
import api from '../../services/api'

const BulkOperations = () => {
  const [activeTab, setActiveTab] = useState('status')
  const [selectedAssets, setSelectedAssets] = useState([])
  const [newStatus, setNewStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [csvFile, setCsvFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [lastOperation, setLastOperation] = useState(null)
  const [message, setMessage] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [operationHistory, setOperationHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [stats, setStats] = useState({
    totalSelected: 0,
    byStatus: {},
    byCampus: {}
  })

  useEffect(() => {
    loadOperationHistory()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [selectedAssets])

  const loadOperationHistory = () => {
    const history = JSON.parse(localStorage.getItem('bulkOperationHistory') || '[]')
    setOperationHistory(history.slice(0, 10)) // Keep last 10 operations
  }

  const saveToHistory = (operation) => {
    const history = JSON.parse(localStorage.getItem('bulkOperationHistory') || '[]')
    history.unshift({
      ...operation,
      timestamp: new Date().toISOString()
    })
    localStorage.setItem('bulkOperationHistory', JSON.stringify(history.slice(0, 10)))
    loadOperationHistory()
  }

  const calculateStats = () => {
    setStats({
      totalSelected: selectedAssets.length,
      byStatus: {},
      byCampus: {}
    })
  }

  const statusOptions = [
    { value: 'AVAILABLE', label: 'Available', color: 'green' },
    { value: 'IN_USE', label: 'In Use', color: 'blue' },
    { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance', color: 'yellow' },
    { value: 'CONDEMNED', label: 'Condemned', color: 'red' }
  ]

  const handleBulkStatusUpdate = async () => {
    if (!selectedAssets.length || !newStatus) {
      setMessage({ type: 'error', text: 'Please select assets and a status' })
      return
    }

    if (!window.confirm(`Update ${selectedAssets.length} assets to ${newStatus}?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await api.post('/assets/assets/bulk_status_update/', {
        asset_ids: selectedAssets,
        status: newStatus
      })

      setLastOperation(response.data)
      saveToHistory({
        type: 'status_update',
        count: selectedAssets.length,
        status: newStatus,
        assets: selectedAssets
      })
      setMessage({ 
        type: 'success', 
        text: response.data.message 
      })
      setSelectedAssets([])
      setNewStatus('')
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update assets' 
      })
    } finally {
      setLoading(false)
    }
  }

  const searchAssets = async () => {
    if (!searchQuery.trim()) {
      setMessage({ type: 'error', text: 'Please enter a search query' })
      return
    }

    try {
      setSearching(true)
      const response = await api.get(`/assets/assets/?search=${searchQuery}`)
      const assets = response.data.results || response.data
      setSearchResults(assets)
      setMessage({ 
        type: 'info', 
        text: `Found ${assets.length} assets matching "${searchQuery}"` 
      })
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to search assets' 
      })
    } finally {
      setSearching(false)
    }
  }

  const selectAllSearchResults = () => {
    const newAssets = searchResults
      .map(asset => asset.asset_id)
      .filter(id => !selectedAssets.includes(id))
    setSelectedAssets([...selectedAssets, ...newAssets])
    setSearchResults([])
    setSearchQuery('')
    setMessage({ 
      type: 'success', 
      text: `Added ${newAssets.length} assets to selection` 
    })
  }

  const clearAllSelections = () => {
    if (window.confirm('Clear all selected assets?')) {
      setSelectedAssets([])
      setMessage({ type: 'info', text: 'All selections cleared' })
    }
  }

  const handleRollback = async () => {
    if (!lastOperation?.original_states) {
      setMessage({ type: 'error', text: 'No operation to rollback' })
      return
    }

    if (!window.confirm(`Rollback ${lastOperation.updated_count} asset updates?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await api.post('/assets/assets/rollback_bulk_update/', {
        original_states: lastOperation.original_states
      })

      setMessage({ 
        type: 'success', 
        text: response.data.message 
      })
      setLastOperation(null)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to rollback' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file)
      setPreview(null)
      setMessage(null)
    } else {
      setMessage({ type: 'error', text: 'Please select a CSV file' })
    }
  }

  const handlePreview = async () => {
    if (!csvFile) {
      setMessage({ type: 'error', text: 'Please select a CSV file' })
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('preview', 'true')

      const response = await api.post('/assets/assets/bulk_import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setPreview(response.data)
      setMessage({ 
        type: 'info', 
        text: `Preview: ${response.data.valid_rows}/${response.data.total_rows} valid rows` 
      })
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to preview CSV' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!csvFile) {
      setMessage({ type: 'error', text: 'Please select a CSV file' })
      return
    }

    if (preview && preview.errors && preview.errors.length > 0) {
      setMessage({ type: 'error', text: 'Please fix errors before importing' })
      return
    }

    if (!window.confirm(`Import ${preview?.valid_rows || 0} assets?`)) {
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', csvFile)

      const response = await api.post('/assets/assets/bulk_import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      saveToHistory({
        type: 'import',
        count: preview?.valid_rows || 0,
        filename: csvFile.name
      })
      setMessage({ 
        type: 'success', 
        text: response.data.message 
      })
      setCsvFile(null)
      setPreview(null)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to import assets' 
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'name,asset_type,campus_code,status,description,purchase_cost\n' +
                    'Laptop Dell XPS,EQP,MAIN,AVAILABLE,15-inch laptop,45000\n' +
                    'Office Desk,FUR,BURIE,AVAILABLE,Wooden desk,12000\n' +
                    'Medical Cart,EQP,HEALTH,IN_USE,Mobile medical cart,25000\n'
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'asset_import_template.csv'
    a.click()
  }

  const addAssetId = () => {
    const input = document.getElementById('asset-id-input')
    const assetId = input.value.trim()
    
    if (assetId && !selectedAssets.includes(assetId)) {
      setSelectedAssets([...selectedAssets, assetId])
      input.value = ''
    }
  }

  const removeAssetId = (assetId) => {
    setSelectedAssets(selectedAssets.filter(id => id !== assetId))
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Bulk Operations</h1>
              <p className="text-indigo-100 text-lg">Manage multiple assets efficiently with powerful bulk tools</p>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <FaHistory />
              Operation History
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {selectedAssets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 animate-slide-up">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Selected Assets</p>
                <h3 className="text-3xl font-bold text-gray-800">{stats.totalSelected}</h3>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                <FaClipboardList className="text-2xl text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Ready to Update</p>
                <h3 className="text-3xl font-bold text-gray-800">{newStatus ? stats.totalSelected : 0}</h3>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                <FaCheckCircle className="text-2xl text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Operations Today</p>
                <h3 className="text-3xl font-bold text-gray-800">{operationHistory.length}</h3>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <FaChartBar className="text-2xl text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operation History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-2xl sticky top-0">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Operation History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {operationHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FaHistory className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No operations yet</p>
                  <p className="text-gray-400 text-sm">Your bulk operations will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {operationHistory.map((op, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-3 rounded-lg ${
                            op.type === 'status_update' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {op.type === 'status_update' ? (
                              <FaEdit className="text-blue-600 text-xl" />
                            ) : (
                              <FaFileImport className="text-green-600 text-xl" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">
                              {op.type === 'status_update' ? 'Status Update' : 'CSV Import'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {op.type === 'status_update' 
                                ? `Updated ${op.count} assets to ${op.status}`
                                : `Imported ${op.count} assets from ${op.filename}`
                              }
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(op.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Success
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 animate-slide-down ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {message.type === 'success' ? <FaCheckCircle className="text-2xl" /> : 
           <FaExclamationTriangle className="text-2xl" />}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="hover:opacity-70">
            <FaTimes />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 bg-white p-2 rounded-xl shadow-md">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'status'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FaEdit />
            Bulk Status Update
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FaFileImport />
            CSV Import
          </button>
        </div>
      </div>

      {/* Bulk Status Update Tab */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* Asset Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Select Assets</h3>
              {selectedAssets.length > 0 && (
                <button
                  onClick={clearAllSelections}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-semibold"
                >
                  <FaTrash />
                  Clear All
                </button>
              )}
            </div>

            {/* Search Assets */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <FaInfoCircle className="text-blue-600" />
                <p className="text-sm font-semibold text-blue-800">Search & Select Multiple Assets</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, campus, or status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchAssets()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={searchAssets}
                  disabled={searching}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-semibold text-green-800">
                    Found {searchResults.length} assets
                  </p>
                  <button
                    onClick={selectAllSearchResults}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                  >
                    Select All Results
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {searchResults.map(asset => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-green-200"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{asset.name}</p>
                        <p className="text-xs text-gray-600">{asset.asset_id} • {asset.campus_name}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (!selectedAssets.includes(asset.asset_id)) {
                            setSelectedAssets([...selectedAssets, asset.asset_id])
                          }
                        }}
                        disabled={selectedAssets.includes(asset.asset_id)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedAssets.includes(asset.asset_id) ? 'Added' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Manual Entry */}
            <div className="flex gap-2 mb-4">
              <input
                id="asset-id-input"
                type="text"
                placeholder="Or enter Asset ID manually (e.g., DMU-MAIN-EQP-00001)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && addAssetId()}
              />
              <button
                onClick={addAssetId}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
              >
                Add
              </button>
            </div>

            {selectedAssets.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 font-semibold">
                  Selected Assets ({selectedAssets.length}):
                </p>
                <div className="max-h-64 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {selectedAssets.map(assetId => (
                      <div
                        key={assetId}
                        className="flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      >
                        <span className="text-sm font-medium">{assetId}</span>
                        <button
                          onClick={() => removeAssetId(assetId)}
                          className="hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Select New Status</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setNewStatus(option.value)}
                  className={`p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                    newStatus === option.value
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full mx-auto mb-3 ${
                    option.color === 'green' ? 'bg-green-500' :
                    option.color === 'blue' ? 'bg-blue-500' :
                    option.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                  <p className="text-sm font-bold text-gray-800">{option.label}</p>
                  {newStatus === option.value && (
                    <FaCheckCircle className="text-indigo-600 mx-auto mt-2" />
                  )}
                </button>
              ))}
            </div>

            {newStatus && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-sm text-indigo-800">
                  <FaInfoCircle className="inline mr-2" />
                  {selectedAssets.length} assets will be updated to <span className="font-bold">{statusOptions.find(o => o.value === newStatus)?.label}</span>
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleBulkStatusUpdate}
              disabled={loading || !selectedAssets.length || !newStatus}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FaCheckCircle />
              {loading ? 'Updating...' : 'Update Assets'}
            </button>

            {lastOperation && (
              <button
                onClick={handleRollback}
                disabled={loading}
                className="px-6 py-4 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <FaUndo />
                Rollback Last Operation
              </button>
            )}
          </div>

          {/* Last Operation Info */}
          {lastOperation && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <h4 className="font-bold text-blue-800 mb-2">Last Operation</h4>
              <p className="text-blue-700 text-sm">
                Updated {lastOperation.updated_count} assets. You can rollback this operation if needed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* CSV Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Template Download */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="p-4 bg-green-100 rounded-xl">
                <FaFileExcel className="text-3xl text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2">CSV Template</h3>
                <p className="text-gray-600 mb-4">
                  Download the template to see the required format for import. The template includes sample data and all required columns.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={downloadTemplate}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <FaDownload />
                    Download Template
                  </button>
                  <button
                    onClick={() => {
                      setMessage({
                        type: 'info',
                        text: 'Template includes: name, asset_type, campus_code, status, description, purchase_cost'
                      })
                    }}
                    className="px-6 py-3 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-semibold flex items-center gap-2"
                  >
                    <FaInfoCircle />
                    View Format
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Upload CSV File</h3>
            
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              csvFile 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 hover:border-indigo-500 hover:bg-gray-50'
            }`}>
              {csvFile ? (
                <div className="animate-scale-in">
                  <FaCheckCircle className="text-5xl text-green-500 mx-auto mb-4" />
                  <p className="font-bold text-gray-800 mb-2">File Selected</p>
                  <p className="text-sm text-gray-600 mb-4">{csvFile.name}</p>
                  <button
                    onClick={() => {
                      setCsvFile(null)
                      setPreview(null)
                    }}
                    className="text-red-600 hover:text-red-700 font-semibold text-sm"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <>
                  <FaUpload className="text-5xl text-gray-400 mx-auto mb-4" />
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-semibold text-lg"
                  >
                    Click to upload CSV file
                  </label>
                  <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">CSV files only, max 10MB</p>
                </>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handlePreview}
                disabled={loading || !csvFile}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <FaSearch />
                {loading ? 'Loading...' : 'Preview Data'}
              </button>
              <button
                onClick={handleImport}
                disabled={loading || !preview || (preview.errors && preview.errors.length > 0)}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <FaFileImport />
                {loading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Preview</h3>
              
              <div className="mb-4 flex gap-4">
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
                  Total: {preview.total_rows}
                </div>
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                  Valid: {preview.valid_rows}
                </div>
                {preview.errors && preview.errors.length > 0 && (
                  <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg">
                    Errors: {preview.errors.length}
                  </div>
                )}
              </div>

              {/* Errors */}
              {preview.errors && preview.errors.length > 0 && (
                <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <h4 className="font-bold text-red-800 mb-2">Errors Found:</h4>
                  <ul className="space-y-1">
                    {preview.errors.map((error, idx) => (
                      <li key={idx} className="text-sm text-red-700">
                        Row {error.row}: {error.errors.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Row</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Campus</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.preview.slice(0, 10).map((row) => (
                      <tr key={row.row} className={row.valid ? '' : 'bg-red-50'}>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.row}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.asset_type}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.campus_code}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.status}</td>
                        <td className="px-4 py-3">
                          {row.valid ? (
                            <FaCheckCircle className="text-green-600" />
                          ) : (
                            <FaExclamationTriangle className="text-red-600" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.preview.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Showing first 10 of {preview.preview.length} rows
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BulkOperations
