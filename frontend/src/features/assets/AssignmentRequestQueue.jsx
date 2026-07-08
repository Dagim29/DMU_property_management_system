import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  FaClipboardList, FaSearch, FaFilter, FaClock, FaCheckCircle, 
  FaTimesCircle, FaHourglassHalf, FaExclamationTriangle, FaEye,
  FaCheck, FaTimes, FaUserClock
} from 'react-icons/fa';
import RequestReviewModal from './RequestReviewModal';

const AssignmentRequestQueue = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchStatistics();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let endpoint = '/assets/asset-requests/';
      
      if (statusFilter === 'PENDING_REVIEW') {
        endpoint = '/assets/asset-requests/pending/';
      } else if (statusFilter === 'OVERDUE') {
        endpoint = '/assets/asset-requests/overdue/';
      } else if (statusFilter === 'EXPIRING_SOON') {
        endpoint = '/assets/asset-requests/expiring_soon/';
      } else if (statusFilter !== 'all') {
        endpoint = `/assets/asset-requests/?status=${statusFilter}`;
      }

      const response = await api.get(endpoint);
      setRequests(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/assets/asset-requests/statistics/');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleReviewRequest = (request) => {
    setSelectedRequest(request);
    setShowReviewModal(true);
  };

  const handleReviewComplete = () => {
    setShowReviewModal(false);
    setSelectedRequest(null);
    fetchRequests();
    fetchStatistics();
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING_REVIEW': { color: 'yellow', icon: FaClock, text: 'Pending Review' },
      'APPROVED': { color: 'green', icon: FaCheckCircle, text: 'Approved' },
      'REJECTED': { color: 'red', icon: FaTimesCircle, text: 'Rejected' },
      'WAITLISTED': { color: 'orange', icon: FaHourglassHalf, text: 'Waitlisted' },
      'ACTIVE': { color: 'blue', icon: FaCheckCircle, text: 'Active' },
      'RETURNED': { color: 'gray', icon: FaCheckCircle, text: 'Returned' },
      'CANCELLED': { color: 'gray', icon: FaTimesCircle, text: 'Cancelled' },
      'EXPIRED': { color: 'gray', icon: FaTimesCircle, text: 'Expired' }
    };

    const badge = badges[status] || badges['PENDING_REVIEW'];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-${badge.color}-100 text-${badge.color}-700`}>
        <Icon />
        {badge.text}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      'LOW': 'gray',
      'MEDIUM': 'blue',
      'HIGH': 'orange',
      'URGENT': 'red'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${colors[priority]}-100 text-${colors[priority]}-700`}>
        {priority}
      </span>
    );
  };

  const filteredRequests = requests.filter(request => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (request.asset_name || '').toLowerCase().includes(term) ||
      (request.request_id || '').toLowerCase().includes(term) ||
      (request.requested_by_name || '').toLowerCase().includes(term) ||
      (request.asset_id_display || '').toLowerCase().includes(term);
    
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
              <FaClipboardList className="text-4xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Assignment Request Queue</h1>
              <p className="text-purple-100 text-lg mt-2">
                Review and manage asset assignment requests
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <StatCard 
            title="Total Requests" 
            value={stats.total || 0} 
            color="purple"
            icon={FaClipboardList}
          />
          <StatCard 
            title="Pending Review" 
            value={stats.pending || 0} 
            color="yellow"
            icon={FaClock}
            onClick={() => setStatusFilter('PENDING_REVIEW')}
          />
          <StatCard 
            title="Active" 
            value={stats.active || 0} 
            color="blue"
            icon={FaCheckCircle}
            onClick={() => setStatusFilter('ACTIVE')}
          />
          <StatCard 
            title="Overdue" 
            value={stats.overdue || 0} 
            color="red"
            icon={FaExclamationTriangle}
            onClick={() => setStatusFilter('OVERDUE')}
          />
          <StatCard 
            title="Waitlisted" 
            value={stats.waitlisted || 0} 
            color="orange"
            icon={FaHourglassHalf}
            onClick={() => setStatusFilter('WAITLISTED')}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by asset, request ID, user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
              >
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="ACTIVE">Active</option>
                <option value="WAITLISTED">Waitlisted</option>
                <option value="OVERDUE">Overdue</option>
                <option value="EXPIRING_SOON">Expiring Soon</option>
                <option value="RETURNED">Returned</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="all">All Status</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FaClipboardList className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No Requests Found</h3>
            <p className="text-gray-500">
              {searchTerm || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No requests match the selected status'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-800">{request.asset_name}</h3>
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-semibold">Request ID:</span> {request.request_id}
                      </div>
                      <div>
                        <span className="font-semibold">Requested By:</span> {request.requested_by_name}
                      </div>
                      <div>
                        <span className="font-semibold">Asset ID:</span> {request.asset_id_display}
                      </div>
                      <div>
                        <span className="font-semibold">Type:</span> {request.assignment_type_display}
                      </div>
                      <div>
                        <span className="font-semibold">Start Date:</span> {new Date(request.requested_start_date).toLocaleDateString()}
                      </div>
                      {request.requested_end_date && (
                        <div>
                          <span className="font-semibold">End Date:</span> {new Date(request.requested_end_date).toLocaleDateString()}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold">Requested:</span> {new Date(request.request_date).toLocaleDateString()}
                      </div>
                      {request.reviewed_by_name && (
                        <div>
                          <span className="font-semibold">Reviewed By:</span> {request.reviewed_by_name}
                        </div>
                      )}
                    </div>

                    {/* Overdue Warning */}
                    {request.is_overdue && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-red-800 font-semibold">
                          <FaExclamationTriangle className="inline mr-2" />
                          Overdue by {request.overdue_days} days!
                        </p>
                      </div>
                    )}

                    {/* Days Until Due */}
                    {request.status === 'ACTIVE' && request.days_until_due !== null && !request.is_overdue && (
                      <div className={`border rounded-lg p-3 mb-4 ${
                        request.days_until_due <= 3 
                          ? 'bg-yellow-50 border-yellow-200' 
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <p className={`font-semibold ${
                          request.days_until_due <= 3 ? 'text-yellow-800' : 'text-blue-800'
                        }`}>
                          <FaClock className="inline mr-2" />
                          Due in {request.days_until_due} days
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => navigate(`/dashboard/asset-requests/${request.id}`)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <FaEye />
                      View Details
                    </button>

                    {request.status === 'PENDING_REVIEW' && (
                      <button
                        onClick={() => handleReviewRequest(request)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        <FaUserClock />
                        Review
                      </button>
                    )}

                    {request.status === 'APPROVED' && (
                      <button
                        onClick={() => navigate(`/dashboard/asset-requests/${request.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        <FaCheck />
                        Complete Handover
                      </button>
                    )}

                    {request.status === 'ACTIVE' && (
                      <button
                        onClick={() => navigate(`/dashboard/asset-requests/${request.id}`)}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        <FaCheckCircle />
                        Process Return
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <RequestReviewModal
          request={selectedRequest}
          onClose={() => setShowReviewModal(false)}
          onComplete={handleReviewComplete}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value, color, icon: Icon, onClick }) => {
  const colors = {
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600'
  };

  return (
    <div 
      className={`bg-gradient-to-br ${colors[color]} rounded-xl shadow-lg p-6 text-white ${
        onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold opacity-90">{title}</p>
        {Icon && <Icon className="text-2xl opacity-75" />}
      </div>
      <p className="text-4xl font-bold">{value}</p>
    </div>
  );
};

export default AssignmentRequestQueue;
