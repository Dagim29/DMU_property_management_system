import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Package,
  Search,
  Filter,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Wrench,
  ArrowRight,
  X
} from 'lucide-react'

export default function BrowseAssets() {
  const { token } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchAssets()
  }, [statusFilter, typeFilter])

  const fetchAssets = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.asset_type = typeFilter

      const response = await axios.get('http://localhost:8000/api/assets/assets/', {
        headers: { Authorization: `Bearer ${token}` },
        params
      })
      
      const data = response.data.results || response.data
      setAssets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAssets = assets.filter((asset) =>
    (asset.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     asset.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleRequestAsset = (assetId) => {
    navigate(`/dashboard/owner/request-asset/${assetId}`)
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16 mb-4"></div>
        <p className="text-gray-600">Loading assets...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
          <h1 className="text-3xl font-bold mb-2">Browse Available Assets</h1>
          <p className="text-purple-100">Find and request assets for your work or projects</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by asset ID, name, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Filter className="h-5 w-5" />
            Filters
            {(statusFilter || typeFilter) && (
              <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                {[statusFilter, typeFilter].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Types</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="FURNITURE">Furniture</option>
                <option value="VEHICLE">Vehicle</option>
                <option value="ELECTRONICS">Electronics</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('')
                  setTypeFilter('')
                }}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-gray-600">
        Showing <span className="font-semibold text-gray-900">{filteredAssets.length}</span> assets
      </div>

      {/* Asset Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No assets found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onRequestAsset={handleRequestAsset}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AssetCard({ asset, onRequestAsset }) {
  const getStatusColor = (status) => {
    const colors = {
      AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
      IN_USE: 'bg-blue-100 text-blue-800 border-blue-200',
      UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      CONDEMNED: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="h-4 w-4" />
      case 'IN_USE':
        return <Clock className="h-4 w-4" />
      case 'UNDER_MAINTENANCE':
        return <Wrench className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const canRequest = asset.status === 'AVAILABLE' || asset.status === 'IN_USE' || asset.status === 'UNDER_MAINTENANCE'

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      {/* Asset Image or Placeholder */}
      <div className="h-48 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
        {asset.photo ? (
          <img
            src={asset.photo}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="h-20 w-20 text-purple-300" />
        )}
      </div>

      {/* Asset Details */}
      <div className="p-5">
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatusColor(asset.status)}`}>
            {getStatusIcon(asset.status)}
            {asset.status?.replace('_', ' ')}
          </span>
          <span className="text-xs text-gray-500 font-mono">{asset.asset_id}</span>
        </div>

        {/* Asset Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          {asset.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {asset.description || 'No description available'}
        </p>

        {/* Location */}
        {asset.campus && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <MapPin className="h-4 w-4" />
            <span>{asset.campus.name}</span>
          </div>
        )}

        {/* Action Button */}
        {canRequest ? (
          <button
            onClick={() => onRequestAsset(asset.id)}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
          >
            Request Asset
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            disabled
            className="w-full py-3 bg-gray-200 text-gray-500 font-semibold rounded-lg cursor-not-allowed"
          >
            Not Available
          </button>
        )}
      </div>
    </div>
  )
}
