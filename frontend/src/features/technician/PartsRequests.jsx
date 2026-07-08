import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaArrowLeft,
  FaClipboardList,
  FaSearch,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaBox,
  FaExclamationCircle
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

const PartsRequests = () => {
  const navigate = useNavigate()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)

  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const response = await api.get(`/maintenance/parts-requests/?${params}`)
      setRequests(response.data.results || response.data)
    } catch (err) {
      console.error('Error fetching requests:', err)
      showError('Failed to load parts requests')
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(req =>
    req.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.reason.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusCounts = {
    all: requests.length,
    PENDING: requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    FULFILLED: requests.filter(r => r.status === 'FULFILLED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
  }

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { icon: FaClock, color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      APPROVED: { icon: FaCheckCircle, color: 'bg-blue-100 text-blue-800', text: 'Approved' },
      FULFILLED: { icon: FaCheckCircle, color: 'bg-green-100 text-green-800', text: 'Fulfilled' },
      REJECTED: { icon: FaTimesCircle, color: 'bg-red-100 text-red-800', text: 'Rejected' },
      CANCELLED: { icon: FaTimesCircle, color: 'bg-gray-100 text-gray-800', text: 'Cancelled' },
    }

    const badge = badges[status] || badges.PENDING
    const Icon = badge.icon

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badge.color}`}>
        <Icon /> {badge.text}
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      URGENT: 'bg-red-100 text-red-800 border-red-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      NORMAL: 'bg-blue-100 text-blue-800 border-blue-200',
      LOW: 'bg-gray-100 text-gray-800 border-gray-200',
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[priority]}`}>
        {priority}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <button
          onClick={() => navigate('/dashboard/technician')}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <FaArrowLeft />
          Back to Dashboard
        </button>
        
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <FaClipboardList className="text-6xl opacity-80" />
            <div>
              <h1 className="text-4xl font-bold mb-2">My Parts Requests</h1>
              <p className="text-purple-100 text-lg">Track your parts and supplies requests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="All"
          count={statusCounts.all}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          color="bg-gray-100 text-gray-800"
        />
        <StatCard
          label="Pending"
          count={statusCounts.PENDING}
          active={statusFilter === 'PENDING'}
          onClick={() => setStatusFilter('PENDING')}
          color="bg-yellow-100 text-yellow-800"
        />
        <StatCard
          label="Approved"
          count={statusCounts.APPROVED}
          active={statusFilter === 'APPROVED'}
          onClick={() => setStatusFilter('APPROVED')}
          color="bg-blue-100 text-blue-800"
        />
        <StatCard
          label="Fulfilled"
          count={statusCounts.FULFILLED}
          active={statusFilter === 'FULFILLED'}
          onClick={() => setStatusFilter('FULFILLED')}
          color="bg-green-100 text-green-800"
        />
        <StatCard
          label="Rejected"
          count={statusCounts.REJECTED}
          active={statusFilter === 'REJECTED'}
          onClick={() => setStatusFilter('REJECTED')}
          color="bg-red-100 text-red-800"
        />
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests..."
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <FaClipboardList className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No parts requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              onClick={() => setSelectedRequest(request)}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-gray-100 hover:border-blue-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {request.request_number}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Submitted {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {getPriorityBadge(request.priority)}
                  {getStatusBadge(request.status)}
                </div>
              </div>

              <p className="text-gray-700 mb-4">{request.reason}</p>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <FaBox />
                  <span>{request.items?.length || 0} items</span>
                </div>
                {request.reviewed_by_name && (
                  <div className="flex items-center gap-1">
                    <FaCheckCircle />
                    <span>Reviewed by {request.reviewed_by_name}</span>
                  </div>
                )}
              </div>

              {request.review_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    <strong>Review Notes:</strong> {request.review_notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  )
}

const StatCard = ({ label, count, active, onClick, color }) => {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl shadow-lg p-4 text-left transition-all ${
        active ? 'ring-4 ring-blue-500 ring-opacity-50' : 'hover:shadow-xl'
      }`}
    >
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${active ? 'text-blue-600' : 'text-gray-900'}`}>
        {count}
      </p>
    </button>
  )
}

const RequestDetailModal = ({ request, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{request.request_number}</h2>
            <p className="text-gray-600">
              Submitted on {new Date(request.created_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Status & Priority */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="flex items-center gap-2">
                {request.status === 'PENDING' && <FaClock className="text-yellow-600" />}
                {request.status === 'APPROVED' && <FaCheckCircle className="text-blue-600" />}
                {request.status === 'FULFILLED' && <FaCheckCircle className="text-green-600" />}
                {request.status === 'REJECTED' && <FaTimesCircle className="text-red-600" />}
                <span className="font-medium">{request.status_display}</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <span className="font-medium">{request.priority_display}</span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
            <p className="text-gray-900">{request.reason}</p>
          </div>

          {/* Notes */}
          {request.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
              <p className="text-gray-900">{request.notes}</p>
            </div>
          )}

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Requested Items</label>
            <div className="space-y-2">
              {request.items?.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{item.item_name}</p>
                      <p className="text-sm text-gray-600">Code: {item.item_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        {item.quantity_requested} {item.unit}
                      </p>
                      {item.quantity_approved > 0 && (
                        <p className="text-sm text-green-600">
                          Approved: {item.quantity_approved}
                        </p>
                      )}
                      {item.quantity_fulfilled > 0 && (
                        <p className="text-sm text-green-600">
                          Fulfilled: {item.quantity_fulfilled}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Review Info */}
          {request.reviewed_by_name && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Review Information</h4>
              <p className="text-sm text-blue-800 mb-1">
                Reviewed by: {request.reviewed_by_name}
              </p>
              <p className="text-sm text-blue-800 mb-2">
                Date: {new Date(request.reviewed_at).toLocaleString()}
              </p>
              {request.review_notes && (
                <p className="text-sm text-blue-900">
                  <strong>Notes:</strong> {request.review_notes}
                </p>
              )}
            </div>
          )}

          {/* Fulfillment Info */}
          {request.fulfilled_by_name && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">Fulfillment Information</h4>
              <p className="text-sm text-green-800 mb-1">
                Fulfilled by: {request.fulfilled_by_name}
              </p>
              <p className="text-sm text-green-800">
                Date: {new Date(request.fulfilled_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PartsRequests
