import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  TrendingUp,
  Activity,
  PlayCircle,
  PauseCircle,
  List,
  BarChart3,
  Package,
  Star,
  ChevronRight,
  Zap,
  Target,
  Award,
  Bell,
  ArrowRight,
  Navigation,
  MessageCircle
} from 'lucide-react';

export default function TechnicianDashboard() {
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockLoading, setClockLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('http://localhost:8000/api/technician/dashboard/', { headers });
      setDashboardData(response.data);
      setClockedIn(response.data.clocked_in || false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockToggle = async () => {
    setClockLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const action = clockedIn ? 'clock-out' : 'clock-in';
      await axios.post(`http://localhost:8000/api/technician/time-tracking/${action}/`, {}, { headers });
      setClockedIn(!clockedIn);
      fetchDashboardData();
    } catch (error) {
      console.error('Error toggling clock:', error);
    } finally {
      setClockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  const stats = dashboardData?.statistics || {};
  const todayWorkOrders = dashboardData?.today_work_orders || [];
  const upcomingWorkOrders = dashboardData?.upcoming_work_orders || [];

  // Determine greeting
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Emergency work orders (only show non-completed ones)
  const emergencyOrders = [...todayWorkOrders, ...upcomingWorkOrders].filter(
    wo => wo.maintenance_request?.priority === 'EMERGENCY' && 
          wo.maintenance_request?.status !== 'COMPLETED'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">

      {/* ── Header ── */}
      <div className="mb-6 animate-slide-up">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-xl p-6 text-white relative overflow-hidden border border-blue-800">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48"></div>
          </div>

          <div className="relative flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">
                    {greeting}, {user?.first_name}! 👋
                  </h1>
                  <p className="text-blue-100 text-sm flex items-center gap-2 mt-1">
                    <Activity className="w-4 h-4" />
                    Maintenance Technician
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm">
                  <Calendar className="w-4 h-4 text-blue-200" />
                  <span className="font-medium">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm">
                  <Clock className="w-4 h-4 text-blue-200" />
                  <span className="font-medium font-mono">{currentTime.toLocaleTimeString()}</span>
                </div>
                <div className={`flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm ${clockedIn ? 'border border-green-400' : ''}`}>
                  <span className={`w-2 h-2 rounded-full ${clockedIn ? 'bg-green-400 animate-pulse' : 'bg-blue-300'}`}></span>
                  <span className="font-medium">{clockedIn ? 'On Duty' : 'Off Duty'}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClockToggle}
                disabled={clockLoading}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed ${
                  clockedIn
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {clockLoading ? (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                ) : clockedIn ? (
                  <PauseCircle className="w-4 h-4" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
                {clockedIn ? 'Clock Out' : 'Clock In'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Emergency Alert ── */}
      {emergencyOrders.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-xl flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-900 mb-1">
              {emergencyOrders.length} Emergency Work Order{emergencyOrders.length > 1 ? 's' : ''} Require Immediate Attention
            </p>
            <p className="text-sm text-red-700">
              {emergencyOrders.map(wo => wo.maintenance_request?.asset_name || 'Asset').join(', ')}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/technician/work-orders')}
            className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex-shrink-0"
          >
            View <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={List}         title="Today's Tasks"    value={stats.today_work_orders || 0} color="from-blue-500 to-blue-600"   sub="assigned today" />
        <StatCard icon={Clock}        title="In Progress"      value={stats.in_progress || 0}       color="from-amber-500 to-orange-500" sub="currently active" />
        <StatCard icon={CheckCircle}  title="Completed Today"  value={stats.completed_today || 0}   color="from-green-500 to-emerald-600" sub="finished today" />
        <StatCard icon={AlertTriangle} title="Overdue"         value={stats.overdue || 0}           color="from-red-500 to-red-600"      sub="past deadline" urgent={stats.overdue > 0} />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Today's Work Orders (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Today's Work Orders
            </h2>
            <Link to="/dashboard/technician/work-orders" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {todayWorkOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <CheckCircle className="w-14 h-14 mb-3 text-green-300" />
              <p className="font-medium text-gray-500">All clear for today!</p>
              <p className="text-sm mt-1">No work orders scheduled</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayWorkOrders.map((wo) => (
                <WorkOrderRow key={wo.id} workOrder={wo} />
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Performance Score */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl shadow-lg border border-yellow-200 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              My Performance
            </h3>
            <div className="text-center mb-4">
              <p className="text-5xl font-bold text-yellow-500">
                {dashboardData?.performance_score != null ? Math.round(dashboardData.performance_score) : '—'}
              </p>
              <p className="text-sm text-gray-500 mt-1">Performance Score</p>
              <div className="flex justify-center gap-0.5 mt-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round((dashboardData?.performance_score || 0) / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              {dashboardData?.total_ratings > 0 && (
                <p className="text-xs text-gray-400 mt-1">{dashboardData.total_ratings} rating{dashboardData.total_ratings !== 1 ? 's' : ''}</p>
              )}
            </div>
            <Link
              to="/dashboard/technician/performance"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-xl font-semibold text-sm transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              View Full Stats
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              {[
                { to: '/dashboard/technician/work-orders', icon: Wrench,  label: 'My Work Orders',   color: 'text-blue-600 bg-blue-50' },
                { to: '/dashboard/technician/schedule',    icon: Calendar, label: 'My Schedule',      color: 'text-purple-600 bg-purple-50' },
                { to: '/dashboard/technician/time-tracking', icon: Clock, label: 'Time Tracking',    color: 'text-green-600 bg-green-50' },
                { to: '/dashboard/technician/communication', icon: MessageCircle, label: 'Team Messages', color: 'text-pink-600 bg-pink-50' },
                { to: '/dashboard/technician/parts-inventory', icon: Package, label: 'Parts Inventory', color: 'text-indigo-600 bg-indigo-50' },
              { to: '/dashboard/technician/leaderboard',     icon: Award,    label: 'Leaderboard & Badges', color: 'text-yellow-600 bg-yellow-50' },
              { to: '/dashboard/technician/route',           icon: Navigation, label: "Today's Route",       color: 'text-teal-600 bg-teal-50' },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-gray-600" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming Work Orders ── */}
      {upcomingWorkOrders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Upcoming Work Orders
            </h2>
            <span className="text-sm text-gray-500">{upcomingWorkOrders.length} scheduled</span>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingWorkOrders.slice(0, 5).map((wo) => (
              <WorkOrderRow key={wo.id} workOrder={wo} />
            ))}
          </div>
          {upcomingWorkOrders.length > 5 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Link
                to="/dashboard/technician/work-orders"
                className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View {upcomingWorkOrders.length - 5} more <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function StatCard({ icon: Icon, title, value, color, sub, urgent }) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-5 border ${urgent ? 'border-red-200' : 'border-gray-100'} hover:shadow-xl transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {urgent && value > 0 && (
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function WorkOrderRow({ workOrder }) {
  const navigate = useNavigate();
  const req = workOrder.maintenance_request || {};

  const priorityConfig = {
    EMERGENCY: { bg: 'bg-red-100 text-red-800',    dot: 'bg-red-500',    border: 'border-l-red-500' },
    HIGH:      { bg: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500', border: 'border-l-orange-500' },
    MEDIUM:    { bg: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', border: 'border-l-yellow-500' },
    LOW:       { bg: 'bg-green-100 text-green-800',  dot: 'bg-green-500',  border: 'border-l-green-500' },
  };

  const statusConfig = {
    ASSIGNED:    { bg: 'bg-blue-100 text-blue-800',   label: 'Assigned' },
    IN_PROGRESS: { bg: 'bg-indigo-100 text-indigo-800', label: 'In Progress' },
    COMPLETED:   { bg: 'bg-green-100 text-green-800', label: 'Completed' },
    SUBMITTED:   { bg: 'bg-gray-100 text-gray-800',   label: 'Pending' },
  };

  const priority = req.priority || 'MEDIUM';
  const status = req.status || 'ASSIGNED';
  const pc = priorityConfig[priority] || priorityConfig.MEDIUM;
  const sc = statusConfig[status] || statusConfig.ASSIGNED;

  const isOverdue = workOrder.scheduled_date && new Date(workOrder.scheduled_date) < new Date() && status !== 'COMPLETED';

  return (
    <div
      onClick={() => navigate(`/dashboard/technician/work-orders/${workOrder.id}`)}
      className={`flex items-center gap-4 px-6 py-4 hover:bg-blue-50 cursor-pointer transition-colors border-l-4 ${pc.border}`}
    >
      {/* Priority dot */}
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pc.dot}`}></span>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-gray-900 truncate">
            {req.asset_name || workOrder.asset_name || 'Asset'}
          </p>
          {isOverdue && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
              Overdue
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{req.description || 'No description'}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {req.asset_location || workOrder.asset_location || 'N/A'}
          </span>
          {workOrder.scheduled_date && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(workOrder.scheduled_date).toLocaleDateString()}
            </span>
          )}
          {workOrder.estimated_hours && (
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {workOrder.estimated_hours}h est.
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${pc.bg}`}>
          {priority}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${sc.bg}`}>
          {sc.label}
        </span>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </div>
  );
}
