import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaTrash, 
  FaCheckCircle, 
  FaTimes,
  FaHourglassHalf,
  FaClock,
  FaDollarSign,
  FaUser,
  FaExclamationTriangle,
  FaClipboardList
} from 'react-icons/fa'
import api from '../../services/api'

const AssetDisposal = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [disposals, setDisposals] = useState([])
  const [assets, setAssets] = useState([])
  const [message, setMessage] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filter, setFilter] = useState('PENDING_COMMITTEE')
  
  const [formData, setFormData] = useState({
    asset: '',
    disposal_method: 'SALE',
    reason: '',
    estimated_value: ''
  })

  useEffect(() => {
    fetchDisposals()
    fetchAssets()
  }, [filter])

  const fetchDisposals = async () => {
    try {
      setLoading(true)
      const params = {}
      
      // Only add status filter if not 'ALL'
      if (filter !== 'ALL') {
        params.status = filter
      }
      
      const response = await api.get('/assets/disposals/', { params })
      const data = response.data.results || response.data
      setDisposals(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching disposals:', error)
      // Don't show error message on initial load, just log it
      if (error.response?.status !== 400) {
        setMessage({ type: 'error', text: 'Failed to load disposals' })
      }
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

  const handleCreateDisposal = async (e) => {
    e.preventDefault()
    try {
      setActionLoading('create')
      await api.post('/assets/disposals/', formData)
      setMessage({ type: 'success', text: 'Disposal request created successfully' })
      setShowCreateForm(false)
      setFormData({ asset: '', disposal_method: 'SALE', reason: '', estimated_value: '' })
      fetchDisposals()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to create disposal request' 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCommitteeApprove = async (disposalId) => {
    const notes = prompt('Committee notes (optional):')
    try {
      setActionLoading(disposalId)
      await api.post(`/assets/disposals/${disposalId}/committee_approve/`, { notes: notes || '' })
      setMessage({ type: 'success', text: 'Disposal approved by committee' })
      fetchDisposals()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to approve disposal' 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCommitteeReject = async (disposalId) => {
    const notes = prompt('Please provide rejection notes:')
    if (!notes) return

    try {
      setActionLoading(disposalId)
      await api.post(`/assets/disposals/${disposalId}/committee_reject/`, { notes })
      setMessage({ type: 'success', text: 'Disposal rejected by committee' })
      fetchDisposals()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to reject disposal' 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleManagerApprove = async (disposalId) => {
    const notes = prompt('Property manager notes (optional):')
    try {
      setActionLoading(disposalId)
      await api.post(`/assets/disposals/${disposalId}/manager_approve/`, { notes: notes || '' })
      setMessage({ type: 'success', text: 'Disposal approved by property manager' })
      fetchDisposals()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to approve disposal' 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleManagerReject = async (disposalId) => {
    const notes = prompt('Please provide rejection notes:')
    if (!notes) return

    try {
      setActionLoading(disposalId)
      await api.post(`/assets/disposals/${disposalId}/manager_reject/`, { notes })
      setMessage({ type: 'success', text: 'Disposal rejected by property manager' })
      fetchDisposals()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to reject disposal' 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING_COMMITTEE': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaHourglassHalf, label: 'Pending Committee' },
      'COMMITTEE_APPROVED': { bg: 'bg-blue-100', text: 'text-blue-800', icon: FaClock, label: 'Pending Manager' },
      'PENDING_MANAGER': { bg: 'bg-blue-100', text: 'text-blue-800', icon: FaClock, label: 'Pending Manager' },
      'MANAGER_APPROVED': { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle, label: 'Approved' },
      'COMMITTEE_REJECTED': { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimes, label: 'Committee Rejected' },
      'MANAGER_REJECTED': { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimes, label: 'Manager Rejected' }
    }
    
    const badge = badges[status] || badges['PENDING_COMMITTEE']
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
        <Icon />
        {badge.label}
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
        <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FaTrash className="text-6xl opacity-80" />
              <div>
                <h1 className="text-4xl font-bold mb-2">Asset Disposal Management</h1>
                <p className="text-red-100 text-lg">Request and manage asset disposal approvals</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-white text-red-600 rounded-xl font-bold hover:shadow-xl transition-all"
            >
              {showCreateForm ? 'Cancel' : 'New Disposal Request'}
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
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Create Disposal Request</h3>
          <form onSubmit={handleCreateDisposal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Asset <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.asset}
                  onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select Asset</option>
                  {assets.map(asset => (
                    <option key={asset.asset_id} value={asset.asset_id}>
                      {asset.asset_id} - {asset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Disposal Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.disposal_method}
                  onChange={(e) => setFormData({ ...formData, disposal_method: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="SALE">Sale</option>
                  <option value="DONATION">Donation</option>
                  <option value="SCRAP">Scrap</option>
                  <option value="DESTRUCTION">Destruction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estimated Value (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Disposal <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Explain why this asset should be disposed..."
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading === 'create'}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {actionLoading === 'create' ? 'Creating...' : 'Create Disposal Request'}
            </button>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'PENDING_COMMITTEE', 'PENDING_MANAGER', 'MANAGER_APPROVED', 'COMMITTEE_REJECTED', 'MANAGER_REJECTED'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === status
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Disposals List */}
      {disposals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <FaTrash className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-500">No disposal requests found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {disposals.map(disposal => (
            <div key={disposal.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-800">
                      {disposal.asset_name || disposal.asset}
                    </h3>
                    {getStatusBadge(disposal.status)}
                  </div>
                  <p className="text-sm text-gray-500">Disposal ID: {disposal.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Disposal Method</p>
                  <p className="font-semibold text-gray-800">{disposal.disposal_method}</p>
                </div>

                {disposal.estimated_value && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FaDollarSign className="text-green-600" />
                      <p className="text-sm text-gray-600">Estimated Value</p>
                    </div>
                    <p className="font-semibold text-gray-800">{disposal.estimated_value} ETB</p>
                  </div>
                )}

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <FaUser className="text-blue-600" />
                    <p className="text-sm text-gray-600">Requested By</p>
                  </div>
                  <p className="font-semibold text-gray-800">{disposal.requested_by_name || disposal.requested_by}</p>
                </div>
              </div>

              {disposal.reason && (
                <div className="p-4 bg-gray-50 rounded-lg mb-6">
                  <p className="text-sm text-gray-600 mb-1">Reason</p>
                  <p className="text-gray-800">{disposal.reason}</p>
                </div>
              )}

              {/* Committee Actions */}
              {disposal.status === 'PENDING_COMMITTEE' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleCommitteeApprove(disposal.id)}
                    disabled={actionLoading === disposal.id}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FaCheckCircle />
                    Committee Approve
                  </button>
                  <button
                    onClick={() => handleCommitteeReject(disposal.id)}
                    disabled={actionLoading === disposal.id}
                    className="px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <FaTimes />
                    Committee Reject
                  </button>
                </div>
              )}

              {/* Manager Actions */}
              {(disposal.status === 'PENDING_MANAGER' || disposal.status === 'COMMITTEE_APPROVED') && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleManagerApprove(disposal.id)}
                    disabled={actionLoading === disposal.id}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FaCheckCircle />
                    Manager Approve
                  </button>
                  <button
                    onClick={() => handleManagerReject(disposal.id)}
                    disabled={actionLoading === disposal.id}
                    className="px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <FaTimes />
                    Manager Reject
                  </button>
                </div>
              )}

              {disposal.status === 'MANAGER_APPROVED' && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-green-600">
                    <FaCheckCircle />
                    <span className="font-semibold">Disposal approved - Asset marked for disposal</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AssetDisposal
