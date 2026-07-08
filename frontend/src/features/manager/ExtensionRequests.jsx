import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaClock, FaCheckCircle, FaTimesCircle, FaCalendar, FaUser, 
  FaBox, FaFilter, FaSearch, FaCalendarPlus, FaExclamationTriangle 
} from 'react-icons/fa';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import { ToastContainer } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';

const ExtensionRequests = () => {
  const navigate = useNavigate();
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExtension, setSelectedExtension] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    approved_end_date: '',
    notes: ''
  });
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchExtensions();
  }, [filter]);

  const fetchExtensions = async () => {
    setLoading(true);
    try {
      const endpoint = filter === 'PENDING' 
        ? '/assets/assignment-extensions/pending/'
        : '/assets/assignment-extensions/';
      
      const response = await api.get(endpoint);
      let data = response.data;
      
      // Handle paginated response
      if (data && typeof data === 'object' && 'results' in data) {
        data = data.results;
      }
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error('API returned non-array data:', data);
        data = [];
      }
      
      // Filter by status if not pending
      if (filter !== 'PENDING' && filter !== 'ALL') {
        data = data.filter(ext => ext.status === filter);
      }
      
      setExtensions(data);
    } catch (error) {
      console.error('Error fetching extensions:', error);
      showError('Failed to load extension requests');
      setExtensions([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (extension) => {
    setSelectedExtension(extension);
    setApprovalData({
      approved_end_date: extension.requested_new_end_date,
      notes: ''
    });
    setShowApproveModal(true);
  };

  const handleReject = (extension) => {
    setSelectedExtension(extension);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const submitApproval = async () => {
    if (!selectedExtension) return;

    try {
      await api.post(`/assets/assignment-extensions/${selectedExtension.id}/approve/`, {
        approved_end_date: approvalData.approved_end_date,
        notes: approvalData.notes
      });
      
      showSuccess('Extension request approved successfully');
      setShowApproveModal(false);
      setSelectedExtension(null);
      fetchExtensions();
    } catch (error) {
      console.error('Error approving extension:', error);
      showError('Failed to approve extension: ' + (error.response?.data?.error || error.message));
    }
  };

  const submitRejection = async () => {
    if (!selectedExtension) return;

    if (!rejectionReason.trim()) {
      showError('Rejection reason is required');
      return;
    }

    try {
      await api.post(`/assets/assignment-extensions/${selectedExtension.id}/reject/`, {
        reason: rejectionReason
      });
      
      showSuccess('Extension request rejected');
      setShowRejectModal(false);
      setSelectedExtension(null);
      fetchExtensions();
    } catch (error) {
      console.error('Error rejecting extension:', error);
      showError('Failed to reject extension: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': { color: 'yellow', icon: FaClock, text: 'Pending' },
      'APPROVED': { color: 'green', icon: FaCheckCircle, text: 'Approved' },
      'REJECTED': { color: 'red', icon: FaTimesCircle, text: 'Rejected' },
      'CANCELLED': { color: 'gray', icon: FaTimesCircle, text: 'Cancelled' }
    };

    const badge = badges[status] || badges['PENDING'];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-${badge.color}-100 text-${badge.color}-700`}>
        <Icon className="text-xs" />
        {badge.text}
      </span>
    );
  };

  const getPriorityBadge = (days) => {
    if (days > 60) {
      return <span className="text-red-600 font-bold">High Priority</span>;
    } else if (days > 30) {
      return <span className="text-yellow-600 font-semibold">Medium Priority</span>;
    }
    return <span className="text-green-600">Standard</span>;
  };

  const filteredExtensions = extensions.filter(ext => {
    const searchLower = searchTerm.toLowerCase();
    return (
      ext.extension_id.toLowerCase().includes(searchLower) ||
      ext.assignment_request_id.toLowerCase().includes(searchLower) ||
      ext.asset_name.toLowerCase().includes(searchLower) ||
      ext.requested_by_name.toLowerCase().includes(searchLower)
    );
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
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                <FaCalendarPlus className="text-4xl" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Extension Requests</h1>
                <p className="text-purple-100 text-lg mt-2">
                  Review and manage assignment extension requests
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{extensions.length}</p>
              <p className="text-purple-100">Total Requests</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaFilter className="inline mr-2" />
                Filter by Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="ALL">All Requests</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaSearch className="inline mr-2" />
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by ID, asset, or user..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Extension Requests List */}
        {filteredExtensions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FaCalendarPlus className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Extension Requests</h3>
            <p className="text-gray-600">
              {searchTerm ? 'No requests match your search criteria' : 'No extension requests found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExtensions.map((extension) => (
              <div key={extension.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{extension.asset_name}</h3>
                        {getStatusBadge(extension.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Extension ID: <span className="font-semibold">{extension.extension_id}</span>
                        {' • '}
                        Assignment: <span className="font-semibold">{extension.assignment_request_id}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">{extension.extension_days} days</p>
                      <p className="text-sm text-gray-600">{getPriorityBadge(extension.extension_days)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <FaUser className="text-purple-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Requested By</p>
                        <p className="font-semibold text-gray-800">{extension.requested_by_name}</p>
                        <p className="text-xs text-gray-600">{extension.requested_by_email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <FaCalendar className="text-blue-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Current End Date</p>
                        <p className="font-semibold text-gray-800">
                          {new Date(extension.current_end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <FaCalendarPlus className="text-green-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Requested New Date</p>
                        <p className="font-semibold text-gray-800">
                          {new Date(extension.requested_new_end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Reason for Extension:</p>
                    <p className="text-gray-800">{extension.reason}</p>
                  </div>

                  {/* Warning for long extensions */}
                  {extension.extension_days > 60 && extension.status === 'PENDING' && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-yellow-800 font-semibold flex items-center gap-2 text-sm">
                        <FaExclamationTriangle />
                        Long Extension Request - Requires Careful Review
                      </p>
                    </div>
                  )}

                  {/* Review Information */}
                  {extension.status !== 'PENDING' && extension.reviewed_by_name && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-600">Reviewed by: </span>
                          <span className="font-semibold text-gray-800">{extension.reviewed_by_name}</span>
                          <span className="text-gray-600"> on </span>
                          <span className="font-semibold text-gray-800">
                            {new Date(extension.review_date).toLocaleDateString()}
                          </span>
                        </div>
                        {extension.status === 'APPROVED' && extension.approved_days && (
                          <div className="text-green-600 font-semibold">
                            Approved: {extension.approved_days} days
                          </div>
                        )}
                      </div>
                      {extension.review_notes && (
                        <div className="mt-2 bg-blue-50 rounded p-3">
                          <p className="text-sm text-gray-700">{extension.review_notes}</p>
                        </div>
                      )}
                      {extension.rejection_reason && (
                        <div className="mt-2 bg-red-50 rounded p-3">
                          <p className="text-sm text-red-700">{extension.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {extension.status === 'PENDING' && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleApprove(extension)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <FaCheckCircle />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(extension)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <FaTimesCircle />
                        Reject
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/assignment-requests/${extension.assignment}`)}
                        className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                      >
                        View Assignment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedExtension && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Approve Extension Request</h3>
            <p className="text-gray-600 mb-4">
              Review and approve the extension for {selectedExtension.asset_name}
            </p>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Requested Extension</p>
                <p className="text-lg font-bold text-gray-800">{selectedExtension.extension_days} days</p>
                <p className="text-sm text-gray-600 mt-2">
                  From: {new Date(selectedExtension.current_end_date).toLocaleDateString()}
                  {' → '}
                  To: {new Date(selectedExtension.requested_new_end_date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Approved End Date
                </label>
                <input
                  type="date"
                  value={approvalData.approved_end_date}
                  onChange={(e) => setApprovalData({...approvalData, approved_end_date: e.target.value})}
                  min={selectedExtension.current_end_date}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can approve a different date than requested
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={approvalData.notes}
                  onChange={(e) => setApprovalData({...approvalData, notes: e.target.value})}
                  rows="3"
                  placeholder="Any conditions or notes for the user..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={submitApproval}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Approve Extension
              </button>
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedExtension && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Reject Extension Request</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this extension request
            </p>
            
            <div className="space-y-4">
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Extension Request</p>
                <p className="text-lg font-bold text-gray-800">{selectedExtension.extension_days} days</p>
                <p className="text-sm text-gray-600">for {selectedExtension.asset_name}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows="4"
                  required
                  placeholder="Explain why this extension cannot be approved..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={submitRejection}
                disabled={!rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Extension
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtensionRequests;
