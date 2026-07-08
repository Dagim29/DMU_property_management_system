import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaSave, FaTimes, FaShieldAlt } from 'react-icons/fa'
import api from '../../services/api'

const InsuranceForm = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState([])
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    asset: '',
    policy_number: '',
    provider: '',
    policy_type: 'COMPREHENSIVE',
    coverage_amount: '',
    premium_amount: '',
    start_date: '',
    end_date: '',
    renewal_date: '',
    notes: ''
  })

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets/assets/')
      const data = response.data.results || response.data
      setAssets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching assets:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.asset) newErrors.asset = 'Please select an asset.'
    if (!formData.policy_number.trim()) newErrors.policy_number = 'Policy number is required.'
    if (!formData.provider.trim()) newErrors.provider = 'Provider name is required.'
    if (!formData.policy_type) newErrors.policy_type = 'Please select a policy type.'
    
    if (!formData.coverage_amount || Number(formData.coverage_amount) <= 0) {
      newErrors.coverage_amount = 'Coverage amount must be greater than zero.'
    }
    
    if (!formData.premium_amount || Number(formData.premium_amount) <= 0) {
      newErrors.premium_amount = 'Premium amount must be greater than zero.'
    }
    
    if (!formData.start_date) newErrors.start_date = 'Start date is required.'
    if (!formData.end_date) newErrors.end_date = 'End date is required.'
    if (!formData.renewal_date) newErrors.renewal_date = 'Renewal date is required.'
    
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be exactly after the start date.'
      }
    }

    if (formData.start_date && formData.renewal_date) {
      const startDate = new Date(formData.start_date)
      const renewalDate = new Date(formData.renewal_date)
      if (renewalDate <= startDate) {
        newErrors.renewal_date = 'Renewal date must be after the start date.'
      }
    }

    if (formData.end_date && formData.renewal_date) {
      const endDate = new Date(formData.end_date)
      const renewalDate = new Date(formData.renewal_date)
      if (renewalDate > endDate) {
        newErrors.renewal_date = 'Renewal date cannot be after the policy end date.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please correct the errors in the form before submitting.' })
      return
    }
    
    try {
      setLoading(true)
      await api.post('/assets/insurance/', formData)
      setMessage({ type: 'success', text: 'Insurance policy added successfully!' })
      setTimeout(() => navigate('/dashboard/assets/management'), 1500)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to add insurance policy' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FaShieldAlt />
            Add Insurance Policy
          </h1>
          <p className="text-red-100 text-lg">Register insurance coverage for an asset</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl border-2 ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Asset <span className="text-red-500">*</span>
            </label>
            <select
              name="asset"
              value={formData.asset}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
                errors.asset ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Select Asset</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_id} - {asset.name}
                </option>
              ))}
            </select>
            {errors.asset && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.asset}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Policy Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="policy_number"
              value={formData.policy_number}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
                errors.policy_number ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.policy_number && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.policy_number}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Provider <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="provider"
              value={formData.provider}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
                errors.provider ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.provider && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.provider}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Policy Type <span className="text-red-500">*</span>
            </label>
            <select
              name="policy_type"
              value={formData.policy_type}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
                errors.policy_type ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="COMPREHENSIVE">Comprehensive</option>
              <option value="THEFT">Theft Only</option>
              <option value="DAMAGE">Damage Only</option>
              <option value="LIABILITY">Liability</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.policy_type && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.policy_type}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Coverage Amount (ETB) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="coverage_amount"
              value={formData.coverage_amount}
              onChange={handleInputChange}
              required
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
                errors.coverage_amount ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.coverage_amount && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.coverage_amount}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Premium Amount (ETB) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="premium_amount"
              value={formData.premium_amount}
              onChange={handleInputChange}
              required
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
                errors.premium_amount ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.premium_amount && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.premium_amount}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
                errors.start_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.start_date && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.start_date}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              min={formData.start_date ? new Date(new Date(formData.start_date).getTime() + 86400000).toISOString().split('T')[0] : undefined}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
                errors.end_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.end_date && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.end_date}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Renewal Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="renewal_date"
              value={formData.renewal_date}
              onChange={handleInputChange}
              min={formData.start_date ? new Date(new Date(formData.start_date).getTime() + 86400000).toISOString().split('T')[0] : undefined}
              max={formData.end_date || undefined}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
                errors.renewal_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.renewal_date && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.renewal_date}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FaSave />
            {loading ? 'Adding...' : 'Add Policy'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/assets/management')}
            className="px-6 py-3 bg-gray-500 text-white rounded-xl font-bold hover:bg-gray-600 transition-all flex items-center gap-2"
          >
            <FaTimes />
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default InsuranceForm
