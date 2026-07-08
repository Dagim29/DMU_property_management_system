import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCalendarAlt,
  FaUserClock,
  FaCheckCircle,
  FaTimesCircle,
  FaPlus,
  FaFilter,
  FaArrowLeft
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

const TechnicianAvailability = () => {
  const navigate = useNavigate()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [availabilities, setAvailabilities] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterTechnician, setFilterTechnician] = useState('')
  
  const INITIAL_FORM = { technician: '', status: 'ON_LEAVE', start_date: '', end_date: '', reason: '', notes: '' }
  const formRef = useRef({ ...INITIAL_FORM })
  const [formData, setFormData] = useState({ ...INITIAL_FORM })
  const [formErrors, setFormErrors] = useState({})

  const updateField = (field, value) => {
    formRef.current = { ...formRef.current, [field]: value }
    setFormData({ ...formRef.current })
  }

  const resetForm = () => {
    formRef.current = { ...INITIAL_FORM }
    setFormData({ ...INITIAL_FORM })
    setFormErrors({})
  }

  useEffect(() => {
    fetchData()
  }, [filterStatus, filterTechnician])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch technicians
      const techRes = await api.get('/users/users/?role=MAINTENANCE_TECHNICIAN')
      setTechnicians(techRes.data.results || techRes.data)
      
      // Fetch availabilities with filters
      let url = '/users/availability/'
      const params = []
      if (filterStatus !== 'ALL') params.push(`status=${filterStatus}`)
      if (filterTechnician) params.push(`technician=${filterTechnician}`)
      if (params.length > 0) url += '?' + params.join('&')
      
      const availRes = await api.get(url)
      setAvailabilities(availRes.data.results || availRes.data)
    } catch (err) {
      console.error('Error fetching data:', err)
      showError('Failed to load availability data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Always read from ref — never from stale closure state
    const data = formRef.current
    console.log('[availability] submitting:', data)

    const errors = {}
    if (!data.technician) errors.technician = 'Please select a technician.'
    if (!data.start_date) errors.start_date = 'Start date is required.'
    if (!data.end_date) errors.end_date = 'End date is required.'
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      errors.end_date = 'End date must be on or after start date.'
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})

    try {
      await api.post('/users/availability/', data)
      showSuccess('Availability record created successfully!')
      setShowAddModal(false)
      resetForm()
      fetchData()
    } catch (err) {
      console.error('Error creating availability:', err)
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to create availability record'
      showError(msg)
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.post(`/users/availability/${id}/approve/`)
      showSuccess('Availability approved!')
      fetchData()
    } catch (err) {
      console.error('Error approving availability:', err)
      showError('Failed to approve availability')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this availability record?')) return
    
    try {
      await api.delete(`/users/availability/${id}/`)
      showSuccess('Availability record deleted!')
      fetchData()
    } catch (err) {
      console.error('Error deleting availability:', err)
      showError('Failed to delete availability record')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'AVAILABLE': 'bg-green-100 text-green-700 border-green-200',
      'ON_LEAVE': 'bg-blue-100 text-blue-700 border-blue-200',
      'SICK_LEAVE': 'bg-red-100 text-red-700 border-red-200',
      'VACATION': 'bg-purple-100 text-purple-700 border-purple-200',
      'TRAINING': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'OFF_DUTY': 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
          onClick={() => navigate('/dashboard/supervisor')}
          className="mb-4 flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
        >
          <FaArrowLeft />
          Back to Dashboard
        </button>
        
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FaUserClock className="text-6xl opacity-80" />
              <div>
                <h1 className="text-4xl font-bold mb-2">Technician Availability</h1>
                <p className="text-purple-100 text-lg">Manage schedules, time off, and availability</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
            >
              <FaPlus />
              Add Availability
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SICK_LEAVE">Sick Leave</option>
              <option value="VACATION">Vacation</option>
              <option value="TRAINING">Training</option>
              <option value="OFF_DUTY">Off Duty</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Technician</label>
            <select
              value={filterTechnician}
              onChange={(e) => setFilterTechnician(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="">All Technicians</option>
              {technicians.map(tech => (
                <option key={tech.id} value={tech.id}>
                  {tech.first_name} {tech.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Availability List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">Availability Records ({availabilities.length})</h2>
        </div>

        <div className="p-6">
          {availabilities.length === 0 ? (
            <div className="text-center py-12">
              <FaCalendarAlt className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No availability records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availabilities.map((avail) => (
                <div
                  key={avail.id}
                  className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{avail.technician_name}</h3>
                        <span className={`px-4 py-1 rounded-full text-sm font-bold border-2 ${getStatusColor(avail.status)}`}>
                          {avail.status.replace('_', ' ')}
                        </span>
                        {avail.is_active && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                            ACTIVE NOW
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-gray-600">
                        <span className="flex items-center gap-2">
                          <FaCalendarAlt />
                          {new Date(avail.start_date).toLocaleDateString()} - {new Date(avail.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!avail.approved && (
                        <button
                          onClick={() => handleApprove(avail.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <FaCheckCircle />
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(avail.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <FaTimesCircle />
                        Delete
                      </button>
                    </div>
                  </div>

                  {avail.reason && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Reason:</p>
                      <p className="text-gray-600">{avail.reason}</p>
                    </div>
                  )}

                  {avail.notes && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Notes:</p>
                      <p className="text-gray-600">{avail.notes}</p>
                    </div>
                  )}

                  {avail.approved && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <FaCheckCircle />
                      <span>Approved by {avail.approved_by_name} on {new Date(avail.approved_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Availability Record</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technician <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.technician}
                  onChange={(e) => { updateField('technician', e.target.value); setFormErrors(p => ({...p, technician: ''})) }}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${formErrors.technician ? 'border-red-400' : 'border-gray-200'}`}
                >
                  <option value="">Select Technician</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.first_name} {tech.last_name}
                    </option>
                  ))}
                </select>
                {formErrors.technician && <p className="mt-1 text-sm text-red-500">{formErrors.technician}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="SICK_LEAVE">Sick Leave</option>
                  <option value="VACATION">Vacation</option>
                  <option value="TRAINING">Training</option>
                  <option value="OFF_DUTY">Off Duty</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      const val = e.target.value
                      const newEnd = formRef.current.end_date && formRef.current.end_date < val ? val : formRef.current.end_date
                      updateField('start_date', val)
                      updateField('end_date', newEnd)
                      setFormErrors(p => ({...p, start_date: ''}))
                    }}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${formErrors.start_date ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {formErrors.start_date && <p className="mt-1 text-sm text-red-500">{formErrors.start_date}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={formData.start_date || undefined}
                    value={formData.end_date}
                    onChange={(e) => { updateField('end_date', e.target.value); setFormErrors(p => ({...p, end_date: ''})) }}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${formErrors.end_date ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {formErrors.end_date && <p className="mt-1 text-sm text-red-500">{formErrors.end_date}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => updateField('reason', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Reason for unavailability..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm() }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors"
                >
                  Create Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicianAvailability
