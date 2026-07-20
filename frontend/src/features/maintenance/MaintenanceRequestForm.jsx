import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  FaSave, 
  FaTimes, 
  FaUpload, 
  FaImage,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa'
import api from '../../services/api'

const MaintenanceRequestForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const initialAssetId = queryParams.get('asset') ? Number(queryParams.get('asset')) : ''

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  
  // Form data
  const [formData, setFormData] = useState({
    asset: initialAssetId,
    category: 'ELECTRICAL',
    priority: 'MEDIUM',
    description: ''
  })
  
  // BR-OW-01: After-hours detection
  const [isAfterHours, setIsAfterHours] = useState(false)

  // Assets list
  const [assets, setAssets] = useState([])
  const [assetsLoading, setAssetsLoading] = useState(true)
  
  // Photo upload
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])

  // SLA information
  const slaInfo = {
    EMERGENCY: { hours: 24, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    HIGH: { hours: 72, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    MEDIUM: { hours: 168, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    LOW: { hours: 336, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
  }

  useEffect(() => {
    fetchAssets()
    checkAfterHours()
  }, [])
  
  const checkAfterHours = () => {
    // BR-OW-01: Check if current time is after hours (6PM-8AM)
    const now = new Date()
    const hour = now.getHours()
    setIsAfterHours(hour >= 18 || hour < 8)
  }

  const fetchAssets = async () => {
    try {
      setAssetsLoading(true)
      // Fetch only user's assigned assets from owner endpoint
      const response = await api.get('/owner/my-assets/')
      // Handle both paginated and non-paginated responses
      const data = response.data.results || response.data
      setAssets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching assets:', error)
      setMessage({ type: 'error', text: 'Failed to load your assets' })
      setAssets([])
    } finally {
      setAssetsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files)
    
    // Validate total number of photos
    if (photoFiles.length + files.length > 5) {
      setMessage({ type: 'error', text: 'Maximum 5 photos allowed' })
      return
    }
    
    // Validate each file
    const validFiles = []
    const newPreviews = []
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: 'error', text: `${file.name} is too large. Maximum size is 10MB` })
        continue
      }
      
      validFiles.push(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push({ file: file.name, preview: reader.result })
        if (newPreviews.length === validFiles.length) {
          setPhotoPreviews(prev => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    }
    
    setPhotoFiles(prev => [...prev, ...validFiles])
  }

  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.asset || !formData.description) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    try {
      setLoading(true)
      
      const submitData = new FormData()
      submitData.append('asset', formData.asset)
      submitData.append('category', formData.category)
      submitData.append('priority', formData.priority)
      submitData.append('description', formData.description)
      
      // Append multiple photos
      photoFiles.forEach((file, index) => {
        submitData.append(`photo_${index}`, file)
      })

      const response = await api.post('/maintenance/requests/', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setMessage({ 
        type: 'success', 
        text: `Maintenance request created successfully! Request ID: ${response.data.request_id}` 
      })
      
      setTimeout(() => {
        navigate('/dashboard/maintenance/requests')
      }, 2000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to create maintenance request' 
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedSLA = slaInfo[formData.priority]

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">New Maintenance Request</h1>
          <p className="text-purple-100 text-lg">Submit a maintenance request for an asset</p>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 animate-slide-down ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <FaCheckCircle className="text-2xl" /> : 
           <FaExclamationTriangle className="text-2xl" />}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="hover:opacity-70">
            <FaTimes />
          </button>
        </div>
      )}
      
      {/* BR-OW-01: After-hours warning */}
      {isAfterHours && formData.priority !== 'EMERGENCY' && (
        <div className="mb-6 p-4 rounded-xl border-2 bg-yellow-50 border-yellow-200 text-yellow-800 flex items-center gap-3 animate-slide-down">
          <FaExclamationTriangle className="text-2xl" />
          <div className="flex-1">
            <p className="font-semibold">After-Hours Request</p>
            <p className="text-sm">This request is being submitted outside business hours (6PM-8AM). Non-emergency requests will be scheduled for the next business day.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Asset Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Asset Information</h3>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Asset <span className="text-red-500">*</span>
            </label>
            {assetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-600">Loading your assets...</span>
              </div>
            ) : assets.length === 0 ? (
              <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-center">
                <FaExclamationTriangle className="text-4xl text-yellow-600 mx-auto mb-3" />
                <p className="font-semibold text-yellow-900 mb-2">No Assets Assigned</p>
                <p className="text-sm text-yellow-700">
                  You don't have any assets assigned to you. Please contact your administrator if you need to request maintenance for an asset.
                </p>
              </div>
            ) : (
              <>
                <select
                  name="asset"
                  value={formData.asset}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-gray-900 font-medium"
                >
                  <option value="">Choose an asset...</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.asset_id} - {asset.name} {asset.campus_name ? `(${asset.campus_name})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  Select the asset that requires maintenance
                </p>
              </>
            )}
          </div>
        </div>

        {/* Request Details */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Request Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="ELECTRICAL">Electrical</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="STRUCTURAL">Structural</option>
                <option value="EQUIPMENT">Equipment Repair</option>
                <option value="OTHER">Other</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Type of maintenance required
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="EMERGENCY">Emergency (24h)</option>
                <option value="HIGH">High (72h)</option>
                <option value="MEDIUM">Medium (7 days)</option>
                <option value="LOW">Low (14 days)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Urgency level of the request
              </p>
            </div>
          </div>

          {/* SLA Information */}
          <div className={`mt-6 p-4 rounded-lg border-2 ${selectedSLA.bgColor} ${selectedSLA.borderColor}`}>
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className={`text-2xl ${selectedSLA.color}`} />
              <div>
                <p className={`font-bold ${selectedSLA.color}`}>
                  Service Level Agreement (SLA)
                </p>
                <p className="text-sm text-gray-700">
                  This request will be addressed within {selectedSLA.hours} hours 
                  ({selectedSLA.hours / 24} {selectedSLA.hours / 24 === 1 ? 'day' : 'days'})
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows="6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Provide a detailed description of the maintenance issue..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Include as much detail as possible to help technicians understand the issue
            </p>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaImage className="text-purple-600" />
            Photos (Optional - Up to 5)
          </h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors">
            {photoPreviews.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photoPreviews.map((item, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={item.preview} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      >
                        <FaTimes className="text-sm" />
                      </button>
                      <p className="text-xs text-gray-600 mt-1 truncate">{item.file}</p>
                    </div>
                  ))}
                </div>
                {photoFiles.length < 5 && (
                  <div className="pt-4 border-t border-gray-200">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload-more"
                    />
                    <label
                      htmlFor="photo-upload-more"
                      className="cursor-pointer text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-2"
                    >
                      <FaUpload />
                      Add More Photos ({5 - photoFiles.length} remaining)
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <>
                <FaUpload className="text-5xl text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer text-purple-600 hover:text-purple-700 font-semibold"
                >
                  Click to upload photos
                </label>
                <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 10MB each (Maximum 5 photos)</p>
                <p className="text-xs text-gray-400 mt-1">
                  Multiple photos help technicians better understand the issue
                </p>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || assetsLoading}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaSave />
            {loading ? 'Submitting Request...' : 'Submit Request'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/maintenance/requests')}
            className="px-6 py-4 bg-gray-500 text-white rounded-xl font-bold hover:bg-gray-600 transition-all flex items-center gap-2"
          >
            <FaTimes />
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default MaintenanceRequestForm
