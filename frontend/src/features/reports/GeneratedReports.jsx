import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaFileAlt,
  FaDownload,
  FaEye,
  FaCheckCircle,
  FaArchive,
  FaClock,
  FaShieldAlt,
  FaFilter,
  FaSearch,
  FaSync,
  FaBoxOpen,
  FaTimesCircle
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'
import { MESSAGES, formatErrorMessage } from '../../utils/messages'

// ── Constants ────────────────────────────────────────────────────────────────

const REPORT_TYPE_LABELS = {
  ASSET_STATUS:          'Asset Status Summary',
  MAINTENANCE_COST:      'Maintenance Cost Analysis',
  ASSET_UTILIZATION:     'Asset Utilization',
  PREVENTIVE_COMPLIANCE: 'Preventive PM Compliance',
  MONTHLY_ASSET:         'Monthly Asset Report',
  AUDIT_TRAIL:           'Audit Trail Report',
}

const TYPE_BADGE_COLORS = {
  MONTHLY_ASSET:         'bg-blue-100 text-blue-800 border-blue-200',
  MAINTENANCE_COST:      'bg-green-100 text-green-800 border-green-200',
  ASSET_UTILIZATION:     'bg-purple-100 text-purple-800 border-purple-200',
  PREVENTIVE_COMPLIANCE: 'bg-orange-100 text-orange-800 border-orange-200',
  AUDIT_TRAIL:           'bg-red-100 text-red-800 border-red-200',
  ASSET_STATUS:          'bg-indigo-100 text-indigo-800 border-indigo-200',
}

// ── Component ─────────────────────────────────────────────────────────────────

