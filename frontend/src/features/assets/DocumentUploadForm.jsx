import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaSave, FaTimes, FaFileUpload } from 'react-icons/fa'
import api from '../../services/api'

const DocumentUploadForm = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState([])
  const [message, setMessage] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  
  const [formData, setFormData] = useState({
    asset: '',
    document_type: 'MANUAL',
    title: '',
    description: '',
    uploaded_by: ''
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

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a file to upload' })
      return
    }

    try {
      setLoading(true)
      const submitData = new FormData()
      submitData.append('asset', formData.asset)
      submitData.append('document_type', formData.document_type)
      submitData.append('title', formData.title)
      submitData.append('description', formData.description)
      submitData.append('file', selectedFile)
      
      await api.post('/assets/documents/', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setMessage({ type: 'success', text: 'Document uploaded successfully!' })
      setTimeout(() => navigate('/dashboard/assets/management'), 1500)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to upload document' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FaFileUpload />
            Upload Document
          </h1>
          <p className="text-purple-100 text-lg">Attach documents to assets</p>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select Asset</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_id} - {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              name="document_type"
              value={formData.document_type}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="MANUAL">Manual</option>
              <option value="WARRANTY">Warranty</option>
              <option value="INVOICE">Invoice</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="PHOTO">Photo</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., User Manual"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Brief description of the document..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FaSave />
            {loading ? 'Uploading...' : 'Upload Document'}
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

export default DocumentUploadForm
