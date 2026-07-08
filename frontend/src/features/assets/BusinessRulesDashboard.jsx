import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaShieldAlt, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaTimes,
  FaSearch,
  FaInfoCircle
} from 'react-icons/fa'
import api from '../../services/api'

const BusinessRulesDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [assetId, setAssetId] = useState('')
  const [ruleCheck, setRuleCheck] = useState(null)
  const [permissions, setPermissions] = useState(null)
  const [message, setMessage] = useState(null)

  const handleCheckRules = async (e) => {
    e.preventDefault()
    if (!assetId) return

    try {
      setLoading(true)
      setMessage(null)
      
      // Check business rules
      const rulesResponse = await api.get(`/assets/business-rules/check/${assetId}/`)
      setRuleCheck(rulesResponse.data)
      
      // Get permissions
      const permissionsResponse = await api.get(`/assets/business-rules/permissions/${assetId}/`)
      setPermissions(permissionsResponse.data)
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to check business rules' 
      })
      setRuleCheck(null)
      setPermissions(null)
    } finally {
      setLoading(false)
    }
  }

  const getRuleStatusIcon = (status) => {
    switch (status) {
      case 'OK':
        return <FaCheckCircle className="text-green-600 text-2xl" />
      case 'OVERDUE':
      case 'BLOCKED':
        return <FaExclamationTriangle className="text-red-600 text-2xl" />
      default:
        return <FaInfoCircle className="text-blue-600 text-2xl" />
    }
  }

  const getRuleStatusBadge = (status) => {
    const badges = {
      'OK': { bg: 'bg-green-100', text: 'text-green-800', label: 'Compliant' },
      'OVERDUE': { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' },
      'BLOCKED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Blocked' }
    }
    
    const badge = badges[status] || badges['OK']
    
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const ruleDescriptions = {
    'BR-AM-01': 'High-value assets must be registered promptly to ensure proper tracking and accountability',
    'BR-AM-02': 'Asset transfers require approval from both departments to maintain accurate records',
    'BR-AM-03': 'Asset disposal requires committee review and management approval for proper oversight',
    'BR-AM-04': 'Regular physical verification ensures asset records match actual inventory',
    'BR-AM-05': 'Assets under maintenance are temporarily locked to prevent conflicts',
    'BR-AM-06': 'Standardized asset identification ensures consistent tracking across the system',
    'BR-AM-07': 'Role-based access controls protect asset data and maintain security'
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <FaShieldAlt className="text-6xl opacity-80" />
            <div>
              <h1 className="text-4xl font-bold mb-2">Compliance Dashboard</h1>
              <p className="text-indigo-100 text-lg">Monitor asset management policies and compliance status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 animate-slide-down ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <FaCheckCircle className="text-2xl" /> : 
           <FaExclamationTriangle className="text-2xl" />}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="hover:opacity-70">
            <FaTimes />
          </button>
        </div>
      )}

      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <form onSubmit={handleCheckRules} className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Asset ID
            </label>
            <input
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="Enter Asset ID (e.g., DMU-MAIN-COMP-001)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <FaSearch />
              {loading ? 'Checking...' : 'Check Rules'}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {ruleCheck && (
        <div className="space-y-6 animate-slide-up">
          {/* Asset Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Asset Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Asset ID</p>
                <p className="font-bold text-gray-800">{ruleCheck.asset_id}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Asset Name</p>
                <p className="font-bold text-gray-800">{ruleCheck.asset_name}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Rules Checked</p>
                <p className="font-bold text-gray-800">{ruleCheck.rules_checked} Rules</p>
              </div>
            </div>
          </div>

          {/* Rules Status */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Policy Compliance Status</h2>
            <div className="space-y-4">
              {ruleCheck.rules.map((rule, index) => (
                <div 
                  key={index}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getRuleStatusIcon(rule.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-gray-800">{rule.name}</h3>
                          {getRuleStatusBadge(rule.status)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{ruleDescriptions[rule.rule]}</p>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{rule.message}</p>
                      </div>
                      
                      {/* Rule Details */}
                      {rule.details && Object.keys(rule.details).length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs font-semibold text-blue-800 mb-2">Details:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(rule.details).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-blue-600 font-semibold">{key.replace(/_/g, ' ')}:</span>
                                <span className="text-blue-800 ml-1">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions */}
          {permissions && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Access Permissions</h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600">Your Role</p>
                <p className="text-lg font-bold text-gray-800">{permissions.user_role.replace(/_/g, ' ')}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(permissions.permissions).map(([permission, allowed]) => (
                  <div 
                    key={permission}
                    className={`p-4 rounded-lg border-2 ${
                      allowed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {allowed ? (
                        <FaCheckCircle className="text-green-600" />
                      ) : (
                        <FaTimes className="text-red-600" />
                      )}
                      <p className={`text-sm font-semibold ${
                        allowed ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {permission.replace('can_', '').replace(/_/g, ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate(`/dashboard/assets/${ruleCheck.asset_id}`)}
                className="px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                View Asset Details
              </button>
              <button
                onClick={() => navigate('/dashboard/assets/transfer-approvals')}
                className="px-6 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all"
              >
                Transfer Approvals
              </button>
              <button
                onClick={() => navigate('/dashboard/assets/verifications')}
                className="px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
              >
                Verifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      {!ruleCheck && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <FaShieldAlt className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Asset Compliance Overview</h3>
            <p className="text-gray-600 mb-6">Enter an Asset ID above to check compliance status and policies</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-8">
              {Object.entries(ruleDescriptions).map(([rule, description]) => (
                <div key={rule} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-bold text-indigo-600 mb-1">{rule.split('-')[2]}: Policy Check</p>
                  <p className="text-sm text-gray-700">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BusinessRulesDashboard
