import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Clock,
  PlayCircle,
  PauseCircle,
  Calendar,
  TrendingUp,
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText
} from 'lucide-react';

export default function TechnicianTimeTracking() {
  const { token } = useSelector((state) => state.auth);
  const [timeData, setTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockLoading, setClockLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [clockOutNotes, setClockOutNotes] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    fetchTimeData();
    timerRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const fetchTimeData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('http://localhost:8000/api/technician/time-tracking/', { headers });
      const data = response.data;
      setTimeData(data);
      setClockedIn(data.clocked_in || false);
      setClockInTime(data.clock_in_time ? new Date(data.clock_in_time) : null);
    } catch (error) {
      console.error('Error fetching time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleClockIn = async () => {
    setClockLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('http://localhost:8000/api/technician/time-tracking/clock-in/', {}, { headers });
      setClockedIn(true);
      setClockInTime(new Date());
      showToast('Clocked in successfully!');
      fetchTimeData();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to clock in', 'error');
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        'http://localhost:8000/api/technician/time-tracking/clock-out/',
        { notes: clockOutNotes },
        { headers }
      );
      setClockedIn(false);
      setClockInTime(null);
      setClockOutNotes('');
      setShowNotesModal(false);
      showToast(`Clocked out — ${response.data.total_hours}h logged`);
      fetchTimeData();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to clock out', 'error');
    } finally {
      setClockLoading(false);
    }
  };

  const getElapsed = () => {
    if (!clockedIn || !clockInTime) return { display: '00:00:00', seconds: 0 };
    const diff = currentTime - clockInTime;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return {
      display: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`,
      hours: h, minutes: m, seconds: s
    };
  };

  const exportCSV = () => {
    if (!timeData?.records?.length) return;
    const rows = [
      ['Date', 'Clock In', 'Clock Out', 'Total Hours', 'Status', 'Notes'],
      ...timeData.records.map(r => [r.date, r.clock_in, r.clock_out || '—', r.total_hours ?? '—', r.status, r.notes || ''])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const elapsed = getElapsed();

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading time tracking...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-medium transition-all ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 rounded-2xl shadow-2xl p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-28 translate-x-28"></div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <Clock className="w-8 h-8" />
              Time Tracking
            </h1>
            <p className="text-indigo-200 text-sm">Monitor your work hours and attendance</p>
          </div>
          <button
            onClick={fetchTimeData}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors self-start"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Clock In/Out Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-xl border border-gray-100 p-8 flex flex-col items-center justify-center text-center">
          {/* Live clock */}
          <p className="text-5xl font-mono font-bold text-gray-900 mb-1 tabular-nums">
            {currentTime.toLocaleTimeString()}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>

          {/* Status indicator */}
          <div className={`flex items-center gap-2 text-sm font-medium mb-6 px-4 py-2 rounded-full ${
            clockedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${clockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            {clockedIn ? 'On Duty' : 'Off Duty'}
          </div>

          {/* Elapsed timer */}
          {clockedIn && (
            <div className="mb-6 w-full">
              <p className="text-xs text-gray-500 mb-1">Session Duration</p>
              <p className="text-4xl font-mono font-bold text-indigo-600 tabular-nums">{elapsed.display}</p>
              <p className="text-xs text-gray-400 mt-1">
                Started at {clockInTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}

          {/* Clock button */}
          <button
            onClick={clockedIn ? () => setShowNotesModal(true) : handleClockIn}
            disabled={clockLoading}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
              clockedIn
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
            }`}
          >
            {clockLoading ? (
              <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
            ) : clockedIn ? (
              <><PauseCircle className="w-6 h-6" /> Clock Out</>
            ) : (
              <><PlayCircle className="w-6 h-6" /> Clock In</>
            )}
          </button>

          {clockedIn && (
            <p className="text-xs text-gray-400 mt-3">Remember to clock out at end of shift</p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">
          <SummaryCard icon={Clock}      title="Today"      value={timeData?.total_hours_today || 0}  color="from-blue-500 to-blue-600"    sub="hours worked" />
          <SummaryCard icon={Calendar}   title="This Week"  value={timeData?.total_hours_week || 0}   color="from-purple-500 to-purple-600" sub="hours this week" />
          <SummaryCard icon={TrendingUp} title="This Month" value={timeData?.total_hours_month || 0}  color="from-green-500 to-emerald-600" sub="hours this month" />

          {/* Weekly progress bar */}
          <div className="sm:col-span-3 bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Weekly Progress</p>
              <p className="text-sm text-gray-500">
                {timeData?.total_hours_week || 0}h / 40h target
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  (timeData?.total_hours_week || 0) >= 40 ? 'bg-green-500' :
                  (timeData?.total_hours_week || 0) >= 20 ? 'bg-blue-500' : 'bg-indigo-400'
                }`}
                style={{ width: `${Math.min(((timeData?.total_hours_week || 0) / 40) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>0h</span>
              <span>20h</span>
              <span>40h</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Time Log Table ── */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Time Log
            {timeData?.records?.length > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-1">({timeData.records.length} entries)</span>
            )}
          </h2>
          <button
            onClick={exportCSV}
            disabled={!timeData?.records?.length}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {!timeData?.records?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Clock className="w-14 h-14 mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">No time entries yet</p>
            <p className="text-sm mt-1">Clock in to start tracking your hours</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <tr>
                  {['Date', 'Clock In', 'Clock Out', 'Duration', 'Status', 'Notes'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {timeData.records.map((record, i) => (
                  <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 text-sm">{record.date}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 font-mono">{record.clock_in}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 font-mono">{record.clock_out || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {record.total_hours != null ? (
                        <span className="font-bold text-indigo-700 text-sm">{record.total_hours}h</span>
                      ) : (
                        <span className="text-sm text-blue-600 font-medium animate-pulse">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        record.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {record.status === 'completed' ? 'Completed' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 truncate max-w-[150px] block">
                        {record.notes || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Tips ── */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mt-6">
        <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Time Tracking Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-indigo-800">
          {[
            'Always clock in when you start your shift',
            'Clock out for lunch breaks if required',
            'Remember to clock out at end of shift',
            'Add notes when clocking out for context',
            'Review your entries regularly for accuracy',
            'Contact your supervisor to correct any errors',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Clock Out Notes Modal ── */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Clock Out</h2>
            <p className="text-sm text-gray-500 mb-4">
              Session: {elapsed.display} · Started {clockInTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={clockOutNotes}
                onChange={e => setClockOutNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-sm"
                placeholder="What did you work on today?"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowNotesModal(false); setClockOutNotes(''); }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleClockOut}
                disabled={clockLoading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {clockLoading ? (
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <><PauseCircle className="w-5 h-5" /> Clock Out</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, title, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-all">
      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} w-fit mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}h</p>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
