import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  ArrowLeft,
  Package,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Ban,
  RefreshCw,
  Star,
  ShieldCheck
} from 'lucide-react'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

export default function MyRequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)

  useEffect(() => {
    fetchRequestDetail()
  }, [id])

  const fetchRequestDetail = async () => {
    try {
      setLoading(true)
      // Fetch from owner-specific endpoint
      const response = await axios.get(
        `http://localhost:8000/api/owner/my-requests/${id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setRequest(response.data)
    } catch (error) {
      console.error('Error fetching request details:', error)
      if (error.response?.status === 404) {
        setError('Request not found or you do not have permission to view it')
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view this request')
      } else {
        setError('Failed to load request details')
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
      ASSIGNED: 'bg-purple-100 text-purple-800 border-purple-200',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      WAITING_PARTS: 'bg-orange-100 text-orange-800 border-orange-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      EMERGENCY: 'bg-red-100 text-red-800 border-red-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-green-100 text-green-800 border-green-200'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusIcon = (status) => {
    const icons = {
      SUBMITTED: <Clock className="h-5 w-5" />,
      ASSIGNED: <User className="h-5 w-5" />,
      IN_PROGRESS: <Wrench className="h-5 w-5" />,
      WAITING_PARTS: <AlertTriangle className="h-5 w-5" />,
      COMPLETED: <CheckCircle className="h-5 w-5" />,
      CANCELLED: <XCircle className="h-5 w-5" />
    }
    return icons[status] || <Wrench className="h-5 w-5" />
  }

  const canCancel = request && !['COMPLETED', 'CANCELLED'].includes(request.status)

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mb-4"></div>
        <p className="text-gray-600">Loading request details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">{error}</h3>
          <button
            onClick={() => navigate('/dashboard/owner/my-requests')}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to My Requests
          </button>
        </div>
      </div>
    )
  }

  if (!request) {
    return null
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/owner/my-requests')}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to My Requests
        </button>

        <div className="bg-gradient-to-r from-orange-600 via-orange-700 to-red-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Wrench className="h-10 w-10" />
                <div>
                  <h1 className="text-3xl font-bold">Request Details</h1>
                  <p className="text-orange-200 font-mono text-sm">{request.request_id}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(request.status)} backdrop-blur-sm flex items-center gap-2`}>
                  {getStatusIcon(request.status)}
                  {request.status.replace('_', ' ')}
                </span>
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${getPriorityColor(request.priority)} backdrop-blur-sm`}>
                  {request.priority} PRIORITY
                </span>
                {request.escalated && (
                  <span className="px-4 py-1.5 bg-red-500 text-white rounded-full text-sm font-semibold border border-red-400 animate-pulse">
                    ESCALATED
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchRequestDetail}
                className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl hover:bg-white/30 transition-all shadow-lg font-semibold"
              >
                <RefreshCw className="h-5 w-5" />
                Refresh
              </button>
              {request.status === 'COMPLETED' && !request.service_rating && (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-yellow-900 rounded-xl hover:bg-yellow-300 transition-all shadow-lg font-semibold"
                >
                  <Star className="h-5 w-5 fill-yellow-700" />
                  Rate Service
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 rounded-xl hover:bg-red-50 transition-all shadow-lg font-semibold"
                >
                  <Ban className="h-5 w-5" />
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-6 w-6 text-orange-600" />
              Asset Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Asset Name</p>
                <p className="font-semibold text-gray-900 text-lg">{request.asset_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Asset ID</p>
                <p className="font-mono text-gray-900">{request.asset_id_display || request.asset_id}</p>
              </div>
              {(request.campus_name || request.asset_location) && (
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="text-gray-900">{request.campus_name || request.asset_location}</p>
                </div>
              )}
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-orange-600" />
              Request Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Category</p>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium">
                  {request.category}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-900 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {request.description}
                </p>
              </div>
            </div>
          </div>

          {/* Photos */}
          {request.photo && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ImageIcon className="h-6 w-6 text-orange-600" />
                Attached Photo
              </h3>
              <img
                src={`http://localhost:8000${request.photo}`}
                alt="Issue"
                className="w-full rounded-xl border-2 border-gray-200"
              />
            </div>
          )}

          {/* Comments Section */}
          {request.comments && request.comments.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-orange-600" />
                Comments & Updates
              </h3>
              <div className="space-y-4">
                {request.comments.map((comment, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{comment.user_name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-gray-700">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              <TimelineItem
                icon={<Calendar className="h-4 w-4" />}
                label="Submitted"
                value={new Date(request.created_at).toLocaleString()}
                color="blue"
              />
              {request.assigned_at && (
                <TimelineItem
                  icon={<User className="h-4 w-4" />}
                  label="Assigned"
                  value={new Date(request.assigned_at).toLocaleString()}
                  color="purple"
                />
              )}
              {request.completed_at && (
                <TimelineItem
                  icon={<CheckCircle className="h-4 w-4" />}
                  label="Completed"
                  value={new Date(request.completed_at).toLocaleString()}
                  color="green"
                />
              )}
            </div>
          </div>

          {/* Assignment Info */}
          {request.assigned_to_name && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Assigned To</h3>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-full">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{request.assigned_to_name}</p>
                  <p className="text-sm text-gray-600">Technician</p>
                </div>
              </div>
            </div>
          )}

          {/* SLA Information */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-lg p-6 border border-orange-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Service Level</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Priority Level</p>
                <p className="font-bold text-gray-900 text-lg">{request.priority}</p>
              </div>
              {request.sla_deadline && (
                <div>
                  <p className="text-sm text-gray-600">Target Completion</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(request.sla_deadline).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sign-Off Card — only for completed requests */}
          {request.status === 'COMPLETED' && (
            <SignOffCard
              request={request}
              token={token}
              onSuccess={fetchRequestDetail}
              showSuccess={showSuccess}
              showError={showError}
            />
          )}

          {/* Rating Card */}
          {request.status === 'COMPLETED' && (
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-lg p-6 border border-yellow-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                Service Rating
              </h3>
              {request.service_rating ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-5 w-5 ${s <= request.service_rating.overall_rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900">{request.service_rating.overall_rating}/5</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <RatingRow label="Timeliness" value={request.service_rating.timeliness_rating} />
                    <RatingRow label="Quality" value={request.service_rating.quality_rating} />
                    <RatingRow label="Communication" value={request.service_rating.communication_rating} />
                  </div>
                  {request.service_rating.feedback_text && (
                    <p className="text-sm text-gray-700 italic bg-white p-3 rounded-lg border border-yellow-200">
                      "{request.service_rating.feedback_text}"
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Rated on {new Date(request.service_rating.created_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-600 mb-4">
                    How was the service? Your feedback helps improve our maintenance team.
                  </p>
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-xl hover:from-yellow-500 hover:to-amber-600 transition-all shadow-md font-semibold"
                  >
                    <Star className="h-5 w-5 fill-white" />
                    Rate This Service
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Cancel Modal */}
      {showCancelModal && (
        <CancelModal
          request={request}
          onClose={() => setShowCancelModal(false)}
          onSuccess={() => {
            fetchRequestDetail()
            setShowCancelModal(false)
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingModal
          request={request}
          onClose={() => setShowRatingModal(false)}
          onSuccess={() => {
            fetchRequestDetail()
            setShowRatingModal(false)
          }}
        />
      )}
    </div>
  )
}

function RatingRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(s => (
          <Star key={s} className={`h-3.5 w-3.5 ${s <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        ))}
      </div>
    </div>
  )
}

function TimelineItem({ icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600'
  }

  return (
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-medium text-gray-900 text-sm">{value}</p>
      </div>
    </div>
  )
}

function RatingModal({ request, onClose, onSuccess }) {
  const { token } = useSelector((state) => state.auth)
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    timeliness_rating: 0,
    quality_rating: 0,
    communication_rating: 0
  })
  const [feedbackText, setFeedbackText] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [hoveredRating, setHoveredRating] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const aspects = [
    { key: 'overall_rating', label: 'Overall Experience', icon: '⭐' },
    { key: 'timeliness_rating', label: 'Timeliness', icon: '⏱️' },
    { key: 'quality_rating', label: 'Quality of Work', icon: '🔧' },
    { key: 'communication_rating', label: 'Communication', icon: '💬' }
  ]

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const allRated = Object.values(ratings).every(r => r > 0)
    if (!allRated) {
      setError('Please provide ratings for all aspects')
      return
    }
    setSubmitting(true)
    try {
      await axios.post(
        'http://localhost:8000/api/owner/feedback/service-rating/',
        {
          maintenance_request: request.id,
          ...ratings,
          feedback_text: feedbackText,
          is_anonymous: isAnonymous
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.maintenance_request?.[0] || 'Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-t-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Star className="h-6 w-6 fill-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Rate This Service</h2>
                <p className="text-yellow-100 text-sm">{request.request_id}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Technician info */}
          {request.assigned_to_name && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="p-3 bg-purple-100 rounded-full">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Serviced by</p>
                <p className="font-semibold text-gray-900">{request.assigned_to_name}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Star Ratings */}
          <div className="space-y-5">
            {aspects.map(({ key, label, icon }) => {
              const current = ratings[key]
              const hovered = hoveredRating[key] || 0
              const display = hovered || current
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      {icon} {label}
                    </label>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                      display >= 4 ? 'bg-green-100 text-green-700' :
                      display >= 3 ? 'bg-yellow-100 text-yellow-700' :
                      display > 0 ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {display > 0 ? ratingLabels[display] : 'Not rated'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRatings({ ...ratings, [key]: value })}
                        onMouseEnter={() => setHoveredRating({ ...hoveredRating, [key]: value })}
                        onMouseLeave={() => setHoveredRating({ ...hoveredRating, [key]: 0 })}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star className={`h-9 w-9 transition-colors ${
                          value <= display ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 hover:text-yellow-300'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Feedback Text */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Comments <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all resize-none"
              placeholder="Share your experience with this maintenance service..."
            />
          </div>

          {/* Anonymous toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isAnonymous ? 'bg-yellow-400' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAnonymous ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-700">Submit anonymously</span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-xl hover:from-yellow-500 hover:to-amber-600 transition-all shadow-md font-semibold disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SignOffCard({ request, token, onSuccess, showSuccess, showError }) {
  const [signing, setSigning] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const signoff = request.work_order_signoff

  const handleSignOff = async () => {
    setSigning(true)
    try {
      await axios.post(
        `http://localhost:8000/api/owner/my-requests/${request.id}/signoff/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setShowConfirm(false)
      showSuccess('Work order signed off successfully!')
      onSuccess()
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to sign off. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  if (!signoff) return null

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-blue-600" />
        Completion Sign-Off
      </h3>

      <div className="space-y-3">
        {/* Supervisor sign-off */}
        <div className={`p-3 rounded-xl border-2 ${signoff.supervisor_signed_off ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-4 h-4 rounded-full flex-shrink-0 ${signoff.supervisor_signed_off ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <p className="text-sm font-semibold text-gray-800">Supervisor Sign-Off</p>
          </div>
          {signoff.supervisor_signed_off ? (
            <p className="text-xs text-green-700 ml-6">
              ✓ Signed by {signoff.supervisor_signoff_by_name || 'Supervisor'}
              {signoff.supervisor_signoff_date && signoff.supervisor_signoff_date !== '1970-01-01T00:00:00Z' && (
                <> on {new Date(signoff.supervisor_signoff_date).toLocaleDateString()}</>
              )}
            </p>
          ) : (
            <p className="text-xs text-gray-500 ml-6">Pending supervisor approval</p>
          )}
        </div>

        {/* Requester sign-off */}
        <div className={`p-3 rounded-xl border-2 ${signoff.requester_signed_off ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-4 h-4 rounded-full flex-shrink-0 ${signoff.requester_signed_off ? 'bg-green-500' : 'bg-orange-400'}`}></div>
            <p className="text-sm font-semibold text-gray-800">Your Sign-Off</p>
          </div>
          {signoff.requester_signed_off ? (
            <p className="text-xs text-green-700 ml-6">
              ✓ Signed by {signoff.requester_signoff_by_name || 'You'}
              {signoff.requester_signoff_date && (
                <> on {new Date(signoff.requester_signoff_date).toLocaleDateString()}</>
              )}
            </p>
          ) : (
            <div className="ml-6">
              <p className="text-xs text-orange-700 mb-2">Your approval is required</p>
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all text-xs font-semibold shadow-md"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Sign Off Now
              </button>
            </div>
          )}
        </div>

        {/* Fully approved badge */}
        {signoff.fully_approved && (
          <div className="p-3 bg-green-100 border-2 border-green-300 rounded-xl text-center">
            <p className="text-sm font-bold text-green-800 flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Fully Approved
            </p>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Confirm Sign-Off</h3>
                <p className="text-sm text-gray-500">{request.request_id}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              By signing off, you confirm that the maintenance work on <strong>{request.asset_name}</strong> has been completed to your satisfaction.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOff}
                disabled={signing}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {signing ? (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Confirm Sign-Off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CancelModal({ request, onClose, onSuccess, showSuccess, showError }) {
  const { token } = useSelector((state) => state.auth)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await axios.post(
        `http://localhost:8000/api/owner/my-requests/${request.id}/cancel/`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showSuccess('Request cancelled successfully!')
      onSuccess()
    } catch (error) {
      console.error('Error cancelling request:', error)
      showError(error.response?.data?.error || 'Failed to cancel request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancel Request</h2>
        
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm font-semibold text-gray-900">{request.request_id}</p>
          <p className="text-xs text-gray-600 mt-1">{request.asset_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Cancellation <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              placeholder="Please explain why you're cancelling this request..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Keep Request
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold"
            >
              {submitting ? 'Cancelling...' : 'Cancel Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
