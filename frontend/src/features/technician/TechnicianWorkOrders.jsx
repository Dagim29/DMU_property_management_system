import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Wrench,
  Search,
  Filter,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  List,
  Grid
} from 'lucide-react';

export default function TechnicianWorkOrders() {
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter, priorityFilter]);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      let url = 'http://localhost:8000/api/technician/work-orders/';
      
      const params = [];
      if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
      if (priorityFilter !== 'all') params.push(`priority=${priorityFilter}`);
      if (params.length > 0) url += '?' + params.join('&');
      
      const response = await axios.get(url, { headers });
      const data = response.data;
      setWorkOrders(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    const req = wo.maintenance_request || {}
    const matchesSearch = 
      req.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.asset_id_display?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const statusCounts = {
    all: workOrders.length,
    PENDING: workOrders.filter(wo => ['SUBMITTED', 'ASSIGNED'].includes(wo.maintenance_request?.status)).length,
    IN_PROGRESS: workOrders.filter(wo => wo.maintenance_request?.status === 'IN_PROGRESS').length,
    COMPLETED: workOrders.filter(wo => wo.maintenance_request?.status === 'COMPLETED').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-2xl shadow-md p-6 md:p-8 mb-6 text-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              My Work Orders
            </h1>
            <p className="text-indigo-100 text-sm md:text-base font-medium max-w-xl ml-1">
              Manage your assigned maintenance tasks and track progress.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="All"
          count={statusCounts.all}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          color="bg-gray-100 text-gray-800"
        />
        <StatCard
          label="Pending"
          count={statusCounts.PENDING}
          active={statusFilter === 'PENDING'}
          onClick={() => setStatusFilter('PENDING')}
          color="bg-yellow-100 text-yellow-800"
        />
        <StatCard
          label="In Progress"
          count={statusCounts.IN_PROGRESS}
          active={statusFilter === 'IN_PROGRESS'}
          onClick={() => setStatusFilter('IN_PROGRESS')}
          color="bg-blue-100 text-blue-800"
        />
        <StatCard
          label="Completed"
          count={statusCounts.COMPLETED}
          active={statusFilter === 'COMPLETED'}
          onClick={() => setStatusFilter('COMPLETED')}
          color="bg-green-100 text-green-800"
        />
      </div>

      {/* Filters - Glassmorphism Style */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="relative md:col-span-6 lg:col-span-7">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by asset, ID, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>

          <div className="md:col-span-3 lg:col-span-3">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-medium text-gray-700 cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="EMERGENCY">🚨 Emergency</option>
              <option value="HIGH">🔥 High</option>
              <option value="MEDIUM">⚡ Medium</option>
              <option value="LOW">✅ Low</option>
            </select>
          </div>

          <div className="flex gap-2 md:col-span-3 lg:col-span-2 bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-sm ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-sm ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid className="w-4 h-4" />
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Work Orders */}
      {filteredWorkOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Wrench className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">No work orders found</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredWorkOrders.map((wo) => (
            <WorkOrderListItem key={wo.id} workOrder={wo} navigate={navigate} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkOrders.map((wo) => (
            <WorkOrderGridItem key={wo.id} workOrder={wo} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, count, active, onClick, color }) {
  // Extract base color name from tailwind class string like "bg-yellow-100 text-yellow-800"
  let colorTheme = 'gray'
  if (color.includes('yellow')) colorTheme = 'amber'
  if (color.includes('blue')) colorTheme = 'indigo'
  if (color.includes('green')) colorTheme = 'emerald'

  const bgGradient = {
    'gray': 'from-gray-50 to-gray-100',
    'amber': 'from-amber-50 to-orange-50',
    'indigo': 'from-indigo-50 to-blue-50',
    'emerald': 'from-emerald-50 to-teal-50',
  }[colorTheme]

  const textColor = {
    'gray': 'text-gray-600',
    'amber': 'text-amber-600',
    'indigo': 'text-indigo-600',
    'emerald': 'text-emerald-600',
  }[colorTheme]

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl p-5 text-left transition-all duration-300 group border ${
        active 
          ? `border-${colorTheme}-400 bg-gradient-to-br ${bgGradient} shadow-sm scale-[1.01]` 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="relative z-10">
        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${active ? textColor : 'text-gray-500'}`}>
          {label}
        </p>
        <p className={`text-2xl font-bold ${active ? 'text-gray-900' : 'text-gray-800'}`}>
          {count}
        </p>
      </div>
      
      {/* Decorative background element */}
      <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${active ? 'bg-current text-gray-900' : 'bg-gray-400'}`}></div>
    </button>
  );
}

function WorkOrderListItem({ workOrder, navigate }) {
  const priorityStyles = {
    EMERGENCY: 'bg-red-50 text-red-700 border-red-200 shadow-red-100/50',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200 shadow-orange-100/50',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200 shadow-amber-100/50',
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100/50',
  };

  const statusStyles = {
    SUBMITTED: 'bg-gray-100 text-gray-700',
    ASSIGNED: 'bg-indigo-50 text-indigo-700',
    IN_PROGRESS: 'bg-blue-50 text-blue-700',
    COMPLETED: 'bg-emerald-50 text-emerald-700',
    CANCELLED: 'bg-rose-50 text-rose-700',
  };

  const status = workOrder.maintenance_request?.status || 'SUBMITTED';
  const priority = workOrder.maintenance_request?.priority || 'MEDIUM';

  return (
    <div
      onClick={() => navigate(`/dashboard/technician/work-orders/${workOrder.id}`)}
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all duration-200 cursor-pointer relative overflow-hidden"
    >
      {/* Left decorative line based on priority */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${priority === 'EMERGENCY' ? 'bg-red-500' : priority === 'HIGH' ? 'bg-orange-500' : priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pl-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {workOrder.maintenance_request?.asset_name || workOrder.asset_name || 'Asset'}
            </h3>
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${priorityStyles[priority] || priorityStyles.MEDIUM}`}>
              {priority}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-1 max-w-2xl">
            {workOrder.maintenance_request?.description || 'No description provided'}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>{workOrder.maintenance_request?.asset_location || workOrder.asset_location || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleDateString() : 'Not scheduled'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
              <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
              <span>ID: {workOrder.maintenance_request?.request_id || workOrder.id}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border border-transparent shadow-sm ${statusStyles[status] || statusStyles.SUBMITTED}`}>
            {status.replace('_', ' ')}
          </span>
          <div className="text-indigo-600 font-bold text-sm hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
            View Details <span className="text-lg">→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkOrderGridItem({ workOrder, navigate }) {
  const priorityColors = {
    EMERGENCY: 'from-red-500 to-rose-600',
    HIGH: 'from-orange-500 to-amber-600',
    MEDIUM: 'from-amber-400 to-yellow-500',
    LOW: 'from-emerald-400 to-teal-500',
  };
  
  const statusStyles = {
    SUBMITTED: 'bg-gray-100 text-gray-700',
    ASSIGNED: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border border-blue-100',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    CANCELLED: 'bg-rose-50 text-rose-700 border border-rose-100',
  };

  const priority = workOrder.maintenance_request?.priority || 'MEDIUM';
  const status = workOrder.maintenance_request?.status || 'SUBMITTED';

  return (
    <div
      onClick={() => navigate(`/dashboard/technician/work-orders/${workOrder.id}`)}
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col h-full"
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${priorityColors[priority] || priorityColors.MEDIUM}`}></div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1 pr-2">
            {workOrder.maintenance_request?.asset_name || workOrder.asset_name || 'Asset'}
          </h3>
          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${statusStyles[status] || statusStyles.SUBMITTED}`}>
            {status.replace('_', ' ')}
          </span>
        </div>
        
        <p className="text-gray-500 text-sm mb-6 line-clamp-2 flex-1">
          {workOrder.maintenance_request?.description || 'No description provided.'}
        </p>
        
        <div className="space-y-3 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-3 text-sm font-medium text-gray-600 bg-gray-50/50 p-2 rounded-lg">
            <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">{workOrder.maintenance_request?.asset_location || workOrder.asset_location || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-gray-600 bg-gray-50/50 p-2 rounded-lg">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleDateString() : 'Not scheduled'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
