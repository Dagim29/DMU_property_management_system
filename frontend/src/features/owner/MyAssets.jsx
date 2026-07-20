import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Package,
  Search,
  Filter,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Wrench,
  Grid3x3,
  List,
  Download,
  SortAsc,
  SortDesc,
  Info,
  TrendingUp,
  FileText,
  Shield
} from 'lucide-react'

export default function MyAssets() {
  const { token } = useSelector((state) => state.auth)
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name') // 'name', 'date', 'value'
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' or 'desc'

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/owner/my-assets/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Ensure we always set an array
      const data = response.data
      setAssets(Array.isArray(data) ? data : (data.results || []))
    } catch (error) {
      console.error('Error fetching assets:', error)
      setAssets([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const filteredAssets = Array.isArray(assets) ? assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.asset_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter
    const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  }) : []

  // Sort assets
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'date':
        comparison = new Date(a.purchase_date || 0) - new Date(b.purchase_date || 0)
        break
      case 'value':
        comparison = (parseFloat(a.current_value) || 0) - (parseFloat(b.current_value) || 0)
        break
      default:
        comparison = 0
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const exportAssets = () => {
    const csvContent = [
      ['Asset ID', 'Name', 'Type', 'Status', 'Location', 'Purchase Date', 'Value'],
      ...sortedAssets.map(asset => [
        asset.asset_id,
        asset.name,
        asset.asset_type,
        asset.status,
        asset.room_name || 'N/A',
        asset.purchase_date || 'N/A',
        asset.current_value || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-assets-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Calculate statistics
  const stats = {
    total: sortedAssets.length,
    totalValue: sortedAssets.reduce((sum, asset) => sum + (parseFloat(asset.current_value) || 0), 0),
    underMaintenance: sortedAssets.filter(a => a.status === 'UNDER_MAINTENANCE').length,
    available: sortedAssets.filter(a => a.status === 'AVAILABLE').length
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16 mb-4"></div>
        <p className="text-gray-600">Loading your assets...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
                <Package className="h-8 w-8 sm:h-10 sm:w-10" />
                My Assets
              </h1>
              <p className="text-purple-100 text-lg">
                Manage and track your assigned assets
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <p className="text-sm text-purple-100">Total Assets</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Assets"
          value={stats.total}
          icon={Package}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Total Value"
          value={`ETB ${stats.totalValue.toLocaleString()}`}
          icon={DollarSign}
          color="from-green-500 to-green-600"
        />
        <StatCard
          title="Under Maintenance"
          value={stats.underMaintenance}
          icon={Wrench}
          color="from-yellow-500 to-yellow-600"
        />
        <StatCard
          title="Available"
          value={stats.available}
          icon={CheckCircle}
          color="from-purple-500 to-purple-600"
        />
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8 animate-slide-up">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none transition-all"
            >
              <option value="all">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In Use</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="CONDEMNED">Condemned</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none transition-all"
            >
              <option value="all">All Types</option>
              <option value="EQP">Equipment</option>
              <option value="FUR">Furniture</option>
              <option value="VEH">Vehicle</option>
              <option value="BLD">Building Component</option>
              <option value="OTH">Other</option>
            </select>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Date</option>
              <option value="value">Sort by Value</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-5 w-5" /> : <SortDesc className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:text-gray-900'}`}
                title="Grid View"
              >
                <Grid3x3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:text-gray-900'}`}
                title="List View"
              >
                <List className="h-5 w-5" />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={exportAssets}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Assets Grid/List */}
      {sortedAssets.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
            {sortedAssets.map((asset, index) => (
              <AssetCard key={asset.id} asset={asset} index={index} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-slide-up">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Asset</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedAssets.map((asset, index) => (
                    <AssetRow key={asset.id} asset={asset} index={index} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100 animate-scale-in">
          <Package className="h-20 w-20 mx-auto text-gray-300 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Assets Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your filters to see more results'
              : 'No assets have been assigned to you yet'}
          </p>
          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
              }}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 card-hover animate-scale-in">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}

function AssetCard({ asset, index }) {
  const getStatusColor = (status) => {
    const colors = {
      AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
      IN_USE: 'bg-blue-100 text-blue-800 border-blue-200',
      UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      CONDEMNED: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getTypeLabel = (type) => {
    const labels = {
      EQP: 'Equipment',
      FUR: 'Furniture',
      VEH: 'Vehicle',
      BLD: 'Building',
      OTH: 'Other'
    }
    return labels[type] || type
  }

  const getStatusIcon = (status) => {
    const icons = {
      AVAILABLE: <CheckCircle className="h-4 w-4" />,
      IN_USE: <Clock className="h-4 w-4" />,
      UNDER_MAINTENANCE: <Wrench className="h-4 w-4" />,
      CONDEMNED: <AlertCircle className="h-4 w-4" />
    }
    return icons[status] || <Package className="h-4 w-4" />
  }

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 group animate-scale-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Asset Image */}
      <div className="h-56 bg-gradient-to-br from-purple-100 to-indigo-100 relative overflow-hidden group/image">
        {asset.photo ? (
          <>
            <img
              src={asset.photo.startsWith('http') ? asset.photo : `http://localhost:8000${asset.photo}`}
              alt={asset.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                e.target.onerror = null
                e.target.style.display = 'none'
                e.target.parentElement.innerHTML = `
                  <div class="flex flex-col items-center justify-center h-full">
                    <svg class="h-20 w-20 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p class="text-purple-400 text-sm mt-2">No Image</p>
                  </div>
                `
              }}
            />
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
              <span className="text-white text-sm font-medium">Click to view details</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <Package className="h-20 w-20 text-purple-300" />
            <p className="text-purple-400 text-sm mt-2">No Image Available</p>
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(asset.status)} backdrop-blur-sm flex items-center gap-1.5 shadow-lg`}>
            {getStatusIcon(asset.status)}
            {asset.status.replace('_', ' ')}
          </span>
          <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-gray-700 rounded-full text-xs font-medium shadow-lg border border-gray-200">
            {getTypeLabel(asset.asset_type)}
          </span>
        </div>
      </div>

      {/* Asset Info */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors line-clamp-1">
            {asset.name}
          </h3>
          <p className="text-sm font-mono text-gray-500">
            {asset.asset_id}
          </p>
        </div>

        {/* Key Details - Simplified */}
        <div className="space-y-2 mb-4">
          {asset.campus_name && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-purple-500 flex-shrink-0" />
              <span className="truncate">{asset.campus_name}</span>
            </div>
          )}
          
          {asset.current_value && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="font-semibold text-gray-900">
                ETB {parseFloat(asset.current_value).toLocaleString()}
              </span>
            </div>
          )}
          
          {asset.condition && (
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className={`font-medium ${
                asset.condition === 'EXCELLENT' ? 'text-green-600' :
                asset.condition === 'GOOD' ? 'text-blue-600' :
                asset.condition === 'FAIR' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {asset.condition}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <Link
            to={`/dashboard/owner/asset-detail/${asset.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium text-sm group"
          >
            <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />
            Details
          </Link>
          <Link
            to={`/dashboard/maintenance/requests/new?asset=${asset.id}`}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all font-medium text-sm group"
            title="Request Maintenance"
          >
            <Wrench className="h-4 w-4 group-hover:rotate-12 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function AssetRow({ asset, index }) {
  const getStatusColor = (status) => {
    const colors = {
      AVAILABLE: 'bg-green-100 text-green-800',
      IN_USE: 'bg-blue-100 text-blue-800',
      UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-800',
      CONDEMNED: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getTypeLabel = (type) => {
    const labels = {
      EQP: 'Equipment',
      FUR: 'Furniture',
      VEH: 'Vehicle',
      BLD: 'Building',
      OTH: 'Other'
    }
    return labels[type] || type
  }

  return (
    <tr 
      className="hover:bg-purple-50 transition-colors animate-slide-up"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {asset.photo ? (
              <img
                src={asset.photo.startsWith('http') ? asset.photo : `http://localhost:8000${asset.photo}`}
                alt={asset.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.style.display = 'none'
                  e.target.parentElement.innerHTML = `
                    <svg class="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  `
                }}
              />
            ) : (
              <Package className="h-6 w-6 text-purple-500" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{asset.name}</p>
            <p className="text-sm text-gray-600 font-mono">{asset.asset_id}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          {getTypeLabel(asset.asset_type)}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(asset.status)}`}>
          {asset.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm">
          <p className="text-gray-900 font-medium">{asset.campus_name || 'N/A'}</p>
          {asset.room_name && <p className="text-gray-600 text-xs">{asset.room_name}</p>}
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="text-sm font-semibold text-gray-900">
          {asset.current_value ? `ETB ${parseFloat(asset.current_value).toLocaleString()}` : 'N/A'}
        </p>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Link
            to={`/dashboard/owner/asset-detail/${asset.id}`}
            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="h-5 w-5" />
          </Link>
          <Link
            to={`/dashboard/maintenance/requests/new?asset=${asset.id}`}
            className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
            title="Request Service"
          >
            <Wrench className="h-5 w-5" />
          </Link>
        </div>
      </td>
    </tr>
  )
}