const GeneratedReports = () => {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  const [reports, setReports]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  const [showArchived, setShowArchived]   = useState(false)

  // Filters
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [authFilter, setAuthFilter] = useState('ALL') // ALL | AUTHORIZED | PENDING

  // ── Data fetch ─────────────────────────────────────────────────────────────

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/reports/generated/')
      const data = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setReports(data)
    } catch (err) {
      console.error('Error fetching generated reports:', err)
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAuthorize = async (reportId, title) => {
    try {
      await api.post(`/reports/generated/${reportId}/authorize/`)
      showSuccess(MESSAGES.REPORT?.AUTHORIZE_SUCCESS || `"${title}" authorized successfully!`)
      fetchReports()
    } catch (err) {
      showError(formatErrorMessage ? formatErrorMessage(err) : err.response?.data?.error || 'Failed to authorize report')
    }
  }

  const handleArchive = async (reportId, title) => {
    if (!window.confirm(`Archive "${title}"? It will be hidden from the main list.`)) return
    try {
      await api.post(`/reports/generated/${reportId}/archive/`)
      showSuccess(`"${title}" archived`)
      fetchReports()
    } catch (err) {
      showError('Failed to archive report')
    }
  }

  const handleDownload = async (reportId, title) => {
    setDownloadingId(reportId)
    try {
      const res = await api.get(`/reports/generated/${reportId}/download/`, {
        responseType: 'blob'
      })
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      showSuccess(`"${title}" downloaded`)
    } catch (err) {
      showError('Failed to download PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = reports.filter(r => {
    if (!showArchived && r.is_archived) return false
    if (typeFilter !== 'ALL' && r.report_type !== typeFilter) return false
    if (authFilter === 'AUTHORIZED' && !r.authorized_by) return false
    if (authFilter === 'PENDING'    &&  r.authorized_by) return false
    if (search) {
      const q = search.toLowerCase()
      const inTitle  = r.title?.toLowerCase().includes(q)
      const inType   = (REPORT_TYPE_LABELS[r.report_type] || r.report_type).toLowerCase().includes(q)
      const inAuthor = r.generated_by_name?.toLowerCase().includes(q)
      if (!inTitle && !inType && !inAuthor) return false
    }
    return true
  })

  const archivedCount = reports.filter(r => r.is_archived).length

  // ── Helpers ────────────────────────────────────────────────────────────────

  const hasMetrics = (m) => m && typeof m === 'object' && Object.keys(m).length > 0
    && (m.total_requests !== undefined || m.mean_time_to_repair !== undefined)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Generated Reports</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {filtered.length} report{filtered.length !== 1 ? 's' : ''} shown
            {archivedCount > 0 && !showArchived && (
              <button
                onClick={() => setShowArchived(true)}
                className="ml-2 text-indigo-500 hover:underline text-xs"
              >
                + {archivedCount} archived
              </button>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {showArchived && (
            <button
              onClick={() => setShowArchived(false)}
              className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg"
            >
              Hide Archived
            </button>
          )}
          <button
            onClick={fetchReports}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
            title="Refresh"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder="Search by title, type, or author…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FaTimesCircle className="text-xs" />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          <option value="ALL">All Types</option>
          {Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Auth Filter */}
        <select
          value={authFilter}
          onChange={e => setAuthFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          <option value="ALL">All Status</option>
          <option value="AUTHORIZED">Authorized</option>
          <option value="PENDING">Pending Authorization</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-14 text-center border border-gray-100">
          <FaBoxOpen className="text-6xl text-gray-200 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">
            {reports.length === 0 ? 'No generated reports yet' : 'No reports match your filters'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {reports.length === 0
              ? 'Reports appear here after running a scheduled report or generating one manually.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {(search || typeFilter !== 'ALL' || authFilter !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('ALL'); setAuthFilter('ALL') }}
              className="mt-4 px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(report => (
            <div
              key={report.id}
              className={`bg-white rounded-xl border transition-all hover:shadow-md ${
                report.is_archived
                  ? 'border-amber-200 opacity-70'
                  : report.authorized_by
                    ? 'border-green-200 shadow-sm'
                    : 'border-gray-100 shadow-sm'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 pb-3">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TYPE_BADGE_COLORS[report.report_type] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                    {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {report.follows_ethiopian_guidelines && (
                      <FaShieldAlt className="text-emerald-500 text-xs" title="Ethiopian Federal Guidelines" />
                    )}
                    {report.is_archived && (
                      <span className="text-xs text-amber-600 font-semibold">Archived</span>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-800 mb-3 leading-snug line-clamp-2">
                  {report.title}
                </h3>

                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <FaClock className="text-gray-300 flex-shrink-0" />
                    <span>Generated {new Date(report.generated_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FaFileAlt className="text-gray-300 flex-shrink-0" />
                    <span>Period: {report.period_start} → {report.period_end}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {report.authorized_by_name ? (
                      <>
                        <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
                        <span className="text-emerald-700 font-medium">Authorized by {report.authorized_by_name}</span>
                      </>
                    ) : (
                      <>
                        <FaClock className="text-amber-400 flex-shrink-0" />
                        <span className="text-amber-600 font-medium">Pending authorization</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics snippet (only if meaningful data exists) */}
              {hasMetrics(report.metrics) && (
                <div className="mx-5 mb-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Key Metrics</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {report.metrics.mean_time_to_repair !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">MTTR</span>
                        <span className="font-bold text-gray-800">{parseFloat(report.metrics.mean_time_to_repair || 0).toFixed(1)}h</span>
                      </div>
                    )}
                    {report.metrics.first_time_fix_rate !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fix Rate</span>
                        <span className="font-bold text-gray-800">{parseFloat(report.metrics.first_time_fix_rate || 0).toFixed(1)}%</span>
                      </div>
                    )}
                    {report.metrics.total_requests !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Requests</span>
                        <span className="font-bold text-gray-800">{report.metrics.total_requests}</span>
                      </div>
                    )}
                    {report.metrics.cost_per_repair !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cost/Repair</span>
                        <span className="font-bold text-gray-800">ETB {parseFloat(report.metrics.cost_per_repair || 0).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-5 pb-5 flex gap-2 flex-wrap">
                {/* View */}
                <button
                  onClick={() => navigate(`/dashboard/reports/${report.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-semibold"
                >
                  <FaEye className="text-xs" /> View
                </button>

                {/* Download PDF */}
                <button
                  onClick={() => handleDownload(report.id, report.title)}
                  disabled={downloadingId === report.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-xs font-semibold disabled:opacity-50"
                >
                  {downloadingId === report.id ? (
                    <span className="animate-spin border border-gray-400 border-t-transparent rounded-full w-3 h-3 inline-block" />
                  ) : (
                    <FaDownload className="text-xs" />
                  )}
                  PDF
                </button>

                {/* Authorize (only if not yet authorized) */}
                {!report.authorized_by && !report.is_archived && (
                  <button
                    onClick={() => handleAuthorize(report.id, report.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-semibold"
                  >
                    <FaCheckCircle className="text-xs" /> Authorize
                  </button>
                )}

                {/* Archive */}
                {!report.is_archived && (
                  <button
                    onClick={() => handleArchive(report.id, report.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-xs"
                    title="Archive this report"
                  >
                    <FaArchive className="text-xs" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GeneratedReports
