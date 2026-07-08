import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  FaExchangeAlt,
  FaUser,
  FaArrowRight,
  FaArrowLeft,
  FaCheckCircle
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

const RequestReassignment = () => {
  const navigate = useNavigate()
  const { requestId } = useParams()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState(null)
  const [technicians, setTechnicians] = useState([])
  const [reassignments, setReassignments] = useState([])
  const [formData, setFormData] = useState({
    to_technician: '',
    reason: 'WORKLOAD',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [requestId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch request details
      const reqRes = await api.get(`/maintenance/requests/${requestId}/`)
      setRequest(reqRes.data)
      
      // Fetch available technicians
      const techRes = await api.get('/users/users/?role=MAINTENANCE_TECHNICIAN&is_active=true')
      setTechnicians(techRes.data.results || techRes.data)
      
      // Fetch reassignment history
      const reassignRes = await api.get(`/maintenance/reassignments/?request=${requestId}`)
      setReassignments(reassignRes.data.results || reassignRes.data)
    } catch (err) {
      console.error('Error fetching data:', err)
      showError('Failed to load request data')
    } finally {
      setLoading(false)
    }
  }

  const handleReassign = async (e) => {
    e.preventDefault()
    
    if (!formData.to_technician) {
      showError('Please select a technician')
      return
    }
    
    if (formData.to_technician === String(request.assigned_to?.id)) {
      showError('Request is already assigned to this technician')
      return
    }
    
    try {
      await api.post('/maintenance/reassignments/', {
        request: requestId,
        to_technician: formData.to_technician,
        reason: formData.reason,
        notes: formData.notes
      })
      
      showSuccess('Request reassigned successfully!')
      fetchData()
      setFormData({
        to_technician: '',
        reason: 'WORKLOAD',
        notes: ''
      })
    } catch (err) {
      console.error('Error reassigning request:', err)
      showError('Failed to reassign request')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Request not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <button
          onClick={() => navigate(`/dashboard/maintenance/requests/${requestId}`)}
          className="mb-4 flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
        >
          <FaArrowLeft />
          Back to Request
        </button>
        
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <FaExchangeAlt className="text-6xl opacity-80" />
            <div>
              <h1 className="text-4xl font-bold mb-2">Reassign Request</h1>
              <p className="text-purple-100 text-lg">{request.request_id}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reassignment Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Reassign to New Technician</h2>
          
          {/* Current Assignment */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-2">Currently Assigned To:</p>
            <div className="flex items-center gap-3">
              <FaUser className="text-blue-600 text-2xl" />
              <div>
                <p className="font-bold text-gray-800">
                  {request.assigned_to ? `${request.assigned_to.first_name} ${request.assigned_to.last_name}` : 'Unassigned'}
                </p>
                {request.assigned_to?.specialization && (
                  <p className="text-sm text-gray-600">{request.assigned_to.specialization}</p>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleReassign} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Technician <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.to_technician}
                onChange={(e) => setFormData({ ...formData, to_technician: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value="">Select Technician</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.first_name} {tech.last_name} {tech.specialization ? `(${tech.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value="WORKLOAD">Workload Balancing</option>
                <option value="SPECIALIZATION">Specialization Mismatch</option>
                <option value="UNAVAILABLE">Technician Unavailable</option>
                <option value="PERFORMANCE">Performance Issues</option>
                <option value="EMERGENCY">Emergency Reassignment</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Additional notes about the reassignment..."
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-bold flex items-center justify-center gap-2"
            >
              <FaCheckCircle />
              Reassign Request
            </button>
          </form>
        </div>

        {/* Reassignment History */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Reassignment History</h2>
          
          {reassignments.length === 0 ? (
            <div className="text-center py-12">
              <FaExchangeAlt className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No reassignments yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reassignments.map((reassign, index) => (
                <div key={reassign.id} className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">
                      {new Date(reassign.reassigned_at).toLocaleString()}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                      {reassign.reason.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 bg-red-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">From:</p>
                      <p className="font-bold text-gray-800">{reassign.from_technician_name || 'Unassigned'}</p>
                    </div>
                    <FaArrowRight className="text-purple-600 text-xl" />
                    <div className="flex-1 bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">To:</p>
                      <p className="font-bold text-gray-800">{reassign.to_technician_name}</p>
                    </div>
                  </div>
                  
                  {reassign.notes && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">{reassign.notes}</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    By: {reassign.reassigned_by_name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RequestReassignment
