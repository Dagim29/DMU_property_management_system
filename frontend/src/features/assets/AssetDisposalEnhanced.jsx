import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { 
  FaTrash, 
  FaCheckCircle, 
  FaTimes,
  FaHourglassHalf,
  FaClock,
  FaDollarSign,
  FaUser,
  FaExclamationTriangle,
  FaClipboardList,
  FaFileAlt,
  FaCalendarAlt,
  FaInfoCircle,
  FaSearch,
  FaFilter,
  FaPlus,
  FaArrowRight,
  FaArrowLeft,
  FaBuilding,
  FaTag,
  FaDownload
} from 'react-icons/fa'
import api from '../../services/api'
import { generateDisposalCertificate } from '../../utils/pdfExportUtils'

const AssetDisposalEnhanced = () => {
  const navigate = useNavigate()
  const currentUser = useSelector((state) => state.auth.user)
  
  // State management
  const [loading, setLoading] = useState(true)
  const [disposals, setDisposals] = useState([])
  const [allDisposals, setAllDisposals] = useState([])
  const [assets, setAssets] = useState([])
  const [message, setMessage] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [documentationFile, setDocumentationFile] = useState(null)
  const [disposalDate, setDisposalDate] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  
  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedDisposal, setSelectedDisposal] = useState(null)
  const [approvalAction, setApprovalAction] = useState(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [activeTab, setActiveTab] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Form data
  const [formData, setFormData] = useState({
    asset: '',
    disposal_method: 'SALE',
    reason: '',
    estimated_value: '',
    disposal_category: '',
    planned_disposal_date: '',
    documentation: '',
    environmental_impact: ''
  })

  useEffect(() => {
    fetchDisposals()
    if (showCreateModal) {
      fetchAssets()
    }
  }, [activeTab, statusFilter])

  const fetchDisposals = async () => {
    try {
      setLoading(true)
      const params = {}
      
      if (statusFilter) {
        params.status = statusFilter
      }

      const response = await api.get('/assets/disposals/', { params })
      const data = response.data.results || response.data
      let allData = Array.isArray(data) ? data : []
      
      // Store all disposals for statistics
      setAllDisposals(allData)
      
      // Client-side filtering based on tab
      let filteredData = allData
      if (activeTab === 'pending') {
        filteredData = allData.filter(d => 
          d.status === 'PENDING_MANAGER'
        )
      } else if (activeTab === 'my-requests') {
        filteredData = allData.filter(d => d.requested_by === currentUser?.id)
      } else if (activeTab === 'approved') {
        filteredData = allData.filter(d => d.status === 'APPROVED')
      } else if (activeTab === 'rejected') {
        filteredData = allData.filter(d => 
          d.status === 'COMMITTEE_REJECTED' || d.status === 'REJECTED'
        )
      }
      
      setDisposals(filteredData)
    } catch (error) {
      console.error('Error fetching disposals:', error)
      setDisposals([])
      setAllDisposals([])
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
      setAssets([])
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateDisposal = async (e) => {
    e.preventDefault()
    
    if (!formData.asset) {
      setMessage({ type: 'error', text: 'Please select an asset' })
      return
    }

    if (!formData.reason) {
      setMessage({ type: 'error', text: 'Please provide a reason for disposal' })
      return
    }

    if (formData.planned_disposal_date) {
      const selectedDate = new Date(formData.planned_disposal_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        setMessage({ type: 'error', text: 'Planned disposal date cannot be in the past' })
        return
      }
    }

    try {
      setActionLoading('create')
      
      const submitData = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (value) submitData.append(key, value)
      })
      if (documentationFile) submitData.append('documentation_file', documentationFile)

      await api.post('/assets/disposals/', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setMessage({ type: 'success', text: 'Disposal request submitted successfully!' })
      setShowCreateModal(false)
      setCurrentStep(1)
      setFormData({
        asset: '',
        disposal_method: 'SALE',
        reason: '',
        estimated_value: '',
        disposal_category: '',
        planned_disposal_date: '',
        documentation: '',
        environmental_impact: ''
      })
      setDocumentationFile(null)
      fetchDisposals()
      
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to create disposal request' 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleApprovalClick = (disposal, action) => {
    setSelectedDisposal(disposal)
    setApprovalAction(action)
    setApprovalNotes('')
    setShowApprovalModal(true)
  }

  const handleApprovalSubmit = async () => {
    if (!selectedDisposal || !approvalAction) return

    // Validate rejection notes
    if ((approvalAction === 'committee_reject' || approvalAction === 'manager_reject') && !approvalNotes) {
      setMessage({ type: 'error', text: 'Rejection notes are required' })
      return
    }

    try {
      setActionLoading('approval')
      
      const endpoint = `/assets/disposals/${selectedDisposal.id}/${approvalAction}/`
      
      if (approvalAction === 'complete') {
        const submitData = new FormData()
        submitData.append('disposal_date', disposalDate)
        submitData.append('final_notes', approvalNotes)
        if (receiptFile) submitData.append('disposal_receipt', receiptFile)
        
        await api.post(endpoint, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await api.post(endpoint, { notes: approvalNotes })
      }
      
      setMessage({ 
        type: 'success', 
        text: `Disposal ${approvalAction === 'complete' ? 'completed' : approvalAction.replace('_', ' ')} successfully!` 
      })
      
      setShowApprovalModal(false)
      fetchDisposals()
      setDisposalDate('')
      setReceiptFile(null)
      
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to process approval' 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING_MANAGER': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: FaClock, label: 'Pending Manager' },
      'APPROVED': { color: 'bg-green-100 text-green-800 border-green-200', icon: FaCheckCircle, label: 'Approved' },
      'REJECTED': { color: 'bg-red-100 text-red-800 border-red-200', icon: FaTimes, label: 'Rejected' }
    }
    
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FaInfoCircle, label: status }
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
        <Icon className="text-sm" />
        {badge.label}
      </span>
    )
  }

  const canApproveManager = (disposal) => {
    return disposal.status === 'PENDING_MANAGER' && 
           ['SUPER_ADMIN', 'PROPERTY_MANAGER'].includes(currentUser?.role)
  }

  const filteredDisposals = disposals.filter(disposal => {
    const matchesSearch = 
      disposal.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      disposal.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      disposal.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const stats = {
    pendingManager: allDisposals.filter(d => d.status === 'PENDING_MANAGER').length,
    approved: allDisposals.filter(d => d.status === 'APPROVED').length,
    completed: allDisposals.filter(d => d.status === 'COMPLETED').length,
    rejected: allDisposals.filter(d => d.status === 'REJECTED').length
  }

  const selectedAsset = assets.find(a => a.id === parseInt(formData.asset))

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Asset Disposal Management</h1>
              <p className="text-red-100 text-lg">Property manager approval workflow</p>
            </div>
            <button
              onClick={() => {
                setShowCreateModal(true)
                fetchAssets()
              }}
              className="px-6 py-3 bg-white text-red-600 rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
            >
              <FaPlus />
              New Disposal Request
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Pending Approval</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.pendingManager}</h3>
            </div>
            <FaClock className="text-4xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Approved</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.approved}</h3>
            </div>
            <FaCheckCircle className="text-4xl text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Completed</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.completed}</h3>
            </div>
            <FaCheckCircle className="text-4xl text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Rejected</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.rejected}</h3>
            </div>
            <FaTimes className="text-4xl text-red-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'pending'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pending Approvals
            </button>
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'my-requests'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              My Requests
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'approved'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'rejected'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              All Disposals
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px] relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by asset ID, name, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            >
              <option value="">All Status</option>
              <option value="PENDING_MANAGER">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Disposal List */}
        <div className="p-6">
          {filteredDisposals.length === 0 ? (
            <div className="text-center py-12">
              <FaTrash className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No disposal requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDisposals.map((disposal) => (
                <div
                  key={disposal.id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">
                          Disposal #{disposal.id}
                        </h3>
                        {getStatusBadge(disposal.status)}
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <FaCalendarAlt />
                        Submitted: {new Date(disposal.request_date).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Asset Info */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FaTag className="text-red-600" />
                        Asset
                      </h4>
                      <p className="text-sm font-semibold">{disposal.asset_id || disposal.asset}</p>
                      <p className="text-sm text-gray-600">{disposal.asset_name}</p>
                    </div>

                    {/* Disposal Method */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-2">Method</h4>
                      <p className="text-sm font-semibold">{disposal.disposal_method}</p>
                    </div>

                    {/* Estimated Value */}
                    {disposal.estimated_value && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <FaDollarSign className="text-green-600" />
                          Estimated Value
                        </h4>
                        <p className="text-sm font-semibold">{disposal.estimated_value} ETB</p>
                      </div>
                    )}
                  </div>

                  {/* Reason */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-1">Reason</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {disposal.reason}
                    </p>
                  </div>

                  {/* Requested By */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <FaUser />
                      Requested by: <span className="font-semibold">{disposal.requested_by_name || 'Unknown'}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    {/* Committee actions removed as per user request */}

                    {canApproveManager(disposal) && (
                      <div className="flex w-full gap-2">
                        <button
                          onClick={() => handleApprovalClick(disposal, 'manager_approve')}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-sm hover:shadow-md"
                        >
                          <FaCheckCircle />
                          Approve Request
                        </button>
                        <button
                          onClick={() => handleApprovalClick(disposal, 'manager_reject')}
                          className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-sm hover:shadow-md"
                        >
                          <FaTimes />
                          Decline
                        </button>
                      </div>
                    )}

                    {disposal.status === 'APPROVED' && ['SUPER_ADMIN', 'PROPERTY_MANAGER'].includes(currentUser?.role) && (
                      <button
                        onClick={() => handleApprovalClick(disposal, 'complete')}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-sm hover:shadow-md"
                      >
                        <FaCheckCircle />
                        Execute Final Disposal
                      </button>
                    )}

                    {disposal.status === 'COMPLETED' && (
                      <div className="flex w-full items-center justify-between gap-2 py-2 px-4 bg-gray-50 rounded-lg text-gray-700 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <FaCheckCircle className="text-emerald-500 text-lg" />
                          <span className="font-semibold text-emerald-700">Disposal Completed</span>
                        </div>
                        <button
                          onClick={() => generateDisposalCertificate(disposal)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm"
                        >
                          <FaDownload />
                          Certificate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Disposal Modal - Multi-Step Form */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-down shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Create Disposal Request</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setCurrentStep(1)
                    setFormData({
                      asset: '',
                      disposal_method: 'SALE',
                      reason: '',
                      estimated_value: '',
                      disposal_category: '',
                      planned_disposal_date: '',
                      documentation: '',
                      environmental_impact: ''
                    })
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {[
                  { num: 1, label: 'Asset Selection', icon: FaTag },
                  { num: 2, label: 'Disposal Details', icon: FaClipboardList },
                  { num: 3, label: 'Review & Submit', icon: FaCheckCircle }
                ].map((step, index) => (
                  <div key={step.num} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                        currentStep >= step.num 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {currentStep > step.num ? (
                          <FaCheckCircle />
                        ) : (
                          <step.icon />
                        )}
                      </div>
                      <span className={`mt-2 text-sm font-semibold ${
                        currentStep >= step.num ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < 2 && (
                      <div className={`h-1 flex-1 mx-2 transition-all ${
                        currentStep > step.num ? 'bg-red-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateDisposal}>
              {/* Step 1: Asset Selection */}
              {currentStep === 1 && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Select Asset for Disposal</h3>
                    <p className="text-gray-600 mb-6">Choose the asset you want to dispose of</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Asset <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="asset"
                      value={formData.asset}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Select Asset</option>
                      {assets.map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.asset_id} - {asset.name} ({asset.status})
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      Select the asset that needs to be disposed
                    </p>
                  </div>

                  {/* Asset Preview */}
                  {selectedAsset && (
                    <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <h4 className="font-semibold text-gray-700 mb-3">Selected Asset Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Asset ID:</span>
                          <span className="ml-2 font-semibold">{selectedAsset.asset_id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <span className="ml-2 font-semibold">{selectedAsset.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-2 font-semibold">{selectedAsset.asset_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className="ml-2 font-semibold">{selectedAsset.status}</span>
                        </div>
                        {selectedAsset.purchase_cost && (
                          <div>
                            <span className="text-gray-600">Purchase Cost:</span>
                            <span className="ml-2 font-semibold">{selectedAsset.purchase_cost} ETB</span>
                          </div>
                        )}
                        {selectedAsset.current_value && (
                          <div>
                            <span className="text-gray-600">Current Value:</span>
                            <span className="ml-2 font-semibold">{selectedAsset.current_value} ETB</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      disabled={!formData.asset}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next: Disposal Details
                      <FaArrowRight />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Disposal Details */}
              {currentStep === 2 && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Disposal Details</h3>
                    <p className="text-gray-600 mb-6">Provide information about the disposal</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Disposal Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="disposal_method"
                        value={formData.disposal_method}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="SALE">Sale</option>
                        <option value="DONATION">Donation</option>
                        <option value="SCRAP">Scrap</option>
                        <option value="DESTRUCTION">Destruction</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Disposal Category
                      </label>
                      <select
                        name="disposal_category"
                        value={formData.disposal_category}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="">Select Category</option>
                        <option value="END_OF_LIFE">End of Life</option>
                        <option value="OBSOLETE">Obsolete</option>
                        <option value="DAMAGED">Damaged Beyond Repair</option>
                        <option value="SURPLUS">Surplus</option>
                        <option value="UPGRADE">Upgrade/Replacement</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Estimated Value (ETB)
                      </label>
                      <div className="relative">
                        <FaDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          name="estimated_value"
                          value={formData.estimated_value}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Expected value from sale or scrap
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Planned Disposal Date
                      </label>
                      <input
                        type="date"
                        name="planned_disposal_date"
                        value={formData.planned_disposal_date}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reason for Disposal <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      required
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Explain why this asset should be disposed..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Provide detailed justification for the disposal
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Environmental Impact Assessment
                    </label>
                    <textarea
                      name="environmental_impact"
                      value={formData.environmental_impact}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Describe any environmental considerations..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Supporting Documentation
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setDocumentationFile(e.target.files[0])}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Upload any supporting documents (PDF, images, etc.)
                    </p>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      <FaArrowLeft />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      disabled={!formData.reason}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next: Review
                      <FaArrowRight />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {currentStep === 3 && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Review Disposal Request</h3>
                    <p className="text-gray-600 mb-6">Please review all details before submitting</p>
                  </div>

                  {/* Asset Information */}
                  {selectedAsset && (
                    <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-red-600">
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FaTag className="text-red-600" />
                        Asset Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Asset ID:</span>
                          <span className="ml-2 font-semibold">{selectedAsset.asset_id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <span className="ml-2 font-semibold">{selectedAsset.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-2 font-semibold">{selectedAsset.asset_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Current Status:</span>
                          <span className="ml-2 font-semibold">{selectedAsset.status}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Disposal Details */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FaClipboardList className="text-blue-600" />
                      Disposal Details
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-600">Method:</span>
                          <span className="ml-2 font-semibold">{formData.disposal_method}</span>
                        </div>
                        {formData.disposal_category && (
                          <div>
                            <span className="text-gray-600">Category:</span>
                            <span className="ml-2 font-semibold">{formData.disposal_category.replace('_', ' ')}</span>
                          </div>
                        )}
                        {formData.estimated_value && (
                          <div>
                            <span className="text-gray-600">Estimated Value:</span>
                            <span className="ml-2 font-semibold">{formData.estimated_value} ETB</span>
                          </div>
                        )}
                        {formData.planned_disposal_date && (
                          <div>
                            <span className="text-gray-600">Planned Date:</span>
                            <span className="ml-2 font-semibold">{new Date(formData.planned_disposal_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-600">Reason:</span>
                        <p className="mt-1 p-3 bg-white rounded border border-gray-200">
                          {formData.reason}
                        </p>
                      </div>
                      {formData.environmental_impact && (
                        <div>
                          <span className="text-gray-600">Environmental Impact:</span>
                          <p className="mt-1 p-3 bg-white rounded border border-gray-200">
                            {formData.environmental_impact}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approval Process Info */}
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <FaInfoCircle className="text-blue-600 text-2xl mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">Manager Approval Process</h4>
                        <p className="text-sm text-blue-700 mb-2">
                          This disposal request will be sent directly to the Property Manager for review and final execution.
                        </p>
                        <div className="flex flex-col gap-2 mt-3">
                          <div className="flex items-center gap-3 text-xs text-blue-700 bg-white p-2 rounded shadow-sm">
                            <span className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full font-bold">1</span>
                            <span>Manager reviews request details</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-blue-700 bg-white p-2 rounded shadow-sm">
                            <span className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full font-bold">2</span>
                            <span>Manager approves or declines request</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-blue-700 bg-white p-2 rounded shadow-sm">
                            <span className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full font-bold">3</span>
                            <span>Asset is marked for final disposal</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      <FaArrowLeft />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading === 'create'}
                      className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {actionLoading === 'create' ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </span>
                      ) : (
                        <>
                          <FaCheckCircle />
                          Execute Asset Disposal
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedDisposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-down shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                {approvalAction === 'complete' ? 'Execute Final Disposal' : approvalAction?.includes('reject') ? 'Decline Disposal Request' : 'Approve Disposal Request'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Disposal Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Disposal Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-600">Asset:</span> <span className="font-semibold">{selectedDisposal.asset_id}</span></p>
                  <p><span className="text-gray-600">Method:</span> {selectedDisposal.disposal_method}</p>
                  <p><span className="text-gray-600">Reason:</span> {selectedDisposal.reason}</p>
                </div>
              </div>

              {/* Execution Fields for Completion */}
              {approvalAction === 'complete' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Disposal Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={disposalDate}
                      onChange={(e) => setDisposalDate(e.target.value)}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Disposal Receipt/Certificate
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setReceiptFile(e.target.files[0])}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {approvalAction === 'complete' ? 'Final Notes' : approvalAction?.includes('reject') ? 'Rejection Reason' : 'Approval Notes'} 
                  {approvalAction?.includes('reject') && <span className="text-red-500"> *</span>}
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows="4"
                  required={approvalAction?.includes('reject')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder={approvalAction?.includes('reject') ? 'Explain why this disposal is being rejected...' : 'Add any notes or comments...'}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={actionLoading === 'approval'}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovalSubmit}
                disabled={actionLoading === 'approval' || (approvalAction?.includes('reject') && !approvalNotes)}
                className={`px-6 py-2 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  approvalAction?.includes('reject')
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : approvalAction === 'complete'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionLoading === 'approval' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  <>
                    {approvalAction === 'complete' ? <FaCheckCircle /> : approvalAction?.includes('reject') ? <FaTimes /> : <FaCheckCircle />}
                    {approvalAction === 'complete' ? 'Confirm Execution' : approvalAction?.includes('reject') ? 'Confirm Decline' : 'Confirm Approval'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssetDisposalEnhanced
