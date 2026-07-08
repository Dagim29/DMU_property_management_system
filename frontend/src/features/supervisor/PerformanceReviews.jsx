import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  FaStar,
  FaArrowLeft,
  FaUser,
  FaPlus,
  FaFilter,
  FaChartBar,
  FaComments
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

const PerformanceReviews = () => {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [technicians, setTechnicians] = useState([])
  const [reviews, setReviews] = useState([])
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)
  const [acknowledgeComments, setAcknowledgeComments] = useState('')
  const [selectedTechnician, setSelectedTechnician] = useState(null)
  const [filterRating, setFilterRating] = useState('ALL')
  
  const [reviewForm, setReviewForm] = useState({
    technician: '',
    review_period_start: '',
    review_period_end: '',
    quality_of_work: 5,
    timeliness: 5,
    communication: 5,
    professionalism: 5,
    technical_skills: 5,
    teamwork: 5,
    strengths: '',
    areas_for_improvement: '',
    comments: '',
    goals: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch technicians
      const techRes = await api.get('/users/users/?role=MAINTENANCE_TECHNICIAN')
      setTechnicians(techRes.data.results || techRes.data)
      
      // Fetch reviews from backend API
      const reviewsRes = await api.get('/users/performance-reviews/')
      setReviews(reviewsRes.data.results || reviewsRes.data)
    } catch (err) {
      console.error('Error fetching data:', err)
      showError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    
    try {
      // Submit to backend API
      await api.post('/users/performance-reviews/', reviewForm)
      
      showSuccess('Performance review submitted successfully!')
      setShowReviewModal(false)
      setReviewForm({
        technician: '',
        review_period_start: '',
        review_period_end: '',
        quality_of_work: 5,
        timeliness: 5,
        communication: 5,
        professionalism: 5,
        technical_skills: 5,
        teamwork: 5,
        strengths: '',
        areas_for_improvement: '',
        comments: '',
        goals: ''
      })
      
      // Refresh data
      fetchData()
    } catch (err) {
      console.error('Error submitting review:', err)
      showError(err.response?.data?.error || 'Failed to submit review')
    }
  }

  const handleAcknowledge = async (review) => {
    setSelectedReview(review)
    setAcknowledgeComments('')
    setShowAcknowledgeModal(true)
  }

  const handleSubmitAcknowledge = async (e) => {
    e.preventDefault()
    
    try {
      await api.post(`/users/performance-reviews/${selectedReview.id}/acknowledge/`, {
        comments: acknowledgeComments
      })
      
      showSuccess('Review acknowledged successfully!')
      setShowAcknowledgeModal(false)
      setSelectedReview(null)
      setAcknowledgeComments('')
      
      // Refresh data
      fetchData()
    } catch (err) {
      console.error('Error acknowledging review:', err)
      showError(err.response?.data?.error || 'Failed to acknowledge review')
    }
  }

  const getTechnicianStats = (technicianId) => {
    const techReviews = reviews.filter(r => r.technician === technicianId)
    if (techReviews.length === 0) return null
    
    const avgRating = techReviews.reduce((sum, r) => sum + r.overall_rating, 0) / techReviews.length
    const latestReview = techReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    
    return {
      count: techReviews.length,
      avgRating: avgRating.toFixed(1),
      latestReview
    }
  }

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 3.5) return 'text-blue-600'
    if (rating >= 2.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRatingBg = (rating) => {
    if (rating >= 4.5) return 'bg-green-50 border-green-200'
    if (rating >= 3.5) return 'bg-blue-50 border-blue-200'
    if (rating >= 2.5) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const filteredReviews = filterRating === 'ALL' 
    ? reviews 
    : reviews.filter(r => {
        if (filterRating === 'EXCELLENT') return r.overall_rating >= 4.5
        if (filterRating === 'GOOD') return r.overall_rating >= 3.5 && r.overall_rating < 4.5
        if (filterRating === 'AVERAGE') return r.overall_rating >= 2.5 && r.overall_rating < 3.5
        if (filterRating === 'POOR') return r.overall_rating < 2.5
        return true
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <button
          onClick={() => navigate('/dashboard/supervisor')}
          className="mb-4 flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
        >
          <FaArrowLeft />
          Back to Dashboard
        </button>
        
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FaStar className="text-6xl opacity-80" />
              <div>
                <h1 className="text-4xl font-bold mb-2">Performance Reviews</h1>
                <p className="text-purple-100 text-lg">Evaluate and provide feedback to technicians</p>
              </div>
            </div>
            <button
              onClick={() => setShowReviewModal(true)}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
            >
              <FaPlus />
              New Review
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">Filter by Rating</h2>
        </div>
        <div className="flex gap-2">
          {['ALL', 'EXCELLENT', 'GOOD', 'AVERAGE', 'POOR'].map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterRating(filter)}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                filterRating === filter
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Technician Overview */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">Team Overview</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technicians.map((tech) => {
              const stats = getTechnicianStats(tech.id)
              return (
                <div
                  key={tech.id}
                  className={`border-2 rounded-xl p-6 hover:shadow-lg transition-all ${
                    stats ? getRatingBg(stats.avgRating) : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    {tech.profile_photo ? (
                      <img
                        src={tech.profile_photo}
                        alt={tech.first_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {tech.first_name?.[0]}{tech.last_name?.[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-lg">
                        {tech.first_name} {tech.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{tech.specialization || 'General'}</p>
                    </div>
                  </div>

                  {stats ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Average Rating</span>
                        <div className="flex items-center gap-1">
                          <FaStar className={getRatingColor(stats.avgRating)} />
                          <span className={`font-bold ${getRatingColor(stats.avgRating)}`}>
                            {stats.avgRating}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {stats.count} review{stats.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No reviews yet</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">Recent Reviews ({filteredReviews.length})</h2>
        </div>

        <div className="p-6">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <FaStar className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No reviews found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className={`border-2 rounded-xl p-6 ${getRatingBg(review.overall_rating)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {review.technician_photo ? (
                        <img
                          src={review.technician_photo}
                          alt={review.technician_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                          {review.technician_name?.[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{review.technician_name}</h3>
                        <p className="text-sm text-gray-600">
                          Reviewed by {review.reviewer_name} • {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaStar className={`text-2xl ${getRatingColor(review.overall_rating)}`} />
                      <span className={`text-2xl font-bold ${getRatingColor(review.overall_rating)}`}>
                        {review.overall_rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Quality of Work</p>
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-500" />
                        <span className="font-bold">{review.quality_of_work}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Timeliness</p>
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-500" />
                        <span className="font-bold">{review.timeliness}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Communication</p>
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-500" />
                        <span className="font-bold">{review.communication}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Professionalism</p>
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-500" />
                        <span className="font-bold">{review.professionalism}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Technical Skills</p>
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-500" />
                        <span className="font-bold">{review.technical_skills}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Teamwork</p>
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-500" />
                        <span className="font-bold">{review.teamwork}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-blue-600 mb-1">Work Orders</p>
                      <p className="text-lg font-bold text-blue-700">{review.work_orders_completed}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <p className="text-xs text-green-600 mb-1">Avg Time</p>
                      <p className="text-lg font-bold text-green-700">{review.avg_completion_time_hours}h</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-xs text-purple-600 mb-1">SLA Compliance</p>
                      <p className="text-lg font-bold text-purple-700">{review.sla_compliance_rate}%</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                      <p className="text-xs text-yellow-600 mb-1">Customer Rating</p>
                      <p className="text-lg font-bold text-yellow-700">{review.customer_satisfaction_avg.toFixed(1)}/5</p>
                    </div>
                  </div>

                  {review.strengths && (
                    <div className="bg-green-50 rounded-lg p-4 mb-3 border border-green-200">
                      <p className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                        <FaStar className="text-green-600" />
                        Key Strengths
                      </p>
                      <p className="text-gray-700">{review.strengths}</p>
                    </div>
                  )}

                  {review.areas_for_improvement && (
                    <div className="bg-yellow-50 rounded-lg p-4 mb-3 border border-yellow-200">
                      <p className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                        <FaChartBar />
                        Areas for Improvement
                      </p>
                      <p className="text-gray-700">{review.areas_for_improvement}</p>
                    </div>
                  )}

                  {review.comments && (
                    <div className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FaComments />
                        Comments
                      </p>
                      <p className="text-gray-700">{review.comments}</p>
                    </div>
                  )}

                  {review.goals && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-3 border border-blue-200">
                      <p className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                        <FaChartBar />
                        Goals & Development
                      </p>
                      <p className="text-gray-700">{review.goals}</p>
                    </div>
                  )}

                  {/* Review Period */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3">
                    <p className="text-xs text-gray-600 mb-1">Review Period</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {new Date(review.review_period_start).toLocaleDateString()} - {new Date(review.review_period_end).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Acknowledgment Status */}
                  {review.technician_acknowledged ? (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-sm font-semibold text-green-700 mb-2">
                        ✓ Acknowledged by technician on {new Date(review.acknowledged_at).toLocaleDateString()}
                      </p>
                      {review.technician_comments && (
                        <p className="text-sm text-gray-700 italic">"{review.technician_comments}"</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 flex items-center justify-between">
                      <p className="text-sm text-yellow-700">⏳ Pending technician acknowledgment</p>
                      {user.role === 'MAINTENANCE_TECHNICIAN' && review.technician === user.id && (
                        <button
                          onClick={() => handleAcknowledge(review)}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm"
                        >
                          Acknowledge Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-4xl w-full my-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">New Performance Review</h2>
            
            <form onSubmit={handleSubmitReview} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technician <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={reviewForm.technician}
                  onChange={(e) => setReviewForm({ ...reviewForm, technician: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="">Select Technician</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.first_name} {tech.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Period Start <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={reviewForm.review_period_start}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_period_start: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Period End <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={reviewForm.review_period_end}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_period_end: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-4">Performance Ratings (1-5)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality of Work
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={reviewForm.quality_of_work}
                      onChange={(e) => setReviewForm({ ...reviewForm, quality_of_work: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeliness
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={reviewForm.timeliness}
                      onChange={(e) => setReviewForm({ ...reviewForm, timeliness: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Communication
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={reviewForm.communication}
                      onChange={(e) => setReviewForm({ ...reviewForm, communication: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professionalism
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={reviewForm.professionalism}
                      onChange={(e) => setReviewForm({ ...reviewForm, professionalism: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Technical Skills
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={reviewForm.technical_skills}
                      onChange={(e) => setReviewForm({ ...reviewForm, technical_skills: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teamwork
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={reviewForm.teamwork}
                      onChange={(e) => setReviewForm({ ...reviewForm, teamwork: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Strengths & Achievements
                </label>
                <textarea
                  value={reviewForm.strengths}
                  onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Highlight key strengths and achievements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Areas for Improvement
                </label>
                <textarea
                  value={reviewForm.areas_for_improvement}
                  onChange={(e) => setReviewForm({ ...reviewForm, areas_for_improvement: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Identify areas needing improvement..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments & Feedback
                </label>
                <textarea
                  value={reviewForm.comments}
                  onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Provide detailed feedback..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goals & Development Areas
                </label>
                <textarea
                  value={reviewForm.goals}
                  onChange={(e) => setReviewForm({ ...reviewForm, goals: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Set goals and identify development areas..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="w-full sm:flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors font-bold"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acknowledge Modal */}
      {showAcknowledgeModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-2xl w-full animate-scale-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Acknowledge Performance Review</h2>
            <p className="text-gray-600 mb-6">
              Review Period: {new Date(selectedReview.review_period_start).toLocaleDateString()} - {new Date(selectedReview.review_period_end).toLocaleDateString()}
            </p>
            
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 mb-6 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Overall Rating</h3>
                <div className="flex items-center gap-2">
                  <FaStar className="text-3xl text-yellow-500" />
                  <span className="text-3xl font-bold text-purple-600">{selectedReview.overall_rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-600">Quality</p>
                  <p className="font-bold text-gray-800">{selectedReview.quality_of_work}/5</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Timeliness</p>
                  <p className="font-bold text-gray-800">{selectedReview.timeliness}/5</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Communication</p>
                  <p className="font-bold text-gray-800">{selectedReview.communication}/5</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Professionalism</p>
                  <p className="font-bold text-gray-800">{selectedReview.professionalism}/5</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Technical</p>
                  <p className="font-bold text-gray-800">{selectedReview.technical_skills}/5</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Teamwork</p>
                  <p className="font-bold text-gray-800">{selectedReview.teamwork}/5</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitAcknowledge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Comments (Optional)
                </label>
                <textarea
                  value={acknowledgeComments}
                  onChange={(e) => setAcknowledgeComments(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Add your response to this review..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can provide your thoughts on the review or acknowledge areas for improvement
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAcknowledgeModal(false)
                    setSelectedReview(null)
                    setAcknowledgeComments('')
                  }}
                  className="w-full sm:flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors font-bold"
                >
                  Acknowledge Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceReviews
