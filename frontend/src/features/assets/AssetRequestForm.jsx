import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { FaBox, FaCalendar, FaClipboard, FaExclamationTriangle, FaClock, FaCheckCircle } from 'react-icons/fa';
import useToast from '../../hooks/useToast'
import { MESSAGES, formatErrorMessage } from '../../utils/messages';
import { ToastContainer } from '../../components/Toast';

const AssetRequestForm = () => {
  const navigate = useNavigate();
  const { assetId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [asset, setAsset] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [formData, setFormData] = useState({
    asset: assetId ? parseInt(assetId) : '',
    purpose: '',
    assignment_type: 'TEMPORARY',
    requested_start_date: '',
    requested_end_date: '',
    department: user?.department || '',
    project_name: '',
    priority: 'MEDIUM'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (assetId) {
      fetchAssetDetails();
      checkAvailability();
    }
  }, [assetId]);

  useEffect(() => {
    if (user?.department && !formData.department) {
      setFormData(prev => ({ ...prev, department: user.department }));
    }
  }, [user]);

  const fetchAssetDetails = async () => {
    try {
      const response = await api.get(`/assets/assets/${assetId}/`);
      setAsset(response.data);
      // Convert assetId to integer for the API
      setFormData(prev => ({ ...prev, asset: parseInt(assetId) }));
    } catch (error) {
      console.error('Error fetching asset:', error);
    }
  };

  const checkAvailability = async () => {
    if (!assetId) return;
    
    setCheckingAvailability(true);
    try {
      const response = await api.get(`/assets/asset-availability/check/?asset_id=${assetId}`);
      setAvailability(response.data);
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.asset) newErrors.asset = 'Please select an asset';
    if (!formData.purpose.trim()) newErrors.purpose = 'Purpose is required';
    if (!formData.requested_start_date) newErrors.requested_start_date = 'Start date is required';
    if (!formData.department) newErrors.department = 'Department is required';
    
    if (formData.assignment_type === 'TEMPORARY' && !formData.requested_end_date) {
      newErrors.requested_end_date = 'End date is required for temporary assignments';
    }

    if (formData.assignment_type === 'PROJECT_BASED' && !formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required for project-based assignments';
    }

    if (formData.requested_start_date && formData.requested_end_date) {
      if (new Date(formData.requested_end_date) <= new Date(formData.requested_start_date)) {
        newErrors.requested_end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showWarning('Please check the form for errors');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/assets/asset-requests/', formData);
      
      // Show success message
      showSuccess(`Request submitted successfully! Request ID: ${response.data.request_id}`);
      
      // Navigate to my requests page (role-aware) after a short delay
      setTimeout(() => {
        const isOwner = user?.role === 'owner' || user?.role === 'OWNER';
        navigate(isOwner ? '/dashboard/owner/my-asset-requests' : '/dashboard/my-asset-requests');
      }, 1500);
    } catch (error) {
      console.error('Error submitting request:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.data) {
        // If it's a validation error object, set field errors
        if (typeof error.response.data === 'object' && !error.response.data.detail) {
          setErrors(error.response.data);
          showError('Please check the form for errors');
        } else {
          // Otherwise show the error message
          const errorMsg = error.response.data.detail || JSON.stringify(error.response.data);
          showError(`Failed to submit request: ${errorMsg}`);
        }
      } else {
        showError('Failed to submit request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityBadge = () => {
    if (!availability) return null;

    const badges = {
      'AVAILABLE': { color: 'green', icon: FaCheckCircle, text: 'Available' },
      'IN_USE': { color: 'yellow', icon: FaClock, text: 'In Use' },
      'UNDER_MAINTENANCE': { color: 'orange', icon: FaExclamationTriangle, text: 'Under Maintenance' },
      'CONDEMNED': { color: 'red', icon: FaExclamationTriangle, text: 'Not Available' }
    };

    const badge = badges[availability.availability_status] || badges['AVAILABLE'];
    const Icon = badge.icon;

    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-${badge.color}-50 border border-${badge.color}-200`}>
        <Icon className={`text-${badge.color}-600`} />
        <span className={`font-semibold text-${badge.color}-700`}>{badge.text}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
              <FaBox className="text-4xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Request Asset Assignment</h1>
              <p className="text-purple-100 text-lg mt-2">
                Submit a request to be assigned an asset
              </p>
            </div>
          </div>
        </div>

        {/* Asset Info Card */}
        {asset && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{asset.name}</h2>
                <p className="text-gray-600 mb-4">{asset.asset_id}</p>
                <p className="text-gray-700">{asset.description}</p>
              </div>
              <div>
                {checkingAvailability ? (
                  <div className="animate-pulse bg-gray-200 h-10 w-32 rounded-lg"></div>
                ) : (
                  getAvailabilityBadge()
                )}
              </div>
            </div>

            {/* Availability Details */}
            {availability && !availability.is_available && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-semibold mb-2">
                  <FaExclamationTriangle className="inline mr-2" />
                  {availability.message}
                </p>
                {availability.estimated_available_date && (
                  <p className="text-yellow-700 text-sm">
                    Estimated available: {new Date(availability.estimated_available_date).toLocaleDateString()}
                  </p>
                )}
                {availability.waitlist_count > 0 && (
                  <p className="text-yellow-700 text-sm">
                    {availability.waitlist_count} user(s) in waitlist
                  </p>
                )}
                <p className="text-yellow-700 text-sm mt-2">
                  You can still submit a request and will be added to the waitlist.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Request Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
          <div className="space-y-6">
            {/* Assignment Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assignment Type *
              </label>
              <select
                name="assignment_type"
                value={formData.assignment_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="TEMPORARY">Temporary Assignment</option>
                <option value="PERMANENT">Permanent Assignment</option>
                <option value="PROJECT_BASED">Project-Based Assignment</option>
              </select>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Purpose *
              </label>
              <textarea
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                rows="4"
                placeholder="Explain why you need this asset..."
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.purpose ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.purpose && (
                <p className="text-red-500 text-sm mt-1">{errors.purpose}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FaCalendar className="inline mr-2" />
                  Start Date *
                </label>
                <input
                  type="date"
                  name="requested_start_date"
                  value={formData.requested_start_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.requested_start_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.requested_start_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.requested_start_date}</p>
                )}
              </div>

              {formData.assignment_type === 'TEMPORARY' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FaCalendar className="inline mr-2" />
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="requested_end_date"
                    value={formData.requested_end_date}
                    onChange={handleChange}
                    min={formData.requested_start_date || new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.requested_end_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.requested_end_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.requested_end_date}</p>
                  )}
                </div>
              )}
            </div>

            {/* Department & Project */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department *
                </label>
                {user?.department ? (
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed focus:outline-none"
                    title="Department is automatically set from your profile"
                  />
                ) : (
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.department ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Department</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Health Sciences">Health Sciences</option>
                    <option value="Business">Business</option>
                    <option value="Administration">Administration</option>
                    <option value="Other">Other</option>
                  </select>
                )}
                {errors.department && (
                  <p className="text-red-500 text-sm mt-1">{errors.department}</p>
                )}
              </div>

              {formData.assignment_type === 'PROJECT_BASED' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="project_name"
                    value={formData.project_name}
                    onChange={handleChange}
                    placeholder="e.g., Research Project"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.project_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.project_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.project_name}</p>
                  )}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetRequestForm;
