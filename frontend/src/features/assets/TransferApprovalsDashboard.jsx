import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaExchangeAlt, FaCheckCircle, FaTimesCircle, FaClock, FaMapMarkerAlt,
  FaBuilding, FaExclamationTriangle, FaFilter, FaSearch, FaArrowRight,
  FaCalendarAlt, FaTruck, FaBolt, FaInfoCircle
} from 'react-icons/fa';
import api from '../../services/api';
import useToast from '../../hooks/useToast'
import { MESSAGES, formatErrorMessage } from '../../utils/messages';
import { ToastContainer } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';

const TransferApprovalsDashboard = () => {
  const navigate = useNavigate();
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalType, setApprovalType] = useState(''); // 'source' or 'dest'
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchTransfers();
  }, [filter]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/assets/transfers/');
      let data = response.data;
      
      // Handle paginated response
      if (data && typeof data === 'object' && 'results' in data) {
        data = data.results;
      }
      
      if (!Array.isArray(data)) {
        data = [];
      }
      
      // Filter by status
      if (filter !== 'ALL') {
        data = data.filter(t => t.approval_status === filter);
      }
      
      setTransfers(data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      showError('Failed to load transfer requests');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSource = (transfer) => {
    setSelectedTransfer(transfer);
    setApprovalType('source');
    setShowApproveModal(true);
  };

  const handleApproveDest = (transfer) => {
    setSelectedTransfer(transfer);
    setApprovalType('dest');
    setShowApproveModal(true);
  };

  const handleReject = (transfer) => {
    setSelectedTransfer(transfer);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const submitApproval = async () => {
    if (!selectedTransfer) return;

    try {
      const endpoint = approvalType === 'source' 
        ? `/assets/transfers/${selectedTransfer.id}/approve_source/`
        : `/assets/transfers/${selectedTransfer.id}/approve_dest/`;
      
      await api.post(endpoint);
      
      const message = approvalType === 'source'
        ? 'Transfer approved by source department'
        : 'Transfer approved by destination department and completed';
      
      showSuccess(message);
      setShowApproveModal(false);
      setSelectedTransfer(null);
      fetchTransfers();
    } catch (error) {
      console.error('Error approving transfer:', error);
      showError(formatErrorMessage(error) || 'Failed to approve transfer');
    }
  };

  const submitRejection = async () => {
    if (!selectedTransfer) return;

    if (!rejectionReason.trim()) {
      showError('Rejection reason is required');
      return;
    }

    try {
      await api.post(`/assets/transfers/${selectedTransfer.id}/reject/`, {
        reason: rejectionReason
      });
      
      showSuccess('Transfer request rejected');
      setShowRejectModal(false);
      setSelectedTransfer(null);
      fetchTransfers();
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      showError(formatErrorMessage(error) || 'Failed to reject transfer');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': { color: 'yellow', icon: FaClock, text: 'Pending Source Approval' },
      'APPROVED_SOURCE': { color: 'blue', icon: FaArrowRight, text: 'Awaiting Destination Approval' },
      'FULLY_APPROVED': { color: 'green', icon: FaCheckCircle, text: 'Fully Approved' },
      'COMPLETED': { color: 'green', icon: FaCheckCircle, text: 'Completed' },
      'REJECTED': { color: 'red', icon: FaTimesCircle, text: 'Rejected' }
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

  const getTransferTypeBadge = (type) => {
    const badges = {
      'PERMANENT': { color: 'purple', icon: FaExchangeAlt },
      'TEMPORARY': { color: 'blue', icon: FaClock },
      'EMERGENCY': { color: 'red', icon: FaBolt }
    };

    const badge = badges[type] || badges['PERMANENT'];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-${badge.color}-100 text-${badge.color}-700`}>
        <Icon />
        {type}
      </span>
    );
  };

  const filteredTransfers = transfers.filter(transfer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      transfer.asset_id?.toLowerCase().includes(searchLower) ||
      transfer.asset_name?.toLowerCase().includes(searchLower) ||
      transfer.requested_by_name?.toLowerCase().includes(searchLower) ||
      transfer.source_campus_name?.toLowerCase().includes(searchLower) ||
      transfer.dest_campus_name?.toLowerCase().includes(searchLower)
    );
  });

  // Separate transfers by approval stage
  const pendingSourceApproval = filteredTransfers.filter(t => t.approval_status === 'PENDING');
  const pendingDestApproval = filteredTransfers.filter(t => t.approval_status === 'APPROVED_SOURCE');
  const completedTransfers = filteredTransfers.filter(t => ['FULLY_APPROVED', 'COMPLETED'].includes(t.approval_status));
  const rejectedTransfers = filteredTransfers.filter(t => t.approval_status === 'REJECTED');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 py-8">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                <FaExchangeAlt className="text-4xl" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Transfer Approvals</h1>
                <p className="text-teal-100 text-lg mt-2">
                  Review and approve asset transfer requests
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{transfers.length}</p>
              <p className="text-teal-100">Total Transfers</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Source</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingSourceApproval.length}</p>
              </div>
              <FaClock className="text-4xl text-yellow-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Destination</p>
                <p className="text-3xl font-bold text-blue-600">{pendingDestApproval.length}</p>
              </div>
              <FaArrowRight className="text-4xl text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedTransfers.length}</p>
              </div>
              <FaCheckCircle className="text-4xl text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{rejectedTransfers.length}</p>
              </div>
              <FaTimesCircle className="text-4xl text-red-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaFilter className="inline mr-2" />
                Filter by Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="ALL">All Transfers</option>
                <option value="PENDING">Pending Source Approval</option>
                <option value="APPROVED_SOURCE">Pending Destination Approval</option>
                <option value="FULLY_APPROVED">Fully Approved</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaSearch className="inline mr-2" />
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by asset, campus, or user..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Transfer Requests List */}
        {filteredTransfers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FaExchangeAlt className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Transfer Requests</h3>
            <p className="text-gray-600">
              {searchTerm ? 'No transfers match your search criteria' : 'No transfer requests found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransfers.map((transfer) => (
              <div key={transfer.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{transfer.asset_name}</h3>
                        {getStatusBadge(transfer.approval_status)}
                        {getTransferTypeBadge(transfer.transfer_type)}
                        {transfer.is_source_overdue && transfer.approval_status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">
                            <FaExclamationTriangle />
                            OVERDUE
                          </span>
                        )}
                        {transfer.is_dest_overdue && transfer.approval_status === 'APPROVED_SOURCE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">
                            <FaExclamationTriangle />
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Asset ID: <span className="font-semibold">{transfer.asset_id}</span>
                        {' • '}
                        Requested by: <span className="font-semibold">{transfer.requested_by_name}</span>
                        {' • '}
                        {new Date(transfer.transfer_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Transfer Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* From Location */}
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <p className="text-xs font-semibold text-blue-600 mb-2 uppercase">From (Source)</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FaBuilding className="text-blue-600" />
                          <span className="text-sm font-semibold">{transfer.source_campus_name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="text-blue-600" />
                          <span className="text-sm">{transfer.from_room_info || 'N/A'}</span>
                        </div>
                      </div>
                      {transfer.source_approved_at && (
                        <div className="mt-2 pt-2 border-t border-blue-300">
                          <p className="text-xs text-blue-700">
                            ✓ Approved by {transfer.source_approved_by_name}
                          </p>
                          <p className="text-xs text-blue-600">
                            {new Date(transfer.source_approved_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center">
                      <FaArrowRight className="text-4xl text-teal-600" />
                    </div>

                    {/* To Location */}
                    <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <p className="text-xs font-semibold text-green-600 mb-2 uppercase">To (Destination)</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FaBuilding className="text-green-600" />
                          <span className="text-sm font-semibold">{transfer.dest_campus_name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="text-green-600" />
                          <span className="text-sm">{transfer.to_room_info || 'N/A'}</span>
                        </div>
                      </div>
                      {transfer.dest_approved_at && (
                        <div className="mt-2 pt-2 border-t border-green-300">
                          <p className="text-xs text-green-700">
                            ✓ Approved by {transfer.dest_approved_by_name}
                          </p>
                          <p className="text-xs text-green-600">
                            {new Date(transfer.dest_approved_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {transfer.reason_category && (
                        <div>
                          <p className="text-gray-600">Category</p>
                          <p className="font-semibold">{transfer.reason_category_display}</p>
                        </div>
                      )}
                      {transfer.scheduled_date && (
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <FaCalendarAlt /> Scheduled
                          </p>
                          <p className="font-semibold">{new Date(transfer.scheduled_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {transfer.transportation_method && (
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <FaTruck /> Transport
                          </p>
                          <p className="font-semibold">{transfer.transportation_method}</p>
                        </div>
                      )}
                      {transfer.source_approval_deadline && transfer.approval_status === 'PENDING' && (
                        <div>
                          <p className="text-gray-600">Source Deadline</p>
                          <p className={`font-semibold ${transfer.is_source_overdue ? 'text-red-600' : ''}`}>
                            {new Date(transfer.source_approval_deadline).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {transfer.dest_approval_deadline && transfer.approval_status === 'APPROVED_SOURCE' && (
                        <div>
                          <p className="text-gray-600">Dest Deadline</p>
                          <p className={`font-semibold ${transfer.is_dest_overdue ? 'text-red-600' : ''}`}>
                            {new Date(transfer.dest_approval_deadline).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {transfer.reason && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Reason:</p>
                        <p className="text-sm text-gray-800">{transfer.reason}</p>
                      </div>
                    )}
                    {transfer.special_requirements && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Special Requirements:</p>
                        <p className="text-sm text-gray-800">{transfer.special_requirements}</p>
                      </div>
                    )}
                  </div>

                  {/* Rejection Reason */}
                  {transfer.approval_status === 'REJECTED' && transfer.rejection_reason && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                        <FaTimesCircle />
                        Rejection Reason
                      </p>
                      <p className="text-sm text-red-700">{transfer.rejection_reason}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    {transfer.approval_status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApproveSource(transfer)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <FaCheckCircle />
                          Approve as Source
                        </button>
                        <button
                          onClick={() => handleReject(transfer)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <FaTimesCircle />
                          Reject
                        </button>
                      </>
                    )}

                    {transfer.approval_status === 'APPROVED_SOURCE' && (
                      <>
                        <button
                          onClick={() => handleApproveDest(transfer)}
                          className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <FaCheckCircle />
                          Approve as Destination & Complete
                        </button>
                        <button
                          onClick={() => handleReject(transfer)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <FaTimesCircle />
                          Reject
                        </button>
                      </>
                    )}

                    {['FULLY_APPROVED', 'COMPLETED'].includes(transfer.approval_status) && (
                      <div className="flex-1 text-center py-2">
                        <span className="text-green-600 font-semibold flex items-center justify-center gap-2">
                          <FaCheckCircle />
                          Transfer Completed Successfully
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => navigate(`/dashboard/assets/${transfer.asset}`)}
                      className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      View Asset
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {approvalType === 'source' ? 'Approve as Source Department' : 'Approve as Destination & Complete Transfer'}
            </h3>
            <p className="text-gray-600 mb-4">
              {approvalType === 'source' 
                ? 'Approve this transfer from the source department. The destination department will then need to approve.'
                : 'Final approval from destination department. This will complete the transfer and update the asset location.'}
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Asset</p>
              <p className="text-lg font-bold text-gray-800">{selectedTransfer.asset_name}</p>
              <p className="text-sm text-gray-600 mt-2">
                {selectedTransfer.source_campus_name} → {selectedTransfer.dest_campus_name}
              </p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-blue-800 text-sm flex items-center gap-2">
                <FaInfoCircle />
                {approvalType === 'source' 
                  ? 'After your approval, the destination department will be notified to complete the approval process.'
                  : 'After your approval, the asset will be immediately transferred to the new location.'}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={submitApproval}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Confirm Approval
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
      {showRejectModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Reject Transfer Request</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this transfer request
            </p>
            
            <div className="bg-red-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Asset</p>
              <p className="text-lg font-bold text-gray-800">{selectedTransfer.asset_name}</p>
              <p className="text-sm text-gray-600">Requested by {selectedTransfer.requested_by_name}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="4"
                required
                placeholder="Explain why this transfer cannot be approved..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={submitRejection}
                disabled={!rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Transfer
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

export default TransferApprovalsDashboard;
