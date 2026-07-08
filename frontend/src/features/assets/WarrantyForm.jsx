import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaSave, FaTimes, FaShieldAlt } from 'react-icons/fa'
import api from '../../services/api'

const WarrantyForm = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState([])
  const [existingWarranties, setExistingWarranties] = useState([])
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    asset: '',
    provider: '',
    warranty_number: '',
    start_date: '',
    end_date: '',
    coverage_details: '',
    contact_email: '',
    contact_phone: ''
  })

  useEffect(() => {
    fetchAssets()
    fetchExistingWarranties()
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

  const fetchExistingWarranties = async () => {
    try {
      const response = await api.get('/assets/warranties/')
      const data = response.data.results || response.data
      const warranties = Array.isArray(data) ? data : []
      // Only store asset IDs that have ACTIVE warranties
      // Expired warranties should allow new warranty creation
      const activeWarranties = warranties.filter(w => w.is_active)
      setExistingWarranties(activeWarranties.map(w => w.asset))
    } catch (error) {
      console.error('Error fetching warranties:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.asset) newErrors.asset = 'Please select an asset.'
    if (!formData.provider.trim()) newErrors.provider = 'Provider name is required.'
    
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required.'
    }
    
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required.'
    }
    
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after the start date.'
      }
    }
    
    if (formData.contact_email && !/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address.'
    }
    
    if (formData.contact_phone && !/^[\d\+\-\s\(\)]+$/.test(formData.contact_phone)) {
      newErrors.contact_phone = 'Please enter a valid phone number format.'
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
      console.log('Submitting warranty data:', formData)
      await api.post('/assets/warranties/', formData)
      setMessage({ type: 'success', text: 'Warranty added successfully!' })
      setTimeout(() => navigate('/dashboard/assets/management'), 1500)
    } catch (error) {
      console.error('Warranty creation error:', error.response?.data)
      
      // Handle different error formats
      let errorMessage = 'Failed to add warranty'
      
      if (error.response?.data) {
        const errorData = error.response.data
        
        // Check for field-specific errors
        if (errorData.asset) {
          errorMessage = Array.isArray(errorData.asset) 
            ? errorData.asset[0] 
            : errorData.asset
          
          // Check if it's a OneToOne constraint error
          if (errorMessage.includes('already exists') || errorMessage.includes('unique')) {
            errorMessage = 'This asset already has an active warranty. Each asset can only have one warranty at a time. If the existing warranty is expired, please contact support to remove it first.'
          }
        } else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors)
            ? errorData.non_field_errors[0]
            : errorData.non_field_errors
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        } else {
          // Display all field errors
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => {
              const errorText = Array.isArray(errors) ? errors[0] : errors
              return `${field}: ${errorText}`
            })
            .join(', ')
          
          if (fieldErrors) {
            errorMessage = fieldErrors
          }
        }
      }
      
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FaShieldAlt />
            Add Warranty
          </h1>
          <p className="text-blue-100 text-lg">Register warranty information for an asset</p>
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.asset ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Select Asset</option>
              {assets.map(asset => {
                const hasActiveWarranty = existingWarranties.includes(asset.id)
                return (
                  <option 
                    key={asset.id} 
                    value={asset.id}
                    disabled={hasActiveWarranty}
                  >
                    {asset.asset_id} - {asset.name} {hasActiveWarranty ? '(Has active warranty)' : ''}
                  </option>
                )
              })}
            </select>
            {errors.asset && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.asset}</p>}
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.provider ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="e.g., DMU Warranty Services"
            />
            {errors.provider && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.provider}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Warranty Number
            </label>
            <input
              type="text"
              name="warranty_number"
              value={formData.warranty_number}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., WR-12345"
            />
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.end_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.end_date && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.end_date}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.contact_email ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="warranty@provider.com"
            />
            {errors.contact_email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.contact_email}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.contact_phone ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="+251-911-123456"
            />
            {errors.contact_phone && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.contact_phone}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Coverage Details
            </label>
            <textarea
              name="coverage_details"
              value={formData.coverage_details}
              onChange={handleInputChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what is covered under this warranty..."
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FaSave />
            {loading ? 'Adding...' : 'Add Warranty'}
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

export default WarrantyForm
