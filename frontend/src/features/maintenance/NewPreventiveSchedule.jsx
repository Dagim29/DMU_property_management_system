import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaArrowLeft, 
  FaSave, 
  FaCalendarCheck,
  FaTools,
  FaClock,
  FaCalendar,
  FaUsers
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

const NewPreventiveSchedule = () => {
  const navigate = useNavigate()
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState([])
  const [formData, setFormData] = useState({
    asset: '',
    description: '',
    interval_days: 30,
    next_due_date: '',
    assigned_team: '',
    is_active: true
  })

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets/assets/')
      setAssets(response.data.results || response.data)
    } catch (err) {
      console.error('Error fetching assets:', err)
      showError('Failed to load assets')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.asset || !formData.description || !formData.next_due_date) {
      showError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      await api.post('/maintenance/preventive/', formData)
      showSuccess('Preventive maintenance schedule created successfully!')
      setTimeout(() => {
        navigate('/dashboard/maintenance/preventive')
      }, 1500)
    } catch (err) {
      console.error('Error creating schedule:', err)
      if (err.response?.data) {
        const errors = err.response.data
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('. ')
        showError(`Failed to create schedule: ${errorMessages}`)
      } else {
        showError('Failed to create schedule. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <button
          onClick={() => navigate('/dashboard/maintenance/preventive')}
          className="mb-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <FaArrowLeft />
          Back to Preventive Maintenance
        </button>
        
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FaCalendarCheck className="text-5xl" />
            New Preventive Maintenance Schedule
          </h1>
          <p className="text-indigo-100 text-lg">Create a new preventive maintenance schedule for an asset</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="space-y-6">
            {/* Asset Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaTools className="inline mr-2 text-indigo-600" />
                Asset <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.asset}
                onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              >
                <option value="">Select Asset</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_id} - {asset.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Select the asset that requires preventive maintenance</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                rows="4"
                required
                placeholder="Describe the preventive maintenance task in detail..."
              />
              <p className="text-xs text-gray-500 mt-1">Provide a detailed description of the maintenance task</p>
            </div>

            {/* Interval and Next Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaClock className="inline mr-2 text-purple-600" />
                  Interval (days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.interval_days}
                  onChange={(e) => setFormData({ ...formData, interval_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  min="1"
                  required
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 mt-1">How often this task should be performed (in days)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaCalendar className="inline mr-2 text-pink-600" />
                  Next Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.next_due_date}
                  onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">When this task should be performed next</p>
              </div>
            </div>

            {/* Assigned Team */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaUsers className="inline mr-2 text-blue-600" />
                Assigned Team
              </label>
              <input
                type="text"
                value={formData.assigned_team}
                onChange={(e) => setFormData({ ...formData, assigned_team: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="e.g., Facilities Team, HVAC Team, Electrical Team"
              />
              <p className="text-xs text-gray-500 mt-1">Specify which team is responsible for this maintenance task</p>
            </div>

            {/* Active Status */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active Schedule
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2 ml-8">
                Active schedules will be tracked and monitored. Inactive schedules are archived.
              </p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/dashboard/maintenance/preventive')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FaSave />
              {loading ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewPreventiveSchedule
