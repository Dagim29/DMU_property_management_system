import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FaFileAlt, 
  FaDownload, 
  FaCheckCircle,
  FaArrowLeft,
  FaClock,
  FaShieldAlt,
  FaPrint,
  FaUser,
  FaCalendar
} from 'react-icons/fa'
import api from '../../services/api'

const ReportDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReportDetail()
  }, [id])

  const fetchReportDetail = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/reports/generated/${id}/`)
      setReport(response.data)
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthorize = async () => {
    try {
      await api.post(`/reports/generated/${id}/authorize/`)
      showSuccess('Report authorized successfully!')
      fetchReportDetail()
    } catch (error) {
      console.error('Error authorizing report:', error)
      showError('Failed to authorize report')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    try {
      const response = await api.get(`/reports/generated/${id}/download/`, {
        responseType: 'blob'
      })
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      showError('Failed to download PDF')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-900 border-t-transparent"></div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center py-16">
          <p className="text-gray-600 text-lg mb-6">Report not found</p>
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Reports
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - No Print */}
      <div className="bg-white border-b border-gray-200 print:hidden sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard/reports')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              <FaArrowLeft />
              Back
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FaPrint className="text-sm" />
                Print
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FaDownload className="text-sm" />
                Download
              </button>
              {!report.authorized_by && (
                <button
                  onClick={handleAuthorize}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <FaCheckCircle className="text-sm" />
                  Authorize
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block bg-white p-8 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{report.title}</h1>
        <p className="text-sm text-gray-600">
          {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
        </p>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 py-12 space-y-12">
        {/* Title Section */}
        <div className="print:hidden">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{report.title}</h1>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FaCalendar className="text-gray-400" />
              <span>{new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaUser className="text-gray-400" />
              <span>{report.generated_by_name || 'System'}</span>
            </div>
            <div className="flex items-center gap-2">
              {report.authorized_by_name ? (
                <>
                  <FaCheckCircle className="text-green-600" />
                  <span className="text-green-600 font-medium">Authorized</span>
                </>
              ) : (
                <>
                  <FaClock className="text-amber-600" />
                  <span className="text-amber-600 font-medium">Pending</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        {report.metrics && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                <div className="text-sm text-gray-600 mb-2">Mean Time To Repair</div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{report.metrics.mean_time_to_repair}</div>
                <div className="text-xs text-gray-500">hours</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                <div className="text-sm text-gray-600 mb-2">First-Time Fix Rate</div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{report.metrics.first_time_fix_rate}%</div>
                <div className="text-xs text-gray-500">success rate</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                <div className="text-sm text-gray-600 mb-2">Cost Per Repair</div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{parseFloat(report.metrics.cost_per_repair).toLocaleString()}</div>
                <div className="text-xs text-gray-500">ETB</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                <div className="text-sm text-gray-600 mb-2">Total Requests</div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{report.metrics.total_requests}</div>
                <div className="text-xs text-gray-500">{report.metrics.completed_requests} completed</div>
              </div>
            </div>
          </div>
        )}

        {/* Asset Summary */}
        {report.data?.summary && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Asset Overview</h2>
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
              <div className="grid grid-cols-3 gap-px bg-gray-200">
                <div className="bg-white p-6">
                  <div className="text-sm text-gray-600 mb-2">Total Assets</div>
                  <div className="text-3xl font-bold text-gray-900">{report.data.summary.total_assets}</div>
                </div>
                <div className="bg-white p-6">
                  <div className="text-sm text-gray-600 mb-2">New Assets</div>
                  <div className="text-3xl font-bold text-gray-900">{report.data.summary.new_assets_this_period}</div>
                </div>
                <div className="bg-white p-6">
                  <div className="text-sm text-gray-600 mb-2">Total Value</div>
                  <div className="text-3xl font-bold text-gray-900">{(report.data.summary.total_asset_value / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-gray-500">ETB</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px bg-gray-200">
                <div className="bg-white p-6">
                  <div className="text-sm text-gray-600 mb-2">High Value</div>
                  <div className="text-3xl font-bold text-gray-900">{report.data.summary.high_value_assets}</div>
                </div>
                <div className="bg-white p-6">
                  <div className="text-sm text-gray-600 mb-2">Overdue Registration</div>
                  <div className="text-3xl font-bold text-gray-900">{report.data.summary.high_value_overdue_registration}</div>
                </div>
                <div className="bg-white p-6">
                  <div className="text-sm text-gray-600 mb-2">Need Verification</div>
                  <div className="text-3xl font-bold text-gray-900">{report.data.summary.assets_needing_verification}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campus Distribution */}
        {report.data?.by_campus && report.data.by_campus.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Distribution by Campus</h2>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Campus</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Assets</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Avg Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.data.by_campus.map((campus, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{campus.campus__name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-semibold">{campus.count}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-semibold">{(campus.total_value / 1000).toFixed(1)}K ETB</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">{(campus.total_value / campus.count / 1000).toFixed(1)}K ETB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Asset Type & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {report.data?.by_type && Object.keys(report.data.by_type).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">By Asset Type</h2>
              <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                {Object.entries(report.data.by_type).map(([type, count]) => (
                  <div key={type} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-900">{type}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.data?.by_status && Object.keys(report.data.by_status).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">By Status</h2>
              <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                {Object.entries(report.data.by_status).map(([status, count]) => (
                  <div key={status} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-900">{status.replace('_', ' ')}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Report Metadata */}
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-8">
          <div className="flex items-center gap-2 mb-6">
            <FaShieldAlt className="text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Report Information</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div className="text-xs text-gray-600 mb-1">Report ID</div>
              <div className="text-sm font-semibold text-gray-900">#{report.id}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Generated</div>
              <div className="text-sm font-semibold text-gray-900">{new Date(report.generated_at).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Authorized By</div>
              <div className="text-sm font-semibold text-gray-900">{report.authorized_by_name || 'Pending'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Compliance</div>
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                <FaCheckCircle className="text-green-600 text-xs" />
                Ethiopian Guidelines
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-300">
            <p className="text-xs text-gray-600 italic">{report.data_currency_disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportDetail
