import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FaTimes, FaCheck, FaBan, FaHourglassHalf, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

const RequestReviewModal = ({ request, onClose, onComplete }) => {
  const [action, setAction] = useState('approve'); // approve, reject, waitlist
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(true);

  useEffect(() => {
    checkAssetAvailability();
  }, []);

  const checkAssetAvailability = async () => {
    setCheckingAvailability(true);
    try {
      const response = await api.get(`/assets/asset-availability/check/?asset_id=${request.asset}`);
      setAvailability(response.data);
      
      // Auto-suggest waitlist if not available
      if (!response.data.is_available) {
        setAction('waitlist');
        if (response.data.estimated_available_date) {
          setEstimatedDate(response.data.estimated_available_date);
        }
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (action === 'reject' && !rejectionReason.trim()) {
      showError('Please provide a rejection reason');
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      let data = {};

      if (action === 'approve') {
        endpoint = `/assets/asset-requests/${request.id}/approve/`;
        data = { notes };
      } else if (action === 'reject') {
        endpoint = `/assets/asset-requests/${request.id}/reject/`;
        data = { reason: rejectionReason };
      } else if (action === 'waitlist') {
        endpoint = `/assets/asset-requests/${request.id}/add_to_waitlist/`;
        data = { 
          notes,
          estimated_date: estimatedDate || null
        };
      }

      await api.post(endpoint, data);
      alert(`Request ${action}d successfully!`);
      onComplete();
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(error.response?.data?.error || `Failed to ${action} request`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-2xl text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Review Assignment Request</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FaTimes className="text-2xl" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Request Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Request Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Request ID:</span>
                <p className="text-gray-800">{request.request_id}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Asset:</span>
                <p className="text-gray-800">{request.asset_name}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Requested By:</span>
                <p className="text-gray-800">{request.requested_by_name}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Priority:</span>
                <p className="text-gray-800">{request.priority_display}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Type:</span>
                <p className="text-gray-800">{request.assignment_type_display}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Duration:</span>
                <p className="text-gray-800">
                  {new Date(request.requested_start_date).toLocaleDateString()} - 
                  {request.requested_end_date ? new Date(request.requested_end_date).toLocaleDateString() : 'Permanent'}
                </p>
              </div>
              {request.department && (
                <div>
                  <span className="font-semibold text-gray-600">Department:</span>
                  <p className="text-gray-800">{request.department}</p>
                </div>
              )}
              {request.project_name && (
                <div>
                  <span className="font-semibold text-gray-600">Project:</span>
                  <p className="text-gray-800">{request.project_name}</p>
                </div>
              )}
            </div>
            <div className="mt-4">
              <span className="font-semibold text-gray-600">Purpose:</span>
              <p className="text-gray-800 mt-1">{request.purpose}</p>
            </div>
          </div>

          {/* Availability Status */}
          {checkingAvailability ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-800">Checking asset availability...</p>
            </div>
          ) : availability && (
            <div className={`border rounded-xl p-4 mb-6 ${
              availability.is_available 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                {availability.is_available ? (
                  <FaCheckCircle className="text-2xl text-green-600 mt-1" />
                ) : (
                  <FaExclamationTriangle className="text-2xl text-yellow-600 mt-1" />
                )}
                <div className="flex-1">
                  <p className={`font-bold mb-2 ${
                    availability.is_available ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {availability.message}
                  </p>
                  {!availability.is_available && (
                    <>
                      {availability.estimated_available_date && (
                        <p className="text-yellow-700 text-sm mb-1">
                          Estimated available: {new Date(availability.estimated_available_date).toLocaleDateString()}
                        </p>
                      )}
                      {availability.waitlist_count > 0 && (
                        <p className="text-yellow-700 text-sm">
                          {availability.waitlist_count} user(s) already in waitlist
                        </p>
                      )}
                      {availability.current_assignment && (
                        <p className="text-yellow-700 text-sm">
                          Currently assigned to: {availability.current_assignment.user}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Selection */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Review Action
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setAction('approve')}
                  disabled={availability && !availability.is_available}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    action === 'approve'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-300'
                  } ${availability && !availability.is_available ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FaCheck className={`text-3xl mx-auto mb-2 ${
                    action === 'approve' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <p className="font-semibold text-gray-800">Approve</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAction('reject')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    action === 'reject'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-red-300'
                  }`}
                >
                  <FaBan className={`text-3xl mx-auto mb-2 ${
                    action === 'reject' ? 'text-red-600' : 'text-gray-400'
                  }`} />
                  <p className="font-semibold text-gray-800">Reject</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAction('waitlist')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    action === 'waitlist'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-300 hover:border-orange-300'
                  }`}
                >
                  <FaHourglassHalf className={`text-3xl mx-auto mb-2 ${
                    action === 'waitlist' ? 'text-orange-600' : 'text-gray-400'
                  }`} />
                  <p className="font-semibold text-gray-800">Waitlist</p>
                </button>
              </div>
            </div>

            {/* Action-specific fields */}
            {action === 'approve' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  placeholder="Add any notes or conditions for this approval..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}

            {action === 'reject' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows="3"
                  placeholder="Explain why this request is being rejected..."
                  className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            {action === 'waitlist' && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estimated Available Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={estimatedDate}
                    onChange={(e) => setEstimatedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Waitlist Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="3"
                    placeholder="Add any notes about the waitlist..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (action === 'approve' && availability && !availability.is_available)}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : action === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : (
                  `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestReviewModal;
