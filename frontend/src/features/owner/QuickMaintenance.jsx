import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Wrench,
  Camera,
  Mic,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader,
  X,
  Zap
} from 'lucide-react'

export default function QuickMaintenance() {
  const { assetId } = useParams()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    priority: 'MEDIUM',
    category: 'OTHER',
    description: '',
    photo: null
  })
  
  const [photoPreview, setPhotoPreview] = useState(null)
  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    fetchAsset()
  }, [assetId])

  const fetchAsset = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/assets/assets/${assetId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setAsset(response.data)
    } catch (err) {
      console.error('Error fetching asset:', err)
      setError('Failed to load asset')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({ ...formData, photo: file })
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const removePhoto = () => {
    setFormData({ ...formData, photo: null })
    setPhotoPreview(null)
  }

  const startVoiceRecording = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        setIsRecording(true)
      }
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setFormData({
          ...formData,
          description: formData.description + (formData.description ? ' ' : '') + transcript
        })
      }
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setError('Voice recognition failed. Please type instead.')
        setIsRecording(false)
      }
      
      recognition.onend = () => {
        setIsRecording(false)
      }
      
      recognition.start()
    } else {
      setError('Voice recognition not supported in this browser')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.description.trim()) {
      setError('Please describe the issue')
      return
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      const submitData = new FormData()
      submitData.append('asset_id', asset.asset_id)
      submitData.append('priority', formData.priority)
      submitData.append('category', formData.category)
      submitData.append('description', formData.description)
      
      if (formData.photo) {
        submitData.append('photo', formData.photo)
      }
      
      const response = await axios.post(
        'http://localhost:8000/api/owner/qr/quick-maintenance/',
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      
      setSuccess(true)
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard/owner/my-requests')
      }, 2000)
    } catch (err) {
      console.error('Error submitting maintenance request:', err)
      setError(err.response?.data?.error || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your maintenance request has been submitted successfully. You'll be redirected to your requests page.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader className="h-4 w-4 animate-spin" />
            Redirecting...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quick Maintenance</h1>
              <p className="text-sm text-gray-600">Report an issue quickly</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Asset Info */}
        {asset && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                <Wrench className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{asset.name}</h2>
                <p className="text-sm text-gray-600">{asset.asset_id}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Priority Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'LOW', label: 'Low', color: 'from-blue-500 to-blue-600' },
                { value: 'MEDIUM', label: 'Medium', color: 'from-yellow-500 to-yellow-600' },
                { value: 'HIGH', label: 'High', color: 'from-orange-500 to-orange-600' },
                { value: 'EMERGENCY', label: 'Emergency', color: 'from-red-500 to-red-600' }
              ].map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: priority.value })}
                  className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                    formData.priority === priority.value
                      ? `bg-gradient-to-r ${priority.color} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none"
            >
              <option value="ELECTRICAL">Electrical</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="HVAC">HVAC</option>
              <option value="STRUCTURAL">Structural</option>
              <option value="EQUIPMENT">Equipment Repair</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Describe the Issue
            </label>
            <div className="relative">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What's the problem?"
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={startVoiceRecording}
                disabled={isRecording}
                className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Mic className="h-5 w-5" />
              </button>
            </div>
            {isRecording && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                Listening...
              </p>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Add Photo (Optional)
            </label>
            
            {!photoPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <Camera className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Tap to capture photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !formData.description.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Submit Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
