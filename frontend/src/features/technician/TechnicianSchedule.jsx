import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Wrench,
  List,
  LayoutGrid,
  RefreshCw,
  Target
} from 'lucide-react';

const PRIORITY_CONFIG = {
  EMERGENCY: { dot: 'bg-red-500',    border: 'border-l-red-500',    badge: 'bg-red-100 text-red-800',    label: 'Emergency' },
  HIGH:      { dot: 'bg-orange-500', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-800', label: 'High' },
  MEDIUM:    { dot: 'bg-yellow-500', border: 'border-l-yellow-500', badge: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
  LOW:       { dot: 'bg-green-500',  border: 'border-l-green-500',  badge: 'bg-green-100 text-green-800',  label: 'Low' },
};

const STATUS_CONFIG = {
  ASSIGNED:    { bg: 'bg-blue-100 text-blue-800',   label: 'Assigned' },
  IN_PROGRESS: { bg: 'bg-indigo-100 text-indigo-800', label: 'In Progress' },
  COMPLETED:   { bg: 'bg-green-100 text-green-800', label: 'Completed' },
  SUBMITTED:   { bg: 'bg-gray-100 text-gray-800',   label: 'Pending' },
  CANCELLED:   { bg: 'bg-red-100 text-red-800',     label: 'Cancelled' },
};

const WEEK_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_DAYS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function TechnicianSchedule() {
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayOrders, setSelectedDayOrders] = useState([]);

  useEffect(() => {
    fetchSchedule();
  }, [currentDate, viewMode]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      let startDate, endDate;
      if (viewMode === 'week') {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - start.getDay());
        startDate = start.toISOString().split('T')[0];
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        endDate = end.toISOString().split('T')[0];
      } else {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        startDate = start.toISOString().split('T')[0];
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        endDate = end.toISOString().split('T')[0];
      }

      const response = await axios.get(
        `http://localhost:8000/api/technician/schedule/?start_date=${startDate}&end_date=${endDate}`,
        { headers }
      );
      setSchedule(response.data.schedule || {});
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigate_ = (direction) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + direction);
    else d.setDate(d.getDate() + direction * 7);
    setCurrentDate(d);
    setSelectedDate(null);
  };

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const getWorkOrdersForDate = (date) => {
    if (!date) return [];
    const key = date.toISOString().split('T')[0];
    return schedule[key] || [];
  };

  const isToday = (date) => date && date.toDateString() === new Date().toDateString();
  const isSelected = (date) => date && selectedDate && date.toDateString() === selectedDate.toDateString();

  const handleDayClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedDayOrders(getWorkOrdersForDate(date));
  };

  // Month grid
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [currentDate]);

  // Week days
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Summary stats for current view
  const allOrders = Object.values(schedule).flat();
  const totalOrders = allOrders.length;
  const emergencyCount = allOrders.filter(wo => wo.maintenance_request?.priority === 'EMERGENCY').length;
  const completedCount = allOrders.filter(wo => wo.maintenance_request?.status === 'COMPLETED').length;
  const pendingCount = allOrders.filter(wo => ['ASSIGNED', 'SUBMITTED', 'IN_PROGRESS'].includes(wo.maintenance_request?.status)).length;

  const title = viewMode === 'month'
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : `Week of ${weekDays[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-6">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-28 translate-x-28"></div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              My Schedule
            </h1>
            <p className="text-purple-200 text-base">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'week' ? 'bg-white text-purple-700 shadow' : 'text-white hover:bg-white/20'}`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'month' ? 'bg-white text-purple-700 shadow' : 'text-white hover:bg-white/20'}`}
              >
                Month
              </button>
            </div>
            <button
              onClick={fetchSchedule}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tasks',  value: totalOrders,    icon: Wrench,        color: 'from-purple-500 to-purple-600' },
          { label: 'Pending',      value: pendingCount,   icon: Clock,         color: 'from-blue-500 to-blue-600' },
          { label: 'Completed',    value: completedCount, icon: CheckCircle,   color: 'from-green-500 to-emerald-600' },
          { label: 'Emergency',    value: emergencyCount, icon: AlertTriangle, color: 'from-red-500 to-red-600', urgent: emergencyCount > 0 },
        ].map(({ label, value, icon: Icon, color, urgent }) => (
          <div key={label} className={`bg-white rounded-2xl shadow-lg p-5 border ${urgent && value > 0 ? 'border-red-200' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              {urgent && value > 0 && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Navigation Bar ── */}
      <div className="bg-white rounded-2xl shadow-lg px-6 py-4 mb-6 flex items-center justify-between border border-gray-100">
        <button onClick={() => navigate_(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={goToday}
            className="px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold text-sm shadow-md"
          >
            Today
          </button>
          <span className="text-lg font-bold text-gray-900">{title}</span>
        </div>
        <button onClick={() => navigate_(1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronRight className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* ── Calendar + Side Panel ── */}
      <div className={`grid gap-6 ${selectedDate ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Calendar */}
        <div className={selectedDate ? 'lg:col-span-2' : ''}>
          {viewMode === 'month' ? (
            <MonthView
              days={monthDays}
              getWorkOrdersForDate={getWorkOrdersForDate}
              isToday={isToday}
              isSelected={isSelected}
              onDayClick={handleDayClick}
              navigate={navigate}
            />
          ) : (
            <WeekView
              days={weekDays}
              getWorkOrdersForDate={getWorkOrdersForDate}
              isToday={isToday}
              isSelected={isSelected}
              onDayClick={handleDayClick}
              navigate={navigate}
            />
          )}
        </div>

        {/* Day Detail Panel */}
        {selectedDate && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-xs font-medium">
                    {WEEK_DAYS_FULL[selectedDate.getDay()]}
                  </p>
                  <p className="text-2xl font-bold">
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-purple-200 text-sm mt-1">
                {selectedDayOrders.length} work order{selectedDayOrders.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-4">
              {selectedDayOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <CheckCircle className="w-12 h-12 mb-3 text-green-300" />
                  <p className="font-medium text-gray-500">Free day!</p>
                  <p className="text-sm mt-1">No work orders scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayOrders.map((wo) => {
                    const req = wo.maintenance_request || {};
                    const priority = req.priority || 'MEDIUM';
                    const status = req.status || 'ASSIGNED';
                    const pc = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
                    const sc = STATUS_CONFIG[status] || STATUS_CONFIG.ASSIGNED;

                    return (
                      <div
                        key={wo.id}
                        onClick={() => navigate(`/dashboard/technician/work-orders/${wo.id}`)}
                        className={`p-4 border-l-4 ${pc.border} bg-gray-50 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-gray-900 text-sm leading-tight">
                            {req.asset_name || wo.asset_name || 'Asset'}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${pc.badge}`}>
                            {pc.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{req.description || 'No description'}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          {wo.scheduled_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(wo.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {wo.estimated_hours && (
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {wo.estimated_hours}h
                            </span>
                          )}
                          {(req.asset_location || wo.asset_location) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {req.asset_location || wo.asset_location}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg}`}>
                            {sc.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Month View ──
function MonthView({ days, getWorkOrdersForDate, isToday, isSelected, onDayClick, navigate }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEK_DAYS_SHORT.map((d) => (
          <div key={d} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          const orders = getWorkOrdersForDate(date);
          const today = isToday(date);
          const selected = isSelected(date);
          const hasEmergency = orders.some(wo => wo.maintenance_request?.priority === 'EMERGENCY');

          return (
            <div
              key={i}
              onClick={() => onDayClick(date)}
              className={`min-h-[110px] p-2 border-b border-r border-gray-100 transition-colors ${
                !date
                  ? 'bg-gray-50'
                  : selected
                  ? 'bg-purple-50 cursor-pointer'
                  : today
                  ? 'bg-blue-50 cursor-pointer'
                  : 'hover:bg-gray-50 cursor-pointer'
              }`}
            >
              {date && (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                      today ? 'bg-blue-600 text-white' :
                      selected ? 'bg-purple-600 text-white' :
                      'text-gray-700'
                    }`}>
                      {date.getDate()}
                    </span>
                    {hasEmergency && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {orders.slice(0, 3).map((wo) => {
                      const priority = wo.maintenance_request?.priority || 'MEDIUM';
                      const pc = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
                      return (
                        <div
                          key={wo.id}
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/technician/work-orders/${wo.id}`); }}
                          className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 truncate cursor-pointer hover:opacity-80 ${pc.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pc.dot}`}></span>
                          <span className="truncate">{wo.maintenance_request?.asset_name || wo.asset_name || 'Task'}</span>
                        </div>
                      );
                    })}
                    {orders.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">+{orders.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ──
function WeekView({ days, getWorkOrdersForDate, isToday, isSelected, onDayClick, navigate }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {days.map((date, i) => {
          const today = isToday(date);
          const selected = isSelected(date);
          return (
            <div
              key={i}
              onClick={() => onDayClick(date)}
              className={`py-4 text-center cursor-pointer transition-colors ${
                selected ? 'bg-purple-50' : today ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{WEEK_DAYS_SHORT[i]}</p>
              <span className={`text-xl font-bold w-10 h-10 flex items-center justify-center rounded-full mx-auto ${
                today ? 'bg-blue-600 text-white' :
                selected ? 'bg-purple-600 text-white' :
                'text-gray-800'
              }`}>
                {date.getDate()}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                {getWorkOrdersForDate(date).length > 0 ? `${getWorkOrdersForDate(date).length} task${getWorkOrdersForDate(date).length > 1 ? 's' : ''}` : ''}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {days.map((date, i) => {
          const orders = getWorkOrdersForDate(date);
          const today = isToday(date);
          return (
            <div key={i} className={`p-3 min-h-[300px] ${today ? 'bg-blue-50/30' : ''}`}>
              {orders.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-300 text-xs">
                  Free
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((wo) => {
                    const req = wo.maintenance_request || {};
                    const priority = req.priority || 'MEDIUM';
                    const pc = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
                    return (
                      <div
                        key={wo.id}
                        onClick={() => navigate(`/dashboard/technician/work-orders/${wo.id}`)}
                        className={`p-2 border-l-4 ${pc.border} bg-white rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
                      >
                        <p className="text-xs font-semibold text-gray-900 truncate mb-1">
                          {req.asset_name || wo.asset_name || 'Task'}
                        </p>
                        {wo.scheduled_date && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(wo.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {wo.estimated_hours && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Target className="w-3 h-3" />
                            {wo.estimated_hours}h
                          </p>
                        )}
                        <span className={`mt-1 inline-block px-1.5 py-0.5 rounded text-xs font-medium ${pc.badge}`}>
                          {pc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
