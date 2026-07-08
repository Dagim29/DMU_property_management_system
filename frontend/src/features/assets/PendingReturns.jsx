import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  ArrowLeft,
  RefreshCw,
  ArrowRight
} from 'lucide-react'
import useToast from '../../hooks/useToast'

export default function PendingReturns() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const [checkouts, setCheckouts] = useState([])
  const [selectedCheckout, setSelectedCheckout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCheckinModal, setShowCheckinModal] = useState(false)

  useEffect(() => {
    fetchPendingReturns()
    
    // If ID is provided in URL, open that checkout's modal
    if (id) {
      fetchCheckoutDetail(id)
    }
  }, [id])

  const fetchPendingReturns = async () => {
    setLoading(true)
    try {
      const response = await axios.get('http://localhost:8000/api/assets/checkouts/pending_returns/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCheckouts(response.data)
    } catch (error) {
      console.error('Error fetching pending returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCheckoutDetail = async (checkoutId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/assets/checkouts/${checkoutId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSelectedCheckout(response.data)
      setShowCheckinModal(true)
    } catch (error) {
      console.error('Error fetching checkout detail:', error)
    }
  }

  const handleCheckinClick = (checkout) => {
    setSelectedCheckout(checkout)
    setShowCheckinModal(true)
  }

  const handleCheckinComplete = () => {
    setShowCheckinModal(false)
    setSelectedCheckout(null)
    fetchPendingReturns()
    
    // If we came from a notification link, go back to dashboard
    if (id) {
      navigate('/dashboard/pending-returns')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Package className="h-10 w-10" />
                Pending Returns
              </h1>
              <p className="text-purple-100 text-lg">
                Manage asset returns and check-ins
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchPendingReturns}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all"
              >
                <RefreshCw className="h-5 w-5" />
                Refresh
              </button>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <p className="text-sm text-purple-100">Pending</p>
                <p className="text-3xl font-bold">{checkouts.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkouts List */}
      {checkouts.length > 0 ? (
        <div className="space-y-4">
          {checkouts.map((checkout) => (
            <CheckoutCard
              key={checkout.id}
              checkout={checkout}
              onCheckin={handleCheckinClick}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
          <CheckCircle className="h-20 w-20 mx-auto text-green-500 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No pending returns at the moment</p>
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckinModal && selectedCheckout && (
        <CheckinModal
          checkout={selectedCheckout}
          onClose={() => {
            setShowCheckinModal(false)
            setSelectedCheckout(null)
            if (id) navigate('/dashboard/pending-returns')
          }}
          onSuccess={handleCheckinComplete}
        />
      )}
    </div>
  )
}

function CheckoutCard({ checkout, onCheckin }) {
  const [showDetails, setShowDetails] = useState(false)
  const isOverdue = new Date(checkout.expected_return_date) < new Date()
  const daysOverdue = Math.ceil((new Date() - new Date(checkout.expected_return_date)) / (1000 * 60 * 60 * 24))

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border ${isOverdue ? 'border-red-300 ring-2 ring-red-500' : 'border-gray-100'}`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-3 rounded-lg ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
              <Package className={`h-6 w-6 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{checkout.asset_name}</h3>
              <p className="text-sm font-mono text-gray-600 mb-2">{checkout.asset_id}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span>Checked out to: {checkout.checked_out_to_name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Checkout date: {new Date(checkout.checkout_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {isOverdue ? (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {daysOverdue} days overdue
              </span>
            ) : (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Return Pending
              </span>
            )}
          </div>
        </div>

        {/* Return Date Info */}
        <div className={`p-4 rounded-lg mb-4 ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Expected Return Date</p>
              <p className={`text-lg font-bold ${isOverdue ? 'text-red-900' : 'text-gray-900'}`}>
                {new Date(checkout.expected_return_date).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {showDetails ? 'Hide Details' : 'View Details'}
              </button>
              <button
                onClick={() => onCheckin(checkout)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <CheckCircle className="h-5 w-5" />
                Complete Check-In
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-slide-down">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Checkout Condition</p>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium inline-block">
                  {checkout.checkout_condition}
                </span>
              </div>
              {checkout.purpose && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Purpose</p>
                  <p className="text-sm text-gray-800">{checkout.purpose}</p>
                </div>
              )}
            </div>

            {checkout.notes && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{checkout.notes}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">📋 Manager Action Required</p>
              <p className="text-sm text-blue-800">
                Review the checkout details and reported condition. Schedule an inspection with the user, 
                then complete the check-in after verifying the asset's actual condition.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckinModal({ checkout, onClose, onSuccess }) {
  const { token } = useSelector((state) => state.auth)
  const { showSuccess, showError } = useToast()
  const [step, setStep] = useState(1) // 1: Review, 2: Document Condition
  const [returnCondition, setReturnCondition] = useState('GOOD')
  const [notes, setNotes] = useState('')
  const [inspectionNotes, setInspectionNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await axios.post(
        `http://localhost:8000/api/assets/checkouts/${checkout.id}/checkin/`,
        { 
          return_condition: returnCondition, 
          notes: `${inspectionNotes}\n\nOriginal notes: ${notes}` 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showSuccess('Asset checked in successfully!')
      onSuccess()
    } catch (error) {
      console.error('Error checking in asset:', error)
      showError('Failed to check in asset: ' + (error.response?.data?.error || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="font-medium">Review Request</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="font-medium">Complete Check-In</span>
            </div>
          </div>
        </div>

        {step === 1 ? (
          // Step 1: Review Return Request
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Return Request</h2>
            <p className="text-gray-600 mb-4">Review the checkout details before proceeding with check-in</p>
            
            <div className="space-y-4 mb-6">
              {/* Asset Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Asset Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Asset Name</p>
                    <p className="text-blue-900">{checkout.asset_name}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Asset ID</p>
                    <p className="text-blue-900 font-mono">{checkout.asset_id}</p>
                  </div>
                </div>
              </div>

              {/* Checkout Details */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Checkout Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Checked Out To</p>
                    <p className="text-gray-900">{checkout.checked_out_to_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Checkout Date</p>
                    <p className="text-gray-900">{new Date(checkout.checkout_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Expected Return</p>
                    <p className="text-gray-900">{new Date(checkout.expected_return_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Checkout Condition</p>
                    <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs font-medium">
                      {checkout.checkout_condition}
                    </span>
                  </div>
                </div>
                {checkout.purpose && (
                  <div className="mt-3">
                    <p className="text-gray-600 font-medium text-sm">Purpose</p>
                    <p className="text-gray-900 text-sm">{checkout.purpose}</p>
                  </div>
                )}
                {checkout.notes && (
                  <div className="mt-3">
                    <p className="text-gray-600 font-medium text-sm">Notes</p>
                    <p className="text-gray-900 text-sm bg-white p-2 rounded">{checkout.notes}</p>
                  </div>
                )}
              </div>

              {/* Action Required */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Next Steps
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1 ml-6 list-disc">
                  <li>Contact {checkout.checked_out_to_name} to schedule an inspection</li>
                  <li>Physically inspect the asset condition</li>
                  <li>Document any damage or issues</li>
                  <li>Complete the check-in process</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Proceed to Check-In
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          // Step 2: Complete Check-In
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Check-In</h2>
            <p className="text-gray-600 mb-4">Document the asset condition after inspection</p>
            
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-gray-900">{checkout.asset_name}</p>
              <p className="text-xs text-gray-600 mt-1 font-mono">{checkout.asset_id}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Actual Return Condition *
                </label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="EXCELLENT">Excellent - Like new, no wear</option>
                  <option value="GOOD">Good - Normal wear, fully functional</option>
                  <option value="FAIR">Fair - Some wear and tear, functional</option>
                  <option value="POOR">Poor - Significant wear, may need maintenance</option>
                  <option value="DAMAGED">Damaged - Requires repair</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Original checkout condition: <span className="font-medium">{checkout.checkout_condition}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Inspection Notes *
                </label>
                <textarea
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  rows={4}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Document any damage, missing parts, or observations from the physical inspection..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> After completing check-in, the asset will be marked as AVAILABLE and the user will be notified.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Processing...' : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Complete Check-In
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
