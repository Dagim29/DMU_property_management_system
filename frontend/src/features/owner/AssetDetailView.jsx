import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Package,
  MapPin,
  Calendar,
  DollarSign,
  Info,
  ArrowLeft,
  Wrench,
  Clock,
  FileText,
  Shield,
  AlertCircle,
  CheckCircle,
  History,
  Download,
  Share2,
  Tag,
  Building,
  Layers,
  QrCode
} from 'lucide-react'
import AssetHistory from './AssetHistory'

export default function AssetDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.auth)
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'details')

  useEffect(() => {
    fetchAssetDetails()
  }, [id])

  useEffect(() => {
    // Update active tab if passed via navigation state
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state])

  const fetchAssetDetails = async () => {
    try {
      // Fetch from general assets endpoint (accessible to all authenticated users)
      const response = await axios.get(`http://localhost:8000/api/assets/assets/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAsset(response.data)
    } catch (error) {
      console.error('Error fetching asset details:', error)
      if (error.response?.status === 404) {
        setError('Asset not found')
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view this asset')
      } else {
        setError('Failed to load asset details')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: asset.name,
        text: `Check out this asset: ${asset.asset_id}`,
        url: window.location.href
      }).catch(console.error)
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(
        `${asset.name} (${asset.asset_id})\n${window.location.href}`
      )
      showSuccess('Asset info copied to clipboard!')
    }
  }

  const handleDownloadQR = async () => {
    try {
      // If asset has a stored QR code, use that (plain text QR code)
      if (asset.qr_code) {
        // Download the stored QR code
        const response = await axios.get(asset.qr_code, {
          responseType: 'blob'
        })
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${asset.asset_id}_QR.png`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } else {
        // Fallback to generating encrypted QR code
        const response = await axios.get(
          `http://localhost:8000/api/owner/qr-generate/generate/?asset_id=${asset.asset_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          }
        )
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${asset.asset_id}_QR.png`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading QR code:', error)
      showError('Failed to download QR code. Please try again.')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
      IN_USE: 'bg-blue-100 text-blue-800 border-blue-200',
      UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      CONDEMNED: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getConditionColor = (condition) => {
    const colors = {
      EXCELLENT: 'text-green-600 bg-green-50',
      GOOD: 'text-blue-600 bg-blue-50',
      FAIR: 'text-yellow-600 bg-yellow-50',
      POOR: 'text-red-600 bg-red-50'
    }
    return colors[condition] || 'text-gray-600 bg-gray-50'
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16 mb-4"></div>
        <p className="text-gray-600">Loading asset details...</p>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            {error || 'Asset Not Found'}
          </h3>
          <p className="text-red-700 mb-4">
            {error === 'Asset not found' 
              ? "This asset doesn't exist in the system."
              : error === 'You do not have permission to view this asset'
              ? "You don't have permission to view this asset."
              : "Unable to load asset details. Please try again."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard/owner/my-assets')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to My Assets
            </button>
            <button
              onClick={() => navigate('/dashboard/owner/qr-scanner')}
              className="px-6 py-2 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Scan Another Asset
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/owner/my-assets')}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to My Assets
        </button>

        <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Package className="h-10 w-10" />
                <div>
                  <h1 className="text-3xl font-bold">{asset.name}</h1>
                  <p className="text-purple-200 font-mono text-sm">{asset.asset_id}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(asset.status)} backdrop-blur-sm`}>
                  {asset.status.replace('_', ' ')}
                </span>
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                  {asset.asset_type === 'EQP' ? 'Equipment' :
                   asset.asset_type === 'FUR' ? 'Furniture' :
                   asset.asset_type === 'VEH' ? 'Vehicle' :
                   asset.asset_type === 'BLD' ? 'Building' : 'Other'}
                </span>
                {asset.assigned_to === user?.id && (
                  <span className="px-4 py-1.5 bg-green-500/90 backdrop-blur-sm rounded-full text-sm font-semibold border border-green-400/50 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Assigned to You
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/dashboard/maintenance/requests/new?asset=${asset.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-white text-purple-700 rounded-xl hover:bg-purple-50 transition-all shadow-lg font-semibold"
              >
                <Wrench className="h-5 w-5" />
                Request Service
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'details'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Info className="inline h-5 w-5 mr-2" />
            Details
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'history'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <History className="inline h-5 w-5 mr-2" />
            History
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'details' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Asset Image */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="h-96 bg-gradient-to-br from-purple-100 to-indigo-100 relative">
                {asset.photo ? (
                  <img
                    src={asset.photo.startsWith('http') ? asset.photo : `http://localhost:8000${asset.photo}`}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full">
                          <svg class="h-32 w-32 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <p class="text-purple-400 text-lg mt-4">No Image Available</p>
                        </div>
                      `
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Package className="h-32 w-32 text-purple-300" />
                    <p className="text-purple-400 text-lg mt-4">No Image Available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {asset.description && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Description
                </h3>
                <p className="text-gray-700 leading-relaxed">{asset.description}</p>
              </div>
            )}

            {/* Specifications */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-purple-600" />
                Specifications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {asset.manufacturer && (
                  <DetailItem label="Manufacturer" value={asset.manufacturer} />
                )}
                {asset.model_number && (
                  <DetailItem label="Model Number" value={asset.model_number} />
                )}
                {asset.serial_number && (
                  <DetailItem label="Serial Number" value={asset.serial_number} />
                )}
                {asset.supplier && (
                  <DetailItem label="Supplier" value={asset.supplier} />
                )}
                {asset.condition && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Condition</p>
                    <span className={`inline-block px-3 py-1 rounded-lg font-semibold text-sm ${getConditionColor(asset.condition)}`}>
                      {asset.condition}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-4">
                {asset.campus_name && (
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Campus</p>
                      <p className="font-semibold text-gray-900">{asset.campus_name}</p>
                    </div>
                  </div>
                )}
                {asset.room_info && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-semibold text-gray-900">{asset.room_info}</p>
                    </div>
                  </div>
                )}
                {asset.purchase_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Purchase Date</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(asset.purchase_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {asset.current_value && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Current Value</p>
                      <p className="font-semibold text-gray-900 text-lg">
                        ETB {parseFloat(asset.current_value).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to={`/dashboard/maintenance/requests/new?asset=${asset.id}`}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  <Wrench className="h-5 w-5" />
                  Request Maintenance
                </Link>
                <button
                  onClick={() => setActiveTab('history')}
                  className="flex items-center gap-3 w-full px-4 py-3 border-2 border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all font-medium"
                >
                  <History className="h-5 w-5" />
                  View History
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="flex items-center gap-3 w-full px-4 py-3 border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all font-medium"
                >
                  <Download className="h-5 w-5" />
                  Download QR Code
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-3 w-full px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
                >
                  <Share2 className="h-5 w-5" />
                  Share Asset
                </button>
              </div>
            </div>

            {/* Status Info */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-purple-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Status Information</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(asset.status)}`}>
                    {asset.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Asset Type</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {asset.asset_type === 'EQP' ? 'Equipment' :
                     asset.asset_type === 'FUR' ? 'Furniture' :
                     asset.asset_type === 'VEH' ? 'Vehicle' :
                     asset.asset_type === 'BLD' ? 'Building' : 'Other'}
                  </span>
                </div>
                {asset.condition && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Condition</span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getConditionColor(asset.condition)}`}>
                      {asset.condition}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <AssetHistory assetId={id} />
        </div>
      )}
    </div>
  )
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  )
}
