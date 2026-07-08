import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft, FaUser, FaEnvelope, FaLock, FaTools, FaMapMarkerAlt, FaCamera, FaSave, FaCertificate } from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

const EditTechnician = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [certificateFile, setCertificateFile] = useState(null)
  const [currentCertificateUrl, setCurrentCertificateUrl] = useState(null)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    specialization: '',
    assigned_campus: '',
    certifications: '',
    is_active: true
  })

  useEffect(() => {
    fetchTechnicianDetails()
  }, [id])

  const fetchTechnicianDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/users/users/${id}/`)
      const tech = response.data
      
      setFormData({
        username: tech.username || '',
        email: tech.email || '',
        first_name: tech.first_name || '',
        last_name: tech.last_name || '',
        specialization: tech.specialization || '',
        assigned_campus: tech.assigned_campus || '',
        certifications: tech.certifications || '',
        is_active: tech.is_active
      })
      
      if (tech.profile_photo) {
        setPhotoPreview(tech.profile_photo)
      }
      if (tech.certificate_file) {
        setCurrentCertificateUrl(tech.certificate_file)
      }
    } catch (error) {
      console.error('Error fetching technician details:', error)
      showError('Failed to load technician details.')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCertificateChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCertificateFile(file)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required.'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required.'
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required.'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showError('Please fix the errors in the form before submitting.')
      return
    }

    try {
      setSaving(true)
      const data = new FormData()
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key])
      })
      
      // Append photo if selected
      if (photoFile) {
        data.append('profile_photo', photoFile)
      }
      
      // Append certificate if selected
      if (certificateFile) {
        data.append('certificate_file', certificateFile)
      }

      await api.patch(`/users/users/${id}/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      showSuccess('Technician updated successfully!')
      setTimeout(() => {
        navigate('/dashboard/supervisor/technicians')
      }, 1500)
    } catch (err) {
      console.error('Error updating technician:', err)
      if (err.response?.data) {
        const errorsData = err.response.data
        const errorMessages = Object.entries(errorsData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('. ')
        showError(`Failed to update technician: ${errorMessages}`)
      } else {
        showError('Failed to update technician. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
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
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
             <FaUser />
             Edit Technician
          </h1>
          <p className="text-indigo-100 text-lg">Update technician details and profile</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto animate-scale-in">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {/* Profile Photo */}
          <div className="mb-10 text-center">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Profile Photo
            </label>
            <div className="flex flex-col items-center gap-4">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-4xl shadow-lg font-bold">
                  {formData.first_name?.[0]}{formData.last_name?.[0]}
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer px-6 py-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors inline-block font-medium shadow-sm"
                >
                  Change Photo
                </label>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF (max 5MB)</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Account Information Section */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Account Details</h3>
              <div className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-colors ${
                        errors.username ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-200 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.username && <p className="text-red-500 text-xs mt-1 font-medium">{errors.username}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-colors ${
                        errors.email ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-200 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
                </div>

                {/* Active Status */}
                <div className="mt-4 flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-sm font-bold text-gray-700 cursor-pointer">
                    Account is Active
                  </label>
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Personal Information</h3>
              <div className="space-y-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-colors ${
                      errors.first_name ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-200 focus:ring-indigo-500'
                    }`}
                  />
                  {errors.first_name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.first_name}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-colors ${
                      errors.last_name ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-200 focus:ring-indigo-500'
                    }`}
                  />
                  {errors.last_name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.last_name}</p>}
                </div>
              </div>
            </div>

            {/* Work Details Section */}
            <div className="md:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-100 mt-2">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Work Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Specialization */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
                  <div className="relative">
                    <FaTools className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                    >
                      <option value="">Select Specialization</option>
                      <option value="ELECTRICAL">Electrical</option>
                      <option value="PLUMBING">Plumbing</option>
                      <option value="HVAC">HVAC</option>
                      <option value="STRUCTURAL">Structural</option>
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </div>
                </div>

                {/* Assigned Campus */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Campus
                  </label>
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      value={formData.assigned_campus}
                      onChange={(e) => setFormData({ ...formData, assigned_campus: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                    >
                      <option value="">Select Campus</option>
                      <option value="Main Campus">Main Campus</option>
                      <option value="Burie Campus">Burie Campus</option>
                      <option value="Health Campus">Health Campus</option>
                    </select>
                  </div>
                </div>
                
                {/* Certifications */}
                <div className="md:col-span-2 mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certifications / Qualifications
                  </label>
                  <div className="relative">
                    <FaCertificate className="absolute left-3 top-3 text-gray-400" />
                    <textarea
                      value={formData.certifications}
                      onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[100px]"
                      placeholder="e.g. Certified Electrician, EPA Section 608 Certification..."
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">List relevant professional certifications separated by commas or new lines.</p>
                </div>

                {/* Certificate File Upload */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certificate Document (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleCertificateChange}
                      className="hidden"
                      id="certificate-upload"
                    />
                    <label
                      htmlFor="certificate-upload"
                      className="cursor-pointer px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-block text-sm font-medium"
                    >
                      {certificateFile ? 'Change Document' : 'Upload Document'}
                    </label>
                    <span className="text-sm text-gray-600">
                      {certificateFile ? certificateFile.name : (currentCertificateUrl ? 'Current document exists' : 'No file chosen')}
                    </span>
                  </div>
                  {currentCertificateUrl && !certificateFile && (
                    <div className="mt-2 text-sm">
                      <a href={currentCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                        View current document
                      </a>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Upload a scanned copy or PDF of the certificate (max 5MB)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 mt-8 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/dashboard/supervisor/technicians')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving Changes...
                </>
              ) : (
                <>
                  <FaSave /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTechnician
