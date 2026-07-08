import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaExchangeAlt, FaDownload, FaMapMarkerAlt, FaBuilding, FaArrowRight,
  FaCalendarAlt, FaTruck, FaBolt, FaClock, FaUser, FaFilter, FaSearch
} from 'react-icons/fa';
import api from '../../services/api';
import useToast from '../../hooks/useToast'
import { MESSAGES, formatErrorMessage } from '../../utils/messages';
import { ToastContainer } from '../../components/Toast';

const TransferHistory = () => {
  const navigate = useNavigate();
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchTransfers();
  }, [filter]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/assets/transfers/');
      let data = response.data;
      
      if (data && typeof data === 'object' && 'results' in data) {
        data = data.results;
      }
      
      if (!Array.isArray(data)) {
        data = [];
      }
      
      // Filter by status if needed
      if (filter !== 'ALL') {
        data = data.filter(t => t.approval_status === filter);
      }
      
      setTransfers(data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      showError(formatErrorMessage(error));
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (transferId) => {
    setDownloading(transferId);
    try {
      const response = await api.get(`/assets/transfers/${transferId}/download_pdf/`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Transfer_${transferId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showSuccess(MESSAGES.DOCUMENT.DOWNLOAD_SUCCESS);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showError(MESSAGES.DOCUMENT.DOWNLOAD_ERROR);
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': { color: 'yellow', icon: FaClock, text: 'Pending' },
      'COMPLETED': { color: 'green', icon: FaExchangeAlt, text: 'Completed' },
      'CANCELLED': { color: 'red', icon: FaClock, text: 'Cancelled' }
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
      transfer.transferred_by_name?.toLowerCase().includes(searchLower) ||
      transfer.source_campus_name?.toLowerCase().includes(searchLower) ||
      transfer.dest_campus_name?.toLowerCase().includes(searchLower)
    );
  });

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
                <h1 className="text-4xl font-bold">Transfer History</h1>
                <p className="text-teal-100 text-lg mt-2">
                  View all asset transfers and download documents
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{transfers.length}</p>
              <p className="text-teal-100">Total Transfers</p>
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
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
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

        {/* Transfer List */}
        {filteredTransfers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FaExchangeAlt className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Transfers Found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'No transfers match your search criteria' : 'No transfer records found'}
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
                      </div>
                      <p className="text-sm text-gray-600">
                        Asset ID: <span className="font-semibold">{transfer.asset_id}</span>
                        {' • '}
                        Transferred by: <span className="font-semibold">{transfer.transferred_by_name}</span>
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
                          <p className="font-semibold">{transfer.transportation_method_display}</p>
                        </div>
                      )}
                      {transfer.completed_date && (
                        <div>
                          <p className="text-gray-600">Completed</p>
                          <p className="font-semibold">{new Date(transfer.completed_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    {transfer.reason && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Reason:</p>
                        <p className="text-sm text-gray-800">{transfer.reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleDownloadPDF(transfer.id)}
                      disabled={downloading === transfer.id}
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FaDownload />
                      {downloading === transfer.id ? 'Downloading...' : 'Download Transfer Document'}
                    </button>
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
    </div>
  );
};

export default TransferHistory;
