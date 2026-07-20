import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Filter,
  Search,
  ArrowRight,
  Download,
  Grid3x3,
  List,
  SortAsc,
  SortDesc,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

export default function MyCheckouts() {
  const { token } = useSelector((state) => state.auth)
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const [checkouts, setCheckouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedCheckout, setSelectedCheckout] = useState(null)
  const [viewMode, setViewMode] = useState('card')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    fetchCheckouts()
  }, [statusFilter])

  const fetchCheckouts = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const response = await axios.get('http://localhost:8000/api/owner/my-checkouts/', {
        headers: { Authorization: `Bearer ${token}` },
        params
      })
      const data = response.data
      setCheckouts(Array.isArray(data) ? data : (data.results || []))
    } catch (error) {
      console.error('Error fetching checkouts:', error)
      setCheckouts([])
    } finally {
      setLoading(false)
    }
  }

  const handleRequestExtension = (checkout) => {
    setSelectedCheckout(checkout)
    setShowExtensionModal(true)
  }

  const handleInitiateReturn = (checkout) => {
    setSelectedCheckout(checkout)
    setShowReturnModal(true)
  }

  const filteredCheckouts = Array.isArray(checkouts) ? checkouts.filter(checkout =>
    checkout.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    checkout.asset_id?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  // Sort checkouts
  const sortedCheckouts = [...filteredCheckouts].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.checkout_date) - new Date(b.checkout_date)
        break
      case 'return':
        comparison = new Date(a.expected_return_date) - new Date(b.expected_return_date)
        break
      case 'asset':
        comparison = (a.asset_name || '').localeCompare(b.asset_name || '')
        break
      default:
        comparison = 0
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const stats = {
    active: Array.isArray(checkouts) ? checkouts.filter(c => !c.is_returned).length : 0,
    overdue: Array.isArray(checkouts) ? checkouts.filter(c => !c.is_returned && new Date(c.expected_return_date) < new Date()).length : 0,
    returned: Array.isArray(checkouts) ? checkouts.filter(c => c.is_returned).length : 0,
    dueSoon: Array.isArray(checkouts) ? checkouts.filter(c => {
      if (c.is_returned) return false
      const daysUntil = Math.ceil((new Date(c.expected_return_date) - new Date()) / (1000 * 60 * 60 * 24))
      return daysUntil >= 0 && daysUntil <= 3
    }).length : 0
  }

  const exportCheckouts = () => {
    const csvContent = [
      ['Asset ID', 'Asset Name', 'Checkout Date', 'Expected Return', 'Status', 'Days Remaining/Overdue'],
      ...sortedCheckouts.map(checkout => {
        const daysUntil = Math.ceil((new Date(checkout.expected_return_date) - new Date()) / (1000 * 60 * 60 * 24))
        return [
          checkout.asset_id,
          checkout.asset_name,
          new Date(checkout.checkout_date).toLocaleDateString(),
          new Date(checkout.expected_return_date).toLocaleDateString(),
          checkout.is_returned ? 'Returned' : 'Active',
          checkout.is_returned ? 'N/A' : daysUntil
        ]
      })
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-checkouts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16 mb-4"></div>
        <p className="text-gray-600">Loading your checkouts...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
                <Calendar className="h-8 w-8 sm:h-10 sm:w-10" />
                My Checkouts
              </h1>
              <p className="text-green-100 text-lg">
                Track your borrowed assets and return dates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <p className="text-sm text-green-100">Active</p>
                <p className="text-3xl font-bold">{stats.active}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Checkouts"
          value={stats.active}
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Overdue Items"
          value={stats.overdue}
          icon={AlertTriangle}
          color="red"
          alert={stats.overdue > 0}
        />
        <StatCard
          title="Due Soon (3 days)"
          value={stats.dueSoon}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Returned"
          value={stats.returned}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8 animate-slide-up">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by asset name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none transition-all"
            >
              <option value="all">All Checkouts</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchCheckouts}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="date">Sort by Checkout Date</option>
              <option value="return">Sort by Return Date</option>
              <option value="asset">Sort by Asset Name</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-5 w-5" /> : <SortDesc className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600 hover:text-gray-900'}`}
                title="Card View"
              >
                <Grid3x3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600 hover:text-gray-900'}`}
                title="List View"
              >
                <List className="h-5 w-5" />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={exportCheckouts}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
            >
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Checkouts List */}
      {sortedCheckouts.length > 0 ? (
        viewMode === 'card' ? (
          <div className="space-y-4 animate-slide-up">
            {sortedCheckouts.map((checkout, index) => (
              <CheckoutCard
                key={checkout.id}
                checkout={checkout}
                onRequestExtension={handleRequestExtension}
                onInitiateReturn={handleInitiateReturn}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-slide-up">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Asset</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Checkout Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Expected Return</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Condition</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedCheckouts.map((checkout, index) => (
                    <CheckoutRow
                      key={checkout.id}
                      checkout={checkout}
                      onRequestExtension={handleRequestExtension}
                      onInitiateReturn={handleInitiateReturn}
                      index={index}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100 animate-scale-in">
          <Package className="h-20 w-20 mx-auto text-gray-300 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Checkouts Found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters to see more results'
              : 'You have no asset checkouts'}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all') }}
              className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Extension Request Modal */}
      {showExtensionModal && (
        <ExtensionModal
          checkout={selectedCheckout}
          onClose={() => {
            setShowExtensionModal(false)
            setSelectedCheckout(null)
          }}
          onSuccess={fetchCheckouts}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      {/* Return Asset Modal */}
      {showReturnModal && (
        <ReturnModal
          checkout={selectedCheckout}
          onClose={() => {
            setShowReturnModal(false)
            setSelectedCheckout(null)
          }}
          onSuccess={fetchCheckouts}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}
    </div>
  )
}

function CheckoutCard({ checkout, onRequestExtension, onInitiateReturn, index }) {
  const isOverdue = !checkout.is_returned && new Date(checkout.expected_return_date) < new Date()
  const daysUntilDue = Math.ceil((new Date(checkout.expected_return_date) - new Date()) / (1000 * 60 * 60 * 24))

  return (
    <div 
      className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 group animate-scale-in ${isOverdue ? 'ring-2 ring-red-500' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{checkout.asset_name}</h3>
            <p className="text-sm font-mono text-gray-600 mb-2">{checkout.asset_id}</p>
            
            {checkout.purpose && (
              <p className="text-sm text-gray-700 mb-3">
                <span className="font-medium">Purpose:</span> {checkout.purpose}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Checked out: {new Date(checkout.checkout_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="h-4 w-4" />
                <span>Approved by: {checkout.checked_out_by_name || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {checkout.is_returned ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Returned
            </span>
          ) : isOverdue ? (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Overdue
            </span>
          ) : (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Active
            </span>
          )}
        </div>
      </div>

      {/* Return Date Info */}
      <div className={`p-4 rounded-lg mb-4 ${
        checkout.is_returned
          ? 'bg-green-50 border border-green-200'
          : isOverdue
          ? 'bg-red-50 border border-red-200'
          : daysUntilDue <= 3
          ? 'bg-yellow-50 border border-yellow-200'
          : 'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            {checkout.is_returned ? (
              <>
                <p className="text-sm font-medium text-green-800">Returned on</p>
                <p className="text-lg font-bold text-green-900">
                  {new Date(checkout.actual_return_date).toLocaleDateString()}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Expected Return Date</p>
                <p className={`text-lg font-bold ${isOverdue ? 'text-red-900' : 'text-gray-900'}`}>
                  {new Date(checkout.expected_return_date).toLocaleDateString()}
                </p>
                {!isOverdue && daysUntilDue >= 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} days remaining`}
                  </p>
                )}
                {isOverdue && (
                  <p className="text-sm text-red-600 mt-1 font-medium">
                    {Math.abs(daysUntilDue)} days overdue
                  </p>
                )}
              </>
            )}
          </div>

          {!checkout.is_returned && (
            <div className="flex gap-2">
              <button
                onClick={() => onInitiateReturn(checkout)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Return Asset
              </button>
              <button
                onClick={() => onRequestExtension(checkout)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                Request Extension
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Condition Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600 mb-1">Checkout Condition</p>
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
            {checkout.checkout_condition}
          </span>
        </div>
        {checkout.is_returned && checkout.return_condition && (
          <div>
            <p className="text-gray-600 mb-1">Return Condition</p>
            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
              {checkout.return_condition}
            </span>
          </div>
        )}
      </div>

      {checkout.notes && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Notes:</span> {checkout.notes}
          </p>
        </div>
      )}
      </div>
    </div>
  )
}

function CheckoutRow({ checkout, onRequestExtension, onInitiateReturn, index }) {
  const isOverdue = !checkout.is_returned && new Date(checkout.expected_return_date) < new Date()
  const daysUntilDue = Math.ceil((new Date(checkout.expected_return_date) - new Date()) / (1000 * 60 * 60 * 24))

  const getStatusBadge = () => {
    if (checkout.is_returned) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
          <CheckCircle className="h-3 w-3" />
          Returned
        </span>
      )
    }
    if (isOverdue) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </span>
      )
    }
    if (daysUntilDue <= 3) {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
          <Clock className="h-3 w-3" />
          Due Soon
        </span>
      )
    }
    return (
      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
        <Clock className="h-3 w-3" />
        Active
      </span>
    )
  }

  return (
    <tr
      className={`hover:bg-green-50 transition-colors animate-slide-up ${isOverdue ? 'bg-red-50' : ''}`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <td className="px-6 py-4">
        <div>
          <p className="font-semibold text-gray-900">{checkout.asset_name}</p>
          <p className="text-sm text-gray-600 font-mono">{checkout.asset_id}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="text-sm text-gray-900">{new Date(checkout.checkout_date).toLocaleDateString()}</p>
      </td>
      <td className="px-6 py-4">
        <div>
          <p className={`text-sm font-medium ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
            {checkout.is_returned
              ? new Date(checkout.actual_return_date).toLocaleDateString()
              : new Date(checkout.expected_return_date).toLocaleDateString()}
          </p>
          {!checkout.is_returned && (
            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
              {isOverdue
                ? `${Math.abs(daysUntilDue)} days overdue`
                : daysUntilDue === 0
                ? 'Due today'
                : `${daysUntilDue} days remaining`}
            </p>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        {getStatusBadge()}
      </td>
      <td className="px-6 py-4">
        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
          {checkout.checkout_condition}
        </span>
      </td>
      <td className="px-6 py-4">
        {!checkout.is_returned && (
          <div className="flex gap-2">
            <button
              onClick={() => onInitiateReturn(checkout)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Return
            </button>
            <button
              onClick={() => onRequestExtension(checkout)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Extend
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

function ExtensionModal({ checkout, onClose, onSuccess, showSuccess, showError }) {
  const { token } = useSelector((state) => state.auth)
  const [newDate, setNewDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await axios.post(
        `http://localhost:8000/api/owner/my-checkouts/${checkout.id}/request_extension/`,
        { new_return_date: newDate, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showSuccess('Extension request submitted successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error requesting extension:', error)
      showError('Failed to submit extension request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Extension</h2>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">{checkout.asset_name}</p>
          <p className="text-xs text-gray-600 mt-1">Current due date: {new Date(checkout.expected_return_date).toLocaleDateString()}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Return Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Extension
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Please explain why you need an extension..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReturnModal({ checkout, onClose, onSuccess, showSuccess, showError }) {
  const { token } = useSelector((state) => state.auth)
  const [returnCondition, setReturnCondition] = useState('GOOD')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await axios.post(
        `http://localhost:8000/api/owner/my-checkouts/${checkout.id}/initiate_return/`,
        { return_condition: returnCondition, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showSuccess('Return initiated successfully! A Property Manager will contact you to schedule inspection.')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error initiating return:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Failed to initiate return'
      showError(`Failed to initiate return: ${errorMsg}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Return Asset</h2>
        <p className="text-gray-600 mb-4">Initiate the return process for this asset</p>
        
        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm font-medium text-gray-900">{checkout.asset_name}</p>
          <p className="text-xs text-gray-600 mt-1 font-mono">{checkout.asset_id}</p>
          <p className="text-xs text-gray-600 mt-1">
            Expected return: {new Date(checkout.expected_return_date).toLocaleDateString()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Asset Condition
            </label>
            <select
              value={returnCondition}
              onChange={(e) => setReturnCondition(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="EXCELLENT">Excellent - Like new</option>
              <option value="GOOD">Good - Normal wear</option>
              <option value="FAIR">Fair - Some wear and tear</option>
              <option value="POOR">Poor - Significant wear</option>
              <option value="DAMAGED">Damaged - Needs repair</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Any damage, issues, or observations..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Next Steps:</strong> A Property Manager will contact you to schedule an inspection and complete the return process.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Submitting...' : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Initiate Return
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, alert }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600',
    green: 'from-green-500 to-green-600'
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 card-hover animate-scale-in ${alert ? 'ring-2 ring-red-500 animate-pulse' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}
