import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaClipboardCheck, 
  FaCheckCircle, 
  FaTimes,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaFileUpload,
  FaCalendarAlt
} from 'react-icons/fa'
import api from '../../services/api'

const AssetVerification = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [verifications, setVerifications] = useState([])
  const [assets, setAssets] = useState([])
  const [message, setMessage] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filter, setFilter] = useState('ALL')
  
  const [formData, setFormData] = useState({
    asset: '',
    verification_date: new Date().toISOString().split('T')[0],
    physical_condition: 'GOOD',
    location_verified: true,
    has_discrepancy: false,
    discrepancy_details: '',
    notes: ''
  })

  useEffect(() => {
    fetchVerifications()
    fetchAssets()
  }, [filter])

  const fetchVerifications = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filter === 'DISCREPANCY') params.has_discrepancy = true
      else if (filter !== 'ALL') params.status = filter
      
      const response = await api.get('/assets/verifications/', { params })
      const data = response.data.results || response.data
      setVerifications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching verifications:', error)
      setMessage({ type: 'error', text: 'Failed to load verifications' })
    } finally {
      setLoading(false)
    }
  }

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets/assets/')
      const data = response.data.results || response.data
      setAssets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching assets:', error)
    }
  }

  const handleCreateVerification = async (e) => {
    e.preventDefault()
    try {
      setActionLoading('create')
      await api.post('/assets/verifications/', formData)
      setMessage({ type: 'success', text: 'Verification record created successfully' })
      setShowCreateForm(false)
      setFormData({
        asset: '',
        verification_date: new Date().toISOString().split('T')[0],
        physical_condition: 'GOOD',
        location_verified: true,
        has_discrepancy: false,
        discrepancy_details: '',
        notes: ''
      })
      fetchVerifications()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to create verification' 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSubmitReport = async (verificationId) => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.pdf,.doc,.docx'
    
    fileInput.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        setActionLoading(verificationId)
        const formData = new FormData()
        formData.append('report_file', file)
        
        await api.post(`/assets/verifications/${verificationId}/submit_report/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        setMessage({ type: 'success', text: 'Discrepancy report submitted successfully' })
        fetchVerifications()
      } catch (error) {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.error || 'Failed to submit report' 
        })
      } finally {
        setActionLoading(null)
      }
    }
    
    fileInput.click()
  }

  const handleResolve = async (verificationId) => {
    const resolution_notes = prompt('Please provide resolution notes:')
    if (!resolution_notes) return

    try {
      setActionLoading(verificationId)
      await api.post(`/assets/verifications/${verificationId}/resolve/`, { resolution_notes })
      setMessage({ type: 'success', text: 'Discrepancy resolved successfully' })
      fetchVerifications()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to resolve discrepancy' 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownloadCertificate = async (verification) => {
    try {
      setActionLoading(`download-${verification.id}`)
      const response = await api.get(`/assets/verifications/${verification.id}/download_certificate/`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Certificate_${verification.asset}_${verification.id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      setMessage({ type: 'success', text: 'Certificate downloaded successfully' })
    } catch (error) {
      console.error('Error downloading certificate:', error)
      setMessage({ type: 'error', text: 'Failed to download certificate' })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (verification) => {
    if (verification.status === 'DISCREPANCY_RESOLVED') {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
          <FaCheckCircle />
          Resolved
        </span>
      )
    }
    
    if (verification.has_discrepancy) {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
          <FaExclamationTriangle />
          Discrepancy Found
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
        <FaCheckCircle />
        Verified
      </span>
    )
  }

  const getConditionBadge = (condition) => {
    const badges = {
      'EXCELLENT': { bg: 'bg-green-100', text: 'text-green-800' },
      'GOOD': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'FAIR': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      'POOR': { bg: 'bg-orange-100', text: 'text-orange-800' },
      'DAMAGED': { bg: 'bg-red-100', text: 'text-red-800' },
      'MISSING': { bg: 'bg-gray-100', text: 'text-gray-800' }
    }
    
    const badge = badges[condition] || badges['GOOD']
    
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
        {condition}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-emerald-400 opacity-20 rounded-full blur-3xl"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between relative z-10 gap-6">
            <div className="flex items-center gap-6">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/30">
                <FaClipboardCheck className="text-5xl text-white drop-shadow-md" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight drop-shadow-sm">Asset Verification</h1>
                <p className="text-emerald-100 text-lg font-medium">Physical verification and condition tracking hub</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white/40 text-white rounded-xl font-bold hover:bg-white hover:text-emerald-700 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] transition-all duration-300 transform hover:-translate-y-1"
            >
              {showCreateForm ? 'Cancel Verification' : 'Start New Verification'}
            </button>
          </div>
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

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 mb-8 border border-emerald-100 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <FaClipboardCheck size={20} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Create Verification Record</h3>
          </div>
          <form onSubmit={handleCreateVerification} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Asset <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.asset}
                  onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                  Verification Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.verification_date}
                  onChange={(e) => setFormData({ ...formData, verification_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Physical Condition <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.physical_condition}
                  onChange={(e) => setFormData({ ...formData, physical_condition: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="MISSING">Missing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location Verified
                </label>
                <select
                  value={formData.location_verified}
                  onChange={(e) => setFormData({ ...formData, location_verified: e.target.value === 'true' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_discrepancy}
                    onChange={(e) => setFormData({ ...formData, has_discrepancy: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">Has Discrepancy</span>
                </label>
              </div>

              {formData.has_discrepancy && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Discrepancy Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.discrepancy_details}
                    onChange={(e) => setFormData({ ...formData, discrepancy_details: e.target.value })}
                    required={formData.has_discrepancy}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Describe the discrepancy found..."
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading === 'create'}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all disabled:opacity-50"
            >
              {actionLoading === 'create' ? 'Creating...' : 'Create Verification'}
            </button>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-4 mb-8 border border-gray-100 flex justify-center">
        <div className="flex gap-2 flex-wrap bg-gray-100/50 p-1.5 rounded-xl">
          {['ALL', 'VERIFIED', 'DISCREPANCY', 'DISCREPANCY_RESOLVED'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm tracking-wide transition-all duration-300 ${
                filter === status
                  ? 'bg-white text-emerald-700 shadow-[0_2px_10px_rgba(0,0,0,0.08)] ring-1 ring-emerald-100/50'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Verifications List */}
      {verifications.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-xl rounded-3xl shadow-sm p-16 text-center border border-gray-100 border-dashed">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaClipboardCheck className="text-4xl text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Verifications Found</h3>
          <p className="text-gray-500">There are no asset verification records matching your current filter.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {verifications.map(verification => (
            <div key={verification.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-800">
                      {verification.asset_name || verification.asset}
                    </h3>
                    {getStatusBadge(verification)}
                  </div>
                  <p className="text-sm text-gray-500">Verification ID: {verification.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <FaCalendarAlt className="text-gray-600" />
                    <p className="text-sm text-gray-600">Date</p>
                  </div>
                  <p className="font-semibold text-gray-800">
                    {new Date(verification.verification_date).toLocaleDateString()}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Condition</p>
                  {getConditionBadge(verification.physical_condition)}
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <FaMapMarkerAlt className="text-green-600" />
                    <p className="text-sm text-gray-600">Location</p>
                  </div>
                  <p className="font-semibold text-gray-800">
                    {verification.location_verified ? 'Verified' : 'Not Verified'}
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Verified By</p>
                  <p className="font-semibold text-gray-800">
                    {verification.verified_by_name || verification.verified_by}
                  </p>
                </div>
              </div>

              {verification.notes && (
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <p className="text-gray-800">{verification.notes}</p>
                </div>
              )}

              {verification.has_discrepancy && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-100 mb-4">
                  <p className="text-sm text-red-600 font-semibold mb-2">Discrepancy Details</p>
                  <p className="text-red-800 mb-3">{verification.discrepancy_details}</p>
                  
                  {!verification.discrepancy_report_submitted && (
                    <div className="flex items-center gap-2 text-orange-600 text-sm">
                      <FaExclamationTriangle />
                      <span>Report must be submitted within 14 days</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {verification.has_discrepancy && !verification.discrepancy_report_submitted && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleSubmitReport(verification.id)}
                    disabled={actionLoading === verification.id}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FaFileUpload />
                    Submit Discrepancy Report
                  </button>
                </div>
              )}

              {verification.has_discrepancy && verification.discrepancy_report_submitted && verification.status !== 'DISCREPANCY_RESOLVED' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleResolve(verification.id)}
                    disabled={actionLoading === verification.id}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FaCheckCircle />
                    Resolve Discrepancy
                  </button>
                </div>
              )}

              {verification.status === 'DISCREPANCY_RESOLVED' && verification.resolution_notes && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-sm text-green-600 font-semibold mb-1">Resolution Notes</p>
                    <p className="text-green-800">{verification.resolution_notes}</p>
                  </div>
                </div>
              )}
              {/* Download Certificate Button */}
              {(!verification.has_discrepancy || verification.status === 'DISCREPANCY_RESOLVED') && (
                <div className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
                  <button
                    onClick={() => handleDownloadCertificate(verification)}
                    disabled={actionLoading === `download-${verification.id}`}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-[0_4px_15px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 -translate-x-full group-hover:translate-x-[250%] transition-transform duration-700 ease-in-out"></div>
                    <FaClipboardCheck className="text-lg relative z-10" />
                    <span className="relative z-10 tracking-wide">{actionLoading === `download-${verification.id}` ? 'Generating Premium Certificate...' : 'Download Official Certificate'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AssetVerification
