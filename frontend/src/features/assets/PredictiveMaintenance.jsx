import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaExclamationTriangle,
  FaChartLine,
  FaBrain,
  FaTools,
  FaChevronRight,
  FaInfoCircle,
  FaLightbulb,
  FaDollarSign,
  FaCalendarAlt,
  FaSync
} from 'react-icons/fa'
import api from '../../services/api'

const PredictiveMaintenance = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [assetsAtRisk, setAssetsAtRisk] = useState([])
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('ALL')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedRiskLevel])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch summary
      const summaryResponse = await api.get('/assets/predictive/summary/')
      setSummary(summaryResponse.data)
      
      // Fetch assets at risk
      const params = selectedRiskLevel !== 'ALL' ? { risk_level: selectedRiskLevel } : {}
      const assetsResponse = await api.get('/assets/predictive/at-risk/', { params })
      setAssetsAtRisk(assetsResponse.data)
      
    } catch (error) {
      console.error('Error fetching predictive data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const getRiskColor = (level) => {
    switch (level) {
      case 'HIGH':
        return 'from-red-500 to-red-600'
      case 'MEDIUM':
        return 'from-yellow-500 to-yellow-600'
      case 'LOW':
        return 'from-green-500 to-green-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getRiskBgColor = (level) => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-50 border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-200'
      case 'LOW':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getRiskTextColor = (level) => {
    switch (level) {
      case 'HIGH':
        return 'text-red-700'
      case 'MEDIUM':
        return 'text-yellow-700'
      case 'LOW':
        return 'text-green-700'
      default:
        return 'text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FaBrain className="text-6xl opacity-80" />
              <div>
                <h1 className="text-4xl font-bold mb-2">Predictive Maintenance</h1>
                <p className="text-purple-100 text-lg">AI-powered asset failure prediction and risk analysis</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <FaSync className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-scale-in">
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-red-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <FaExclamationTriangle className="text-4xl text-red-600" />
              <span className="text-sm font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                HIGH RISK
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-1">Assets at High Risk</p>
            <p className="text-4xl font-bold text-red-600">{summary.high_risk_count}</p>
            <p className="text-sm text-gray-500 mt-2">
              {summary.risk_distribution.high}% of total assets
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-yellow-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <FaChartLine className="text-4xl text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">
                MEDIUM RISK
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-1">Assets at Medium Risk</p>
            <p className="text-4xl font-bold text-yellow-600">{summary.medium_risk_count}</p>
            <p className="text-sm text-gray-500 mt-2">
              {summary.risk_distribution.medium}% of total assets
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-green-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <FaTools className="text-4xl text-green-600" />
              <span className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                LOW RISK
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-1">Assets at Low Risk</p>
            <p className="text-4xl font-bold text-green-600">{summary.low_risk_count}</p>
            <p className="text-sm text-gray-500 mt-2">
              {summary.risk_distribution.low}% of total assets
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <FaDollarSign className="text-4xl text-purple-600" />
            </div>
            <p className="text-gray-600 text-sm mb-1">Estimated Maintenance Cost</p>
            <p className="text-3xl font-bold text-purple-600">
              ETB {summary.estimated_maintenance_cost.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Based on risk analysis
            </p>
          </div>
        </div>
      )}

      {/* Risk Level Filter */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaInfoCircle className="text-purple-600" />
            Filter by Risk Level
          </h2>
          <div className="flex gap-2">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedRiskLevel(level)}
                className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                  selectedRiskLevel === level
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assets at Risk List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaExclamationTriangle className="text-purple-600" />
            Assets Requiring Attention ({assetsAtRisk.length})
          </h2>
        </div>

        <div className="p-6">
          {assetsAtRisk.length === 0 ? (
            <div className="text-center py-12">
              <FaTools className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No assets found for selected risk level</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assetsAtRisk.map((asset, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer ${getRiskBgColor(asset.risk_level)}`}
                  onClick={() => navigate(`/dashboard/assets/${asset.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{asset.asset_name}</h3>
                        <span className={`px-4 py-1 rounded-full text-sm font-bold ${getRiskTextColor(asset.risk_level)} bg-white shadow-sm`}>
                          {asset.risk_level} RISK
                        </span>
                      </div>
                      <p className="text-gray-600 font-medium">Asset ID: {asset.asset_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Risk Score</p>
                      <div className="relative w-24 h-24">
                        <svg className="transform -rotate-90 w-24 h-24">
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="#e5e7eb"
                            strokeWidth="8"
                            fill="none"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke={asset.risk_level === 'HIGH' ? '#ef4444' : asset.risk_level === 'MEDIUM' ? '#f59e0b' : '#10b981'}
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${(asset.total_score / 100) * 251.2} 251.2`}
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-2xl font-bold ${getRiskTextColor(asset.risk_level)}`}>
                            {asset.total_score}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Breakdown */}
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    {Object.entries(asset.breakdown).map(([factor, score]) => (
                      <div key={factor} className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1 capitalize">
                          {factor.replace('_', ' ')}
                        </p>
                        <p className="text-lg font-bold text-gray-800">{score}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${
                              score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {asset.recommendations && asset.recommendations.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                      <div className="flex items-center gap-2 mb-3">
                        <FaLightbulb className="text-purple-600 text-xl" />
                        <h4 className="font-bold text-gray-800">Recommended Actions</h4>
                      </div>
                      <div className="space-y-2">
                        {asset.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              rec.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                              rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {rec.priority}
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{rec.action}</p>
                              <p className="text-sm text-gray-600">{rec.reason}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Estimated Cost: {rec.estimated_cost}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-4">
                    <button className="flex items-center gap-2 text-purple-600 font-semibold hover:text-purple-700 transition-colors">
                      View Asset Details
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex items-start gap-4">
          <FaInfoCircle className="text-3xl text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">About Predictive Maintenance</h3>
            <p className="text-gray-700 mb-3">
              Our AI-powered predictive maintenance system analyzes multiple factors to assess asset failure risk:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">
                <FaCalendarAlt className="text-blue-600" />
                <span><strong>Asset Age:</strong> Considers expected lifespan and current age</span>
              </li>
              <li className="flex items-center gap-2">
                <FaTools className="text-blue-600" />
                <span><strong>Maintenance Frequency:</strong> Tracks how often repairs are needed</span>
              </li>
              <li className="flex items-center gap-2">
                <FaDollarSign className="text-blue-600" />
                <span><strong>Cost Trends:</strong> Monitors increasing maintenance expenses</span>
              </li>
              <li className="flex items-center gap-2">
                <FaChartLine className="text-blue-600" />
                <span><strong>Downtime Analysis:</strong> Evaluates operational availability</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PredictiveMaintenance
