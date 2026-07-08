import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { 
  FaArrowLeft, 
  FaTools,
  FaCheckCircle,
  FaClock,
  FaMoneyBillWave,
  FaCalendar,
  FaEdit,
  FaSave,
  FaTimes,
  FaPlay,
  FaUserCheck,
  FaUserTie,
  FaHardHat,
  FaFileContract,
  FaExclamationTriangle,
  FaCheckDouble
} from 'react-icons/fa'
import api from '../../services/api'

const statusColors = {
  SUBMITTED: 'bg-gray-100 text-gray-800 border-gray-200',
  ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
  WAITING_PARTS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

const priorityColors = {
  EMERGENCY: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  LOW: 'bg-gray-100 text-gray-800',
}

const WorkOrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const [workOrder, setWorkOrder] = useState(null)
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState(null)
  const [showFinanceApproval, setShowFinanceApproval] = useState(false)
  const [showContractorForm, setShowContractorForm] = useState(false)
  const [showSignOffModal, setShowSignOffModal] = useState(false)
  const [signOffType, setSignOffType] = useState('') // 'supervisor' or 'requester'
  
  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    status: '',
    notes: '',
    cost_labor: '',
    cost_materials: '',
    scheduled_date: '',
    started_at: '',
    completed_at: '',
    uses_external_contractor: false,
    contractor_name: '',
    contractor_license: '',
    contractor_license_valid: false,
    vendor_registered: false
  })

  useEffect(() => {
    fetchWorkOrder()
  }, [id])

  const fetchWorkOrder = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/maintenance/work-orders/${id}/`)
      setWorkOrder(response.data)
      
      // Fetch related request
      const requestResponse = await api.get(`/maintenance/requests/${response.data.request}/`)
      setRequest(requestResponse.data)
      
      // Set form data
      setFormData({
        status: requestResponse.data.status,
        notes: response.data.notes || '',
        cost_labor: response.data.cost_labor || '',
        cost_materials: response.data.cost_materials || '',
        scheduled_date: response.data.scheduled_date ? response.data.scheduled_date.split('T')[0] : '',
        started_at: response.data.started_at ? response.data.started_at.split('T')[0] : '',
        completed_at: response.data.completed_at ? response.data.completed_at.split('T')[0] : '',
        uses_external_contractor: response.data.uses_external_contractor || false,
        contractor_name: response.data.contractor_name || '',
        contractor_license: response.data.contractor_license || '',
        contractor_license_valid: response.data.contractor_license_valid || false,
        vendor_registered: response.data.vendor_registered || false
      })
    } catch (error) {
      console.error('Error fetching work order:', error)
      setMessage({ type: 'error', text: 'Failed to load work order' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleStatusUpdate = async () => {
    try {
      setUpdating(true)
      
      // Update work order
      await api.patch(`/maintenance/work-orders/${id}/`, {
        notes: formData.notes,
        cost_labor: formData.cost_labor || 0,
        cost_materials: formData.cost_materials || 0,
        scheduled_date: formData.scheduled_date || null,
        started_at: formData.started_at || null,
        completed_at: formData.completed_at || null
      })
      
      // Update request status
      await api.patch(`/maintenance/requests/${request.id}/`, {
        status: formData.status
      })
      
      setMessage({ type: 'success', text: 'Work order updated successfully!' })
      setEditMode(false)
      fetchWorkOrder()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update work order' 
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleStartWork = async () => {
    try {
      setUpdating(true)
      const now = new Date().toISOString()
      
      await api.patch(`/maintenance/work-orders/${id}/`, {
        started_at: now
      })
      
      await api.patch(`/maintenance/requests/${request.id}/`, {
        status: 'IN_PROGRESS'
      })
      
      setMessage({ type: 'success', text: 'Work started!' })
      fetchWorkOrder()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to start work' })
    } finally {
      setUpdating(false)
    }
  }

  const handleCompleteWork = async () => {
    if (!window.confirm('Mark this work order as completed?')) return
    
    try {
      setUpdating(true)
      const now = new Date().toISOString()
      
      await api.patch(`/maintenance/work-orders/${id}/`, {
        completed_at: now
      })
      
      await api.patch(`/maintenance/requests/${request.id}/`, {
        status: 'COMPLETED'
      })
      
      setMessage({ type: 'success', text: 'Work order completed!' })
      fetchWorkOrder()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to complete work order' })
    } finally {
      setUpdating(false)
    }
  }

  const handleFinanceApproval = async () => {
    try {
      setUpdating(true)
      await api.patch(`/maintenance/work-orders/${id}/`, {
        finance_approved: true,
        finance_approved_by: user.id
      })
      setMessage({ type: 'success', text: 'Finance approval granted!' })
      setShowFinanceApproval(false)
      fetchWorkOrder()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to approve' })
    } finally {
      setUpdating(false)
    }
  }

  const handleContractorUpdate = async () => {
    try {
      setUpdating(true)
      await api.patch(`/maintenance/work-orders/${id}/`, {
        uses_external_contractor: formData.uses_external_contractor,
        contractor_name: formData.contractor_name,
        contractor_license: formData.contractor_license,
        contractor_license_valid: formData.contractor_license_valid,
        vendor_registered: formData.vendor_registered
      })
      setMessage({ type: 'success', text: 'Contractor information updated!' })
      setShowContractorForm(false)
      fetchWorkOrder()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update contractor info' })
    } finally {
      setUpdating(false)
    }
  }

  const handleSignOff = async () => {
    try {
      setUpdating(true)
      const now = new Date().toISOString()
      const updateData = signOffType === 'supervisor' 
        ? { supervisor_signed_off: true, supervisor_signoff_by: user.id, supervisor_signoff_date: now }
        : { requester_signed_off: true, requester_signoff_by: user.id, requester_signoff_date: now }
      
      await api.patch(`/maintenance/work-orders/${id}/`, updateData)
      setMessage({ type: 'success', text: `${signOffType === 'supervisor' ? 'Supervisor' : 'Requester'} sign-off completed!` })
      setShowSignOffModal(false)
      fetchWorkOrder()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sign off' })
    } finally {
      setUpdating(false)
    }
  }

  const calculateDuration = () => {
    if (!workOrder.started_at || !workOrder.completed_at) return null
    const start = new Date(workOrder.started_at)
    const end = new Date(workOrder.completed_at)
    const diffMs = end - start
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    const remainingHours = diffHours % 24
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!workOrder || !request) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Work order not found
        </div>
      </div>
    )
  }

  const canEdit = user?.role === 'MAINTENANCE_TECHNICIAN' || user?.role === 'MAINTENANCE_SUPERVISOR'
  const isCompleted = request.status === 'COMPLETED' || request.status === 'CANCELLED'

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/maintenance/work-orders')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <FaArrowLeft />
          Back to Work Orders
        </button>
        
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">Work Order</h1>
              <p className="text-green-100 text-lg">WO-{workOrder.id}</p>
              <p className="text-green-100">Request: {request.request_id}</p>
            </div>
            <div className="flex gap-3">
              {canEdit && !isCompleted && !editMode && (
                <>
                  {!workOrder.started_at && (
                    <button
                      onClick={handleStartWork}
                      disabled={updating}
                      className="px-6 py-3 bg-white text-green-600 rounded-xl font-semibold hover:bg-green-50 transition-all flex items-center gap-2"
                    >
                      <FaPlay />
                      Start Work
                    </button>
                  )}
                  {workOrder.started_at && !workOrder.completed_at && (
                    <button
                      onClick={handleCompleteWork}
                      disabled={updating}
                      className="px-6 py-3 bg-white text-green-600 rounded-xl font-semibold hover:bg-green-50 transition-all flex items-center gap-2"
                    >
                      <FaCheckCircle />
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-6 py-3 bg-white text-green-600 rounded-xl font-semibold hover:bg-green-50 transition-all flex items-center gap-2"
                  >
                    <FaEdit />
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaTools className="text-green-600" />
              Request Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Asset</p>
                <p className="font-semibold text-gray-800">{request.asset_id}</p>
                <p className="text-sm text-gray-600">{request.asset_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Category</p>
                <p className="font-semibold text-gray-800">{request.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Priority</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${priorityColors[request.priority]}`}>
                  {request.priority}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border-2 ${statusColors[request.status]}`}>
                  {request.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Description</p>
              <p className="text-gray-800">{request.description}</p>
            </div>
          </div>

          {/* Work Order Details */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaCalendar className="text-blue-600" />
              Work Order Details
            </h3>
            
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="SUBMITTED">Submitted</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="WAITING_PARTS">Waiting for Parts</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Scheduled Date</label>
                  <input
                    type="date"
                    name="scheduled_date"
                    value={formData.scheduled_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Add work notes..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleStatusUpdate}
                    disabled={updating}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false)
                      fetchWorkOrder()
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <FaTimes />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
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
            )}

            {!editMode && workOrder.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Notes</p>
                <p className="text-gray-800">{workOrder.notes}</p>
              </div>
            )}
          </div>

          {/* Cost Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaMoneyBillWave className="text-green-600" />
              Cost Information
            </h3>
            
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Labor Cost (ETB)</label>
                  <input
                    type="number"
                    name="cost_labor"
                    value={formData.cost_labor}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Materials Cost (ETB)</label>
                  <input
                    type="number"
                    name="cost_materials"
                    value={formData.cost_materials}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                  <p className="text-2xl font-bold text-green-600">
                    ETB {(parseFloat(formData.cost_labor || 0) + parseFloat(formData.cost_materials || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Labor</p>
                    <p className="text-xl font-bold text-gray-800">
                      ETB {parseFloat(workOrder.cost_labor).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Materials</p>
                    <p className="text-xl font-bold text-gray-800">
                      ETB {parseFloat(workOrder.cost_materials).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total</p>
                    <p className="text-xl font-bold text-green-600">
                      ETB {parseFloat(workOrder.cost_total).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Finance Approval Warning */}
                {workOrder.requires_finance_approval && !workOrder.finance_approved && (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800 mb-2">
                      <FaExclamationTriangle />
                      <span className="font-bold">Finance Approval Required</span>
                    </div>
                    <p className="text-sm text-yellow-700 mb-3">
                      This work order exceeds ETB 50,000 and requires finance approval before completion.
                    </p>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => setShowFinanceApproval(true)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                      >
                        Approve Finance
                      </button>
                    )}
                  </div>
                )}

                {/* Finance Approved */}
                {workOrder.finance_approved && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <FaCheckCircle />
                      <span className="font-bold">Finance Approved</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Approved by {workOrder.finance_approved_by_name} on{' '}
                      {new Date(workOrder.finance_approval_date).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contractor Information */}
          {(workOrder.uses_external_contractor || showContractorForm) && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaHardHat className="text-orange-600" />
                External Contractor
              </h3>

              {showContractorForm ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Contractor Name</label>
                    <input
                      type="text"
                      name="contractor_name"
                      value={formData.contractor_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter contractor name"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">License Number</label>
                    <input
                      type="text"
                      name="contractor_license"
                      value={formData.contractor_license}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter license number"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="contractor_license_valid"
                        checked={formData.contractor_license_valid}
                        onChange={(e) => setFormData(prev => ({ ...prev, contractor_license_valid: e.target.checked }))}
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-gray-700">License Valid</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="vendor_registered"
                        checked={formData.vendor_registered}
                        onChange={(e) => setFormData(prev => ({ ...prev, vendor_registered: e.target.checked }))}
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-gray-700">Vendor Registered</span>
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleContractorUpdate}
                      disabled={updating}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      <FaSave />
                      Save Contractor Info
                    </button>
                    <button
                      onClick={() => setShowContractorForm(false)}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Contractor Name</p>
                    <p className="font-semibold text-gray-800">{workOrder.contractor_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">License Number</p>
                    <p className="font-semibold text-gray-800">{workOrder.contractor_license}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      workOrder.contractor_license_valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      License: {workOrder.contractor_license_valid ? 'Valid' : 'Invalid'}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      workOrder.vendor_registered ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      Vendor: {workOrder.vendor_registered ? 'Registered' : 'Not Registered'}
                    </div>
                  </div>
                  {canEdit && !isCompleted && (
                    <button
                      onClick={() => setShowContractorForm(true)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                    >
                      <FaEdit />
                      Edit Contractor Info
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dual Sign-Off */}
          {workOrder.completed_at && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaCheckDouble className="text-blue-600" />
                Completion Sign-Off
              </h3>

              <div className="space-y-4">
                {/* Supervisor Sign-Off */}
                <div className={`p-4 rounded-lg border-2 ${
                  workOrder.supervisor_signed_off ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FaUserTie className={workOrder.supervisor_signed_off ? 'text-green-600' : 'text-gray-600'} />
                        <span className="font-bold text-gray-800">Supervisor Sign-Off</span>
                      </div>
                      {workOrder.supervisor_signed_off ? (
                        <p className="text-sm text-green-700">
                          Signed by {workOrder.supervisor_signoff_by_name} on{' '}
                          {new Date(workOrder.supervisor_signoff_date).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">Pending supervisor approval</p>
                      )}
                    </div>
                    {!workOrder.supervisor_signed_off && user?.role === 'MAINTENANCE_SUPERVISOR' && (
                      <button
                        onClick={() => {
                          setSignOffType('supervisor')
                          setShowSignOffModal(true)
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Sign Off
                      </button>
                    )}
                  </div>
                </div>

                {/* Requester Sign-Off */}
                <div className={`p-4 rounded-lg border-2 ${
                  workOrder.requester_signed_off ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FaUserCheck className={workOrder.requester_signed_off ? 'text-green-600' : 'text-gray-600'} />
                        <span className="font-bold text-gray-800">Requester Sign-Off</span>
                      </div>
                      {workOrder.requester_signed_off ? (
                        <p className="text-sm text-green-700">
                          Signed by {workOrder.requester_signoff_by_name} on{' '}
                          {new Date(workOrder.requester_signoff_date).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">Pending requester approval</p>
                      )}
                    </div>
                    {!workOrder.requester_signed_off && (
                      user?.id === request.requested_by?.id ||
                      user?.id === request.requested_by ||
                      user?.role === 'OWNER'
                    ) && (
                      <button
                        onClick={() => {
                          setSignOffType('requester')
                          setShowSignOffModal(true)
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Sign Off
                      </button>
                    )}
                  </div>
                </div>

                {/* Fully Approved Badge */}
                {workOrder.fully_approved && (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-lg text-center">
                    <FaCheckDouble className="inline text-2xl mb-2" />
                    <p className="font-bold text-lg">Work Order Fully Approved</p>
                    <p className="text-sm text-green-100">Both supervisor and requester have signed off</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Contractor Button */}
          {!workOrder.uses_external_contractor && !showContractorForm && canEdit && !isCompleted && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, uses_external_contractor: true }))
                  setShowContractorForm(true)
                }}
                className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <FaHardHat />
                Add External Contractor
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaClock className="text-gray-600" />
              Timeline
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Created</p>
                  <p className="text-sm text-gray-600">
                    {new Date(workOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {workOrder.scheduled_date && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Scheduled</p>
                    <p className="text-sm text-gray-600">
                      {new Date(workOrder.scheduled_date).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              {workOrder.started_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Started</p>
                    <p className="text-sm text-gray-600">
                      {new Date(workOrder.started_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              {workOrder.completed_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Completed</p>
                    <p className="text-sm text-gray-600">
                      {new Date(workOrder.completed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Duration */}
            {calculateDuration() && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total Duration</p>
                <p className="text-lg font-bold text-green-600">{calculateDuration()}</p>
              </div>
            )}
          </div>

          {/* Photo */}
          {request.photo && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Request Photo</h3>
              <img 
                src={request.photo} 
                alt="Request" 
                className="w-full rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* Finance Approval Modal */}
      {showFinanceApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaFileContract className="text-yellow-600" />
              Finance Approval
            </h3>
            <p className="text-gray-600 mb-6">
              This work order costs ETB {parseFloat(workOrder.cost_total).toLocaleString()} and requires finance approval.
              Do you approve this expenditure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleFinanceApproval}
                disabled={updating}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
              >
                {updating ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => setShowFinanceApproval(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign-Off Modal */}
      {showSignOffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              {signOffType === 'supervisor' ? (
                <>
                  <FaUserTie className="text-blue-600" />
                  Supervisor Sign-Off
                </>
              ) : (
                <>
                  <FaUserCheck className="text-green-600" />
                  Requester Sign-Off
                </>
              )}
            </h3>
            <p className="text-gray-600 mb-6">
              By signing off, you confirm that the work has been completed satisfactorily and meets all requirements.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSignOff}
                disabled={updating}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
              >
                {updating ? 'Signing...' : 'Confirm Sign-Off'}
              </button>
              <button
                onClick={() => setShowSignOffModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkOrderDetail
