import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  FaBox, FaSearch, FaFilter, FaClock, FaCheckCircle, 
  FaTimesCircle, FaHourglassHalf, FaEye, FaBan, FaUndo 
} from 'react-icons/fa';
import useToast from '../../hooks/useToast'
import { MESSAGES, formatErrorMessage } from '../../utils/messages';
import { ToastContainer } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';

const MyAssetRequests = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    active: 0,
    waitlisted: 0
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/assets/asset-requests/my_requests/');
      setRequests(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      pending: data.filter(r => r.status === 'PENDING_REVIEW').length,
      approved: data.filter(r => r.status === 'APPROVED').length,
      active: data.filter(r => r.status === 'ACTIVE').length,
      waitlisted: data.filter(r => r.status === 'WAITLISTED').length
    });
  };

  const handleCancelRequest = async (requestId) => {
    setRequestToCancel(requestId);
    setShowCancelConfirm(true);
  };

  const confirmCancelRequest = async () => {
    if (!requestToCancel) return;

    try {
      await api.post(`/assets/asset-requests/${requestToCancel}/cancel/`);
      showSuccess(MESSAGES.ASSIGNMENT.COMPLETE_SUCCESS);
      fetchRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      showError(formatErrorMessage(error));
    } finally {
      setRequestToCancel(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING_REVIEW': { color: 'yellow', icon: FaClock, text: 'Pending Review' },
      'APPROVED': { color: 'green', icon: FaCheckCircle, text: 'Approved' },
      'REJECTED': { color: 'red', icon: FaTimesCircle, text: 'Rejected' },
      'WAITLISTED': { color: 'orange', icon: FaHourglassHalf, text: 'Waitlisted' },
      'ACTIVE': { color: 'blue', icon: FaCheckCircle, text: 'Active' },
      'RETURNED': { color: 'gray', icon: FaUndo, text: 'Returned' },
      'CANCELLED': { color: 'gray', icon: FaBan, text: 'Cancelled' },
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
      <span className={`px-2 py-1 rounded text-xs font-semibold bg-${colors[priority]}-100 text-${colors[priority]}-700`}>
        {priority}
      </span>
    );
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.asset_id_display?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
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
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => {
          setShowCancelConfirm(false);
          setRequestToCancel(null);
        }}
        onConfirm={confirmCancelRequest}
        title="Cancel Request"
        message="Are you sure you want to cancel this asset request? This action cannot be undone."
        confirmText="Yes, Cancel Request"
        cancelText="No, Keep It"
        type="danger"
      />
      
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                <FaBox className="text-4xl" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">My Asset Requests</h1>
                <p className="text-purple-100 text-lg mt-2">
                  Track and manage your asset assignment requests
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/owner/browse-assets')}
              className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors shadow-lg"
            >
              Request New Asset
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total" value={stats.total} color="purple" />
          <StatCard title="Pending" value={stats.pending} color="yellow" />
          <StatCard title="Approved" value={stats.approved} color="green" />
          <StatCard title="Active" value={stats.active} color="blue" />
          <StatCard title="Waitlisted" value={stats.waitlisted} color="orange" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by asset name, request ID..."
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
                <option value="all">All Status</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="WAITLISTED">Waitlisted</option>
                <option value="ACTIVE">Active</option>
                <option value="RETURNED">Returned</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FaBox className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No Requests Found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'You haven\'t submitted any asset requests yet'}
            </p>
            <button
              onClick={() => navigate('/dashboard/owner/browse-assets')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
            >
              Browse Available Assets
            </button>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-semibold">Request ID:</span> {request.request_id}
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
                    </div>

                    {/* Waitlist Info */}
                    {request.status === 'WAITLISTED' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <p className="text-orange-800 font-semibold">
                          <FaHourglassHalf className="inline mr-2" />
                          Position in waitlist: #{request.waitlist_position}
                        </p>
                        {request.estimated_available_date && (
                          <p className="text-orange-700 text-sm mt-1">
                            Estimated available: {new Date(request.estimated_available_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Overdue Warning */}
                    {request.is_overdue && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-red-800 font-semibold">
                          ⚠️ Overdue by {request.overdue_days} days! Please return immediately.
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

                    {/* Rejection Reason */}
                    {request.status === 'REJECTED' && request.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-red-800 font-semibold mb-1">Rejection Reason:</p>
                        <p className="text-red-700 text-sm">{request.rejection_reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => navigate(`/dashboard/owner/asset-requests/${request.id}`)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <FaEye />
                      View Details
                    </button>

                    {request.can_cancel && (
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <FaBan />
                        Cancel
                      </button>
                    )}

                    {request.status === 'ACTIVE' && request.can_return && (
                      <button
                        onClick={() => navigate(`/dashboard/owner/asset-requests/${request.id}`)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <FaUndo />
                        Return
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color }) => {
  const colors = {
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl shadow-lg p-6 text-white`}>
      <p className="text-sm font-semibold opacity-90 mb-2">{title}</p>
      <p className="text-4xl font-bold">{value}</p>
    </div>
  );
};

export default MyAssetRequests;
