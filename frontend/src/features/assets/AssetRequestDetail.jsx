import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { 
  FaArrowLeft, FaBox, FaClock, FaUser, FaCalendar, FaClipboard,
  FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaBan, FaUndo, FaCheck,
  FaCalendarPlus, FaUpload
} from 'react-icons/fa';
import useToast from '../../hooks/useToast'
import { MESSAGES, formatErrorMessage } from '../../utils/messages';
import { ToastContainer } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';

const AssetRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { toasts, showSuccess, showError, removeToast } = useToast();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [handoverData, setHandoverData] = useState({
    condition: 'GOOD',
    condition_notes: ''
  });
  const [returnData, setReturnData] = useState({
    condition: 'GOOD',
    condition_notes: ''
  });
  const [handoverPhotos, setHandoverPhotos] = useState([]);
  const [returnPhotos, setReturnPhotos] = useState([]);

  // Location selector states
  const [campuses, setCampuses] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [showInitiateReturnModal, setShowInitiateReturnModal] = useState(false);
  const [initiateReturnNotes, setInitiateReturnNotes] = useState('');
  
  const resetLocations = () => {
    setSelectedCampus('');
    setSelectedBuilding('');
    setSelectedFloor('');
    setSelectedRoom('');
  };
  
  // Check if user is Property Manager
  const isPropertyManager = user?.role === 'PROPERTY_MANAGER' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchRequestDetail();
    fetchCampuses();
  }, [id]);

  useEffect(() => {
    if (selectedCampus) {
      fetchBuildings(selectedCampus);
    } else {
      setBuildings([]);
      setFloors([]);
      setRooms([]);
      setSelectedBuilding('');
      setSelectedFloor('');
      setSelectedRoom('');
    }
  }, [selectedCampus]);

  useEffect(() => {
    if (selectedBuilding) {
      fetchFloors(selectedBuilding);
    } else {
      setFloors([]);
      setRooms([]);
      setSelectedFloor('');
      setSelectedRoom('');
    }
  }, [selectedBuilding]);

  useEffect(() => {
    if (selectedFloor) {
      fetchRooms(selectedFloor);
    } else {
      setRooms([]);
      setSelectedRoom('');
    }
  }, [selectedFloor]);

  const fetchCampuses = async () => {
    try {
      const response = await api.get('/assets/campuses/');
      const data = response.data.results || response.data;
      setCampuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching campuses:', error);
    }
  };

  const fetchBuildings = async (campusId) => {
    try {
      const response = await api.get(`/assets/buildings/?campus=${campusId}`);
      const data = response.data.results || response.data;
      setBuildings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchFloors = async (buildingId) => {
    try {
      const response = await api.get(`/assets/floors/?building=${buildingId}`);
      const data = response.data.results || response.data;
      setFloors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching floors:', error);
    }
  };

  const fetchRooms = async (floorId) => {
    try {
      const response = await api.get(`/assets/rooms/?floor=${floorId}`);
      const data = response.data.results || response.data;
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchRequestDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/assets/asset-requests/${id}/`);
      setRequest(response.data);
    } catch (error) {
      console.error('Error fetching request:', error);
      showError('Failed to load request details');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancel Request',
      message: 'Are you sure you want to cancel this request?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await api.post(`/assets/asset-requests/${id}/cancel/`);
          showSuccess(MESSAGES.ASSIGNMENT.COMPLETE_SUCCESS);
          fetchRequestDetail();
        } catch (error) {
          console.error('Error cancelling request:', error);
          showError('Failed to cancel request');
        }
      }
    });
  };

  const handleAcceptTerms = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Accept Terms',
      message: 'By accepting, you agree to take responsibility for this asset and return it in good condition.',
      type: 'info',
      confirmText: 'Accept Terms',
      onConfirm: async () => {
        try {
          await api.post(`/assets/asset-requests/${id}/accept_terms/`, {
            signature: `Accepted by user on ${new Date().toISOString()}`
          });
          showSuccess('Terms accepted successfully');
          fetchRequestDetail();
        } catch (error) {
          console.error('Error accepting terms:', error);
          showError('Failed to accept terms');
        }
      }
    });
  };

  const handleInitiateReturn = () => {
    setReturnPhotos([]);
    setInitiateReturnNotes('');
    setShowInitiateReturnModal(true);
  };

  const submitInitiateReturn = async () => {
    if (returnPhotos.length < 2) {
      showError('Minimum 2 return photos are required to initiate return.');
      return;
    }
    try {
      await api.post(`/assets/asset-requests/${id}/initiate_return/`, {
        photos: returnPhotos,
        notes: initiateReturnNotes
      });
      showSuccess('Return initiated and photos submitted successfully.');
      setShowInitiateReturnModal(false);
      fetchRequestDetail();
    } catch (error) {
      console.error('Error initiating return:', error);
      showError('Failed to initiate return: ' + (formatErrorMessage(error) || 'Please try again.'));
    }
  };

  // Property Manager Actions
  const handleCompleteHandover = async () => {
    try {
      await api.post(`/assets/asset-requests/${id}/complete_handover/`, {
        condition: handoverData.condition,
        condition_notes: handoverData.condition_notes,
        end_date: request.requested_end_date,
        photos: handoverPhotos,
        handover_room_id: selectedRoom || null
      });
      showSuccess('Handover completed successfully');
      setShowHandoverModal(false);
      setHandoverPhotos([]);
      resetLocations();
      fetchRequestDetail();
    } catch (error) {
      console.error('Error completing handover:', error);
      showError('Failed to complete handover: ' + (formatErrorMessage(error) || formatErrorMessage(error)));
    }
  };

  const handleCompleteReturn = async () => {
    try {
      await api.post(`/assets/asset-requests/${id}/complete_return/`, {
        condition: returnData.condition,
        condition_notes: returnData.condition_notes,
        return_room_id: selectedRoom || null
      });
      showSuccess('Return completed successfully');
      setShowReturnModal(false);
      resetLocations();
      fetchRequestDetail();
    } catch (error) {
      console.error('Error completing return:', error);
      showError('Failed to complete return: ' + (formatErrorMessage(error) || formatErrorMessage(error)));
    }
  };

  const handlePhotoUpload = (e, isHandover) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isHandover) {
          setHandoverPhotos(prev => [...prev, reader.result]);
        } else {
          setReturnPhotos(prev => [...prev, reader.result]);
        }
      };
      reader.readAsDataURL(file);
    });
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
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-semibold bg-${badge.color}-100 text-${badge.color}-700`}>
        <Icon />
        {badge.text}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <FaArrowLeft />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{request.asset_name}</h1>
              <p className="text-purple-100 text-lg">Request ID: {request.request_id}</p>
            </div>
            {getStatusBadge(request.status)}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Information */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaClipboard className="text-purple-600" />
                Request Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem label="Asset ID" value={request.asset_id_display} />
                <InfoItem label="Priority" value={request.priority_display} />
                <InfoItem label="Assignment Type" value={request.assignment_type_display} />
                <InfoItem label="Requested Date" value={new Date(request.request_date).toLocaleDateString()} />
                <InfoItem label="Start Date" value={new Date(request.requested_start_date).toLocaleDateString()} />
                {request.requested_end_date && (
                  <InfoItem label="End Date" value={new Date(request.requested_end_date).toLocaleDateString()} />
                )}
                {request.department && <InfoItem label="Department" value={request.department} />}
                {request.project_name && <InfoItem label="Project" value={request.project_name} />}
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-600 mb-2">Purpose:</p>
                <p className="text-gray-800 bg-gray-50 p-4 rounded-lg">{request.purpose}</p>
              </div>
            </div>

            {/* Status-specific Information */}
            {request.status === 'WAITLISTED' && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                  <FaHourglassHalf />
                  Waitlist Information
                </h3>
                <div className="space-y-2">
                  <p className="text-orange-700">
                    <span className="font-semibold">Position:</span> #{request.waitlist_position}
                  </p>
                  {request.estimated_available_date && (
                    <p className="text-orange-700">
                      <span className="font-semibold">Estimated Available:</span>{' '}
                      {new Date(request.estimated_available_date).toLocaleDateString()}
                    </p>
                  )}
                  {request.waitlist_notified && (
                    <p className="text-orange-700">
                      <span className="font-semibold">Notified:</span>{' '}
                      {new Date(request.waitlist_notification_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {request.status === 'REJECTED' && request.rejection_reason && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
                  <FaTimesCircle />
                  Rejection Reason
                </h3>
                <p className="text-red-700">{request.rejection_reason}</p>
              </div>
            )}

            {request.status === 'ACTIVE' && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <FaCheckCircle />
                  Active Assignment
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label="Started" value={new Date(request.assignment_start_date).toLocaleDateString()} />
                  {request.assignment_end_date && (
                    <InfoItem label="Due Date" value={new Date(request.assignment_end_date).toLocaleDateString()} />
                  )}
                  <InfoItem label="Condition at Handover" value={request.assignment_condition} />
                  {request.days_until_due !== null && (
                    <InfoItem 
                      label="Days Until Due" 
                      value={request.is_overdue ? `Overdue by ${request.overdue_days} days` : `${request.days_until_due} days`}
                      className={request.is_overdue ? 'text-red-600 font-bold' : request.days_until_due <= 3 ? 'text-yellow-600 font-bold' : ''}
                    />
                  )}
                </div>
                {request.assignment_condition_notes && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Condition Notes:</p>
                    <p className="text-gray-800 bg-white p-4 rounded-lg">{request.assignment_condition_notes}</p>
                  </div>
                )}
              </div>
            )}

            {request.status === 'RETURNED' && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                  <FaCheckCircle className="text-green-600" />
                  Returned Asset Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label="Actual Return Date" value={request.actual_return_date ? new Date(request.actual_return_date).toLocaleDateString() : 'N/A'} />
                  <InfoItem label="Condition at Return" value={request.return_condition || 'N/A'} />
                </div>
                {request.return_condition_notes && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Return Condition Notes & Review:</p>
                    <p className="text-gray-800 bg-white p-4 rounded-lg whitespace-pre-wrap">{request.return_condition_notes}</p>
                  </div>
                )}
                {request.return_photos && request.return_photos.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Return Photos:</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {request.return_photos.map((photo, idx) => (
                        <img 
                          key={idx} 
                          src={photo} 
                          alt={`Return Photo ${idx + 1}`} 
                          className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Review Information */}
            {request.reviewed_by_name && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaUser className="text-purple-600" />
                  Review Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label="Reviewed By" value={request.reviewed_by_name} />
                  <InfoItem label="Review Date" value={new Date(request.review_date).toLocaleDateString()} />
                </div>
                {request.review_notes && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Review Notes:</p>
                    <p className="text-gray-800 bg-gray-50 p-4 rounded-lg">{request.review_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* History Timeline */}
            {request.history && request.history.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaClock className="text-purple-600" />
                  History Timeline
                </h2>
                <div className="space-y-4">
                  {request.history.map((event, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                        {index < request.history.length - 1 && (
                          <div className="w-0.5 h-full bg-purple-200 my-1"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-semibold text-gray-800">{event.action_display}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(event.action_date).toLocaleString()}
                        </p>
                        {event.performed_by_name && (
                          <p className="text-sm text-gray-600">by {event.performed_by_name}</p>
                        )}
                        {event.notes && (
                          <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Asset Info */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Actions</h3>
              <div className="space-y-3">
                {/* Property Manager Actions */}
                {isPropertyManager && request.status === 'APPROVED' && request.terms_accepted && (
                  <button
                    onClick={() => { resetLocations(); setShowHandoverModal(true); }}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaCheck />
                    Complete Handover
                  </button>
                )}

                {isPropertyManager && request.status === 'ACTIVE' && (
                  <button
                    onClick={() => { resetLocations(); setShowReturnModal(true); }}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaUndo />
                    Complete Return
                  </button>
                )}

                {/* Owner/User Actions */}
                {!isPropertyManager && request.can_cancel && (
                  <button
                    onClick={handleCancelRequest}
                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaBan />
                    Cancel Request
                  </button>
                )}

                {!isPropertyManager && request.status === 'APPROVED' && !request.terms_accepted && (
                  <button
                    onClick={handleAcceptTerms}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaCheckCircle />
                    Accept Terms
                  </button>
                )}

                {!isPropertyManager && request.status === 'ACTIVE' && request.can_return && (
                  <button
                    onClick={handleInitiateReturn}
                    className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaUndo />
                    Initiate Return
                  </button>
                )}

                {/* Request Extension Button */}
                {!isPropertyManager && request.status === 'ACTIVE' && !request.is_overdue && (
                  <button
                    onClick={() => navigate(`/dashboard/owner/request-extension/${id}`)}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaCalendarPlus />
                    Request Extension
                  </button>
                )}

                {/* Back Button */}
                <button
                  onClick={() => navigate(isPropertyManager ? '/dashboard/assignment-requests' : '/dashboard/owner/my-asset-requests')}
                  className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  {isPropertyManager ? 'Back to Asset Requests' : 'Back to My Requests'}
                </button>
              </div>
            </div>

            {/* Asset Information */}
            {request.asset_details && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaBox className="text-purple-600" />
                  Asset Information
                </h3>
                <div className="space-y-3">
                  <InfoItem label="Asset ID" value={request.asset_details.asset_id} />
                  <InfoItem label="Type" value={request.asset_details.asset_type} />
                  <InfoItem label="Status" value={request.asset_details.status} />
                  {request.asset_details.campus_name && (
                    <InfoItem label="Campus" value={request.asset_details.campus_name} />
                  )}
                  {request.asset_details.room_info && (
                    <InfoItem label="Location" value={request.asset_details.room_info} />
                  )}
                </div>
              </div>
            )}

            {/* User Information */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaUser className="text-purple-600" />
                Requester
              </h3>
              <div className="space-y-3">
                <InfoItem label="Name" value={request.requested_by_name} />
                <InfoItem label="Email" value={request.requested_by_email} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Handover Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto transform transition-all duration-300 translate-y-0 opacity-100 animate-[slideDown_0.3s_ease-out]">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Complete Handover</h3>
            <p className="text-gray-600 mb-4">Document the asset condition at handover</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Asset Condition
                </label>
                <select
                  value={handoverData.condition}
                  onChange={(e) => setHandoverData({...handoverData, condition: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Condition Notes (Optional)
                </label>
                <textarea
                  value={handoverData.condition_notes}
                  onChange={(e) => setHandoverData({...handoverData, condition_notes: e.target.value})}
                  rows="3"
                  placeholder="Any scratches, dents, or other observations..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <h4 className="text-sm font-bold text-gray-700">Handover Location (Optional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Campus</label>
                    <select
                      value={selectedCampus}
                      onChange={(e) => setSelectedCampus(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">Select Campus</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Building</label>
                    <select
                      value={selectedBuilding}
                      onChange={(e) => setSelectedBuilding(e.target.value)}
                      disabled={!selectedCampus}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
                    >
                      <option value="">Select Building</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Floor</label>
                    <select
                      value={selectedFloor}
                      onChange={(e) => setSelectedFloor(e.target.value)}
                      disabled={!selectedBuilding}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
                    >
                      <option value="">Select Floor</option>
                      {floors.map(f => <option key={f.id} value={f.id}>{f.name || `Floor ${f.number}`}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Room</label>
                    <select
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      disabled={!selectedFloor}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
                    >
                      <option value="">Select Room</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.number} {r.name ? `(${r.name})` : ''}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Handover Photos (Min. 2 Required)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
                  <FaUpload className="text-3xl text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePhotoUpload(e, true)}
                    className="hidden"
                    id="handover-photo-upload"
                  />
                  <label
                    htmlFor="handover-photo-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Click to select photos
                  </label>
                </div>
                {handoverPhotos.length > 0 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    {handoverPhotos.map((photo, idx) => (
                      <div key={idx} className="relative min-w-[80px]">
                        <img src={photo} alt={`Handover ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setHandoverPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCompleteHandover}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Complete Handover
              </button>
              <button
                onClick={() => setShowHandoverModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initiate Return Modal */}
      {showInitiateReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto transform transition-all duration-300 translate-y-0 opacity-100 animate-[slideDown_0.3s_ease-out]">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Initiate Return</h3>
            <p className="text-gray-600 mb-4 text-sm">Please upload return photos and condition notes to initiate the return process.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Return Notes / Observations (Optional)
                </label>
                <textarea
                  value={initiateReturnNotes}
                  onChange={(e) => setInitiateReturnNotes(e.target.value)}
                  rows="3"
                  placeholder="Describe the current condition, any issues, or comments..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Return Photos (Min. 2 Required)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-orange-500 transition-colors">
                  <FaUpload className="text-3xl text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePhotoUpload(e, false)}
                    className="hidden"
                    id="return-photo-upload"
                  />
                  <label
                    htmlFor="return-photo-upload"
                    className="cursor-pointer text-orange-600 hover:text-orange-700 font-semibold"
                  >
                    Click to select photos
                  </label>
                </div>
                {returnPhotos.length > 0 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    {returnPhotos.map((photo, idx) => (
                      <div key={idx} className="relative min-w-[80px]">
                        <img src={photo} alt={`Return ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setReturnPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={submitInitiateReturn}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                Submit Return
              </button>
              <button
                onClick={() => setShowInitiateReturnModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto transform transition-all duration-300 translate-y-0 opacity-100 animate-[slideDown_0.3s_ease-out]">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Complete Return</h3>
            <p className="text-gray-600 mb-4">Document the asset condition at return</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Return Condition
                </label>
                <select
                  value={returnData.condition}
                  onChange={(e) => setReturnData({...returnData, condition: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                  <option value="DAMAGED">Damaged</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Condition Notes (Optional)
                </label>
                <textarea
                  value={returnData.condition_notes}
                  onChange={(e) => setReturnData({...returnData, condition_notes: e.target.value})}
                  rows="3"
                  placeholder="Any damage, wear, or other observations..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <h4 className="text-sm font-bold text-purple-700">Return Location / Storage Room (Optional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Campus</label>
                    <select
                      value={selectedCampus}
                      onChange={(e) => setSelectedCampus(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">Select Campus</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Building</label>
                    <select
                      value={selectedBuilding}
                      onChange={(e) => setSelectedBuilding(e.target.value)}
                      disabled={!selectedCampus}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
                    >
                      <option value="">Select Building</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Floor</label>
                    <select
                      value={selectedFloor}
                      onChange={(e) => setSelectedFloor(e.target.value)}
                      disabled={!selectedBuilding}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
                    >
                      <option value="">Select Floor</option>
                      {floors.map(f => <option key={f.id} value={f.id}>{f.name || `Floor ${f.number}`}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Room</label>
                    <select
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      disabled={!selectedFloor}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
                    >
                      <option value="">Select Room</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.number} {r.name ? `(${r.name})` : ''}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              
              {/* Photo Comparison Side-by-Side */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <h4 className="text-sm font-bold text-gray-700">Photo Comparison</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Handover Photos ({request.handover_photos?.length || 0})
                    </label>
                    <div className="flex gap-1 overflow-x-auto py-1">
                      {request.handover_photos?.map((photo, idx) => (
                        <img key={idx} src={photo} alt={`Handover ${idx + 1}`} className="h-14 w-14 object-cover rounded border border-gray-200 flex-shrink-0" />
                      ))}
                      {(!request.handover_photos || request.handover_photos.length === 0) && (
                        <span className="text-xs text-gray-400">No photos</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      User Return Photos ({request.return_photos?.length || 0})
                    </label>
                    <div className="flex gap-1 overflow-x-auto py-1">
                      {request.return_photos?.map((photo, idx) => (
                        <img key={idx} src={photo} alt={`Return ${idx + 1}`} className="h-14 w-14 object-cover rounded border border-gray-200 flex-shrink-0" />
                      ))}
                      {(!request.return_photos || request.return_photos.length === 0) && (
                        <span className="text-xs text-gray-400">No photos</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* User Notes (read-only) */}
              {request.return_condition_notes && (
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-xs">
                  <span className="block font-bold text-orange-800 mb-1">User's Return Notes / Observations:</span>
                  <p className="text-orange-700">{request.return_condition_notes}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCompleteReturn}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Complete Return
              </button>
              <button
                onClick={() => setShowReturnModal(false)}
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

const InfoItem = ({ label, value, className = '' }) => (
  <div>
    <p className="text-sm font-semibold text-gray-600">{label}</p>
    <p className={`text-gray-800 ${className}`}>{value || 'N/A'}</p>
  </div>
);

export default AssetRequestDetail;
