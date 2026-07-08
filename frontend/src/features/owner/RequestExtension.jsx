import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaCalendar, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import { ToastContainer } from '../../components/Toast';

const RequestExtension = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [formData, setFormData] = useState({
    requested_new_end_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const response = await api.get(`/assets/asset-requests/${assignmentId}/`);
      setAssignment(response.data);
      
      // Set current end date for reference
      if (response.data.assignment_end_date) {
        const currentDate = new Date(response.data.assignment_end_date);
        const minNewDate = new Date(currentDate);
        minNewDate.setDate(minNewDate.getDate() + 1);
        
        // Set minimum date for new end date
        const minDateStr = minNewDate.toISOString().split('T')[0];
        document.getElementById('requested_new_end_date')?.setAttribute('min', minDateStr);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      showError('Failed to load assignment details');
    }
  };

  const calculateExtensionDays = () => {
    if (!assignment?.assignment_end_date || !formData.requested_new_end_date) {
      return 0;
    }
    
    const currentEnd = new Date(assignment.assignment_end_date);
    const newEnd = new Date(formData.requested_new_end_date);
    const diffTime = newEnd - currentEnd;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const extensionDays = calculateExtensionDays();
    
    if (extensionDays === 0) {
      showError('New end date must be after current end date');
      return;
    }

    if (extensionDays > 90) {
      showError('Extension cannot exceed 90 days');
      return;
    }

    if (extensionDays > 30 && formData.reason.length < 20) {
      showError('Detailed reason required for extensions over 30 days (minimum 20 characters)');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/assets/assignment-extensions/', {
        assignment: parseInt(assignmentId),
        current_end_date: assignment.assignment_end_date,
        requested_new_end_date: formData.requested_new_end_date,
        reason: formData.reason
      });
      
      showSuccess(`Extension request submitted! Request ID: ${response.data.extension_id}`);
      
      setTimeout(() => {
        navigate(`/dashboard/owner/asset-requests/${assignmentId}`);
      }, 1500);
    } catch (error) {
      console.error('Error submitting extension:', error);
      if (error.response?.data) {
        const errorMsg = typeof error.response.data === 'object' 
          ? JSON.stringify(error.response.data) 
          : error.response.data;
        showError(`Failed to submit extension: ${errorMsg}`);
      } else {
        showError('Failed to submit extension request');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const extensionDays = calculateExtensionDays();
  const isLongExtension = extensionDays > 30;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <FaArrowLeft />
            Back
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
              <FaClock className="text-4xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Request Extension</h1>
              <p className="text-purple-100 text-lg mt-2">
                Extend your assignment for {assignment.asset_name}
              </p>
            </div>
          </div>
        </div>

        {/* Current Assignment Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Current Assignment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Asset</p>
              <p className="font-semibold text-gray-900">{assignment.asset_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Asset ID</p>
              <p className="font-semibold text-gray-900">{assignment.asset_id_display}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current End Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(assignment.assignment_end_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Days Until Due</p>
              <p className={`font-semibold ${
                assignment.days_until_due <= 3 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {assignment.days_until_due} days
              </p>
            </div>
          </div>
        </div>

        {/* Extension Request Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Extension Details</h2>
          
          <div className="space-y-6">
            {/* New End Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaCalendar className="inline mr-2" />
                New End Date *
              </label>
              <input
                type="date"
                id="requested_new_end_date"
                value={formData.requested_new_end_date}
                onChange={(e) => setFormData({ ...formData, requested_new_end_date: e.target.value })}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
              {extensionDays > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Extension: <span className="font-semibold text-purple-600">{extensionDays} days</span>
                </p>
              )}
              {extensionDays > 90 && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
                  <FaExclamationTriangle />
                  Extension cannot exceed 90 days
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Extension *
                {isLongExtension && (
                  <span className="text-red-500 text-xs ml-2">
                    (Detailed explanation required for {extensionDays}-day extension)
                  </span>
                )}
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows="6"
                required
                minLength={isLongExtension ? 20 : 10}
                placeholder="Please explain why you need this extension..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.reason.length} characters
                {isLongExtension && ` (minimum 20 required)`}
              </p>
            </div>

            {/* Warning for long extensions */}
            {extensionDays > 60 && extensionDays <= 90 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-800 font-semibold flex items-center gap-2">
                  <FaExclamationTriangle />
                  Long Extension Request
                </p>
                <p className="text-yellow-700 text-sm mt-2">
                  You are requesting a {extensionDays}-day extension. Please ensure your reason is detailed
                  and justified. Property Manager approval is required.
                </p>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || extensionDays === 0 || extensionDays > 90}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit Extension Request'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestExtension;
