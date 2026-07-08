import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addDMUHeader, addDMUFooter, getDMUTableStyles } from '../../utils/pdfExportUtils';
import {
  ArrowLeft,
  Wrench,
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle,
  PlayCircle,
  Camera,
  FileText,
  Package,
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Printer,
  Download
} from 'lucide-react';

export default function TechnicianWorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  // Photo evidence state
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [showPhotoSection, setShowPhotoSection] = useState(true);
  // Checklist state
  const [checklist, setChecklist] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchWorkOrder();
  }, [id]);

  const fetchWorkOrder = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`http://localhost:8000/api/technician/work-orders/${id}/`, { headers });
      setWorkOrder(response.data);
    } catch (error) {
      console.error('Error fetching work order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    try {
      setPhotosLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`http://localhost:8000/api/technician/work-orders/${id}/photos/`, { headers });
      setPhotos(res.data.photos || []);
    } catch (e) {
      console.error('Error fetching photos:', e);
    } finally {
      setPhotosLoading(false);
    }
  };

  const fetchChecklist = async () => {
    try {
      setChecklistLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`http://localhost:8000/api/technician/work-orders/${id}/checklist/`, { headers });
      setChecklist(res.data);
    } catch (e) {
      console.error('Error fetching checklist:', e);
    } finally {
      setChecklistLoading(false);
    }
  };

  const initChecklist = async () => {
    try {
      setChecklistLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`http://localhost:8000/api/technician/work-orders/${id}/checklist/`, {}, { headers });
      setChecklist(res.data);
    } catch (e) {
      console.error('Error creating checklist:', e);
    } finally {
      setChecklistLoading(false);
    }
  };

  const toggleChecklistEntry = async (entryId, currentValue) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.patch(
        `http://localhost:8000/api/technician/work-orders/${id}/checklist/${entryId}/`,
        { is_checked: !currentValue },
        { headers }
      );
      setChecklist(prev => ({
        ...prev,
        completion_percentage: res.data.completion_percentage,
        is_complete: res.data.is_complete,
        entries: prev.entries.map(e => e.id === entryId ? { ...e, is_checked: res.data.is_checked } : e)
      }));
    } catch (e) {
      console.error('Error updating checklist entry:', e);
    }
  };

  const handlePhotoUpload = async (file, photoType) => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('photo_type', photoType);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`http://localhost:8000/api/technician/work-orders/${id}/upload-photo/`, formData, { headers });
      fetchPhotos();
    } catch (e) {
      showError('Failed to upload photo');
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`http://localhost:8000/api/technician/work-orders/${id}/photos/${photoId}/`, { headers });
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (e) {
      showError('Failed to delete photo');
    }
  };

  useEffect(() => {
    if (id) {
      fetchPhotos();
      fetchChecklist();
    }
  }, [id]);

  const handleStartWork = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`http://localhost:8000/api/technician/work-orders/${id}/start_work/`, {}, { headers });
      fetchWorkOrder();
    } catch (error) {
      console.error('Error starting work:', error);
      showError('Failed to start work');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Work order not found</p>
        </div>
      </div>
    );
  }

  const priorityColors = {
    EMERGENCY: 'bg-red-100 text-red-800 border-red-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    LOW: 'bg-green-100 text-green-800 border-green-200',
  };

  const statusColors = {
    SUBMITTED: 'bg-gray-100 text-gray-800',
    ASSIGNED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  const status = workOrder.maintenance_request?.status || 'SUBMITTED';
  const priority = workOrder.maintenance_request?.priority || 'MEDIUM';
  const req = workOrder.maintenance_request || {};
  const assetDetail = req.asset_detail || {};
  const requestedByDetail = req.requested_by_detail || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <button
        onClick={() => navigate('/dashboard/technician/work-orders')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Work Orders
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {req.asset_name || assetDetail.name || workOrder.asset_name || 'Asset'}
            </h1>
            <p className="text-gray-600 text-lg">
              {req.description || 'No description'}
            </p>
          </div>
          <div className="flex gap-2">
            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${priorityColors[priority]}`}>
              {priority}
            </span>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[status]}`}>
              {status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {['SUBMITTED', 'ASSIGNED'].includes(status) && (
            <button
              onClick={handleStartWork}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <PlayCircle className="w-5 h-5" />
              Start Work
            </button>
          )}
          {status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => setShowNoteModal(true)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Add Note
              </button>
              <button
                onClick={() => setShowCompleteModal(true)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle className="w-5 h-5" />
                Complete Work
              </button>
            </>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Asset Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Asset Information</h2>
          <div className="space-y-3">
            <DetailRow
              icon={Package}
              label="Asset ID"
              value={req.asset_id_display || assetDetail.asset_id || workOrder.asset_id || 'N/A'}
            />
            <DetailRow
              icon={MapPin}
              label="Location"
              value={req.asset_location || assetDetail.location || workOrder.asset_location || 'N/A'}
            />
            <DetailRow
              icon={User}
              label="Requested By"
              value={
                req.requested_by_name ||
                (requestedByDetail.first_name
                  ? `${requestedByDetail.first_name} ${requestedByDetail.last_name || ''}`.trim()
                  : null) ||
                'N/A'
              }
            />
          </div>
        </div>

        {/* Work Order Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Work Order Details</h2>
          <div className="space-y-3">
            <DetailRow
              icon={Calendar}
              label="Scheduled Date"
              value={workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleDateString() : 'Not scheduled'}
            />
            <DetailRow
              icon={Clock}
              label="Estimated Hours"
              value={workOrder.estimated_hours || 'N/A'}
            />
            <DetailRow
              icon={Wrench}
              label="Category"
              value={req.category || 'N/A'}
            />
          </div>
        </div>
      </div>

      {/* Progress Notes */}
      {workOrder.progress_notes && workOrder.progress_notes.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Progress Notes</h2>
          <div className="space-y-3">
            {workOrder.progress_notes.map((note, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-800 mb-2">{note.note}</p>
                <p className="text-sm text-gray-500">
                  {note.technician} - {new Date(note.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Photo Evidence Section ── */}
      <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
        <button
          onClick={() => setShowPhotoSection(!showPhotoSection)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Photo Evidence
            <span className="text-sm font-normal text-gray-500 ml-1">({photos.length} photos)</span>
          </h2>
          {showPhotoSection ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showPhotoSection && (
          <div className="px-6 pb-6">
            {/* Upload buttons */}
            {status !== 'COMPLETED' && (
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { type: 'before', label: 'Before', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                  { type: 'progress', label: 'Progress', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                  { type: 'after', label: 'After', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                  { type: 'issue', label: 'Issue Found', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
                ].map(({ type, label, color }) => (
                  <label key={type} className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer font-medium text-sm transition-colors ${color}`}>
                    <Upload className="w-4 h-4" />
                    Upload {label}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files[0] && handlePhotoUpload(e.target.files[0], type)}
                    />
                  </label>
                ))}
              </div>
            )}

            {photosLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">No photos uploaded yet</p>
                {status !== 'COMPLETED' && <p className="text-xs mt-1">Upload before/after photos to document your work</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map(photo => {
                  const typeColors = { before: 'bg-orange-100 text-orange-700', progress: 'bg-blue-100 text-blue-700', after: 'bg-green-100 text-green-700', issue: 'bg-red-100 text-red-700' };
                  return (
                    <div key={photo.id} className="relative group rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors">
                      <img src={photo.photo_url} alt={photo.caption || photo.photo_type} className="w-full h-32 object-cover" />
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[photo.photo_type] || 'bg-gray-100 text-gray-700'}`}>
                          {photo.photo_type}
                        </span>
                      </div>
                      {status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      {photo.caption && (
                        <div className="p-2 bg-white">
                          <p className="text-xs text-gray-600 truncate">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Checklist Section ── */}
      <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
        <button
          onClick={() => setShowChecklist(!showChecklist)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-600" />
            Work Checklist
            {checklist && (
              <span className={`text-sm font-semibold ml-1 px-2 py-0.5 rounded-full ${
                checklist.completion_percentage === 100 ? 'bg-green-100 text-green-700' :
                checklist.completion_percentage > 0 ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {checklist.completion_percentage}%
              </span>
            )}
          </h2>
          {showChecklist ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showChecklist && (
          <div className="px-6 pb-6">
            {checklistLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : !checklist || checklist.entries.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-12 h-12 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-500 mb-4">No checklist yet</p>
                {status !== 'COMPLETED' && (
                  <button
                    onClick={initChecklist}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold text-sm"
                  >
                    Start Checklist
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">{checklist.entries.filter(e => e.is_checked).length} of {checklist.entries.length} completed</span>
                    <span className={`font-semibold ${checklist.is_complete ? 'text-green-600' : 'text-gray-700'}`}>
                      {checklist.is_complete ? '✓ All done!' : `${checklist.completion_percentage}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${checklist.completion_percentage === 100 ? 'bg-green-500' : 'bg-purple-500'}`}
                      style={{ width: `${checklist.completion_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Checklist items */}
                <div className="space-y-2">
                  {checklist.entries.map(entry => (
                    <div
                      key={entry.id}
                      onClick={() => status !== 'COMPLETED' && toggleChecklistEntry(entry.id, entry.is_checked)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                        entry.is_checked
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white border-gray-300 hover:border-purple-400 hover:shadow-sm'
                      } ${status !== 'COMPLETED' ? 'cursor-pointer' : ''}`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                        entry.is_checked ? 'bg-green-500 border-green-500' : 'border-gray-500 bg-white'
                      }`}>
                        {entry.is_checked && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-base font-semibold ${entry.is_checked ? 'line-through text-green-700' : 'text-gray-900'}`}>
                          {entry.item_text || entry.text || 'Checklist item'}
                          {entry.is_required && !entry.is_checked && (
                            <span className="ml-2 text-sm text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">REQUIRED</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Messaging Section ── */}
      <MessagingSection workOrderId={id} token={token} status={status} />

      {/* ── Completion Report Button (completed orders only) ── */}
      {status === 'COMPLETED' && (
        <CompletionReportSection workOrderId={id} token={token} />
      )}

      {/* Modals */}
      {showCompleteModal && (
        <CompleteWorkModal
          workOrder={workOrder}
          onClose={() => setShowCompleteModal(false)}
          onComplete={() => {
            setShowCompleteModal(false);
            navigate('/dashboard/technician/work-orders');
          }}
          token={token}
        />
      )}

      {showNoteModal && (
        <AddNoteModal
          workOrderId={id}
          onClose={() => setShowNoteModal(false)}
          onSuccess={() => {
            setShowNoteModal(false);
            fetchWorkOrder();
          }}
          token={token}
        />
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-gray-400" />
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function CompleteWorkModal({ workOrder, onClose, onComplete, token }) {
  const [formData, setFormData] = useState({
    completion_notes: '',
    labor_hours: '',
    cost_materials: '',
  });
  const [costPreview, setCostPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch cost preview whenever labor_hours changes
  useEffect(() => {
    const hours = parseFloat(formData.labor_hours);
    if (!hours || hours <= 0) {
      setCostPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(
          `http://localhost:8000/api/technician/work-orders/${workOrder.id}/cost-preview/?labor_hours=${hours}`,
          { headers }
        );
        setCostPreview(res.data);
      } catch (e) {
        console.error('Cost preview error:', e);
      } finally {
        setPreviewLoading(false);
      }
    }, 400); // debounce 400ms
    return () => clearTimeout(timer);
  }, [formData.labor_hours]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `http://localhost:8000/api/technician/work-orders/${workOrder.id}/complete_work/`,
        {
          completion_notes: formData.completion_notes,
          labor_hours: parseFloat(formData.labor_hours) || 0,
          cost_materials: parseFloat(formData.cost_materials) || 0,
        },
        { headers }
      );
      onComplete();
    } catch (error) {
      console.error('Error completing work:', error);
      showError('Failed to complete work order');
    } finally {
      setSubmitting(false);
    }
  };

  const materialsVal = parseFloat(formData.cost_materials) || 0;
  const totalCost = (costPreview?.cost_labor || 0) + materialsVal;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Complete Work Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Completion Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Completion Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.completion_notes}
              onChange={(e) => setFormData({ ...formData, completion_notes: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Describe the work completed..."
            />
          </div>

          {/* Labor Hours */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Labor Hours <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={formData.labor_hours}
              onChange={(e) => setFormData({ ...formData, labor_hours: e.target.value })}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="e.g. 2.5"
            />
          </div>

          {/* Materials Cost */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Materials Cost (ETB)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_materials}
              onChange={(e) => setFormData({ ...formData, cost_materials: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Enter cost of parts and materials used</p>
          </div>

          {/* Cost Preview */}
          {(costPreview || previewLoading) && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4">
              <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                💰 Cost Breakdown
                {previewLoading && <span className="text-xs text-blue-500 font-normal animate-pulse">Calculating...</span>}
              </p>
              {costPreview && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Labor ({formData.labor_hours}h × ETB {costPreview.hourly_rate}/hr)
                    </span>
                    <span className="font-semibold text-gray-900">ETB {costPreview.cost_labor.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Materials</span>
                    <span className="font-semibold text-gray-900">ETB {materialsVal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                    <span className="font-bold text-gray-800">Total</span>
                    <span className="font-bold text-blue-700 text-base">ETB {totalCost.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Rate: ETB {costPreview.hourly_rate}/hr for {costPreview.category} work
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              {submitting ? 'Completing...' : 'Complete Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddNoteModal({ workOrderId, onClose, onSuccess, token }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `http://localhost:8000/api/technician/work-orders/${workOrderId}/add_note/`,
        { note },
        { headers }
      );
      onSuccess();
    } catch (error) {
      console.error('Error adding note:', error);
      showError('Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Progress Note</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter progress note..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Feature 13: Messaging Section ──────────────────────────────────────────

function MessagingSection({ workOrderId, token, status }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(
        `http://localhost:8000/api/technician/work-orders/${workOrderId}/messages/`,
        { headers }
      );
      setMessages(res.data.messages || []);
      setUnread(0);
    } catch (e) {
      console.error('Error fetching messages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMessages();
    }
  }, [open]);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(
        `http://localhost:8000/api/technician/work-orders/${workOrderId}/messages/send/`,
        { message: newMessage },
        { headers }
      );
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
    } catch (e) {
      showError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          Messages to Supervisor
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>
          )}
          {messages.length > 0 && (
            <span className="text-sm font-normal text-gray-500 ml-1">({messages.length})</span>
          )}
        </h2>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {open && (
        <div className="px-6 pb-6">
          {/* Messages list */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-72 overflow-y-auto space-y-3">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">No messages yet. Ask your supervisor a question!</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.is_mine
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {!msg.is_mine && (
                      <p className="text-xs font-semibold text-indigo-600 mb-1">{msg.sender_name}</p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.is_mine ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send message */}
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Ask your supervisor a question..."
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Feature 15: Completion Report Section ──────────────────────────────────

function CompletionReportSection({ workOrderId, token }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchReport = async () => {
    if (report) { setOpen(!open); return; }
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(
        `http://localhost:8000/api/technician/work-orders/${workOrderId}/completion-report/`,
        { headers }
      );
      setReport(res.data);
      setOpen(true);
    } catch (e) {
      showError('Failed to load completion report');
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const downloadPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add DMU header
    const metadata = [
      { label: 'Work Order ID', value: report.work_order_id },
      { label: 'Request ID', value: report.request_id },
      { label: 'Generated', value: new Date(report.generated_at).toLocaleString() }
    ];
    const finalY = addDMUHeader(doc, 'Work Order Completion Report', metadata);
    
    let yPos = finalY + 10;

    // Asset Information Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset Information', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: [
        ['Asset Name', report.asset.name],
        ['Asset ID', report.asset.id],
        ['Location', report.asset.location]
      ],
      ...getDMUTableStyles(),
      margin: { left: 14, right: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Work Details Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Work Details', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: [
        ['Technician', report.work.technician],
        ['Duration', report.work.duration_hours ? `${report.work.duration_hours} hours` : 'N/A'],
        ['Completed At', report.work.completed_at ? new Date(report.work.completed_at).toLocaleString() : 'N/A'],
        ['Total Cost', `ETB ${report.work.cost_total.toLocaleString()}`]
      ],
      ...getDMUTableStyles(),
      margin: { left: 14, right: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Completion Notes
    if (report.work.completion_notes) {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Completion Notes', 14, yPos);
      yPos += 5;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(report.work.completion_notes, pageWidth - 28);
      doc.text(notesLines, 14, yPos);
      yPos += (notesLines.length * 5) + 10;
    }

    // Checklist Summary
    if (report.checklist && report.checklist.items.length > 0) {
      // Check if we need a new page
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Checklist (${report.checklist.completion_percentage}% Complete)`, 14, yPos);
      yPos += 5;

      const checklistData = report.checklist.items.map(item => [
        item.checked ? '✓' : '○',
        item.text,
        item.checked ? 'Completed' : 'Pending'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Status', 'Item', 'Completion']],
        body: checklistData,
        ...getDMUTableStyles(),
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 30, halign: 'center' }
        }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }

    // Photo Summary
    if (report.photos.total > 0) {
      // Check if we need a new page
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Photo Evidence', 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['Category', 'Count']],
        body: [
          ['Before Photos', report.photos.before.length.toString()],
          ['After Photos', report.photos.after.length.toString()],
          ['Total Photos', report.photos.total.toString()]
        ],
        ...getDMUTableStyles(),
        margin: { left: 14, right: 14 }
      });
    }

    // Add DMU footer to all pages
    addDMUFooter(doc);

    // Save the PDF
    const filename = `Completion_Report_${report.work_order_id}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
      <button
        onClick={fetchReport}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          Completion Report
        </h2>
        {loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
        ) : open ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {open && report && (
        <div className="px-6 pb-6">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-5 text-white mb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-green-200 text-xs mb-1">Work Order Completion Report</p>
                <p className="text-xl font-bold">{report.work_order_id}</p>
                <p className="text-green-200 text-sm">{report.request_id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={printReport}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Asset Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Asset</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{report.asset.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ID</span><span className="font-mono text-xs">{report.asset.id}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="font-medium text-right max-w-[60%]">{report.asset.location}</span></div>
              </div>
            </div>

            {/* Work Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Work Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Technician</span><span className="font-medium">{report.work.technician}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium">{report.work.duration_hours ? `${report.work.duration_hours}h` : 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Completed</span><span className="font-medium">{report.work.completed_at ? new Date(report.work.completed_at).toLocaleString() : 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Cost</span><span className="font-bold text-green-700">ETB {report.work.cost_total.toLocaleString()}</span></div>
              </div>
            </div>

            {/* Completion Notes */}
            {report.work.completion_notes && (
              <div className="md:col-span-2 bg-blue-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide">Completion Notes</h3>
                <p className="text-sm text-gray-700">{report.work.completion_notes}</p>
              </div>
            )}

            {/* Checklist Summary */}
            {report.checklist && (
              <div className="md:col-span-2 bg-purple-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-purple-600" />
                  Checklist ({report.checklist.completion_percentage}% complete)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {report.checklist.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${item.checked ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {item.checked && <CheckCircle className="w-3 h-3 text-white" />}
                      </span>
                      <span className={item.checked ? 'text-gray-700' : 'text-gray-400 line-through'}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {(report.photos.before.length > 0 || report.photos.after.length > 0) && (
              <div className="md:col-span-2">
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Photo Evidence ({report.photos.total} photos)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {report.photos.before.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-orange-700 mb-2">BEFORE</p>
                      <div className="grid grid-cols-2 gap-2">
                        {report.photos.before.map((url, i) => (
                          <img key={i} src={url} alt="Before" className="w-full h-24 object-cover rounded-lg border-2 border-orange-200" />
                        ))}
                      </div>
                    </div>
                  )}
                  {report.photos.after.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-2">AFTER</p>
                      <div className="grid grid-cols-2 gap-2">
                        {report.photos.after.map((url, i) => (
                          <img key={i} src={url} alt="After" className="w-full h-24 object-cover rounded-lg border-2 border-green-200" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Generated on {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
