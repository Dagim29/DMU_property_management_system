import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FaCalendarAlt,
  FaPlay,
  FaPause,
  FaPlus,
  FaTrash,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaTimes,
  FaRedo,
  FaBolt,
  FaHourglassHalf
} from 'react-icons/fa'
import api from '../../services/api'
import useToast from '../../hooks/useToast'

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatCountdown = (nextRunStr) => {
  if (!nextRunStr) return null
  const diff = new Date(nextRunStr) - new Date()
  if (diff <= 0) return 'Due now'
  const totalSec = Math.floor(diff / 1000)
  const days = Math.floor(totalSec / 86400)
  const hrs  = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  if (days > 0) return `${days}d ${hrs}h ${mins}m`
  if (hrs > 0)  return `${hrs}h ${mins}m`
  return `${mins}m`
}

const reportTypeLabels = {
  ASSET_STATUS:          'Asset Status Summary',
  MAINTENANCE_COST:      'Maintenance Cost Analysis',
  ASSET_UTILIZATION:     'Asset Utilization',
  PREVENTIVE_COMPLIANCE: 'Preventive PM Compliance',
  MONTHLY_ASSET:         'Monthly Asset Report',
  AUDIT_TRAIL:           'Audit Trail Report',
}

const weekdayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// ─── Status Badge ────────────────────────────────────────────────────────────

