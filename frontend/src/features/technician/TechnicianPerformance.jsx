import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  Target,
  BarChart3,
  Star,
  MessageSquare,
  RefreshCw,
  Zap,
  AlertTriangle,
  User
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const PERIODS = [
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
];

export default function TechnicianPerformance() {
  const { token } = useSelector((state) => state.auth);
  const [metrics, setMetrics] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchPerformance();
  }, [period]);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        `http://localhost:8000/api/technician/performance/?period=${period}`,
        { headers }
      );
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRatings = async () => {
    try {
      setRatingsLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        'http://localhost:8000/api/technician/performance/my-ratings/',
        { headers }
      );
      setRatings(response.data);
    } catch (error) {
      console.log('Ratings not available');
    } finally {
      setRatingsLoading(false);
    }
  };

  // Completion rate color
  const completionRate = Math.round(metrics?.completion_rate || 0);
  const rateColor = completionRate >= 80 ? 'text-green-600' : completionRate >= 50 ? 'text-yellow-600' : 'text-red-600';
  const rateRing = completionRate >= 80 ? 'stroke-green-500' : completionRate >= 50 ? 'stroke-yellow-500' : 'stroke-red-500';

  // Charts
  const statusChartData = {
    labels: ['Completed', 'In Progress', 'Pending'],
    datasets: [{
      data: [metrics?.completed || 0, metrics?.in_progress || 0, metrics?.pending || 0],
      backgroundColor: ['rgba(34,197,94,0.85)', 'rgba(59,130,246,0.85)', 'rgba(234,179,8,0.85)'],
      borderColor: ['#16a34a', '#2563eb', '#ca8a04'],
      borderWidth: 2,
    }]
  };

  const priorityChartData = {
    labels: ['Emergency', 'High', 'Medium', 'Low'],
    datasets: [{
      label: 'Completed',
      data: [
        metrics?.by_priority?.EMERGENCY || 0,
        metrics?.by_priority?.HIGH || 0,
        metrics?.by_priority?.MEDIUM || 0,
        metrics?.by_priority?.LOW || 0,
      ],
      backgroundColor: [
        'rgba(239,68,68,0.8)',
        'rgba(249,115,22,0.8)',
        'rgba(234,179,8,0.8)',
        'rgba(34,197,94,0.8)',
      ],
      borderRadius: 6,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } } }
  };

  const barOptions = {
    ...chartOptions,
    plugins: { ...chartOptions.plugins, legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-green-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading performance data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 p-6">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-700 rounded-2xl shadow-2xl p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-28 translate-x-28"></div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <TrendingUp className="w-8 h-8" />
              My Performance
            </h1>
            <p className="text-green-200 text-sm">Track your productivity and customer satisfaction</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1 gap-1">
              {PERIODS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    period === key ? 'bg-white text-green-700 shadow' : 'text-white hover:bg-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { fetchPerformance(); fetchRatings(); }}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Top Metrics Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Completion Rate — circular gauge */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg border border-gray-100 p-5 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-3">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                className={rateRing}
                strokeWidth="3"
                strokeDasharray={`${completionRate} ${100 - completionRate}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${rateColor}`}>{completionRate}%</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-700 text-center">Completion Rate</p>
          <p className="text-xs text-gray-400 mt-0.5">{metrics?.completed || 0}/{metrics?.total_assigned || 0} tasks</p>
        </div>

        <MetricCard icon={CheckCircle} title="Completed"     value={metrics?.completed || 0}                    color="from-green-500 to-emerald-600" sub={`of ${metrics?.total_assigned || 0} assigned`} />
        <MetricCard icon={Clock}       title="Avg Time"      value={`${metrics?.avg_completion_time || 0}h`}    color="from-blue-500 to-blue-600"     sub="per task" />
        <MetricCard icon={Target}      title="Labor Hours"   value={`${Math.round(metrics?.total_labor_hours || 0)}h`} color="from-purple-500 to-purple-600" sub="total logged" />
        <MetricCard icon={Award}       title="Work Orders"   value={metrics?.total_assigned || 0}               color="from-orange-500 to-orange-600" sub="total assigned" />
      </div>

      {/* ── Performance Score + Customer Ratings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Performance Score Card */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl shadow-lg border border-yellow-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            Performance Score
          </h2>

          {ratingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
          ) : !ratings || ratings.total_ratings === 0 ? (
            <div className="text-center py-8">
              <Star className="w-14 h-14 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No ratings yet</p>
              <p className="text-sm text-gray-400 mt-1">Complete work orders to receive ratings</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Big score */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-6xl font-bold text-yellow-500 leading-none">
                    {ratings.avg_overall ? ratings.avg_overall.toFixed(1) : '—'}
                  </p>
                  <div className="flex justify-center gap-0.5 mt-2">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-5 h-5 ${s <= Math.round(ratings.avg_overall || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{ratings.total_ratings} rating{ratings.total_ratings !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1 space-y-3">
                  {[
                    { label: '⏱ Timeliness',    value: ratings.avg_timeliness },
                    { label: '🔧 Quality',        value: ratings.avg_quality },
                    { label: '💬 Communication', value: ratings.avg_communication },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-semibold text-gray-900">{value ? value.toFixed(1) : '—'}/5</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (value || 0) >= 4 ? 'bg-green-500' :
                            (value || 0) >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${((value || 0) / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score badge */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-yellow-200">
                <span className="text-sm text-gray-600">Overall Performance Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${ratings.performance_score >= 70 ? 'bg-green-500' : ratings.performance_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${ratings.performance_score || 0}%` }}
                    />
                  </div>
                  <span className="font-bold text-gray-900 text-sm w-12 text-right">{ratings.performance_score || 0}/100</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Recent Feedback
          </h2>

          {ratingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : !ratings?.recent_reviews?.length ? (
            <div className="text-center py-8">
              <MessageSquare className="w-14 h-14 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No feedback yet</p>
              <p className="text-sm text-gray-400 mt-1">Owner reviews will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {ratings.recent_reviews.map((review, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 rounded-full">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {review.is_anonymous ? 'Anonymous' : review.rated_by_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= review.overall_rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                  {review.feedback_text && (
                    <p className="text-sm text-gray-600 italic mb-2">"{review.feedback_text}"</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{review.maintenance_request_id}</span>
                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Work Order Status Doughnut */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Work Order Status
          </h2>
          {(metrics?.completed || 0) + (metrics?.in_progress || 0) + (metrics?.pending || 0) === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <p className="text-sm">No data for this period</p>
            </div>
          ) : (
            <div className="h-56">
              <Doughnut data={statusChartData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* Priority Breakdown Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Completed by Priority
          </h2>
          <div className="h-56">
            <Bar data={priorityChartData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* ── Category Breakdown ── */}
      {metrics?.by_category && metrics.by_category.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Work by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {metrics.by_category.map((cat, i) => {
              const total = metrics.by_category.reduce((s, c) => s + c.count, 0);
              const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
              return (
                <div key={i} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100 text-center">
                  <p className="text-2xl font-bold text-purple-700 mb-1">{cat.count}</p>
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    {cat.maintenance_request__category || 'Other'}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="h-1.5 bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Performance Insights ── */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Performance Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightCard
            title="Completion Rate"
            value={completionRate}
            threshold={80}
            goodMsg="Great job! You're meeting your completion targets."
            warnMsg="Focus on completing more assigned work orders."
          />
          <InsightCard
            title="Average Completion Time"
            value={metrics?.avg_completion_time || 0}
            threshold={8}
            goodMsg="Excellent! You're completing tasks efficiently."
            warnMsg="Consider ways to improve task completion speed."
            inverse
            unit="h"
          />
          {ratings && ratings.total_ratings > 0 && (
            <InsightCard
              title="Customer Satisfaction"
              value={Math.round((ratings.avg_overall || 0) * 20)}
              threshold={70}
              goodMsg="Customers are happy with your service quality."
              warnMsg="Work on improving communication and quality."
            />
          )}
          <InsightCard
            title="Work Volume"
            value={metrics?.total_assigned || 0}
            threshold={5}
            goodMsg="You have a healthy workload this period."
            warnMsg="Low workload — check with your supervisor."
            unit=" tasks"
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function MetricCard({ icon: Icon, title, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-all">
      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} w-fit mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function InsightCard({ title, value, threshold, goodMsg, warnMsg, inverse = false, unit = '%' }) {
  const isGood = inverse ? value <= threshold : value >= threshold;
  return (
    <div className={`p-4 rounded-xl border-l-4 ${isGood ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
      <div className="flex items-start gap-3">
        {isGood
          ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          : <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        }
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold text-sm ${isGood ? 'text-green-900' : 'text-yellow-900'}`}>{title}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isGood ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
              {value}{unit}
            </span>
          </div>
          <p className={`text-sm ${isGood ? 'text-green-700' : 'text-yellow-700'}`}>
            {isGood ? goodMsg : warnMsg}
          </p>
        </div>
      </div>
    </div>
  );
}
