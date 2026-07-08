import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaShieldAlt,
  FaFileAlt,
  FaExchangeAlt,
  FaDollarSign,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaBrain,
  FaEye,
  FaTimes,
  FaPhone,
  FaEnvelope,
  FaCalendar,
  FaUser
} from 'react-icons/fa'
import api from '../../services/api'

const AssetManagementHub = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('warranties')
  
  // Modal states
  const [selectedWarranty, setSelectedWarranty] = useState(null)
  const [selectedInsurance, setSelectedInsurance] = useState(null)
  const [selectedCheckout, setSelectedCheckout] = useState(null)
  
  // Data states
  const [warranties, setWarranties] = useState([])
  const [insurance, setInsurance] = useState([])
  const [checkouts, setCheckouts] = useState([])
  const [budgets, setBudgets] = useState([])
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [warrantiesRes, insuranceRes, checkoutsRes, budgetsRes, docsRes] = await Promise.all([
        api.get('/assets/warranties/'),
        api.get('/assets/insurance/'),
        api.get('/assets/checkouts/'),
        api.get('/assets/budgets/'),
        api.get('/assets/documents/')
      ])

      const warrantiesData = warrantiesRes.data.results || warrantiesRes.data
      const insuranceData = insuranceRes.data.results || insuranceRes.data
      const checkoutsData = checkoutsRes.data.results || checkoutsRes.data
      const budgetsData = budgetsRes.data.results || budgetsRes.data
      const docsData = docsRes.data.results || docsRes.data

      setWarranties(Array.isArray(warrantiesData) ? warrantiesData : [])
      setInsurance(Array.isArray(insuranceData) ? insuranceData : [])
      setCheckouts(Array.isArray(checkoutsData) ? checkoutsData : [])
      setBudgets(Array.isArray(budgetsData) ? budgetsData : [])
      setDocuments(Array.isArray(docsData) ? docsData : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Warranty Detail Modal
  const WarrantyDetailModal = ({ warranty, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Warranty Details</h2>
              <p className="text-blue-100">{warranty.asset_id}</p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2">
              <FaTimes size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Provider</p>
              <p className="font-semibold text-gray-800">{warranty.provider}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Warranty Number</p>
              <p className="font-semibold text-gray-800">{warranty.warranty_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Start Date</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaCalendar className="text-blue-600" />
                {new Date(warranty.start_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">End Date</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaCalendar className="text-blue-600" />
                {new Date(warranty.end_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                warranty.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {warranty.is_active ? 'Active' : 'Expired'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Days Until Expiry</p>
              <p className={`font-bold text-lg ${
                warranty.days_until_expiry <= 30 ? 'text-orange-600' :
                warranty.days_until_expiry <= 0 ? 'text-red-600' :
                'text-green-600'
              }`}>
                {warranty.days_until_expiry} days
              </p>
            </div>
          </div>

          {warranty.contact_email && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Contact Email</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaEnvelope className="text-blue-600" />
                <a href={`mailto:${warranty.contact_email}`} className="text-blue-600 hover:underline">
                  {warranty.contact_email}
                </a>
              </p>
            </div>
          )}

          {warranty.contact_phone && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Contact Phone</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaPhone className="text-blue-600" />
                <a href={`tel:${warranty.contact_phone}`} className="text-blue-600 hover:underline">
                  {warranty.contact_phone}
                </a>
              </p>
            </div>
          )}

          {warranty.coverage_details && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Coverage Details</p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{warranty.coverage_details}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Insurance Detail Modal
  const InsuranceDetailModal = ({ insurance, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Insurance Policy Details</h2>
              <p className="text-purple-100">{insurance.asset_id}</p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2">
              <FaTimes size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Provider</p>
              <p className="font-semibold text-gray-800">{insurance.provider}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Policy Number</p>
              <p className="font-semibold text-gray-800">{insurance.policy_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Policy Type</p>
              <p className="font-semibold text-gray-800">{insurance.policy_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                insurance.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {insurance.is_active ? 'Active' : 'Expired'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Coverage Amount</p>
              <p className="font-bold text-lg text-green-600">
                ETB {parseFloat(insurance.coverage_amount).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Premium Amount</p>
              <p className="font-bold text-lg text-orange-600">
                ETB {parseFloat(insurance.premium_amount).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Start Date</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaCalendar className="text-purple-600" />
                {new Date(insurance.start_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">End Date</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaCalendar className="text-purple-600" />
                {new Date(insurance.end_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Renewal Date</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaCalendar className="text-purple-600" />
                {new Date(insurance.renewal_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Days Until Renewal</p>
              <p className={`font-bold text-lg ${
                insurance.days_until_renewal <= 30 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {insurance.days_until_renewal} days
              </p>
            </div>
          </div>

          {insurance.notes && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Notes</p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{insurance.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Checkout Detail Modal
  const CheckoutDetailModal = ({ checkout, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className={`text-white p-6 rounded-t-2xl ${
          checkout.is_overdue ? 'bg-gradient-to-r from-red-600 to-orange-600' :
          checkout.is_returned ? 'bg-gradient-to-r from-green-600 to-teal-600' :
          'bg-gradient-to-r from-blue-600 to-cyan-600'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Checkout Details</h2>
              <p className="text-blue-100">{checkout.asset_id} - {checkout.asset_name}</p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2">
              <FaTimes size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex justify-center mb-4">
            {checkout.is_returned ? (
              <span className="px-6 py-3 rounded-full text-lg font-bold bg-green-100 text-green-800 flex items-center gap-2">
                <FaCheckCircle size={24} />
                Returned
              </span>
            ) : checkout.is_overdue ? (
              <span className="px-6 py-3 rounded-full text-lg font-bold bg-red-100 text-red-800 flex items-center gap-2">
                <FaExclamationTriangle size={24} />
                Overdue
              </span>
            ) : (
              <span className="px-6 py-3 rounded-full text-lg font-bold bg-blue-100 text-blue-800 flex items-center gap-2">
                <FaClock size={24} />
                Checked Out
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Checked Out To</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaUser className="text-blue-600" />
                {checkout.checked_out_to_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Approved By</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaUser className="text-blue-600" />
                {checkout.checked_out_by_name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Checkout Date</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaCalendar className="text-blue-600" />
                {new Date(checkout.checkout_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Expected Return</p>
              <p className="font-semibold text-gray-800 flex items-center gap-2">
                <FaCalendar className="text-blue-600" />
                {new Date(checkout.expected_return_date).toLocaleDateString()}
              </p>
            </div>
            {checkout.actual_return_date && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Actual Return</p>
                <p className="font-semibold text-gray-800 flex items-center gap-2">
                  <FaCalendar className="text-green-600" />
                  {new Date(checkout.actual_return_date).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 mb-1">Checkout Condition</p>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {checkout.checkout_condition}
              </span>
            </div>
            {checkout.return_condition && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Return Condition</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  checkout.return_condition === 'DAMAGED' ? 'bg-red-100 text-red-800' :
                  checkout.return_condition === 'EXCELLENT' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {checkout.return_condition}
                </span>
              </div>
            )}
          </div>

          {checkout.purpose && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Purpose</p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{checkout.purpose}</p>
              </div>
            </div>
          )}

          {checkout.notes && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Notes</p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{checkout.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2">Asset Management Hub</h1>
          <p className="text-indigo-100 text-lg">Comprehensive asset lifecycle management</p>
        </div>
      </div>

      {/* Workflow Management */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            onClick={() => navigate('/dashboard/assets')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-l-4 border-indigo-500"
          >
            <FaFileAlt className="text-4xl text-indigo-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Assets List</h3>
            <p className="text-sm text-gray-600">View and manage all assets</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/assignment-requests')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-l-4 border-green-500"
          >
            <FaCheckCircle className="text-4xl text-green-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Asset Requests</h3>
            <p className="text-sm text-gray-600">Review assignment requests</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/assets/checkouts')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-l-4 border-blue-500"
          >
            <FaClock className="text-4xl text-blue-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Checkout Management</h3>
            <p className="text-sm text-gray-600">Manage checkouts and extensions</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/pending-returns')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-l-4 border-orange-500"
          >
            <FaExclamationTriangle className="text-4xl text-orange-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Pending Returns</h3>
            <p className="text-sm text-gray-600">Track overdue returns</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/assets/transfer-approvals')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-l-4 border-purple-500"
          >
            <FaExchangeAlt className="text-4xl text-purple-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Transfer History</h3>
            <p className="text-sm text-gray-600">View completed transfers</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/assets/analytics')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-l-4 border-teal-500"
          >
            <FaBrain className="text-4xl text-teal-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Asset Analytics</h3>
            <p className="text-sm text-gray-600">View insights and reports</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/assets/predictive')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-l-4 border-cyan-500"
          >
            <FaBrain className="text-4xl text-cyan-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Predictive Maintenance</h3>
            <p className="text-sm text-gray-600">AI-powered predictions</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/assets/disposals')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-l-4 border-red-500"
          >
            <FaExclamationTriangle className="text-4xl text-red-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Disposal Requests</h3>
            <p className="text-sm text-gray-600">Manage asset disposals</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/assets/verifications')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-l-4 border-emerald-500"
          >
            <FaCheckCircle className="text-4xl text-emerald-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Asset Verification</h3>
            <p className="text-sm text-gray-600">Physical verification records</p>
          </button>


        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('warranties')}
            className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'warranties'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaShieldAlt className="inline mr-2" />
            Warranties ({warranties.length})
          </button>
          <button
            onClick={() => setActiveTab('insurance')}
            className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'insurance'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaShieldAlt className="inline mr-2" />
            Insurance ({insurance.length})
          </button>
          <button
            onClick={() => setActiveTab('checkouts')}
            className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'checkouts'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaExchangeAlt className="inline mr-2" />
            Checkouts ({checkouts.length})
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaFileAlt className="inline mr-2" />
            Documents ({documents.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Warranties Tab */}
        {activeTab === 'warranties' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Asset Warranties</h2>
              <button
                onClick={() => navigate('/dashboard/assets/warranties/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Add Warranty
              </button>
            </div>

            {warranties.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaShieldAlt className="text-6xl mx-auto mb-4 opacity-20" />
                <p>No warranties found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Asset ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Provider</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Start Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">End Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Days Left</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {warranties.map((warranty) => (
                      <tr key={warranty.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">{warranty.asset_id}</td>
                        <td className="px-4 py-3 text-gray-700">{warranty.provider}</td>
                        <td className="px-4 py-3 text-gray-700">{new Date(warranty.start_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-gray-700">{new Date(warranty.end_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            warranty.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {warranty.is_active ? 'Active' : 'Expired'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${
                            warranty.days_until_expiry <= 30 ? 'text-orange-600' :
                            warranty.days_until_expiry <= 0 ? 'text-red-600' :
                            'text-green-600'
                          }`}>
                            {warranty.days_until_expiry} days
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedWarranty(warranty)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-1"
                            >
                              <FaEye />
                              View
                            </button>
                            {!warranty.is_active && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Delete expired warranty for ${warranty.asset_id}? This will allow adding a new warranty for this asset.`)) {
                                    try {
                                      await api.delete(`/assets/warranties/${warranty.id}/`)
                                      await fetchAllData()
                                      showSuccess('Expired warranty deleted successfully. You can now add a new warranty for this asset.')
                                    } catch (error) {
                                      console.error('Error deleting warranty:', error)
                                      showError('Failed to delete warranty. Please try again.')
                                    }
                                  }
                                }}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                                title="Delete expired warranty to allow new warranty"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Insurance Tab */}
        {activeTab === 'insurance' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Insurance Policies</h2>
              <button
                onClick={() => navigate('/dashboard/assets/insurance/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Add Policy
              </button>
            </div>

            {insurance.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaShieldAlt className="text-6xl mx-auto mb-4 opacity-20" />
                <p>No insurance policies found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insurance.map((policy) => (
                  <div key={policy.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-800">{policy.asset_id}</p>
                        <p className="text-sm text-gray-600">{policy.provider}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        policy.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {policy.is_active ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Policy Number:</span>
                        <span className="font-semibold">{policy.policy_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Coverage:</span>
                        <span className="font-semibold">ETB {parseFloat(policy.coverage_amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Renewal:</span>
                        <span className={`font-semibold ${
                          policy.days_until_renewal <= 30 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {policy.days_until_renewal} days
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedInsurance(policy)}
                      className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <FaEye />
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Checkouts Tab */}
        {activeTab === 'checkouts' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Asset Checkouts</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/dashboard/assets/checkouts')}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
                >
                  Manage Checkouts
                </button>
                <button
                  onClick={() => navigate('/dashboard/assets/checkouts/new')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Checkout Asset
                </button>
              </div>
            </div>

            {checkouts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaExchangeAlt className="text-6xl mx-auto mb-4 opacity-20" />
                <p>No checkouts found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {checkouts.map((checkout) => (
                  <div key={checkout.id} className={`border-l-4 p-4 rounded-lg ${
                    checkout.is_overdue ? 'border-red-500 bg-red-50' :
                    checkout.is_returned ? 'border-green-500 bg-green-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{checkout.asset_id} - {checkout.asset_name}</p>
                        <p className="text-sm text-gray-600 mt-1">Checked out to: {checkout.checked_out_to_name}</p>
                        <p className="text-sm text-gray-600">Expected return: {new Date(checkout.expected_return_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {checkout.is_returned ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <FaCheckCircle className="inline mr-1" />
                            Returned
                          </span>
                        ) : checkout.is_overdue ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <FaExclamationTriangle className="inline mr-1" />
                            Overdue
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            <FaClock className="inline mr-1" />
                            Checked Out
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedCheckout(checkout)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-1"
                        >
                          <FaEye />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Asset Documents</h2>
              <button
                onClick={() => navigate('/dashboard/assets/documents/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Upload Document
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaFileAlt className="text-6xl mx-auto mb-4 opacity-20" />
                <p>No documents found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <FaFileAlt className="text-3xl text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{doc.title}</p>
                        <p className="text-sm text-gray-600">{doc.asset_id}</p>
                        <p className="text-xs text-gray-500 mt-1">{doc.document_type}</p>
                        <p className="text-xs text-gray-500">By: {doc.uploaded_by_name}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              if (!doc.file) {
                                showError('Document file not available')
                                return
                              }
                              const url = doc.file.startsWith('http') ? doc.file : `http://localhost:8000${doc.file}`
                              window.open(url, '_blank', 'noopener,noreferrer')
                            }}
                            disabled={!doc.file}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-none p-0 font-normal disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            View Document →
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                                try {
                                  await api.delete(`/assets/documents/${doc.id}/`)
                                  await fetchAllData()
                                  showSuccess('Document deleted successfully')
                                } catch (error) {
                                  console.error('Error deleting document:', error)
                                  showError('Failed to delete document. Please try again.')
                                }
                              }
                            }}
                            className="text-sm text-red-600 hover:text-red-800 hover:underline cursor-pointer bg-transparent border-none p-0 font-normal ml-2"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedWarranty && (
        <WarrantyDetailModal 
          warranty={selectedWarranty} 
          onClose={() => setSelectedWarranty(null)} 
        />
      )}
      {selectedInsurance && (
        <InsuranceDetailModal 
          insurance={selectedInsurance} 
          onClose={() => setSelectedInsurance(null)} 
        />
      )}
      {selectedCheckout && (
        <CheckoutDetailModal 
          checkout={selectedCheckout} 
          onClose={() => setSelectedCheckout(null)} 
        />
      )}
    </div>
  )
}

export default AssetManagementHub
