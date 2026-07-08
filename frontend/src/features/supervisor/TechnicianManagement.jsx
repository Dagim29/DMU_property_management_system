import { useState, useEffect } from 'react'
import { 
  FaUsers, 
  FaUserPlus, 
  FaEdit, 
  FaEye,
  FaStar,
  FaMapMarkerAlt,
  FaTools,
  FaCheckCircle,
  FaCircle
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

const TechnicianManagement = () => {
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: 'all',
    specialization: 'all',
    search: ''
  })

  useEffect(() => {
    fetchTechnicians()
  }, [])

  const fetchTechnicians = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/users/?role=MAINTENANCE_TECHNICIAN')
      const techs = response.data.results || response.data
      
      // Fetch workload for each technician
      const requestsRes = await api.get('/maintenance/requests/')
      const requests = requestsRes.data.results || requestsRes.data
      
      const techsWithWorkload = techs.map(tech => {
        const techId = tech.id
        const activeRequests = requests.filter(r => {
          const assignedId = typeof r.assigned_to === 'object' ? r.assigned_to?.id : r.assigned_to
          return assignedId === techId && ['ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS'].includes(r.status)
        }).length
        
        const completedToday = requests.filter(r => {
          const assignedId = typeof r.assigned_to === 'object' ? r.assigned_to?.id : r.assigned_to
          return assignedId === techId &&
            r.status === 'COMPLETED' &&
            new Date(r.updated_at).toDateString() === new Date().toDateString()
        }).length
        
        return {
          ...tech,
          activeRequests,
          completedToday
        }
      })
      
      setTechnicians(techsWithWorkload)
    } catch (error) {
      console.error('Error fetching technicians:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTechnicians = technicians.filter(tech => {
    const matchesStatus = filter.status === 'all' || 
      (filter.status === 'active' && tech.is_active) ||
      (filter.status === 'inactive' && !tech.is_active)
    
    const matchesSpecialization = filter.specialization === 'all' || 
      tech.specialization === filter.specialization
    
    const matchesSearch = !filter.search || 
      tech.username.toLowerCase().includes(filter.search.toLowerCase()) ||
      tech.first_name.toLowerCase().includes(filter.search.toLowerCase()) ||
      tech.last_name.toLowerCase().includes(filter.search.toLowerCase())
    
    return matchesStatus && matchesSpecialization && matchesSearch
  })

  const getWorkloadColor = (count) => {
    if (count === 0) return 'text-gray-600'
    if (count <= 3) return 'text-green-600'
    if (count <= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const renderStarRating = (score) => {
    // Convert 0-100 score to 0-5 stars
    const stars = (score / 100) * 5
    const fullStars = Math.floor(stars)
    const hasHalfStar = stars % 1 >= 0.5
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <FaStar
            key={i}
            className={`text-sm ${
              i < fullStars
                ? 'text-yellow-400'
                : i === fullStars && hasHalfStar
                ? 'text-yellow-300'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const handleEditClick = (tech) => {
    window.location.href = `/dashboard/supervisor/technician/${tech.id}/edit`
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
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <FaUsers className="text-5xl" />
                Technician Management
              </h1>
              <p className="text-indigo-100 text-lg">Manage your maintenance team</p>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard/supervisor/add-technician'}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg"
            >
              <FaUserPlus />
              Add Technician
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-scale-in">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Total Technicians</p>
          <p className="text-3xl font-bold text-gray-800">{technicians.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Active</p>
          <p className="text-3xl font-bold text-green-600">
            {technicians.filter(t => t.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Total Active Requests</p>
          <p className="text-3xl font-bold text-blue-600">
            {technicians.reduce((sum, t) => sum + t.activeRequests, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm mb-1">Completed Today</p>
          <p className="text-3xl font-bold text-purple-600">
            {technicians.reduce((sum, t) => sum + t.completedToday, 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8 animate-slide-up">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by name or username"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
            <select
              value={filter.specialization}
              onChange={(e) => setFilter({ ...filter, specialization: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="all">All Specializations</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="HVAC">HVAC</option>
              <option value="STRUCTURAL">Structural</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="GENERAL">General</option>
            </select>
          </div>
        </div>

        {(filter.search || filter.status !== 'all' || filter.specialization !== 'all') && (
          <button
            onClick={() => setFilter({ status: 'all', specialization: 'all', search: '' })}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Technicians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
        {filteredTechnicians.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No technicians found
          </div>
        ) : (
          filteredTechnicians.map((tech) => (
            <div key={tech.id} className="group bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
              
              {/* Premium Header with Glassmorphism */}
              <div className="relative h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>

                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur shadow-sm text-xs font-bold text-gray-800">
                  <FaCircle className={`text-[8px] ${tech.is_active ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
                  {tech.is_active ? 'Active' : 'Offline'}
                </div>
              </div>

              {/* Profile Photo - Elevated & Animated */}
              <div className="relative -mt-14 flex justify-center px-6 z-20">
                <div className="relative group-hover:scale-105 transition-transform duration-300">
                  {tech.profile_photo ? (
                    <img
                      src={tech.profile_photo}
                      alt={`${tech.first_name} ${tech.last_name}`}
                      className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl object-cover bg-white rotate-3 group-hover:rotate-0 transition-all duration-300"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl rotate-3 group-hover:rotate-0 transition-all duration-300">
                      {tech.first_name?.[0]}{tech.last_name?.[0]}
                    </div>
                  )}
                  {/* Performance Badge Overlay */}
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg border border-white flex items-center gap-1 transform rotate-[-5deg] group-hover:rotate-0 transition-all">
                    <FaStar className="text-[10px]" /> {Math.round(tech.performance_score || 0)}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 pt-4 pb-6 flex-1 flex flex-col">
                {/* Name & Role */}
                <div className="text-center mb-5">
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {tech.first_name} {tech.last_name}
                  </h3>
                  <div className="flex items-center justify-center gap-3 mt-1.5 text-sm font-medium text-gray-500">
                    <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md">
                      <FaTools className="text-xs" />
                      {tech.specialization || 'General'}
                    </span>
                    {tech.assigned_campus && (
                      <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-md">
                        <FaMapMarkerAlt className="text-xs" />
                        {tech.assigned_campus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Key Metrics - Modern Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-blue-50/50 rounded-xl p-3 text-center border border-blue-100/50 hover:bg-blue-50 transition-colors">
                    <p className={`text-2xl font-black ${getWorkloadColor(tech.activeRequests)}`}>
                      {tech.activeRequests}
                    </p>
                    <p className="text-xs font-semibold text-blue-800/70 uppercase tracking-wider mt-1">Active</p>
                  </div>
                  
                  <div className="bg-green-50/50 rounded-xl p-3 text-center border border-green-100/50 hover:bg-green-50 transition-colors">
                    <p className="text-2xl font-black text-green-600">
                      {tech.completedToday}
                    </p>
                    <p className="text-xs font-semibold text-green-800/70 uppercase tracking-wider mt-1">Today</p>
                  </div>
                </div>

                {/* Action Buttons - Premium styling */}
                <div className="flex gap-3 mt-auto pt-2">
                  <button
                    onClick={() => window.location.href = `/dashboard/supervisor/technician/${tech.id}`}
                    className="flex-1 py-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 font-bold text-sm shadow-sm border border-gray-200 hover:border-transparent group/btn"
                  >
                    <FaEye className="text-gray-400 group-hover/btn:text-indigo-200 transition-colors" />
                    View Profile
                  </button>
                  <button
                    onClick={() => handleEditClick(tech)}
                    className="w-12 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center font-medium shadow-sm group/edit"
                    aria-label="Edit Technician"
                  >
                    <FaEdit className="group-hover/edit:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  )
}

export default TechnicianManagement
