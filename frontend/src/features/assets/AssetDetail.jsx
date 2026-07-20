import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FaEdit, 
  FaArrowLeft, 
  FaQrcode,
  FaMapMarkerAlt,
  FaCalendar,
  FaDollarSign,
  FaInfoCircle,
  FaHistory,
  FaExchangeAlt,
  FaTools,
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaFileAlt,
  FaPrint,
  FaTrash,
  FaShieldAlt,
  FaBan
} from 'react-icons/fa'
import api from '../../services/api'

const statusColors = {
  AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
  IN_USE: 'bg-blue-100 text-blue-800 border-blue-200',
  UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONDEMNED: 'bg-red-100 text-red-800 border-red-200',
}

const typeLabels = {
  EQP: 'Equipment',
  FUR: 'Furniture',
  VEH: 'Vehicle',
  BLD: 'Building Component',
  OTH: 'Other'
}

function AssetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [transfers, setTransfers] = useState([])
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  const [documents, setDocuments] = useState([])
  const [warranties, setWarranties] = useState([])
  const [insurances, setInsurances] = useState([])
  const [disposals, setDisposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetchAsset()
    fetchTransfers()
    fetchMaintenanceRequests()
    fetchDocuments()
    fetchWarranties()
    fetchInsurances()
    fetchDisposals()
  }, [id])

  const fetchAsset = async () => {
    try {
      const response = await api.get(`/assets/assets/${id}/`)
      setAsset(response.data)
    } catch (error) {
      console.error('Error fetching asset:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransfers = async () => {
    try {
      const response = await api.get(`/assets/transfers/?asset=${id}`)
      const data = response.data.results || response.data
      setTransfers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching transfers:', error)
    }
  }

  const fetchMaintenanceRequests = async () => {
    try {
      const response = await api.get(`/maintenance/requests/?asset=${id}`)
      const data = response.data.results || response.data
      setMaintenanceRequests(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching maintenance requests:', error)
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/assets/documents/?asset=${id}`)
      const data = response.data.results || response.data
      setDocuments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const fetchWarranties = async () => {
    try {
      const response = await api.get(`/assets/warranties/?asset=${id}`)
      const data = response.data.results || response.data
      setWarranties(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching warranties:', error)
    }
  }

  const fetchInsurances = async () => {
    try {
      const response = await api.get(`/assets/insurance/?asset=${id}`)
      const data = response.data.results || response.data
      setInsurances(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching insurances:', error)
    }
  }

  const fetchDisposals = async () => {
    try {
      const response = await api.get(`/assets/disposals/?asset=${id}`)
      const data = response.data.results || response.data
      setDisposals(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching disposals:', error)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleteLoading(true)
      await api.delete(`/assets/assets/${id}/`)
      navigate('/dashboard/assets')
    } catch (error) {
      console.error('Error deleting asset:', error)
      showError('Failed to delete asset. It may have associated records.')
    } finally {
      setDeleteLoading(false)
      setShowDeleteModal(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const calculateDepreciation = () => {
    if (!asset.purchase_cost || !asset.current_value) return null
    const depreciation = ((asset.purchase_cost - asset.current_value) / asset.purchase_cost) * 100
    return depreciation.toFixed(1)
  }

  const calculateAge = () => {
    if (!asset.purchase_date) return null
    const purchaseDate = new Date(asset.purchase_date)
    const today = new Date()
    const diffTime = Math.abs(today - purchaseDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)
    return { years, months, days: diffDays }
  }

  const getMaintenanceStats = () => {
    const total = maintenanceRequests.length
    const pending = maintenanceRequests.filter(r => r.status === 'PENDING').length
    const inProgress = maintenanceRequests.filter(r => r.status === 'IN_PROGRESS').length
    const completed = maintenanceRequests.filter(r => r.status === 'COMPLETED').length
    const totalCost = maintenanceRequests
      .filter(r => r.estimated_cost)
      .reduce((sum, r) => sum + parseFloat(r.estimated_cost), 0)
    return { total, pending, inProgress, completed, totalCost }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Asset not found
        </div>
      </div>
    )
  }

  const age = calculateAge()
  const depreciation = calculateDepreciation()
  const maintenanceStats = getMaintenanceStats()

  return (
    <div className="p-6 bg-gray-50 min-h-screen print:bg-white">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <FaExclamationTriangle className="text-3xl text-red-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Delete Asset?</h3>
                <p className="text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-semibold">{asset.asset_id}</span>? 
              All associated records will be affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 print:mb-4">
        <button
          onClick={() => navigate('/dashboard/assets')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors print:hidden"
        >
          <FaArrowLeft />
          Back to Assets
        </button>
        
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl print:bg-blue-600 print:shadow-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2 print:text-3xl">{asset.name}</h1>
              <div className="flex items-center gap-2">
                <p className="text-blue-100 text-lg print:text-base">Asset ID: {asset.asset_id}</p>
                {asset.verification_status === 'VERIFIED' && (
                  <div className="flex items-center gap-1 bg-green-500 bg-opacity-20 px-3 py-1 rounded-full">
                    <FaCheckCircle className="text-green-100" />
                    <span className="text-green-100 text-sm font-semibold">Verified</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-3">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  asset.status === 'AVAILABLE' ? 'bg-green-500' :
                  asset.status === 'IN_USE' ? 'bg-blue-500' :
                  asset.status === 'UNDER_MAINTENANCE' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}>
                  {asset.status.replace('_', ' ')}
                </span>
                <span className="px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm font-semibold">
                  {typeLabels[asset.asset_type]}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all flex items-center gap-2"
              >
                <FaPrint />
                Print
              </button>
              <button
                onClick={() => navigate(`/dashboard/assets/${id}/edit`)}
                className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all flex items-center gap-2"
              >
                <FaEdit />
                Edit
              </button>
              <button
                onClick={() => navigate(`/dashboard/assets/${id}/transfer`)}
                className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all flex items-center gap-2"
              >
                <FaExchangeAlt />
                Transfer
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all flex items-center gap-2"
              >
                <FaTrash />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:mb-4">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Asset Age</p>
              <p className="text-2xl font-bold text-gray-800">
                {age ? `${age.years}y ${age.months}m` : 'N/A'}
              </p>
            </div>
            <FaClock className="text-4xl text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Value</p>
              <p className="text-2xl font-bold text-gray-800">
                {asset.current_value ? `ETB ${parseFloat(asset.current_value).toLocaleString()}` : 'N/A'}
              </p>
            </div>
            <FaDollarSign className="text-4xl text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Depreciation</p>
              <p className="text-2xl font-bold text-gray-800">
                {depreciation ? `${depreciation}%` : 'N/A'}
              </p>
            </div>
            <FaChartLine className="text-4xl text-orange-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Maintenance</p>
              <p className="text-2xl font-bold text-gray-800">{maintenanceStats.total}</p>
              <p className="text-xs text-gray-500">{maintenanceStats.pending} pending</p>
            </div>
            <FaTools className="text-4xl text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6 print:hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-4 font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaInfoCircle className="inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-6 py-4 font-semibold transition-colors ${
              activeTab === 'maintenance'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaTools className="inline mr-2" />
            Maintenance ({maintenanceStats.total})
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-6 py-4 font-semibold transition-colors ${
              activeTab === 'transfers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaHistory className="inline mr-2" />
            Transfer History ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab('lifecycle')}
            className={`px-6 py-4 font-semibold transition-colors ${
              activeTab === 'lifecycle'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaChartLine className="inline mr-2" />
            Lifecycle
          </button>
          <button
            onClick={() => setActiveTab('coverage')}
            className={`px-6 py-4 font-semibold transition-colors ${
              activeTab === 'coverage'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaShieldAlt className="inline mr-2" />
            Coverage ({warranties.length + insurances.length})
          </button>
          {disposals.length > 0 && (
            <button
              onClick={() => setActiveTab('disposals')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'disposals'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FaBan className="inline mr-2" />
              Disposals
            </button>
          )}
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-4 font-semibold transition-colors ${
              activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaFileAlt className="inline mr-2" />
            Documents ({documents.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Basic Details */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaInfoCircle className="text-blue-600" />
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Asset Type</p>
                    <p className="font-semibold text-gray-800">{typeLabels[asset.asset_type]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border-2 ${statusColors[asset.status]}`}>
                      {asset.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Campus</p>
                    <p className="font-semibold text-gray-800">{asset.campus_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Location</p>
                    <p className="font-semibold text-gray-800">{asset.room_info || 'Not assigned'}</p>
                  </div>
                  {asset.assigned_to_name && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Assigned To</p>
                      <p className="font-semibold text-gray-800">{asset.assigned_to_name}</p>
                    </div>
                  )}
                </div>

                {asset.description && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-gray-800">{asset.description}</p>
                  </div>
                )}
              </div>

              {/* Asset Details */}
              {(asset.manufacturer || asset.model_number || asset.serial_number || asset.condition || asset.supplier) && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FaInfoCircle className="text-blue-600" />
                    Asset Details
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {asset.manufacturer && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Manufacturer/Brand</p>
                        <p className="font-semibold text-gray-800">{asset.manufacturer}</p>
                      </div>
                    )}
                    {asset.model_number && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Model Number</p>
                        <p className="font-semibold text-gray-800">{asset.model_number}</p>
                      </div>
                    )}
                    {asset.serial_number && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Serial Number</p>
                        <p className="font-semibold text-gray-800 font-mono">{asset.serial_number}</p>
                      </div>
                    )}
                    {asset.condition && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Condition</p>
                        <p className="font-semibold text-gray-800">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                            asset.condition === 'EXCELLENT' ? 'bg-green-100 text-green-800' :
                            asset.condition === 'GOOD' ? 'bg-blue-100 text-blue-800' :
                            asset.condition === 'FAIR' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {asset.condition}
                          </span>
                        </p>
                      </div>
                    )}
                    {asset.supplier && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 mb-1">Supplier/Vendor</p>
                        <p className="font-semibold text-gray-800">{asset.supplier}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Information */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaDollarSign className="text-green-600" />
                  Financial Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Purchase Date</p>
                    <p className="font-semibold text-gray-800">
                      {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Purchase Cost</p>
                    <p className="font-semibold text-gray-800">
                      {asset.purchase_cost ? `ETB ${parseFloat(asset.purchase_cost).toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Value</p>
                    <p className="font-semibold text-gray-800">
                      {asset.current_value ? `ETB ${parseFloat(asset.current_value).toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Depreciation</p>
                    <p className="font-semibold text-gray-800">
                      {depreciation ? `${depreciation}%` : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Depreciation Visual */}
                {depreciation && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Value Depreciation</p>
                    <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-orange-500 transition-all"
                        style={{ width: `${100 - depreciation}%` }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700">
                        {100 - depreciation}% Value Retained
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Specifications */}
              {asset.specifications && Object.keys(asset.specifications).length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Specifications</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(asset.specifications).map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">{key}</p>
                        <p className="font-semibold text-gray-800">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <>
              {/* Maintenance Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaTools className="text-purple-600" />
                  Maintenance Overview
                </h3>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{maintenanceStats.total}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Requests</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">{maintenanceStats.pending}</p>
                    <p className="text-sm text-gray-600 mt-1">Pending</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-3xl font-bold text-orange-600">{maintenanceStats.inProgress}</p>
                    <p className="text-sm text-gray-600 mt-1">In Progress</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{maintenanceStats.completed}</p>
                    <p className="text-sm text-gray-600 mt-1">Completed</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Total Maintenance Cost</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ETB {maintenanceStats.totalCost.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Maintenance Requests List */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Maintenance History</h3>
                  <button
                    onClick={() => navigate('/dashboard/maintenance/requests/new', { state: { assetId: id } })}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                  >
                    New Request
                  </button>
                </div>
                
                {maintenanceRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FaTools className="text-5xl mx-auto mb-3 opacity-20" />
                    <p>No maintenance requests found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {maintenanceRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/dashboard/maintenance/requests/${request.id}`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-800">{request.title}</p>
                            <p className="text-sm text-gray-600">{request.description}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Priority: {request.priority}</span>
                          {request.estimated_cost && (
                            <span>Cost: ETB {parseFloat(request.estimated_cost).toLocaleString()}</span>
                          )}
                          <span>{new Date(request.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaHistory className="text-purple-600" />
                Transfer History
              </h3>
              
              {transfers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaExchangeAlt className="text-5xl mx-auto mb-3 opacity-20" />
                  <p>No transfer history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transfers.map((transfer, index) => (
                    <div key={index} className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-l-0 last:pb-0">
                      <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 bg-purple-600 rounded-full"></div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {transfer.from_room ? `From: ${transfer.from_room}` : 'Initial Assignment'}
                            </p>
                            <p className="text-gray-700">
                              To: {transfer.to_room || 'Unassigned'}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(transfer.transfer_date).toLocaleDateString()}
                          </span>
                        </div>
                        {transfer.reason && (
                          <p className="text-sm text-gray-600 mt-2 p-2 bg-white rounded">
                            <span className="font-semibold">Reason:</span> {transfer.reason}
                          </p>
                        )}
                        {transfer.requested_by && (
                          <p className="text-xs text-gray-500 mt-2">
                            Requested by: {transfer.requested_by}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lifecycle Tab */}
          {activeTab === 'lifecycle' && (
            <>
              {/* Lifecycle Timeline */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaChartLine className="text-blue-600" />
                  Asset Lifecycle
                </h3>
                
                <div className="space-y-6">
                  {/* Acquisition */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaCheckCircle className="text-green-600 text-xl" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">Acquisition</h4>
                      <p className="text-sm text-gray-600">
                        Purchased on {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'Unknown'}
                      </p>
                      {asset.purchase_cost && (
                        <p className="text-sm text-gray-600">
                          Initial Cost: ETB {parseFloat(asset.purchase_cost).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Deployment */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      asset.room ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <FaMapMarkerAlt className={`text-xl ${asset.room ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">Deployment</h4>
                      <p className="text-sm text-gray-600">
                        {asset.room ? `Deployed to ${asset.room_info}` : 'Not yet deployed'}
                      </p>
                      {transfers.length > 0 && (
                        <p className="text-sm text-gray-600">
                          Transferred {transfers.length} time{transfers.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Maintenance */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      maintenanceStats.total > 0 ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <FaTools className={`text-xl ${maintenanceStats.total > 0 ? 'text-purple-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">Maintenance</h4>
                      <p className="text-sm text-gray-600">
                        {maintenanceStats.total} maintenance request{maintenanceStats.total !== 1 ? 's' : ''}
                      </p>
                      {maintenanceStats.totalCost > 0 && (
                        <p className="text-sm text-gray-600">
                          Total Cost: ETB {maintenanceStats.totalCost.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Current Status */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      asset.status === 'AVAILABLE' ? 'bg-green-100' :
                      asset.status === 'IN_USE' ? 'bg-blue-100' :
                      asset.status === 'UNDER_MAINTENANCE' ? 'bg-yellow-100' :
                      'bg-red-100'
                    }`}>
                      <FaInfoCircle className={`text-xl ${
                        asset.status === 'AVAILABLE' ? 'text-green-600' :
                        asset.status === 'IN_USE' ? 'text-blue-600' :
                        asset.status === 'UNDER_MAINTENANCE' ? 'text-yellow-600' :
                        'text-red-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">Current Status</h4>
                      <p className="text-sm text-gray-600">
                        {asset.status.replace('_', ' ')}
                      </p>
                      {age && (
                        <p className="text-sm text-gray-600">
                          Age: {age.years} year{age.years !== 1 ? 's' : ''} and {age.months} month{age.months !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Disposal (if condemned) */}
                  {asset.status === 'CONDEMNED' && (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FaExclamationTriangle className="text-red-600 text-xl" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1">Condemned</h4>
                        <p className="text-sm text-gray-600">
                          Asset marked for disposal
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lifecycle Metrics */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Lifecycle Metrics</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Utilization Rate</span>
                      <span className="font-semibold text-gray-800">
                        {asset.status === 'IN_USE' ? '100%' : asset.status === 'AVAILABLE' ? '0%' : 'N/A'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${asset.status === 'IN_USE' ? 'bg-green-500' : 'bg-gray-400'}`}
                        style={{ width: asset.status === 'IN_USE' ? '100%' : '0%' }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Maintenance Frequency</span>
                      <span className="font-semibold text-gray-800">
                        {age && age.days > 0 ? (maintenanceStats.total / (age.days / 365)).toFixed(2) : '0'} per year
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Cost of Ownership</span>
                      <span className="font-semibold text-gray-800">
                        ETB {((parseFloat(asset.purchase_cost || 0) + maintenanceStats.totalCost)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {asset.purchase_cost && maintenanceStats.totalCost > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Maintenance vs Purchase Cost</span>
                        <span className="font-semibold text-gray-800">
                          {((maintenanceStats.totalCost / parseFloat(asset.purchase_cost)) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500"
                          style={{ width: `${Math.min(((maintenanceStats.totalCost / parseFloat(asset.purchase_cost)) * 100), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaFileAlt className="text-blue-600" />
                Asset Documents
              </h3>
              
              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaFileAlt className="text-5xl mx-auto mb-3 opacity-20" />
                  <p>No documents found for this asset</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                          <FaFileAlt className="text-2xl" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{doc.title || doc.document_type}</p>
                          {doc.description && <p className="text-sm text-gray-600">{doc.description}</p>}
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded on {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <a 
                        href={doc.file} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold whitespace-nowrap"
                      >
                        View / Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Coverage Tab */}
          {activeTab === 'coverage' && (
            <div className="space-y-6">
              {/* Warranties */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaShieldAlt className="text-green-600" />
                  Warranties
                </h3>
                {warranties.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FaShieldAlt className="text-5xl mx-auto mb-3 opacity-20" />
                    <p>No warranties recorded</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {warranties.map((warranty, index) => {
                      const isActive = new Date(warranty.end_date) >= new Date();
                      return (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${isActive ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-400'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-gray-800">Provider: {warranty.provider}</p>
                              <p className="text-sm text-gray-600 mt-1">Contact: {warranty.contact_info}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                              {isActive ? 'Active' : 'Expired'}
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-600 mt-2">
                            <span>Start: {new Date(warranty.start_date).toLocaleDateString()}</span>
                            <span>End: {new Date(warranty.end_date).toLocaleDateString()}</span>
                          </div>
                          {warranty.coverage_details && (
                            <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded">
                              Coverage: {warranty.coverage_details}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Insurances */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaShieldAlt className="text-blue-600" />
                  Insurances
                </h3>
                {insurances.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FaShieldAlt className="text-5xl mx-auto mb-3 opacity-20" />
                    <p>No insurance policies recorded</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {insurances.map((ins, index) => {
                      const isActive = new Date(ins.end_date) >= new Date();
                      return (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${isActive ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-400'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-gray-800">Provider: {ins.provider}</p>
                              <p className="text-sm text-gray-600 mt-1">Policy No: {ins.policy_number}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                              {isActive ? 'Active' : 'Expired'}
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-600 mt-2">
                            <span>Start: {new Date(ins.start_date).toLocaleDateString()}</span>
                            <span>End: {new Date(ins.end_date).toLocaleDateString()}</span>
                            {ins.premium_amount && <span>Premium: ETB {ins.premium_amount}</span>}
                          </div>
                          <div className="mt-2 text-sm text-gray-700">
                            {ins.coverage_type && <p>Type: {ins.coverage_type}</p>}
                            {ins.coverage_amount && <p>Coverage: ETB {ins.coverage_amount}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disposals Tab */}
          {activeTab === 'disposals' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaBan className="text-red-600" />
                Disposal Records
              </h3>
              <div className="space-y-4">
                {disposals.map((disposal, index) => (
                  <div key={index} className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-800">Method: {disposal.disposal_method}</p>
                        <p className="text-sm text-gray-600 mt-1">Status: {disposal.status}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-700">
                        {new Date(disposal.request_date).toLocaleDateString()}
                      </span>
                    </div>
                    {disposal.reason && (
                      <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded">
                        Reason: {disposal.reason}
                      </p>
                    )}
                    {disposal.estimated_value && (
                      <p className="text-sm text-gray-600 mt-2">
                        Estimated Value: ETB {disposal.estimated_value}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Photo */}
          {asset.photo && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Photo</h3>
              <img 
                src={asset.photo} 
                alt={asset.name} 
                className="w-full rounded-lg shadow-md"
              />
            </div>
          )}

          {/* QR Code */}
          {asset.qr_code && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaQrcode className="text-blue-600" />
                QR Code
              </h3>
              <img 
                src={asset.qr_code} 
                alt="QR Code" 
                className="w-full rounded-lg shadow-md bg-white p-4"
              />
              <button
                onClick={() => window.open(asset.qr_code, '_blank')}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <FaQrcode />
                Download QR Code
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 print:hidden">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/dashboard/assets/${id}/edit`)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <FaEdit />
                Edit Asset
              </button>
              <button
                onClick={() => navigate(`/dashboard/assets/${id}/transfer`)}
                className="w-full px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <FaExchangeAlt />
                Transfer Asset
              </button>
              <button
                onClick={() => navigate('/dashboard/maintenance/requests/new', { state: { assetId: id } })}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <FaTools />
                Request Maintenance
              </button>
              <button
                onClick={handlePrint}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <FaPrint />
                Print Details
              </button>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaCalendar className="text-gray-600" />
              Timestamps
            </h3>
            
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Created</p>
                <p className="text-sm font-semibold text-gray-800">
                  {new Date(asset.created_at).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                <p className="text-sm font-semibold text-gray-800">
                  {new Date(asset.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Health Score */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Asset Health</h3>
            
            <div className="text-center">
              <div className="relative inline-block">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={
                      asset.status === 'AVAILABLE' ? '#10b981' :
                      asset.status === 'IN_USE' ? '#3b82f6' :
                      asset.status === 'UNDER_MAINTENANCE' ? '#f59e0b' :
                      '#ef4444'
                    }
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${
                      asset.status === 'AVAILABLE' ? 90 :
                      asset.status === 'IN_USE' ? 85 :
                      asset.status === 'UNDER_MAINTENANCE' ? 60 :
                      30
                    } ${352}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-800">
                    {asset.status === 'AVAILABLE' ? '90' :
                     asset.status === 'IN_USE' ? '85' :
                     asset.status === 'UNDER_MAINTENANCE' ? '60' :
                     '30'}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Based on status, age, and maintenance history
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssetDetail
