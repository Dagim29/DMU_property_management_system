import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt,
  FaTools,
  FaCheckCircle,
  FaClock,
  FaArrowLeft,
  FaEdit,
  FaChartLine,
  FaCalendar,
  FaCertificate,
  FaFileDownload
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

const TechnicianDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [technician, setTechnician] = useState(null)
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    avgCompletionTime: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTechnicianDetails()
  }, [id])

  const fetchTechnicianDetails = async () => {
    try {
      setLoading(true)
      const [techRes, requestsRes] = await Promise.all([
        api.get(`/users/users/${id}/`),
        api.get('/maintenance/requests/')
      ])

      const tech = techRes.data
      const allRequests = requestsRes.data.results || requestsRes.data
      const techId = parseInt(id)
      // assigned_to is returned as a plain integer ID by the serializer
      const techRequests = allRequests.filter(r => {
        const assignedId = typeof r.assigned_to === 'object' ? r.assigned_to?.id : r.assigned_to
        return assignedId === techId
      })

      setTechnician(tech)
      setRequests(techRequests)

      // Calculate stats
      const completed = techRequests.filter(r => r.status === 'COMPLETED').length
      const inProgress = techRequests.filter(r => 
        ['ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS'].includes(r.status)
      ).length

      setStats({
        total: techRequests.length,
        completed,
        inProgress,
        avgCompletionTime: 0
      })
    } catch (error) {
      console.error('Error fetching technician details:', error)
    } finally {
      setLoading(false)
    }
  }



  const getStatusColor = (status) => {
    const colors = {
      'SUBMITTED': 'bg-yellow-100 text-yellow-700',
      'ASSIGNED': 'bg-blue-100 text-blue-700',
      'IN_PROGRESS': 'bg-indigo-100 text-indigo-700',
      'WAITING_PARTS': 'bg-orange-100 text-orange-700',
      'COMPLETED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-gray-100 text-gray-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'EMERGENCY': 'text-red-600',
      'HIGH': 'text-orange-600',
      'MEDIUM': 'text-blue-600',
      'LOW': 'text-gray-600'
    }
    return colors[priority] || 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!technician) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Technician not found</p>
          <button
            onClick={() => navigate('/dashboard/supervisor/technicians')}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Team
          </button>
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
          onClick={() => navigate('/dashboard/supervisor/technicians')}
          className="mb-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <FaArrowLeft />
          Back to Team
        </button>
        
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {technician.profile_photo ? (
                <img
                  src={technician.profile_photo}
                  alt={`${technician.first_name} ${technician.last_name}`}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-2xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-4xl shadow-2xl">
                  {technician.first_name?.[0]}{technician.last_name?.[0]}
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {technician.first_name} {technician.last_name}
                </h1>
                <p className="text-indigo-100 text-lg mb-2">@{technician.username}</p>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  technician.is_active ? 'bg-green-400 text-green-900' : 'bg-gray-400 text-gray-900'
                }`}>
                  {technician.is_active ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/dashboard/supervisor/technician/${id}/edit`)}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg"
            >
              <FaEdit />
              Edit Details
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-scale-in">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <FaChartLine className="text-3xl text-blue-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Requests</p>
          <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <FaCheckCircle className="text-3xl text-green-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Completed</p>
          <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <FaClock className="text-3xl text-indigo-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">In Progress</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.inProgress}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <FaCalendar className="text-3xl text-purple-600" />
          </div>
          <p className="text-gray-600 text-sm mb-1">Success Rate</p>
          <p className="text-3xl font-bold text-purple-600">
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Technician Info */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Technician Information</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FaUser className="text-indigo-600 text-xl mt-1" />
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-semibold text-gray-800">
                  {technician.first_name} {technician.last_name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaEnvelope className="text-indigo-600 text-xl mt-1" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-800">{technician.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaTools className="text-indigo-600 text-xl mt-1" />
              <div>
                <p className="text-sm text-gray-600">Specialization</p>
                <p className="font-semibold text-gray-800">
                  {technician.specialization || 'General Maintenance'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FaMapMarkerAlt className="text-indigo-600 text-xl mt-1" />
              <div>
                <p className="text-sm text-gray-600">Assigned Campus</p>
                <p className="font-semibold text-gray-800">
                  {technician.assigned_campus || 'Not Assigned'}
                </p>
              </div>
            </div>

            {(technician.certifications || technician.certificate_file) && (
              <div className="flex items-start gap-3">
                <FaCertificate className="text-indigo-600 text-xl mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Certifications</p>
                  {technician.certifications && (
                    <p className="font-semibold text-gray-800 whitespace-pre-wrap mt-1">
                      {technician.certifications}
                    </p>
                  )}
                  {technician.certificate_file && (
                    <a
                      href={technician.certificate_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                    >
                      <FaFileDownload />
                      View Certificate Document
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Requests */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Requests</h2>
          
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No requests assigned yet</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {requests.slice(0, 10).map((request) => (
                <div
                  key={request.id}
                  onClick={() => navigate(`/dashboard/maintenance/requests/${request.id}`)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{request.request_id}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {request.description?.substring(0, 80)}...
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-semibold ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                    <span className="text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default TechnicianDetail
