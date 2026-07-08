import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  MapPin,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  Building,
  Wrench,
  Target,
  ArrowRight
} from 'lucide-react';

const PRIORITY_CONFIG = {
  EMERGENCY: { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-800',    border: 'border-l-red-500' },
  HIGH:      { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800', border: 'border-l-orange-500' },
  MEDIUM:    { dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800', border: 'border-l-yellow-500' },
  LOW:       { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800',  border: 'border-l-green-500' },
};

export default function TechnicianRouteOptimization() {
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [route, setRoute] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(null);

  useEffect(() => {
    fetchRoute();
  }, []);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('http://localhost:8000/api/technician/work-orders/today-route/', { headers });
      setRoute(res.data.route || []);
      setSummary({
        total: res.data.total_tasks,
        hours: res.data.estimated_total_hours,
        campuses: res.data.campuses_visited,
      });
    } catch (e) {
      console.error('Error fetching route:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Optimizing your route...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 p-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-700 rounded-2xl shadow-2xl p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-28 translate-x-28"></div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <Navigation className="w-8 h-8" />
              Today's Route
            </h1>
            <p className="text-teal-200 text-sm">Optimized work order sequence to minimize travel</p>
          </div>
          <button onClick={fetchRoute} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors self-start">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {route.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
          <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <p className="text-xl font-bold text-gray-700 mb-2">All clear for today!</p>
          <p className="text-gray-500">No active work orders scheduled for today.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 text-center">
              <p className="text-3xl font-bold text-teal-600 mb-1">{summary?.total}</p>
              <p className="text-sm text-gray-500">Tasks Today</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 text-center">
              <p className="text-3xl font-bold text-blue-600 mb-1">{summary?.hours}h</p>
              <p className="text-sm text-gray-500">Est. Total Time</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 text-center">
              <p className="text-3xl font-bold text-purple-600 mb-1">{summary?.campuses}</p>
              <p className="text-sm text-gray-500">Campus{summary?.campuses !== 1 ? 'es' : ''}</p>
            </div>
          </div>

          {/* Route Optimization Info */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Navigation className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-teal-900">Route Optimized</p>
              <p className="text-sm text-teal-700">
                Tasks are ordered by priority first (emergencies always first), then grouped by campus to minimize travel between locations.
              </p>
            </div>
          </div>

          {/* Route Steps */}
          <div className="space-y-3">
            {route.map((item, index) => {
              const pc = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
              const isActive = currentStep === item.step;
              const isDone = currentStep && item.step < currentStep;

              return (
                <div key={item.work_order_id} className="flex gap-4">
                  {/* Step indicator */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 border-2 transition-all ${
                      isDone ? 'bg-green-500 border-green-500 text-white' :
                      isActive ? 'bg-teal-600 border-teal-600 text-white scale-110' :
                      'bg-white border-gray-300 text-gray-600'
                    }`}>
                      {isDone ? <CheckCircle className="w-5 h-5" /> : item.step}
                    </div>
                    {index < route.length - 1 && (
                      <div className={`w-0.5 flex-1 mt-1 ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} style={{ minHeight: '24px' }}></div>
                    )}
                  </div>

                  {/* Task card */}
                  <div
                    className={`flex-1 mb-3 bg-white rounded-2xl shadow-lg border-l-4 ${pc.border} overflow-hidden transition-all ${
                      isActive ? 'ring-2 ring-teal-400 shadow-xl' : ''
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pc.dot}`}></span>
                            <p className="font-bold text-gray-900">{item.asset_name || 'Asset'}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${pc.badge}`}>
                              {item.priority}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono">{item.asset_id_display}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {item.scheduled_time && (
                            <p className="text-sm font-semibold text-gray-700">{item.scheduled_time}</p>
                          )}
                          <p className="text-xs text-gray-400">{item.estimated_hours}h est.</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-teal-500" />
                          {item.campus}
                          {item.building && ` — ${item.building}`}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-teal-500" />
                          {item.category}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/dashboard/technician/work-orders/${item.work_order_id}`)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all text-sm font-semibold"
                        >
                          Open Work Order <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentStep(item.step)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            isActive
                              ? 'bg-teal-100 text-teal-700 border-2 border-teal-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {isActive ? '✓ Current' : 'Set Current'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
