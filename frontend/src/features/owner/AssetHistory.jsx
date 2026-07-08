import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Clock,
  Package,
  Wrench,
  Calendar,
  User,
  MapPin,
  ArrowRight,
  Download,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'

export default function AssetHistory() {
  const { id } = useParams()
  const { token } = useSelector((state) => state.auth)
  const [asset, setAsset] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, checkout, return, maintenance_request, maintenance_complete, condition_change, transfer, assignment

  useEffect(() => {
    fetchAssetHistory()
  }, [id])

  const fetchAssetHistory = async () => {
    try {
      setLoading(true)
      
      // Fetch asset details
      const assetResponse = await axios.get(`http://localhost:8000/api/assets/assets/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAsset(assetResponse.data)

      // Fetch asset events from new history API
      const historyResponse = await axios.get(
        `http://localhost:8000/api/owner/my-assets/${id}/history/`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Map events to timeline format
      const events = historyResponse.data.results.map(event => ({
        type: event.event_type.toLowerCase(),
        date: event.event_date,
        data: event
      }))

      setTimeline(events)
    } catch (error) {
      console.error('Error fetching asset history:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTimeline = timeline.filter(event => {
    if (filter === 'all') return true
    if (filter === 'checkouts') return ['checkout', 'return'].includes(event.type)
    if (filter === 'maintenance') return ['maintenance_request', 'maintenance_complete'].includes(event.type)
    if (filter === 'changes') return ['condition_change', 'transfer', 'assignment'].includes(event.type)
    return true
  })

  const exportHistory = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/owner/my-assets/${id}/history/export/?format=csv`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `asset-history-${asset?.asset_id}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting history:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16 mb-4"></div>
        <p className="text-gray-600">Loading asset history...</p>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-900 mb-2">Asset Not Found</h3>
          <p className="text-red-700">The requested asset could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <Link
            to="/dashboard/owner/my-assets"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Assets
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Clock className="h-10 w-10" />
                Asset History & Timeline
              </h1>
              <p className="text-purple-100 text-lg mb-4">
                Complete history of {asset.name}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
                  {asset.asset_id}
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
                  {asset.asset_type}
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
                  {asset.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <p className="text-sm text-purple-100">Total Events</p>
                <p className="text-3xl font-bold">{timeline.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Checkouts"
          value={timeline.filter(e => ['checkout', 'return'].includes(e.type)).length}
          icon={Calendar}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Maintenance Requests"
          value={timeline.filter(e => ['maintenance_request', 'maintenance_complete'].includes(e.type)).length}
          icon={Wrench}
          color="from-orange-500 to-orange-600"
        />
        <StatCard
          title="Status Changes"
          value={timeline.filter(e => e.type === 'condition_change').length}
          icon={TrendingUp}
          color="from-yellow-500 to-yellow-600"
        />
        <StatCard
          title="Transfers"
          value={timeline.filter(e => e.type === 'transfer').length}
          icon={MapPin}
          color="from-purple-500 to-purple-600"
        />
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8 animate-slide-up">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                filter === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Events ({timeline.length})
            </button>
            <button
              onClick={() => setFilter('checkouts')}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                filter === 'checkouts' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Checkouts ({timeline.filter(e => ['checkout', 'return'].includes(e.type)).length})
            </button>
            <button
              onClick={() => setFilter('maintenance')}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                filter === 'maintenance' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Maintenance ({timeline.filter(e => ['maintenance_request', 'maintenance_complete'].includes(e.type)).length})
            </button>
            <button
              onClick={() => setFilter('changes')}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                filter === 'changes' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Changes ({timeline.filter(e => ['condition_change', 'transfer', 'assignment'].includes(e.type)).length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAssetHistory}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={exportHistory}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Export History
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {filteredTimeline.length > 0 ? (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200"></div>

          <div className="space-y-6">
            {filteredTimeline.map((event, index) => (
              <TimelineEvent key={index} event={event} index={index} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100 animate-scale-in">
          <Clock className="h-20 w-20 mx-auto text-gray-300 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No History Found</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'No events recorded for this asset yet'
              : `No ${filter} events found`}
          </p>
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

function TimelineEvent({ event, index }) {
  const data = event.data

  const renderEventData = (eventData, eventType) => {
    if (!eventData || Object.keys(eventData).length === 0) return null

    const formatValue = (key, value) => {
      // Format dates
      if (key.includes('date') || key.includes('time')) {
        try {
          return new Date(value).toLocaleString()
        } catch {
          return value
        }
      }
      
      // Format booleans
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
      }
      
      // Format null/undefined
      if (value === null || value === undefined) {
        return 'N/A'
      }
      
      // Format objects/arrays
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      }
      
      return value
    }

    const formatKey = (key) => {
      return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(eventData).map(([key, value]) => (
          <div key={key} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 mb-1">{formatKey(key)}</p>
            <p className="text-sm text-gray-900 font-medium break-words">
              {formatValue(key, value)}
            </p>
          </div>
        ))}
      </div>
    )
  }

  const getEventIcon = () => {
    const icons = {
      checkout: <Calendar className="h-6 w-6" />,
      return: <CheckCircle className="h-6 w-6" />,
      maintenance_request: <Wrench className="h-6 w-6" />,
      maintenance_complete: <CheckCircle className="h-6 w-6" />,
      condition_change: <TrendingUp className="h-6 w-6" />,
      transfer: <MapPin className="h-6 w-6" />,
      assignment: <User className="h-6 w-6" />
    }
    return icons[event.type] || <Clock className="h-6 w-6" />
  }

  const getEventColor = () => {
    const colors = {
      checkout: 'from-blue-500 to-blue-600',
      return: 'from-green-500 to-green-600',
      maintenance_request: 'from-orange-500 to-orange-600',
      maintenance_complete: 'from-green-500 to-green-600',
      condition_change: 'from-yellow-500 to-yellow-600',
      transfer: 'from-purple-500 to-purple-600',
      assignment: 'from-indigo-500 to-indigo-600'
    }
    return colors[event.type] || 'from-gray-500 to-gray-600'
  }

  const getEventTitle = () => {
    const titles = {
      checkout: 'Asset Checkout',
      return: 'Asset Return',
      maintenance_request: 'Maintenance Request',
      maintenance_complete: 'Maintenance Completed',
      condition_change: 'Condition Change',
      transfer: 'Asset Transfer',
      assignment: 'Asset Assignment'
    }
    return titles[event.type] || data.event_type_display
  }

  return (
    <div
      className="relative pl-20 animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Timeline Dot */}
      <div className={`absolute left-4 w-8 h-8 rounded-full bg-gradient-to-br ${getEventColor()} shadow-lg flex items-center justify-center text-white z-10`}>
        {getEventIcon()}
      </div>

      {/* Event Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {getEventTitle()}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getEventColor()} text-white`}>
                {data.event_type_display}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {data.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">
              {new Date(event.date).toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(event.date).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4 text-indigo-500" />
            <span>By: {data.actor_name}</span>
          </div>
          
          {/* Show related object details if available */}
          {data.related_object_details?.checkout && (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4 text-indigo-500" />
                <span>Checked out to: {data.related_object_details.checkout.checked_out_to}</span>
              </div>
              {data.related_object_details.checkout.expected_return_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span>Expected return: {new Date(data.related_object_details.checkout.expected_return_date).toLocaleDateString()}</span>
                </div>
              )}
            </>
          )}
          
          {data.related_object_details?.maintenance && (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Wrench className="h-4 w-4 text-indigo-500" />
                <span>Category: {data.related_object_details.maintenance.category}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertTriangle className="h-4 w-4 text-indigo-500" />
                <span>Priority: {data.related_object_details.maintenance.priority}</span>
              </div>
              {data.related_object_details.maintenance.assigned_to && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4 text-indigo-500" />
                  <span>Assigned to: {data.related_object_details.maintenance.assigned_to}</span>
                </div>
              )}
            </>
          )}
          
          {data.related_object_details?.transfer && (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-indigo-500" />
                <span>From: {data.related_object_details.transfer.from_room || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-indigo-500" />
                <span>To: {data.related_object_details.transfer.to_room || 'Unknown'}</span>
              </div>
            </>
          )}
        </div>

        {/* Additional Event Data */}
        {Object.keys(data.event_data).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <details className="text-sm">
              <summary className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                View Additional Details
              </summary>
              <div className="mt-3 space-y-2">
                {renderEventData(data.event_data, event.type)}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}
