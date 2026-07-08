import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Wrench,
  Camera,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Upload,
  X,
  Clock,
  Zap,
  Info,
  Package
} from 'lucide-react'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

export default function NewMaintenanceRequest() {
  const { assetId } = useParams() // Optional: pre-select asset from URL
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast()
  
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    asset: assetId || '',
    category: 'OTHER',
    priority: 'MEDIUM',
    description: ''
  })
  
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [isAfterHours, setIsAfterHours] = useState(false)

  const categories = [
    { value: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
    { value: 'PLUMBING', label: 'Plumbing', icon: '🚰' },
    { value: 'HVAC', label: 'HVAC', icon: '❄️' },
    { value: 'STRUCTURAL', label: 'Structural', icon: '🏗️' },
    { value: 'EQUIPMENT', label: 'Equipment', icon: '⚙️' },
    { value: 'SAFETY', label: 'Safety', icon: '🛡️' },
    { value: 'CLEANING', label: 'Cleaning', icon: '🧹' },
    { value: 'OTHER', label: 'Other', icon: '📋' }
  ]

  const priorities = [
    { 
      value: 'EMERGENCY', 
      label: 'Emergency', 
      description: 'Immediate safety hazard or critical failure',
      sla: '24 hours',
      color: 'red',
      icon: '🚨'
    },
    { 
      value: 'HIGH', 
      label: 'High', 
      description: 'Significant impact on operations',
      sla: '72 hours',
      color: 'orange',
      icon: '⚠️'
    },
    { 
      value: 'MEDIUM', 
      label: 'Medium', 
      description: 'Moderate issue, can wait',
      sla: '7 days',
      color: 'blue',
      icon: '📌'
    },
    { 
      value: 'LOW', 
      label: 'Low', 
      description: 'Minor issue, no urgency',
      sla: '14 days',
      color: 'gray',
      icon: '📝'
    }
  ]

  useEffect(() => {
    fetchAssets()
    checkAfterHours()
  }, [])

  const checkAfterHours = () => {
    const now = new Date()
    const hour = now.getHours()
    setIsAfterHours(hour >= 18 || hour < 8)
  }

  const fetchAssets = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/owner/my-assets/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = response.data.results || response.data
      setAssets(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching assets:', err)
      showError('Failed to load your assets. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files)
    
    if (photoFiles.length + files.length > 5) {
      showWarning('Maximum 5 photos allowed')
      return
    }
    
    const validFiles = []
    const newPreviews = []
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        showError(`${file.name} is too large. Maximum size is 10MB`)
        continue
      }
      
      validFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }
    
    setPhotoFiles([...photoFiles, ...validFiles])
    setPhotoPreviews([...photoPreviews, ...newPreviews])
    
    if (validFiles.length > 0) {
      showSuccess(`${validFiles.length} photo(s) added successfully`)
    }
  }

  const removePhoto = (index) => {
    const newFiles = photoFiles.filter((_, i) => i !== index)
    const newPreviews = photoPreviews.filter((_, i) => i !== index)
    setPhotoFiles(newFiles)
    setPhotoPreviews(newPreviews)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.asset) {
      showError('Please select an asset')
      return
    }
    
    if (!formData.description.trim()) {
      showError('Please describe the issue')
      return
    }
    
    setSubmitting(true)
    
    try {
      const submitData = new FormData()
      submitData.append('asset', formData.asset)
      submitData.append('category', formData.category)
      submitData.append('priority', formData.priority)
      submitData.append('description', formData.description)
      
      // Append photos
      photoFiles.forEach((file, index) => {
        submitData.append(`photo_${index}`, file)
      })
      
      await axios.post(
        'http://localhost:8000/api/owner/my-requests/',
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      
      setSuccess(true)
      showSuccess('Maintenance request submitted successfully! Redirecting...')
      
      setTimeout(() => {
        navigate('/dashboard/owner/my-requests')
      }, 2000)
    } catch (err) {
      console.error('Error submitting request:', err)
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || 'Failed to submit request. Please try again.'
      showError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedPriority = priorities.find(p => p.value === formData.priority)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your maintenance request has been submitted successfully. You'll be notified when it's assigned to a technician.
          </p>
          <p className="text-sm text-gray-500">Redirecting to your requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/owner/my-requests')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to My Requests
        </button>
        
        <div className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <Wrench className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">New Maintenance Request</h1>
              <p className="text-orange-100 text-lg">
                Report an issue with your assigned assets
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* After Hours Alert */}
      {isAfterHours && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">After Hours Request</h3>
              <p className="text-sm text-yellow-800">
                You're submitting a request outside normal business hours (8 AM - 6 PM). 
                Emergency requests will be prioritized, but non-urgent requests may be processed during the next business day.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
        {/* Asset Selection */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Select Asset *
          </label>
          <select
            value={formData.asset}
            onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            required
          >
            <option value="">Choose an asset...</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.asset_id} - {asset.name} ({asset.asset_type})
              </option>
            ))}
          </select>
          {assets.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              No assets assigned to you. Contact your property manager if you need access to assets.
            </p>
          )}
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-3">
            Issue Category *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat.value })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.category === cat.value
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className="text-sm font-medium text-gray-900">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-3">
            Priority Level *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {priorities.map((priority) => (
              <button
                key={priority.value}
                type="button"
                onClick={() => setFormData({ ...formData, priority: priority.value })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.priority === priority.value
                    ? `border-${priority.color}-500 bg-${priority.color}-50 shadow-md`
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{priority.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 mb-1">{priority.label}</div>
                    <div className="text-xs text-gray-600 mb-1">{priority.description}</div>
                    <div className="text-xs font-medium text-gray-500">
                      SLA: {priority.sla}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {selectedPriority && (
            <div className={`mt-3 p-3 bg-${selectedPriority.color}-50 border border-${selectedPriority.color}-200 rounded-lg`}>
              <div className="flex items-start gap-2">
                <Info className={`h-4 w-4 text-${selectedPriority.color}-600 mt-0.5`} />
                <p className={`text-sm text-${selectedPriority.color}-800`}>
                  <strong>Expected Response:</strong> {selectedPriority.sla}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Issue Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={6}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            placeholder="Please describe the issue in detail. Include what happened, when it started, and any relevant information..."
            required
          />
          <p className="text-xs text-gray-500 mt-2">
            Be as specific as possible to help technicians diagnose and fix the issue quickly.
          </p>
        </div>

        {/* Photo Upload */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Photos (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="hidden"
              id="photo-upload"
              disabled={photoFiles.length >= 5}
            />
            <label
              htmlFor="photo-upload"
              className={`cursor-pointer ${photoFiles.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Click to upload photos
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Up to 5 photos, max 10MB each
              </p>
            </label>
          </div>

          {/* Photo Previews */}
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/dashboard/owner/my-requests')}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || assets.length === 0}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Submit Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
