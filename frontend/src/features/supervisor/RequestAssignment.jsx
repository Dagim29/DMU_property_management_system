import { useState, useEffect } from 'react'
import { 
  FaClipboardList, 
  FaUserCog, 
  FaRobot,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
  FaStar,
  FaBuilding,
  FaTools,
  FaMapMarkerAlt,
  FaTasks
} from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const RequestAssignment = () => {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: 'SUBMITTED',
    priority: 'all',
    category: 'all',
    search: ''
  })
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [requestsRes, techsRes] = await Promise.all([
        api.get('/maintenance/requests/'),
        api.get('/users/users/?role=MAINTENANCE_TECHNICIAN&is_active=true')
      ])
      setRequests(requestsRes.data.results || requestsRes.data)
      setTechnicians(techsRes.data.results || techsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAutoAssign = async (requestId) => {
    try {
      await api.post(`/maintenance/requests/${requestId}/auto_assign/`)
      fetchData()
      showSuccess('Request automatically assigned!')
    } catch (error) {
      console.error('Error auto-assigning:', error)
      showError('Failed to auto-assign request')
    }
  }

  const handleManualAssign = async (requestId, technicianId) => {
    try {
      await api.patch(`/maintenance/requests/${requestId}/assign/`, {
        assigned_to: technicianId
      })
      fetchData()
      setShowAssignModal(false)
      showSuccess('Request assigned successfully!')
    } catch (error) {
      console.error('Error assigning:', error)
      showError('Failed to assign request')
    }
  }

  const openAssignModal = async (request) => {
    setSelectedRequest(request)
    try {
      const response = await api.get(`/maintenance/requests/${request.id}/suggest_technicians/`)
      setSuggestions(response.data.suggestions || [])
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    }
    setShowAssignModal(true)
  }

  const filteredRequests = requests.filter(req => {
    const matchesStatus = filter.status === 'all' || req.status === filter.status
    const matchesPriority = filter.priority === 'all' || req.priority === filter.priority
    const matchesCategory = filter.category === 'all' || req.category === filter.category
    const matchesSearch = !filter.search || 
      req.request_id?.toLowerCase().includes(filter.search.toLowerCase()) ||
      req.description?.toLowerCase().includes(filter.search.toLowerCase())
    
    return matchesStatus && matchesPriority && matchesCategory && matchesSearch
  })

  const getPriorityColor = (priority) => {
    const colors = {
      'EMERGENCY': 'bg-red-100 text-red-700 border-red-300',
      'HIGH': 'bg-orange-100 text-orange-700 border-orange-300',
      'MEDIUM': 'bg-blue-100 text-blue-700 border-blue-300',
      'LOW': 'bg-gray-100 text-gray-700 border-gray-300'
    }
    return colors[priority] || 'bg-gray-100 text-gray-700'
  }

  const getStatusColor = (status) => {
    const colors = {
      'SUBMITTED': 'bg-yellow-100 text-yellow-700',
      'ASSIGNED': 'bg-blue-100 text-blue-700',
      'IN_PROGRESS': 'bg-indigo-100 text-indigo-700',
      'COMPLETED': 'bg-green-100 text-green-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
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
      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <div className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FaUserCog className="text-5xl" />
            Request Assignment Center
          </h1>
          <p className="text-orange-100 text-lg">Assign maintenance requests to technicians</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-scale-in">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Unassigned</p>
          <p className="text-3xl font-bold text-yellow-600">
            {requests.filter(r => r.status === 'SUBMITTED').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Assigned Today</p>
          <p className="text-3xl font-bold text-blue-600">
            {requests.filter(r => 
              r.status === 'ASSIGNED' && 
              new Date(r.updated_at).toDateString() === new Date().toDateString()
            ).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Emergency</p>
          <p className="text-3xl font-bold text-red-600">
            {requests.filter(r => r.priority === 'EMERGENCY' && r.status === 'SUBMITTED').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Available Technicians</p>
          <p className="text-3xl font-bold text-green-600">{technicians.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8 animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="text-orange-600" />
          <h2 className="text-xl font-bold text-gray-800">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaSearch className="inline mr-2" />
              Search
            </label>
            <input
              type="text"
              placeholder="Request ID or description"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            >
              <option value="SUBMITTED">Unassigned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="all">All Status</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            >
              <option value="all">All Categories</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="HVAC">HVAC</option>
              <option value="STRUCTURAL">Structural</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 animate-slide-up">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Maintenance Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-50 to-red-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Request ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Asset</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Priority</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Assigned To</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span 
                        className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                        onClick={() => navigate(`/dashboard/maintenance/requests/${request.id}`)}
                      >
                        {request.request_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">
                        {request.asset_detail?.asset_id || request.asset_id_display || request.asset_name || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">{request.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {request.assigned_to ? (
                        <span className="text-gray-700">{request.assigned_to_name || request.assigned_to}</span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {request.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={() => handleAutoAssign(request.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 text-sm"
                              title="Auto-assign"
                            >
                              <FaRobot />
                              Auto
                            </button>
                            <button
                              onClick={() => openAssignModal(request)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
                              title="Manual assign"
                            >
                              <FaUserCog />
                              Assign
                            </button>
                          </>
                        )}
                        {request.status === 'ASSIGNED' && (
                          <button
                            onClick={() => openAssignModal(request)}
                            className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Assign Technician</h2>
                  <p className="text-orange-100 mt-1 text-sm">
                    {selectedRequest.request_id} · {selectedRequest.category} · {selectedRequest.priority} Priority
                  </p>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  ✕
                </button>
              </div>

              {/* Request summary */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-white/15 rounded-xl p-3">
                  <p className="text-orange-200 text-xs mb-1">Asset</p>
                  <p className="font-semibold text-sm">
                    {selectedRequest.asset_detail?.asset_id || selectedRequest.asset_name || '—'}
                  </p>
                </div>
                <div className="bg-white/15 rounded-xl p-3">
                  <p className="text-orange-200 text-xs mb-1">Category</p>
                  <p className="font-semibold text-sm">{selectedRequest.category}</p>
                </div>
                <div className="bg-white/15 rounded-xl p-3">
                  <p className="text-orange-200 text-xs mb-1">Location</p>
                  <p className="font-semibold text-sm">
                    {selectedRequest.asset_detail?.location || selectedRequest.asset_location || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Legend */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="flex items-center gap-1.5 text-xs px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium border border-green-200">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Exact Match
                </span>
                <span className="flex items-center gap-1.5 text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium border border-blue-200">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  General Maintenance
                </span>
                <span className="flex items-center gap-1.5 text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium border border-gray-200">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Other Specialization
                </span>
                <span className="flex items-center gap-1.5 text-xs px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium border border-yellow-200">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  On Leave
                </span>
                <span className="flex items-center gap-1.5 text-xs px-3 py-1 bg-red-100 text-red-800 rounded-full font-medium border border-red-200">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  At Capacity (≥10 tasks)
                </span>
              </div>

              {suggestions.length === 0 ? (
                <div className="text-center py-12">
                  <FaUserCog className="text-5xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No technicians available</p>
                  <p className="text-gray-400 text-sm mt-1">All technicians may be at capacity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((tech) => {
                    const eligibilityStyles = {
                      exact_match: 'border-green-300 bg-green-50 hover:border-green-500 hover:bg-green-100',
                      general: 'border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100',
                      other: 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
                    }
                    const badgeStyles = {
                      exact_match: 'bg-green-100 text-green-800 border-green-300',
                      general: 'bg-blue-100 text-blue-800 border-blue-300',
                      other: 'bg-gray-100 text-gray-700 border-gray-300'
                    }
                    const dotStyles = {
                      exact_match: 'bg-green-500',
                      general: 'bg-blue-500',
                      other: 'bg-gray-400'
                    }

                    return (
                      <div
                        key={tech.id}
                        onClick={() => !tech.at_capacity && handleManualAssign(selectedRequest.id, tech.id)}
                        className={`p-4 border-2 rounded-xl transition-all ${
                          tech.at_capacity
                            ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed'
                            : !tech.is_available
                            ? 'border-yellow-200 bg-yellow-50 opacity-70 cursor-not-allowed'
                            : `cursor-pointer ${eligibilityStyles[tech.eligibility]}`
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Technician info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                tech.at_capacity ? 'bg-red-500' :
                                !tech.is_available ? 'bg-yellow-500' :
                                dotStyles[tech.eligibility]
                              }`}></span>
                              <span className="font-bold text-gray-900 text-base">{tech.full_name}</span>
                              {tech.at_capacity ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-100 text-red-800 border-red-300">
                                  At Capacity
                                </span>
                              ) : !tech.is_available ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-yellow-100 text-yellow-800 border-yellow-300">
                                  On Leave
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeStyles[tech.eligibility]}`}>
                                  {tech.eligibility_label}
                                </span>
                              )}
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <FaTools className="text-orange-500 flex-shrink-0 text-xs" />
                                <span className="truncate">{tech.specialization_display}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <FaBuilding className="text-orange-500 flex-shrink-0 text-xs" />
                                <span className="truncate">{tech.department}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <FaMapMarkerAlt className="text-orange-500 flex-shrink-0 text-xs" />
                                <span className="truncate">{tech.assigned_campus}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <FaTasks className="text-orange-500 flex-shrink-0 text-xs" />
                                <span>{tech.active_requests} active task{tech.active_requests !== 1 ? 's' : ''}</span>
                              </div>
                            </div>

                            {/* Routing explanation */}
                            <p className="text-xs text-gray-500 mt-2 italic">{tech.explanation}</p>
                          </div>

                          {/* Right: Score & Rating */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {/* Match score */}
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${
                                tech.score >= 70 ? 'text-green-600' :
                                tech.score >= 40 ? 'text-orange-500' : 'text-gray-500'
                              }`}>
                                {tech.score}
                              </div>
                              <div className="text-xs text-gray-500">match</div>
                            </div>

                            {/* Performance score */}
                            {tech.performance_score > 0 && (
                              <div className="text-center">
                                <div className="flex items-center gap-1">
                                  <FaStar className="text-yellow-400 text-xs" />
                                  <span className="text-sm font-semibold text-gray-700">
                                    {tech.avg_rating ? tech.avg_rating.toFixed(1) : '—'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400">{tech.total_ratings} rating{tech.total_ratings !== 1 ? 's' : ''}</div>
                              </div>
                            )}

                            {/* Assign button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!tech.at_capacity && tech.is_available) {
                                  handleManualAssign(selectedRequest.id, tech.id)
                                }
                              }}
                              disabled={tech.at_capacity || !tech.is_available}
                              className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-all ${
                                tech.at_capacity || !tech.is_available
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 hover:shadow-lg'
                              }`}
                            >
                              {tech.at_capacity ? 'Full' : !tech.is_available ? 'On Leave' : 'Assign'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RequestAssignment
