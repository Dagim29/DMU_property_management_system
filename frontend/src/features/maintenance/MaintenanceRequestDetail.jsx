import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { 
  FaArrowLeft, 
  FaTools,
  FaCalendar,
  FaUser,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaImage,
  FaEdit,
  FaTasks,
  FaHistory,
  FaMoneyBillWave,
  FaExchangeAlt
} from 'react-icons/fa'
import api from '../../services/api'

const priorityColors = {
  EMERGENCY: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
  LOW: 'bg-gray-100 text-gray-800 border-gray-200',
}

const statusColors = {
  SUBMITTED: 'bg-gray-100 text-gray-800 border-gray-200',
  ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
  WAITING_PARTS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

const categoryLabels = {
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing',
  HVAC: 'HVAC',
  STRUCTURAL: 'Structural',
  EQUIPMENT: 'Equipment Repair',
  OTHER: 'Other'
}

function MaintenanceRequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const [request, setRequest] = useState(null)
  const [workOrder, setWorkOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusHistory, setStatusHistory] = useState([])
  
  // Status update
  const [showStatusUpdate, setShowStatusUpdate] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchRequest()
    fetchWorkOrder()
  }, [id])

  const fetchRequest = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/maintenance/requests/${id}/`)
      setRequest(response.data)
      setNewStatus(response.data.status)
    } catch (error) {
      console.error('Error fetching request:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkOrder = async () => {
    try {
      const response = await api.get(`/maintenance/work-orders/?request=${id}`)
      const data = response.data.results || response.data
      if (Array.isArray(data) && data.length > 0) {
        setWorkOrder(data[0])
      }
    } catch (error) {
      console.error('Error fetching work order:', error)
    }
  }

  const handleStatusUpdate = async () => {
    if (!newStatus) return

    try {
      setUpdating(true)
      await api.patch(`/maintenance/requests/${id}/`, {
        status: newStatus
      })
      
      // If work order exists, update it too
      if (workOrder) {
        await api.patch(`/maintenance/work-orders/${workOrder.id}/update_status/`, {
          status: newStatus,
          notes: statusNote
        })
      }

      setShowStatusUpdate(false)
      setStatusNote('')
      fetchRequest()
      fetchWorkOrder()
    } catch (error) {
      console.error('Error updating status:', error)
      showError('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const getSLADeadline = () => {
    if (!request) return null
    const slaHours = {
      EMERGENCY: 24,
      HIGH: 72,
      MEDIUM: 168,
      LOW: 336
    }
    const hours = slaHours[request.priority] || 168
    const deadline = new Date(request.created_at)
    deadline.setHours(deadline.getHours() + hours)
    return deadline
  }

  const isOverdue = () => {
    if (!request || request.status === 'COMPLETED' || request.status === 'CANCELLED') {
      return false
    }
    const deadline = getSLADeadline()
    return deadline && new Date() > deadline
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Maintenance request not found
        </div>
      </div>
    )
  }

  const deadline = getSLADeadline()
  const overdue = isOverdue()

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/maintenance/requests')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <FaArrowLeft />
          Back to Requests
        </button>
        
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">Maintenance Request</h1>
              <p className="text-purple-100 text-lg">Request ID: {request.request_id}</p>
              {overdue && (
                <div className="flex items-center gap-2 mt-2 text-red-300">
                  <FaExclamationTriangle />
                  <span className="font-semibold">OVERDUE</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {user?.role === 'MAINTENANCE_SUPERVISOR' && 
               request.status !== 'COMPLETED' && request.status !== 'CANCELLED' && (
                <button
                  onClick={() => navigate(`/dashboard/supervisor/reassign/${request.id}`)}
                  className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all flex items-center gap-2"
                >
                  <FaExchangeAlt />
                  Reassign
                </button>
              )}
              {(user?.role === 'MAINTENANCE_TECHNICIAN' || user?.role === 'MAINTENANCE_SUPERVISOR') && 
               request.status !== 'COMPLETED' && request.status !== 'CANCELLED' && (
                <button
                  onClick={() => setShowStatusUpdate(true)}
                  className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all flex items-center gap-2"
                >
                  <FaEdit />
                  Update Status
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaTools className="text-purple-600" />
              Request Details
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Asset</p>
                <p className="font-semibold text-gray-800">{request.asset_id}</p>
                <p className="text-sm text-gray-600">{request.asset_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Category</p>
                <p className="font-semibold text-gray-800">{categoryLabels[request.category]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Priority</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border-2 ${priorityColors[request.priority]}`}>
                  {request.priority}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border-2 ${statusColors[request.status]}`}>
                  {request.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Requested By</p>
                <p className="font-semibold text-gray-800">{request.requested_by_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Assigned To</p>
                <p className="font-semibold text-gray-800">{request.assigned_to_name || 'Unassigned'}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Description</p>
              <p className="text-gray-800">{request.description}</p>
            </div>
          </div>

          {/* SLA Information */}
          <div className={`rounded-xl shadow-lg p-6 border-2 ${
            overdue ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaClock className={overdue ? 'text-red-600' : 'text-blue-600'} />
              <span className={overdue ? 'text-red-800' : 'text-blue-800'}>
                SLA Information
              </span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Created</p>
                <p className="font-semibold text-gray-800">
                  {new Date(request.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Deadline</p>
                <p className={`font-semibold ${overdue ? 'text-red-600' : 'text-gray-800'}`}>
                  {deadline ? deadline.toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
            
            {overdue && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-red-800 font-semibold flex items-center gap-2">
                  <FaExclamationTriangle />
                  This request is overdue and requires immediate attention
                </p>
              </div>
            )}
          </div>

          {/* Work Order Information */}
          {workOrder && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaTasks className="text-green-600" />
                Work Order
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Work Order ID</p>
                  <p className="font-semibold text-gray-800">WO-{workOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Assigned To</p>
                  <p className="font-semibold text-gray-800">{workOrder.assigned_to_name || 'Unassigned'}</p>
                </div>
                {workOrder.scheduled_date && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Scheduled Date</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(workOrder.scheduled_date).toLocaleString()}
                    </p>
                  </div>
                )}
                {workOrder.started_at && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Started At</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(workOrder.started_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {workOrder.completed_at && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed At</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(workOrder.completed_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {workOrder.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <p className="text-gray-800">{workOrder.notes}</p>
                </div>
              )}

              {/* Cost Information */}
              {(workOrder.cost_labor > 0 || workOrder.cost_materials > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <FaMoneyBillWave className="text-green-600" />
                    Cost Breakdown
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Labor</p>
                      <p className="font-bold text-gray-800">
                        ETB {parseFloat(workOrder.cost_labor).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Materials</p>
                      <p className="font-bold text-gray-800">
                        ETB {parseFloat(workOrder.cost_materials).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total</p>
                      <p className="font-bold text-green-600">
                        ETB {parseFloat(workOrder.cost_total).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Photo */}
          {request.photo && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaImage className="text-purple-600" />
                Photo
              </h3>
              <img 
                src={request.photo} 
                alt="Request" 
                className="w-full rounded-lg"
              />
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaCalendar className="text-gray-600" />
              Timeline
            </h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Created</p>
                <p className="text-sm font-semibold text-gray-800">
                  {new Date(request.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                <p className="text-sm font-semibold text-gray-800">
                  {new Date(request.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Update Status</h2>
              <button
                onClick={() => setShowStatusUpdate(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="SUBMITTED">Submitted</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_PARTS">Waiting for Parts</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Notes (Optional)</label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Add any notes about this status change..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowStatusUpdate(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={updating}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    Update Status
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaintenanceRequestDetail
