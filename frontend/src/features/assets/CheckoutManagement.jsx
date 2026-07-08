import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  FaExchangeAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaPlus,
  FaSearch,
  FaFilter,
  FaUndo,
  FaUser,
  FaCalendarAlt,
  FaInfoCircle,
  FaFileExport
} from 'react-icons/fa'
import api from '../../services/api'

const CheckoutManagement = () => {
  const navigate = useNavigate()
  const currentUser = useSelector((state) => state.auth.user)
  
  const [loading, setLoading] = useState(true)
  const [checkouts, setCheckouts] = useState([])
  const [allCheckouts, setAllCheckouts] = useState([])
  const [extensionRequests, setExtensionRequests] = useState([])
  const [allExtensionRequests, setAllExtensionRequests] = useState([])
  const [activeTab, setActiveTab] = useState('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedCheckout, setSelectedCheckout] = useState(null)
  const [selectedExtensionRequest, setSelectedExtensionRequest] = useState(null)
  const [approvalAction, setApprovalAction] = useState(null)
  const [checkinData, setCheckinData] = useState({
    return_condition: 'GOOD',
    notes: ''
  })
  const [approvalData, setApprovalData] = useState({
    notes: ''
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (activeTab === 'extension-requests') {
      fetchExtensionRequests()
    } else {
      fetchCheckouts()
    }
  }, [activeTab, statusFilter])

  const fetchCheckouts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/assets/checkouts/')
      const data = response.data.results || response.data
      let allData = Array.isArray(data) ? data : []
      
      setAllCheckouts(allData)
      
      // Client-side filtering based on tab
      let filteredData = allData
      if (activeTab === 'active') {
        filteredData = allData.filter(c => !c.is_returned)
      } else if (activeTab === 'overdue') {
        filteredData = allData.filter(c => !c.is_returned && c.is_overdue)
      } else if (activeTab === 'returned') {
        filteredData = allData.filter(c => c.is_returned)
      } else if (activeTab === 'my-checkouts') {
        filteredData = allData.filter(c => c.checked_out_to === currentUser?.id)
      }
      
      setCheckouts(filteredData)
    } catch (error) {
      console.error('Error fetching checkouts:', error)
      setCheckouts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchExtensionRequests = async () => {
    try {
      setLoading(true)
      const response = await api.get('/assets/extension-requests/')
      const data = response.data.results || response.data
      let allData = Array.isArray(data) ? data : []
      
      setAllExtensionRequests(allData)
      
      // Client-side filtering based on status
      let filteredData = allData
      if (statusFilter) {
        filteredData = allData.filter(r => r.status === statusFilter)
      }
      
      setExtensionRequests(filteredData)
    } catch (error) {
      console.error('Error fetching extension requests:', error)
      setExtensionRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleCheckinClick = (checkout) => {
    setSelectedCheckout(checkout)
    setCheckinData({
      return_condition: 'GOOD',
      notes: ''
    })
    setShowCheckinModal(true)
  }

  const handleCheckin = async () => {
    if (!selectedCheckout) return

    try {
      setActionLoading(true)
      await api.post(`/assets/checkouts/${selectedCheckout.id}/checkin/`, checkinData)
      setMessage({ type: 'success', text: 'Asset checked in successfully!' })
      setShowCheckinModal(false)
      fetchCheckouts()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to check in asset' 
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprovalClick = (extensionRequest, action) => {
    setSelectedExtensionRequest(extensionRequest)
    setApprovalAction(action)
    setApprovalData({ notes: '' })
    setShowApprovalModal(true)
  }

  const handleApproval = async () => {
    if (!selectedExtensionRequest || !approvalAction) return

    try {
      setActionLoading(true)
      const endpoint = approvalAction === 'approve' ? 'approve' : 'reject'
      await api.post(`/assets/extension-requests/${selectedExtensionRequest.id}/${endpoint}/`, approvalData)
      setMessage({ 
        type: 'success', 
        text: `Extension request ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully!` 
      })
      setShowApprovalModal(false)
      fetchExtensionRequests()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || `Failed to ${approvalAction} extension request` 
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleExport = () => {
    const csvData = checkouts.map(c => ({
      'Asset ID': c.asset_id,
      'Asset Name': c.asset_name,
      'Checked Out To': c.checked_out_to_name,
      'Checkout Date': new Date(c.checkout_date).toLocaleDateString(),
      'Expected Return': new Date(c.expected_return_date).toLocaleDateString(),
      'Actual Return': c.actual_return_date ? new Date(c.actual_return_date).toLocaleDateString() : 'N/A',
      'Status': c.is_returned ? 'Returned' : c.is_overdue ? 'Overdue' : 'Active',
      'Checkout Condition': c.checkout_condition,
      'Return Condition': c.return_condition || 'N/A',
      'Purpose': c.purpose
    }))

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `checkouts_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredCheckouts = checkouts.filter(checkout =>
    searchTerm === '' ||
    checkout.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    checkout.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    checkout.checked_out_to_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredExtensionRequests = extensionRequests.filter(request =>
    searchTerm === '' ||
    request.checkout_asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.checkout_asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    active: allCheckouts.filter(c => !c.is_returned).length,
    overdue: allCheckouts.filter(c => !c.is_returned && c.is_overdue).length,
    returned: allCheckouts.filter(c => c.is_returned).length,
    total: allCheckouts.length,
    extensionPending: allExtensionRequests.filter(r => r.status === 'PENDING').length,
    extensionApproved: allExtensionRequests.filter(r => r.status === 'APPROVED').length,
    extensionRejected: allExtensionRequests.filter(r => r.status === 'REJECTED').length,
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <FaExchangeAlt />
                Checkout Management
              </h1>
              <p className="text-teal-100 text-lg">Track and manage asset checkouts</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/assets/checkouts/new')}
              className="bg-white text-teal-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
            >
              <FaPlus />
              New Checkout
            </button>
          </div>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Checkouts</p>
              <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
            </div>
            <FaClock className="text-5xl text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Overdue</p>
              <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <FaExclamationTriangle className="text-5xl text-red-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Returned</p>
              <p className="text-3xl font-bold text-green-600">{stats.returned}</p>
            </div>
            <FaCheckCircle className="text-5xl text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Checkouts</p>
              <p className="text-3xl font-bold text-purple-600">{stats.total}</p>
            </div>
            <FaExchangeAlt className="text-5xl text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by asset ID, name, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={filteredCheckouts.length === 0}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <FaFileExport />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'active'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaClock className="inline mr-2" />
            Active ({stats.active})
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'overdue'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaExclamationTriangle className="inline mr-2" />
            Overdue ({stats.overdue})
          </button>
          <button
            onClick={() => setActiveTab('returned')}
            className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'returned'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaCheckCircle className="inline mr-2" />
            Returned ({stats.returned})
          </button>
          <button
            onClick={() => setActiveTab('my-checkouts')}
            className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'my-checkouts'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaUser className="inline mr-2" />
            My Checkouts
          </button>
          <button
            onClick={() => setActiveTab('extension-requests')}
            className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'extension-requests'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaCalendarAlt className="inline mr-2" />
            Extension Requests ({stats.extensionPending})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'all'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            All Checkouts ({stats.total})
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'extension-requests' ? (
        /* Extension Requests List */
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Status Filter for Extension Requests */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                statusFilter === '' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All ({allExtensionRequests.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                statusFilter === 'PENDING' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pending ({stats.extensionPending})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                statusFilter === 'APPROVED' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Approved ({stats.extensionApproved})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                statusFilter === 'REJECTED' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Rejected ({stats.extensionRejected})
            </button>
          </div>

          {filteredExtensionRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaCalendarAlt className="text-6xl mx-auto mb-4 opacity-20" />
              <p className="text-lg">No extension requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredExtensionRequests.map((request) => (
                <div
                  key={request.id}
                  className={`border-2 rounded-xl p-6 transition-all ${
                    request.status === 'PENDING'
                      ? 'border-yellow-300 bg-yellow-50'
                      : request.status === 'APPROVED'
                      ? 'border-green-300 bg-green-50'
                      : 'border-red-300 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">
                          {request.checkout_asset_id} - {request.checkout_asset_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          request.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {request.status_display}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <FaUser className="text-teal-600" />
                            Requested By
                          </p>
                          <p className="font-semibold text-gray-800">{request.requested_by_name}</p>
                          <p className="text-xs text-gray-500">For: {request.checked_out_to_name}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <FaCalendarAlt className="text-teal-600" />
                            Current Return Date
                          </p>
                          <p className="font-semibold text-gray-800">
                            {new Date(request.current_return_date).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <FaClock className="text-teal-600" />
                            Requested Return Date
                          </p>
                          <p className="font-semibold text-green-600">
                            {new Date(request.requested_return_date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">+{request.days_extension} days</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <FaInfoCircle className="text-teal-600" />
                            Request Date
                          </p>
                          <p className="font-semibold text-gray-800">
                            {new Date(request.request_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {request.reason && (
                        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Reason:</p>
                          <p className="text-gray-800">{request.reason}</p>
                        </div>
                      )}

                      {request.status !== 'PENDING' && request.review_notes && (
                        <div className={`mt-4 p-3 rounded-lg border ${
                          request.status === 'APPROVED' 
                            ? 'bg-green-100 border-green-200' 
                            : 'bg-red-100 border-red-200'
                        }`}>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className={`text-sm mb-1 ${
                                request.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                Reviewed By:
                              </p>
                              <p className={`font-semibold ${
                                request.status === 'APPROVED' ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {request.reviewed_by_name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {new Date(request.review_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className={`text-sm mb-1 ${
                                request.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                Review Notes:
                              </p>
                              <p className={`text-sm ${
                                request.status === 'APPROVED' ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {request.review_notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {request.status === 'PENDING' && (
                      <div className="ml-4 flex gap-2">
                        <button
                          onClick={() => handleApprovalClick(request, 'approve')}
                          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
                        >
                          <FaCheckCircle />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprovalClick(request, 'reject')}
                          className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
                        >
                          <FaExclamationTriangle />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Checkouts List */
        <div className="bg-white rounded-xl shadow-lg p-6">
        {filteredCheckouts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FaExchangeAlt className="text-6xl mx-auto mb-4 opacity-20" />
            <p className="text-lg">No checkouts found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCheckouts.map((checkout) => (
              <div
                key={checkout.id}
                className={`border-2 rounded-xl p-6 transition-all ${
                  checkout.is_overdue && !checkout.is_returned
                    ? 'border-red-300 bg-red-50'
                    : checkout.is_returned
                    ? 'border-green-300 bg-green-50'
                    : 'border-blue-300 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                        {checkout.asset_id} - {checkout.asset_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        checkout.is_returned
                          ? 'bg-green-100 text-green-800'
                          : checkout.is_overdue
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {checkout.is_returned ? 'RETURNED' : checkout.is_overdue ? 'OVERDUE' : 'ACTIVE'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <FaUser className="text-teal-600" />
                          Checked Out To
                        </p>
                        <p className="font-semibold text-gray-800">{checkout.checked_out_to_name}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <FaCalendarAlt className="text-teal-600" />
                          Checkout Date
                        </p>
                        <p className="font-semibold text-gray-800">
                          {new Date(checkout.checkout_date).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <FaClock className="text-teal-600" />
                          Expected Return
                        </p>
                        <p className={`font-semibold ${
                          checkout.is_overdue && !checkout.is_returned ? 'text-red-600' : 'text-gray-800'
                        }`}>
                          {new Date(checkout.expected_return_date).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <FaInfoCircle className="text-teal-600" />
                          Condition
                        </p>
                        <p className="font-semibold text-gray-800">{checkout.checkout_condition}</p>
                      </div>
                    </div>

                    {checkout.purpose && (
                      <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Purpose:</p>
                        <p className="text-gray-800">{checkout.purpose}</p>
                      </div>
                    )}

                    {checkout.is_returned && checkout.actual_return_date && (
                      <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-green-700 mb-1">Returned On:</p>
                            <p className="font-semibold text-green-800">
                              {new Date(checkout.actual_return_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-green-700 mb-1">Return Condition:</p>
                            <p className="font-semibold text-green-800">{checkout.return_condition}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {!checkout.is_returned && (
                    <button
                      onClick={() => handleCheckinClick(checkout)}
                      className="ml-4 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
                    >
                      <FaUndo />
                      Check In
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckinModal && selectedCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-white rounded-t-2xl">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FaUndo />
                Check In Asset
              </h2>
              <p className="text-teal-100 mt-1">
                {selectedCheckout.asset_id} - {selectedCheckout.asset_name}
              </p>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Checked out to:</strong> {selectedCheckout.checked_out_to_name}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Checkout date:</strong> {new Date(selectedCheckout.checkout_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Expected return:</strong> {new Date(selectedCheckout.expected_return_date).toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Return Condition <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={checkinData.return_condition}
                    onChange={(e) => setCheckinData({ ...checkinData, return_condition: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Return Notes
                  </label>
                  <textarea
                    value={checkinData.notes}
                    onChange={(e) => setCheckinData({ ...checkinData, notes: e.target.value })}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Any notes about the return condition or issues..."
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleCheckin}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Check-In'}
                </button>
                <button
                  onClick={() => setShowCheckinModal(false)}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl font-bold hover:bg-gray-600 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedExtensionRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`p-6 text-white rounded-t-2xl ${
              approvalAction === 'approve' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                : 'bg-gradient-to-r from-red-600 to-rose-600'
            }`}>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {approvalAction === 'approve' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Extension Request
              </h2>
              <p className="mt-1 opacity-90">
                {selectedExtensionRequest.checkout_asset_id} - {selectedExtensionRequest.checkout_asset_name}
              </p>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Requested by:</strong> {selectedExtensionRequest.requested_by_name}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Checked out to:</strong> {selectedExtensionRequest.checked_out_to_name}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Current return date:</strong> {new Date(selectedExtensionRequest.current_return_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Requested return date:</strong> {new Date(selectedExtensionRequest.requested_return_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Extension:</strong> {selectedExtensionRequest.days_extension} days
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  <strong>Reason:</strong> {selectedExtensionRequest.reason}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {approvalAction === 'approve' ? 'Approval Notes' : 'Rejection Reason'} 
                    {approvalAction === 'reject' && <span className="text-red-500"> *</span>}
                  </label>
                  <textarea
                    value={approvalData.notes}
                    onChange={(e) => setApprovalData({ ...approvalData, notes: e.target.value })}
                    rows="4"
                    required={approvalAction === 'reject'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder={
                      approvalAction === 'approve' 
                        ? 'Optional notes about the approval...' 
                        : 'Please explain why this request is being rejected...'
                    }
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleApproval}
                  disabled={actionLoading || (approvalAction === 'reject' && !approvalData.notes)}
                  className={`flex-1 px-6 py-3 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 ${
                    approvalAction === 'approve'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                      : 'bg-gradient-to-r from-red-600 to-rose-600'
                  }`}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${approvalAction === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl font-bold hover:bg-gray-600 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckoutManagement
