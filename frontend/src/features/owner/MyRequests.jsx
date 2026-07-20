import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Wrench,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  MessageSquare,
  Calendar,
  Download,
  Grid3x3,
  List,
  SortAsc,
  SortDesc,
  RefreshCw,
  Eye,
  Ban,
  Star
} from 'lucide-react'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

export default function MyRequests() {
  const { token } = useSelector((state) => state.auth)
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [viewMode, setViewMode] = useState('card')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    fetchRequests()
  }, [statusFilter, priorityFilter])

  const fetchRequests = async () => {
    try {
      const params = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (priorityFilter !== 'all') params.priority = priorityFilter

      const response = await axios.get('http://localhost:8000/api/owner/my-requests/', {
        headers: { Authorization: `Bearer ${token}` },
        params
      })
      const data = response.data
      setRequests(Array.isArray(data) ? data : (data.results || []))
    } catch (error) {
      console.error('Error fetching requests:', error)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRequest = (request) => {
    setSelectedRequest(request)
    setShowCancelModal(true)
  }

  const filteredRequests = Array.isArray(requests) ? requests.filter(request =>
    request.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  // Sort requests
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.created_at) - new Date(b.created_at)
        break
      case 'priority':
        const priorityOrder = { EMERGENCY: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0)
        break
      case 'status':
        comparison = (a.status || '').localeCompare(b.status || '')
        break
      case 'asset':
        comparison = (a.asset_name || '').localeCompare(b.asset_name || '')
        break
      default:
        comparison = 0
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const stats = {
    total: Array.isArray(requests) ? requests.length : 0,
    pending: Array.isArray(requests) ? requests.filter(r => ['SUBMITTED', 'ASSIGNED'].includes(r.status)).length : 0,
    inProgress: Array.isArray(requests) ? requests.filter(r => r.status === 'IN_PROGRESS').length : 0,
    completed: Array.isArray(requests) ? requests.filter(r => r.status === 'COMPLETED').length : 0
  }

  const exportRequests = () => {
    const csvContent = [
      ['Request ID', 'Asset', 'Category', 'Priority', 'Status', 'Date', 'Assigned To'],
      ...sortedRequests.map(request => [
        request.request_id,
        request.asset_name,
        request.category,
        request.priority,
        request.status,
        new Date(request.created_at).toLocaleDateString(),
        request.assigned_to_name || 'Unassigned'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-requests-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16 mb-4"></div>
        <p className="text-gray-600">Loading your requests...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-orange-600 via-orange-700 to-red-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
                <Wrench className="h-8 w-8 sm:h-10 sm:w-10" />
                My Maintenance Requests
              </h1>
              <p className="text-orange-100 text-lg">
                Track and manage your service requests
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <p className="text-sm text-orange-100">Total</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Link
                to="/dashboard/owner/my-requests/new"
                className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus className="h-5 w-5" />
                New Request
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={Wrench}
          color="blue"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle}
          color="green"
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
              placeholder="Search by asset, ID, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none transition-all"
            >
              <option value="all">All Status</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_PARTS">Waiting for Parts</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none transition-all"
            >
              <option value="all">All Priorities</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="status">Sort by Status</option>
              <option value="asset">Sort by Asset</option>
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
            {/* Refresh Button */}
            <button
              onClick={fetchRequests}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <RefreshCw className="h-5 w-5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600 hover:text-gray-900'}`}
                title="Card View"
              >
                <Grid3x3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600 hover:text-gray-900'}`}
                title="List View"
              >
                <List className="h-5 w-5" />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={exportRequests}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
            >
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Requests Grid/List */}
      {sortedRequests.length > 0 ? (
        viewMode === 'card' ? (
          <div className="space-y-4 animate-slide-up">
            {sortedRequests.map((request, index) => (
              <RequestCard
                key={request.id}
                request={request}
                onCancel={handleCancelRequest}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-slide-up">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-50 to-red-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Request</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Asset</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedRequests.map((request, index) => (
                    <RequestRow key={request.id} request={request} onCancel={handleCancelRequest} index={index} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100 animate-scale-in">
          <Wrench className="h-20 w-20 mx-auto text-gray-300 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Requests Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your filters to see more results'
              : 'You haven\'t submitted any maintenance requests yet'}
          </p>
          {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') ? (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setPriorityFilter('all')
              }}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Clear Filters
            </button>
          ) : (
            <Link
              to="/dashboard/maintenance/requests/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-md hover:shadow-lg font-medium"
            >
              <Plus className="h-5 w-5" />
              Submit Your First Request
            </Link>
          )}
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Cancel Modal */}
      {showCancelModal && (
        <CancelModal
          request={selectedRequest}
          onClose={() => {
            setShowCancelModal(false)
            setSelectedRequest(null)
          }}
          onSuccess={fetchRequests}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}
    </div>
  )
}

function RequestCard({ request, onCancel, index }) {
  const getStatusColor = (status) => {
    const colors = {
      SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
      ASSIGNED: 'bg-purple-100 text-purple-800 border-purple-200',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      WAITING_PARTS: 'bg-orange-100 text-orange-800 border-orange-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      EMERGENCY: 'bg-red-100 text-red-800 border-red-300 ring-2 ring-red-500',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-green-100 text-green-800 border-green-200'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusIcon = (status) => {
    const icons = {
      SUBMITTED: <Clock className="h-4 w-4" />,
      ASSIGNED: <Clock className="h-4 w-4" />,
      IN_PROGRESS: <Wrench className="h-4 w-4" />,
      WAITING_PARTS: <AlertTriangle className="h-4 w-4" />,
      COMPLETED: <CheckCircle className="h-4 w-4" />,
      CANCELLED: <XCircle className="h-4 w-4" />
    }
    return icons[status] || <Wrench className="h-4 w-4" />
  }

  const canCancel = !['COMPLETED', 'CANCELLED'].includes(request.status)

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 group animate-scale-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                {request.request_id}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(request.status)} flex items-center gap-1.5`}>
                {getStatusIcon(request.status)}
                {request.status.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getPriorityColor(request.priority)}`}>
                {request.priority}
              </span>
              {request.escalated && (
                <span className="px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-xs font-semibold border border-red-300 animate-pulse">
                  ESCALATED
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
              {request.asset_name}
            </h3>
            <p className="text-sm font-mono text-gray-600 mb-3">{request.asset_id}</p>
            <p className="text-gray-700 mb-4 line-clamp-2">{request.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-orange-500" />
                <span>Submitted: {new Date(request.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Wrench className="h-4 w-4 text-orange-500" />
                <span>Category: {request.category}</span>
              </div>
              {request.assigned_to_name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="h-4 w-4 text-orange-500" />
                  <span>Assigned to: {request.assigned_to_name}</span>
                </div>
              )}
            </div>
          </div>

          {request.photo && (
            <img
              src={`http://localhost:8000${request.photo}`}
              alt="Issue"
              className="w-32 h-32 object-cover rounded-xl ml-4 border-2 border-gray-200 group-hover:border-orange-300 transition-colors"
            />
          )}
        </div>

        {/* Rating Badge (for completed requests) */}
        {request.status === 'COMPLETED' && (
          <div className="flex items-center justify-between pt-3 pb-1">
            {request.service_rating ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-4 w-4 ${s <= request.service_rating.overall_rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {request.service_rating.overall_rating}/5
                </span>
                <span className="text-xs text-gray-500">Your rating</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                <Star className="h-3.5 w-3.5" />
                <span>Rate this service</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Link
            to={`/dashboard/owner/my-requests/${request.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-md hover:shadow-lg font-medium text-sm"
          >
            <Eye className="h-4 w-4" />
            View Details
          </Link>
          {canCancel && (
            <button
              onClick={() => onCancel(request)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-700 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all font-medium text-sm"
            >
              <Ban className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function RequestRow({ request, onCancel, index }) {
  const getStatusColor = (status) => {
    const colors = {
      SUBMITTED: 'bg-blue-100 text-blue-800',
      ASSIGNED: 'bg-purple-100 text-purple-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      WAITING_PARTS: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      EMERGENCY: 'bg-red-100 text-red-800',
      HIGH: 'bg-orange-100 text-orange-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LOW: 'bg-green-100 text-green-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const canCancel = !['COMPLETED', 'CANCELLED'].includes(request.status)

  return (
    <tr 
      className="hover:bg-orange-50 transition-colors animate-slide-up"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <td className="px-6 py-4">
        <div>
          <p className="font-semibold text-gray-900">{request.request_id}</p>
          <p className="text-sm text-gray-600">{request.category}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-gray-900">{request.asset_name}</p>
          <p className="text-sm text-gray-600 font-mono">{request.asset_id}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(request.priority)}`}>
          {request.priority}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
          {request.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-6 py-4">
        {request.service_rating ? (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-3.5 w-3.5 ${s <= request.service_rating.overall_rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">{request.service_rating.overall_rating}/5</span>
          </div>
        ) : request.status === 'COMPLETED' ? (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
            Not rated
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        <p className="text-sm text-gray-900">
          {new Date(request.created_at).toLocaleDateString()}
        </p>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Link
            to={`/dashboard/owner/my-requests/${request.id}`}
            className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="h-5 w-5" />
          </Link>
          {canCancel && (
            <button
              onClick={() => onCancel(request)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title="Cancel Request"
            >
              <Ban className="h-5 w-5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function CancelModal({ request, onClose, onSuccess, showSuccess, showError }) {
  const { token } = useSelector((state) => state.auth)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await axios.post(
        `http://localhost:8000/api/owner/my-requests/${request.id}/cancel/`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showSuccess('Request cancelled successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error cancelling request:', error)
      showError('Failed to cancel request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancel Request</h2>
        
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-gray-900">{request.request_id}</p>
          <p className="text-xs text-gray-600 mt-1">{request.asset_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Cancellation
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Please explain why you're cancelling this request..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Keep Request
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Cancelling...' : 'Cancel Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-yellow-500 to-yellow-600',
    orange: 'from-orange-500 to-orange-600',
    green: 'from-green-500 to-green-600'
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 card-hover animate-scale-in">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}