const StatusBadge = ({ status, nextRun }) => {
  const [countdown, setCountdown] = useState(formatCountdown(nextRun))

  useEffect(() => {
    if (status !== 'PAUSED' || !nextRun) return
    const tick = setInterval(() => setCountdown(formatCountdown(nextRun)), 30000)
    return () => clearInterval(tick)
  }, [status, nextRun])

  const configs = {
    ACTIVE: {
      cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: <FaCheckCircle className="text-xs" />,
      label: 'Active'
    },
    PAUSED: {
      cls: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: <FaHourglassHalf className="text-xs" />,
      label: countdown ? `Paused · runs in ${countdown}` : 'Paused'
    },
    FAILED: {
      cls: 'bg-red-100 text-red-800 border-red-200',
      icon: <FaExclamationCircle className="text-xs" />,
      label: 'Failed'
    }
  }
  const cfg = configs[status] || configs.ACTIVE

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ScheduledReports = () => {
  const { showSuccess, showError } = useToast()
  const [reports, setReports]           = useState([])
  const [users, setUsers]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [checkingDue, setCheckingDue]   = useState(false)
  const pollRef = useRef(null)

  const initialForm = {
    name: '',
    report_type: 'MONTHLY_ASSET',
    frequency: 'MONTHLY',
    day_of_month: 5,
    day_of_week: 0,
    time_of_day: '08:00',
    recipients: [],
    recipient_emails: '',
    is_compliance_required: true
  }
  const [form, setForm] = useState(initialForm)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchReports = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/reports/scheduled/')
      const data = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setReports(data)
    } catch (err) {
      console.error('Error fetching scheduled reports:', err)
      if (!silent) setReports([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users/users/')
      setUsers(Array.isArray(res.data) ? res.data : (res.data.results || []))
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }, [])

  // ── Scheduled-due poller ───────────────────────────────────────────────────
  // Calls GET /reports/scheduled/check_due/ every 60 s.
  // Backend auto-runs any PAUSED report whose next_run has passed,
  // then returns it to PAUSED with the updated next_run.

  const checkDue = useCallback(async () => {
    if (checkingDue) return
    try {
      setCheckingDue(true)
      const res = await api.get('/reports/scheduled/check_due/')
      if (res.data.triggered_count > 0) {
        const names = res.data.triggered.map(r => r.name).join(', ')
        showSuccess(`Auto-ran ${res.data.triggered_count} scheduled report(s): ${names}`)
        fetchReports(true)        // silent refresh
      }
    } catch (err) {
      console.error('check_due error:', err)
    } finally {
      setCheckingDue(false)
    }
  }, [checkingDue, fetchReports, showSuccess])

  useEffect(() => {
    fetchReports()
    fetchUsers()
    checkDue()                            // immediate first check
    pollRef.current = setInterval(checkDue, 60000)   // then every 60 s
    return () => clearInterval(pollRef.current)
  }, [])           // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleRunNow = async (id, name) => {
    try {
      const res = await api.post(`/reports/scheduled/${id}/run_now/`)
      const nextRun = res.data.next_run
        ? new Date(res.data.next_run).toLocaleString()
        : 'unknown'
      showSuccess(`"${name}" ran successfully. Next run: ${nextRun}`)
      fetchReports(true)
    } catch (err) {
      showError(`Failed to run "${name}"`)
    }
  }

  const handlePause = async (id) => {
    try {
      await api.post(`/reports/scheduled/${id}/pause/`)
      showSuccess('Report paused')
      fetchReports(true)
    } catch (err) {
      showError('Failed to pause report')
    }
  }

  const handleResume = async (id) => {
    try {
      const res = await api.post(`/reports/scheduled/${id}/resume/`)
      const nextRun = res.data.next_run
        ? new Date(res.data.next_run).toLocaleString()
        : 'unknown'
      showSuccess(`Report activated. Will auto-run at: ${nextRun}`)
      fetchReports(true)
    } catch (err) {
      showError('Failed to resume report')
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete scheduled report "${name}"?`)) return
    try {
      await api.delete(`/reports/scheduled/${id}/`)
      showSuccess(`"${name}" deleted`)
      fetchReports(true)
    } catch (err) {
      showError('Failed to delete report')
    }
  }

  // ── Form helpers ───────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleRecipients = (e) => {
    const ids = [...e.target.options].filter(o => o.selected).map(o => parseInt(o.value))
    setForm(prev => ({ ...prev, recipients: ids }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let time = form.time_of_day
    if (time.split(':').length === 2) time += ':00'

    const payload = {
      name: form.name,
      report_type: form.report_type,
      frequency: form.frequency,
      time_of_day: time,
      recipients: form.recipients,
      recipient_emails: form.recipient_emails,
      is_compliance_required: form.is_compliance_required,
      day_of_month: null,
      day_of_week: null
    }

    if (form.frequency === 'WEEKLY') {
      payload.day_of_week = parseInt(form.day_of_week)
    } else if (form.frequency !== 'DAILY') {
      payload.day_of_month = parseInt(form.day_of_month)
    }

    try {
      await api.post('/reports/scheduled/', payload)
      showSuccess(`"${form.name}" scheduled. It will auto-run at each ${form.frequency.toLowerCase()} interval.`)
      setShowModal(false)
      setForm(initialForm)
      fetchReports(true)
    } catch (err) {
      const msg = err.response?.data
        ? Object.entries(err.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        : 'Failed to schedule report'
      showError(msg)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Scheduled Reports</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Reports run once then pause until the next scheduled time.
            {checkingDue && <span className="ml-2 text-indigo-500 animate-pulse">● Checking due reports…</span>}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold shadow-md"
        >
          <FaPlus />
          Schedule New Report
        </button>
      </div>

      {/* Lifecycle info banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 flex gap-3 items-start text-sm text-indigo-800">
        <FaBolt className="mt-0.5 flex-shrink-0 text-indigo-500" />
        <span>
          <strong>How it works:</strong> When a report runs (manually or automatically) it enters
          <strong> PAUSED</strong> state. It will auto-run again when the scheduled time arrives, then pause again. 
          Use <strong>Resume</strong> only to re-activate a report you manually paused.
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-14 text-center border border-gray-100">
          <FaCalendarAlt className="text-6xl text-gray-200 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">No scheduled reports yet</p>
          <p className="text-sm text-gray-400 mt-1">Create one to start automating your reporting cycle.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => {
            const isDue = r.next_run && new Date(r.next_run) <= new Date()
            return (
              <div
                key={r.id}
                className={`bg-white rounded-xl shadow-md border transition-shadow hover:shadow-lg ${
                  r.status === 'FAILED' ? 'border-red-200' :
                  r.status === 'PAUSED' && isDue ? 'border-amber-300 ring-1 ring-amber-200' :
                  'border-gray-100'
                }`}
              >
                <div className="p-5 flex flex-col md:flex-row gap-4">

                  {/* Info block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 mb-3">
                      <h3 className="text-lg font-bold text-gray-800">{r.name}</h3>
                      <StatusBadge status={r.status} nextRun={r.next_run} />
                      {r.is_compliance_required && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                          Compliance
                        </span>
                      )}
                      {r.status === 'PAUSED' && isDue && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 rounded-full animate-pulse">
                          ⚡ Due – will auto-run shortly
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm mb-3">
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Type</p>
                        <p className="font-medium text-gray-700">{reportTypeLabels[r.report_type] || r.report_type}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Frequency</p>
                        <p className="font-medium text-gray-700 capitalize">{r.frequency?.toLowerCase()}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Schedule</p>
                        <p className="font-medium text-gray-700">
                          {r.frequency === 'WEEKLY'
                            ? `${weekdayLabels[r.day_of_week] || 'Mon'} at ${r.time_of_day?.slice(0, 5)}`
                            : r.frequency === 'DAILY'
                              ? `Daily at ${r.time_of_day?.slice(0, 5)}`
                              : `Day ${r.day_of_month || 5} at ${r.time_of_day?.slice(0, 5)}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Recipients</p>
                        <p className="font-medium text-gray-700 truncate">
                          {r.recipients_details?.length
                            ? r.recipients_details.map(u => u.name).join(', ')
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <FaClock className="text-gray-300" />
                        Last run: {r.last_run ? new Date(r.last_run).toLocaleString() : 'Never'}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt className="text-gray-300" />
                        Next run: {r.next_run ? new Date(r.next_run).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 self-end md:self-auto border-t md:border-none pt-3 md:pt-0 w-full md:w-auto justify-end">
                    {/* Run Now */}
                    <button
                      onClick={() => handleRunNow(r.id, r.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-xs font-semibold"
                      title="Run now (will pause until next schedule)"
                    >
                      <FaPlay className="text-xs" /> Run
                    </button>

                    {/* Pause / Resume - only meaningful for ACTIVE or manually-paused */}
                    {r.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handlePause(r.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-xs font-semibold"
                        title="Manually pause (stops auto-run)"
                      >
                        <FaPause className="text-xs" /> Pause
                      </button>
                    ) : r.status === 'PAUSED' ? (
                      <button
                        onClick={() => handleResume(r.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-xs font-semibold"
                        title="Re-activate to allow auto-run at next_run"
                      >
                        <FaRedo className="text-xs" /> Resume
                      </button>
                    ) : null}

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(r.id, r.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-xs font-semibold"
                      title="Delete"
                    >
                      <FaTrash className="text-xs" /> Delete
                    </button>
                  </div>
                </div>

                {/* Progress bar: time elapsed since last_run toward next_run */}
                {r.last_run && r.next_run && (() => {
                  const last = new Date(r.last_run).getTime()
                  const next = new Date(r.next_run).getTime()
                  const now  = Date.now()
                  const pct  = Math.min(100, Math.max(0, ((now - last) / (next - last)) * 100))
                  return (
                    <div className="px-5 pb-4">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Last run</span>
                        <span>{pct.toFixed(0)}% to next run</span>
                        <span>Next run</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaCalendarAlt /> Schedule Automated Report
              </h3>
              <button onClick={() => { setShowModal(false); setForm(initialForm) }}>
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Lifecycle note */}
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
                📌 The report will run once immediately when triggered, then pause until the next scheduled interval.
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Report Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="name" value={form.name} onChange={handleChange} required
                  placeholder="e.g., Monthly Campus Asset Audit"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Report Type <span className="text-red-500">*</span></label>
                  <select name="report_type" value={form.report_type} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    {Object.entries(reportTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Frequency <span className="text-red-500">*</span></label>
                  <select name="frequency" value={form.frequency} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {form.frequency === 'WEEKLY' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Day of Week <span className="text-red-500">*</span></label>
                    <select name="day_of_week" value={form.day_of_week} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                      {weekdayLabels.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                ) : form.frequency !== 'DAILY' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Day of Month <span className="text-red-500">*</span></label>
                    <input type="number" name="day_of_month" value={form.day_of_month} onChange={handleChange}
                      min="1" max="31" required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ) : <div />}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time of Day <span className="text-red-500">*</span></label>
                  <input type="time" name="time_of_day" value={form.time_of_day} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Recipients</label>
                <select multiple value={form.recipients} onChange={handleRecipients}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 text-sm">
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name ? `${u.first_name} ${u.last_name}` : u.username} ({u.role})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Additional Emails (comma-separated)</label>
                <input type="text" name="recipient_emails" value={form.recipient_emails} onChange={handleChange}
                  placeholder="auditor@dmu.edu.et, finance@dmu.edu.et"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isc" name="is_compliance_required" checked={form.is_compliance_required} onChange={handleChange}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="isc" className="text-sm font-semibold text-gray-700 select-none">
                  Follow Ethiopian Federal Property Administration Guidelines
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all">
                  Create Schedule
                </button>
                <button type="button" onClick={() => { setShowModal(false); setForm(initialForm) }}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-bold transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduledReports
