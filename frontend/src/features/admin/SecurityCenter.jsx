import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../auth/authSlice'
import { useNavigate } from 'react-router-dom'
import { 
  FaShieldAlt,
  FaLock,
  FaUnlock,
  FaUserShield,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBan,
  FaGlobe,
  FaClock,
  FaKey,
  FaSignOutAlt,
  FaSearch,
  FaPlus,
  FaTimes,
  FaSync,
  FaChartLine,
  FaHistory,
  FaCog,
  FaSave,
  FaFileAlt,
  FaEdit,
  FaTrash,
  FaUpload,
  FaDownload,
  FaEye,
  FaQrcode,
  FaTimesCircle,
  FaUserSlash
} from 'react-icons/fa'
import api from '../../services/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const SecurityCenter = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const currentUser = useSelector((state) => state.auth.user)
  const currentToken = useSelector((state) => state.auth.token)

  const [activeTab, setActiveTab] = useState('sessions')
  const [loading, setLoading] = useState(false)
  
  // Session Management
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  
  // Security Alerts
  const [securityAlerts, setSecurityAlerts] = useState([])
  const [alertStats, setAlertStats] = useState(null)
  
  // IP Management
  const [ipWhitelist, setIpWhitelist] = useState([])
  const [ipBlacklist, setIpBlacklist] = useState([])
  const [newIp, setNewIp] = useState('')
  const [ipType, setIpType] = useState('whitelist')
  const [ipDescription, setIpDescription] = useState('')
  const [showIPImport, setShowIPImport] = useState(false)
  
  // Failed Login Attempts
  const [failedAttempts, setFailedAttempts] = useState([])
  const [failedSummary, setFailedSummary] = useState(null)
  const [blockedIps, setBlockedIps] = useState([])
  
  // 2FA Management
  const [twoFAUsers, setTwoFAUsers] = useState([])
  const [showEnableModal, setShowEnableModal] = useState(null)
  const [qrCodeData, setQrCodeData] = useState(null)
  const [backupCodes, setBackupCodes] = useState([])
  const [verificationCode, setVerificationCode] = useState('')
  const [enablingStep, setEnablingStep] = useState('initial')
  const [twoFAError, setTwoFAError] = useState('')
  
  // Security Audit
  const [auditResults, setAuditResults] = useState(null)
  const [runningAudit, setRunningAudit] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  
  // Security Logs
  const [securityLogs, setSecurityLogs] = useState([])
  const [logFilters, setLogFilters] = useState({ action: '', user: '' })
  const [selectedLogDetails, setSelectedLogDetails] = useState(null)
  const [showLogDetailsModal, setShowLogDetailsModal] = useState(false)
  
  // Security Metrics
  const [securityMetrics, setSecurityMetrics] = useState(null)
  
  // Security Policy
  const [securityPolicy, setSecurityPolicy] = useState({
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special: true,
    password_expiry_days: 90,
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    lockout_duration_minutes: 30,
    require_2fa_for_admins: false
  })
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [policySaved, setPolicySaved] = useState(false)

  useEffect(() => {
    loadSecurityData()
  }, [activeTab])

  const loadSecurityData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'overview') {
        await fetchSecurityMetrics()
      } else if (activeTab === 'access') {
        await Promise.all([
          fetchActiveSessions(),
          fetchIPLists(),
          fetchFailedAttempts()
        ])
      } else if (activeTab === 'alerts') {
        await Promise.all([
          fetchSecurityAlerts(),
          fetchSecurityLogs()
        ])
      } else if (activeTab === 'authentication') {
        await Promise.all([
          fetch2FAUsers(),
          fetchSecurityPolicy()
        ])
      } else if (activeTab === 'audit') {
        await fetchRecommendations()
      }
    } catch (error) {
      console.error('Error loading security data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch security metrics for overview
  const fetchSecurityMetrics = async () => {
    try {
      // Fetch various metrics
      const [sessionsRes, alertsRes, logsRes] = await Promise.all([
        api.get('/users/sessions/', { params: { is_active: true } }),
        api.get('/users/security-alerts/stats/'),
        api.get('/core/audit-logs/', { params: { page_size: 100 } })
      ])

      const sessions = sessionsRes.data.results || sessionsRes.data
      const alertStats = alertsRes.data
      const logs = logsRes.data.results || logsRes.data

      // Process data for charts
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayLogs = logs.filter(log => log.timestamp?.startsWith(dateStr))
        
        last7Days.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          logins: dayLogs.filter(l => l.action === 'LOGIN').length,
          failures: dayLogs.filter(l => l.action === 'FAILED_LOGIN').length,
          alerts: 0 // Would need alert creation dates
        })
      }

      setSecurityMetrics({
        activeSessions: sessions.length,
        totalAlerts: alertStats.total || 0,
        unacknowledgedAlerts: alertStats.unacknowledged || 0,
        criticalAlerts: alertStats.by_severity?.CRITICAL || 0,
        recentActivity: last7Days,
        alertsBySeverity: [
          { name: 'Critical', value: alertStats.by_severity?.CRITICAL || 0, color: '#DC2626' },
          { name: 'High', value: alertStats.by_severity?.HIGH || 0, color: '#F59E0B' },
          { name: 'Medium', value: alertStats.by_severity?.MEDIUM || 0, color: '#EAB308' },
          { name: 'Low', value: alertStats.by_severity?.LOW || 0, color: '#3B82F6' }
        ].filter(item => item.value > 0)
      })
    } catch (error) {
      console.error('Error fetching security metrics:', error)
    }
  }

  // Fetch security logs
  const fetchSecurityLogs = async () => {
    try {
      const params = {
        page_size: 50,
        ordering: '-timestamp'
      }
      
      if (logFilters.action) params.action = logFilters.action
      if (logFilters.user) params.user__username__icontains = logFilters.user
      
      const response = await api.get('/core/audit-logs/', { params })
      setSecurityLogs(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching security logs:', error)
      setSecurityLogs([])
    }
  }

  // Fetch security policy
  const fetchSecurityPolicy = async () => {
    try {
      const response = await api.get('/core/settings/')
      const settings = response.data.results?.[0] || response.data[0] || response.data
      
      if (settings) {
        setSecurityPolicy({
          password_min_length: settings.password_min_length || 8,
          password_require_uppercase: settings.password_require_uppercase ?? true,
          password_require_lowercase: settings.password_require_lowercase ?? true,
          password_require_numbers: settings.password_require_numbers ?? true,
          password_require_special: settings.password_require_special ?? true,
          password_expiry_days: settings.password_expiry_days || 90,
          session_timeout_minutes: settings.session_timeout || 60,
          max_login_attempts: settings.max_login_attempts || 5,
          lockout_duration_minutes: settings.lockout_duration_minutes || 30,
          require_2fa_for_admins: settings.require_2fa_for_admins ?? false
        })
      }
    } catch (error) {
      console.error('Error fetching security policy:', error)
      // Use defaults if fetch fails
    }
  }

  // Save security policy
  const handleSavePolicy = async () => {
    setSavingPolicy(true)
    try {
      // First get the settings to find the ID
      const getResponse = await api.get('/core/settings/')
      const settings = getResponse.data.results?.[0] || getResponse.data[0] || getResponse.data
      
      // Map frontend field names to backend field names
      const backendData = {
        password_min_length: securityPolicy.password_min_length,
        password_require_uppercase: securityPolicy.password_require_uppercase,
        password_require_lowercase: securityPolicy.password_require_lowercase,
        password_require_numbers: securityPolicy.password_require_numbers,
        password_require_special: securityPolicy.password_require_special,
        password_expiry_days: securityPolicy.password_expiry_days,
        session_timeout: securityPolicy.session_timeout_minutes, // Map to session_timeout
        max_login_attempts: securityPolicy.max_login_attempts,
        // Note: lockout_duration_minutes and require_2fa_for_admins may not exist in backend
      }
      
      if (settings && settings.id) {
        await api.patch(`/core/settings/${settings.id}/`, backendData)
        alert('Security policy updated successfully')
      } else {
        // Create new settings if none exist
        await api.post('/core/settings/', backendData)
        alert('Security policy created successfully')
      }
    } catch (error) {
      console.error('Error saving security policy:', error)
      alert('Failed to save security policy: ' + (error.response?.data?.error || error.message))
    } finally {
      setSavingPolicy(false)
    }
  }

  // Fetch active sessions from API
  const fetchActiveSessions = async () => {
    try {
      const response = await api.get('/users/sessions/', {
        params: { is_active: true }
      })
      setSessions(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setSessions([])
    }
  }

  // Fetch security alerts from API
  const fetchSecurityAlerts = async () => {
    try {
      const response = await api.get('/users/security-alerts/')
      setSecurityAlerts(response.data.results || response.data)
      
      // Get stats
      const statsResponse = await api.get('/users/security-alerts/stats/')
      setAlertStats(statsResponse.data)
    } catch (error) {
      console.error('Error fetching security alerts:', error)
      setSecurityAlerts([])
    }
  }

  const fetchIPLists = async () => {
    try {
      const [whitelistRes, blacklistRes, statsRes] = await Promise.all([
        api.get('/users/ip-control/whitelist/'),
        api.get('/users/ip-control/blacklist/'),
        api.get('/users/ip-control/stats/')
      ])
      
      setIpWhitelist(whitelistRes.data)
      setIpBlacklist(blacklistRes.data)
      
      // Update stats if needed
      console.log('IP Control Stats:', statsRes.data)
    } catch (error) {
      console.error('Error fetching IP lists:', error)
      setIpWhitelist([])
      setIpBlacklist([])
    }
  }

  const fetchFailedAttempts = async () => {
    try {
      const [attemptsRes, summaryRes] = await Promise.all([
        api.get('/users/failed-logins/', { params: { page_size: 50 } }),
        api.get('/users/failed-logins/summary/')
      ])
      const attempts = attemptsRes.data.results || attemptsRes.data
      setFailedAttempts(attempts)
      setFailedSummary(summaryRes.data)
      // Derive blocked IPs from top IPs with 5+ attempts in summary
      const topIps = (summaryRes.data?.by_ip || [])
        .filter(entry => entry.count >= 5)
        .map(entry => entry.ip_address)
      setBlockedIps(topIps)
    } catch (error) {
      console.error('Error fetching failed login attempts:', error)
      setFailedAttempts([])
      setFailedSummary(null)
    }
  }

  const fetch2FAUsers = async () => {
    try {
      const response = await api.get('/users/users/')
      const users = response.data.results || response.data
      
      // Map users to include 2FA status (currently mock, can be extended when backend supports it)
      setTwoFAUsers(users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        twoFAEnabled: user.two_fa_enabled || false,
        method: user.two_fa_method || 'TOTP',
        enabledAt: user.two_fa_enabled_at || null
      })))
    } catch (error) {
      console.error('Error fetching users for 2FA:', error)
      setTwoFAUsers([])
    }
  }

  const handleTerminateSession = async (session) => {
    const sessionId = typeof session === 'object' ? session.id : session
    const isOwnSession = typeof session === 'object' && currentUser &&
      session.user === currentUser.id
    const confirmMsg = isOwnSession
      ? 'This is your own active session. Terminating it will log you out. Continue?'
      : 'Terminate this session? The user will be signed out immediately.'
    if (!window.confirm(confirmMsg)) return

    try {
      await api.post(`/users/sessions/${sessionId}/terminate/`)
      if (isOwnSession) {
        // Force logout this browser tab too
        await dispatch(logout())
        navigate('/login', { replace: true })
        return
      }
      await fetchActiveSessions()
    } catch (error) {
      console.error('Error terminating session:', error)
      alert('Failed to terminate session: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await api.post(`/users/security-alerts/${alertId}/acknowledge/`)
      await fetchSecurityAlerts()
      alert('Alert acknowledged successfully')
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      alert('Failed to acknowledge alert')
    }
  }

  const handleAcknowledgeAllAlerts = async () => {
    if (!window.confirm('Acknowledge all unacknowledged alerts?')) return
    
    try {
      const response = await api.post('/users/security-alerts/acknowledge_all/')
      await fetchSecurityAlerts()
      alert(response.data.message)
    } catch (error) {
      console.error('Error acknowledging alerts:', error)
      alert('Failed to acknowledge alerts')
    }
  }

  const handleAddIP = async () => {
    if (!newIp.trim()) {
      alert('Please enter an IP address')
      return
    }

    // Basic IP validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
    const rangePattern = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/
    
    if (!ipPattern.test(newIp) && !rangePattern.test(newIp)) {
      alert('Invalid IP format. Use single IP (192.168.1.100), CIDR (192.168.1.0/24), or range (192.168.1.1-192.168.1.254)')
      return
    }

    try {
      const response = await api.post('/users/ip-control/', {
        ip_address: newIp,
        list_type: ipType.toUpperCase(),
        description: ipDescription || ''
      })

      // Refresh the lists
      await fetchIPLists()
      
      setNewIp('')
      setIpDescription('')
      alert(`IP ${newIp} added to ${ipType}`)
    } catch (error) {
      console.error('Error adding IP:', error)
      alert('Failed to add IP: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleEditIP = async (entry, type) => {
    const newDescription = prompt('Enter new description:', entry.description)
    if (newDescription !== null) {
      try {
        await api.patch(`/users/ip-control/${entry.id}/`, {
          description: newDescription
        })
        
        // Refresh the lists
        await fetchIPLists()
        alert('Description updated successfully')
      } catch (error) {
        console.error('Error updating IP:', error)
        alert('Failed to update IP: ' + (error.response?.data?.error || error.message))
      }
    }
  }

  const exportIPList = async () => {
    try {
      const [whitelistRes, blacklistRes] = await Promise.all([
        api.get('/users/ip-control/whitelist/'),
        api.get('/users/ip-control/blacklist/')
      ])
      
      const data = {
        whitelist: whitelistRes.data,
        blacklist: blacklistRes.data,
        exportedAt: new Date().toISOString(),
        exportedBy: 'admin'
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ip-control-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      alert('IP list exported successfully')
    } catch (error) {
      console.error('Error exporting IP list:', error)
      alert('Failed to export IP list')
    }
  }

  const handleRemoveIP = async (id, type) => {
    if (!window.confirm('Remove this IP?')) return

    try {
      await api.delete(`/users/ip-control/${id}/`)
      
      // Refresh the lists
      await fetchIPLists()
      alert('IP removed successfully')
    } catch (error) {
      console.error('Error removing IP:', error)
      alert('Failed to remove IP: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleImportIP = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate the data structure
      if (!data.whitelist && !data.blacklist) {
        alert('Invalid file format. Expected whitelist and/or blacklist arrays.')
        return
      }

      // Send to backend
      const response = await api.post('/users/ip-control/bulk_import/', data)
      
      alert(response.data.message)
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.log('Import errors:', response.data.errors)
        alert('Some entries had errors. Check console for details.')
      }

      // Refresh the lists
      await fetchIPLists()
      setShowIPImport(false)
    } catch (error) {
      console.error('Error importing IP list:', error)
      alert('Failed to import IP list: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleClearList = async (listType) => {
    const listName = listType === 'WHITELIST' ? 'whitelist' : 'blacklist'
    if (!window.confirm(`Clear all ${listName} entries?`)) return

    try {
      const response = await api.post('/users/ip-control/clear_list/', {
        list_type: listType
      })
      
      alert(response.data.message)
      
      // Refresh the lists
      await fetchIPLists()
    } catch (error) {
      console.error('Error clearing list:', error)
      alert('Failed to clear list: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleUnblockIP = (ip) => {
    if (!window.confirm(`Unblock IP ${ip}?`)) return
    setBlockedIps(blockedIps.filter(blocked => blocked !== ip))
    setFailedAttempts(failedAttempts.map(attempt => 
      attempt.ip === ip ? { ...attempt, status: 'cleared' } : attempt
    ))
    alert('IP unblocked successfully')
  }

  const handleToggle2FA = async (userId, currentStatus) => {
    const user = twoFAUsers.find(u => u.id === userId)
    
    if (currentStatus) {
      // Disable 2FA
      if (!window.confirm(`Disable 2FA for ${user.username}? This will reduce account security.`)) return
      
      try {
        await api.post(`/users/2fa/admin/toggle/${userId}/`, { action: 'disable' })
        await fetch2FAUsers()
        alert('2FA disabled successfully')
      } catch (error) {
        console.error('Error disabling 2FA:', error)
        alert('Failed to disable 2FA: ' + (error.response?.data?.error || error.message))
      }
    } else {
      // Enable 2FA - show modal
      setShowEnableModal(user)
      setEnablingStep('initial')
    }
  }

  const handleStartEnable2FA = async () => {
    setTwoFAError('')
    try {
      // Admin direct-enable: generates secret + backup codes, marks 2FA active
      const response = await api.post(`/users/2fa/admin/toggle/${showEnableModal.id}/`, { action: 'enable' })
      setBackupCodes(response.data.backup_codes || [])
      setEnablingStep('complete')
      await fetch2FAUsers()
    } catch (error) {
      const msg = error.response?.data?.error || error.message
      setTwoFAError('Failed to enable 2FA: ' + msg)
    }
  }

  // Self-enable flow: step 1 = get QR, step 2 = verify code
  const handleSelfEnable2FA = async () => {
    setTwoFAError('')
    try {
      const response = await api.post('/users/2fa/enable/')
      setQrCodeData(response.data.qr_code)
      setBackupCodes(response.data.backup_codes || [])
      setEnablingStep('qr')
    } catch (error) {
      setTwoFAError(error.response?.data?.error || 'Failed to start 2FA setup')
    }
  }

  const handleVerify2FA = async () => {
    setTwoFAError('')
    if (!verificationCode || verificationCode.length !== 6) {
      setTwoFAError('Please enter the 6-digit code from your authenticator app')
      return
    }
    try {
      const response = await api.post('/users/2fa/verify-enable/', { code: verificationCode })
      setBackupCodes(response.data.backup_codes || [])
      setEnablingStep('complete')
      await fetch2FAUsers()
    } catch (error) {
      setTwoFAError(error.response?.data?.error || 'Invalid verification code')
    }
  }

  const handleCloseEnableModal = () => {
    setShowEnableModal(null)
    setQrCodeData(null)
    setBackupCodes([])
    setVerificationCode('')
    setEnablingStep('initial')
    setTwoFAError('')
  }

  const runSecurityAudit = async () => {
    setRunningAudit(true)
    
    try {
      const response = await api.post('/users/security-audit/run_audit/')
      setAuditResults(response.data)
      
      // Also fetch recommendations
      await fetchRecommendations()
    } catch (error) {
      console.error('Error running security audit:', error)
      alert('Failed to run security audit: ' + (error.response?.data?.error || error.message))
    } finally {
      setRunningAudit(false)
    }
  }

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true)
    try {
      const response = await api.get('/users/security-audit/recommendations/')
      setRecommendations(response.data.recommendations || [])
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const tabs = [
    { id: 'overview', label: 'Overview & Monitoring', icon: FaChartLine, description: 'Security dashboard and metrics' },
    { id: 'access', label: 'Access Control', icon: FaLock, description: 'Sessions, IP management, failed logins' },
    { id: 'alerts', label: 'Alerts & Incidents', icon: FaExclamationTriangle, description: 'Security alerts and audit logs' },
    { id: 'authentication', label: 'Authentication', icon: FaKey, description: '2FA and password policies' },
    { id: 'audit', label: 'Security Audit', icon: FaShieldAlt, description: 'System audit and recommendations' }
  ]

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Security Center</h1>
              <p className="text-red-100 text-lg">Monitor and manage system security</p>
            </div>
            <div className="p-4 bg-white bg-opacity-20 rounded-xl">
              <FaShieldAlt className="text-5xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6 border-2 border-gray-200">
        <div className="flex overflow-x-auto border-b-2 border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap min-w-[180px] ${
                activeTab === tab.id
                  ? 'text-red-600 border-b-4 border-red-600 bg-red-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="text-2xl" />
              <div className="text-center">
                <div className="font-bold text-sm">{tab.label}</div>
                <div className="text-xs text-gray-500 mt-1">{tab.description}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Security Overview Tab */}
          {activeTab === 'overview' && securityMetrics && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800">Security Overview</h2>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Active Sessions</p>
                      <h3 className="text-3xl font-bold text-blue-600">{securityMetrics.activeSessions}</h3>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                      <FaClock className="text-2xl text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Total Alerts</p>
                      <h3 className="text-3xl font-bold text-orange-600">{securityMetrics.totalAlerts}</h3>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                      <FaExclamationTriangle className="text-2xl text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Unacknowledged</p>
                      <h3 className="text-3xl font-bold text-red-600">{securityMetrics.unacknowledgedAlerts}</h3>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                      <FaBan className="text-2xl text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Critical Alerts</p>
                      <h3 className="text-3xl font-bold text-purple-600">{securityMetrics.criticalAlerts}</h3>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                      <FaShieldAlt className="text-2xl text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Trend */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Security Activity (Last 7 Days)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={securityMetrics.recentActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="logins" stroke="#3B82F6" strokeWidth={2} name="Successful Logins" />
                      <Line type="monotone" dataKey="failures" stroke="#EF4444" strokeWidth={2} name="Failed Logins" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Alerts by Severity */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Alerts by Severity</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={securityMetrics.alertsBySeverity}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {securityMetrics.alertsBySeverity.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Access Control Tab - Combines Sessions, IP Management, Failed Logins */}
          {activeTab === 'access' && (
            <div className="space-y-8 animate-fade-in">
              {/* Active Sessions Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaClock className="text-blue-600" />
                    Active Sessions
                  </h2>
                  <button
                    onClick={fetchActiveSessions}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaSync />
                    Refresh
                  </button>
                </div>

                <div className="grid gap-4">
                  {sessions.map(session => (
                    <div key={session.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                              <FaUserShield className="text-white text-xl" />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-800 text-lg">{session.username}</h3>
                              <p className="text-sm text-gray-600">{session.user_agent || 'Unknown Device'}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">IP Address</p>
                              <p className="font-semibold text-gray-800">{session.ip_address}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Location</p>
                              <p className="font-semibold text-gray-800">{session.location || 'Unknown'}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Login Time</p>
                              <p className="font-semibold text-gray-800">{formatDate(session.login_time)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Last Activity</p>
                              <p className="font-semibold text-gray-800">{formatDate(session.last_activity)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Duration</p>
                              <p className="font-semibold text-gray-800">{session.duration} minutes</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Status</p>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                session.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {session.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {session.is_active && (
                          <button
                            onClick={() => handleTerminateSession(session)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold"
                          >
                            <FaSignOutAlt />
                            Terminate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {sessions.length === 0 && (
                    <div className="text-center py-12">
                      <FaClock className="text-6xl text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No active sessions found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-gray-200"></div>

              {/* IP Access Control Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaGlobe className="text-blue-600" />
                    IP Access Control
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowIPImport(true)}
                      className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 font-semibold"
                    >
                      <FaUpload />
                      Import
                    </button>
                    <button
                      onClick={exportIPList}
                      className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-2 font-semibold"
                    >
                      <FaDownload />
                      Export
                    </button>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Whitelisted IPs</p>
                        <h3 className="text-3xl font-bold text-green-600">{ipWhitelist.length}</h3>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                        <FaCheckCircle className="text-2xl text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Blacklisted IPs</p>
                        <h3 className="text-3xl font-bold text-red-600">{ipBlacklist.length}</h3>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                        <FaBan className="text-2xl text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Total Rules</p>
                        <h3 className="text-3xl font-bold text-blue-600">{ipWhitelist.length + ipBlacklist.length}</h3>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                        <FaGlobe className="text-2xl text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add IP Form */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <FaPlus />
                    Add IP Address or Range
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-2">
                      <select
                        value={ipType}
                        onChange={(e) => setIpType(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 font-semibold"
                      >
                        <option value="whitelist">✓ Whitelist</option>
                        <option value="blacklist">✗ Blacklist</option>
                      </select>
                    </div>
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        value={newIp}
                        onChange={(e) => setNewIp(e.target.value)}
                        placeholder="IP address or CIDR (e.g., 192.168.1.100 or 192.168.1.0/24)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <input
                        type="text"
                        value={ipDescription}
                        onChange={(e) => setIpDescription(e.target.value)}
                        placeholder="Description (e.g., Office Network)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <button
                        onClick={handleAddIP}
                        className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                        title="Add IP"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    <span className="bg-white px-3 py-1 rounded-full">💡 Supports single IPs: 192.168.1.100</span>
                    <span className="bg-white px-3 py-1 rounded-full">💡 Supports CIDR: 192.168.1.0/24</span>
                    <span className="bg-white px-3 py-1 rounded-full">💡 Supports ranges: 192.168.1.1-192.168.1.254</span>
                  </div>
                </div>

                {/* Whitelist Section */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                      <FaCheckCircle className="text-green-600 text-xl" />
                      IP Whitelist ({ipWhitelist.length})
                    </h3>
                    {ipWhitelist.length > 0 && (
                      <button
                        onClick={() => handleClearList('WHITELIST')}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  {ipWhitelist.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FaCheckCircle className="text-5xl text-gray-300 mx-auto mb-3" />
                      <p>No whitelisted IPs yet</p>
                      <p className="text-sm">Add IP addresses that should always have access</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ipWhitelist.map(entry => (
                        <div key={entry.id} className="bg-green-50 rounded-xl p-5 border-2 border-green-200 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-bold">
                                  ALLOWED
                                </span>
                                <p className="font-bold text-gray-800 text-lg">{entry.ip_address}</p>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                {entry.description || 'No description provided'}
                              </p>
                              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <FaUserShield className="text-green-600" />
                                  Added by: <strong>{entry.added_by_full_name || entry.added_by_username || 'System'}</strong>
                                </span>
                                <span className="flex items-center gap-1">
                                  <FaClock className="text-green-600" />
                                  {formatDate(entry.added_at)}
                                </span>
                                {entry.last_used && (
                                  <span className="flex items-center gap-1">
                                    <FaHistory className="text-green-600" />
                                    Last used: {formatDate(entry.last_used)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditIP(entry, 'whitelist')}
                                className="p-3 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => handleRemoveIP(entry.id, 'whitelist')}
                                className="p-3 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Remove"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blacklist Section */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                      <FaBan className="text-red-600 text-xl" />
                      IP Blacklist ({ipBlacklist.length})
                    </h3>
                    {ipBlacklist.length > 0 && (
                      <button
                        onClick={() => handleClearList('BLACKLIST')}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  {ipBlacklist.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FaBan className="text-5xl text-gray-300 mx-auto mb-3" />
                      <p>No blacklisted IPs yet</p>
                      <p className="text-sm">Add IP addresses that should be blocked</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ipBlacklist.map(entry => (
                        <div key={entry.id} className="bg-red-50 rounded-xl p-5 border-2 border-red-200 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-xs font-bold">
                                  BLOCKED
                                </span>
                                <p className="font-bold text-gray-800 text-lg">{entry.ip_address}</p>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                {entry.description || 'No description provided'}
                              </p>
                              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <FaUserShield className="text-red-600" />
                                  Added by: <strong>{entry.added_by_full_name || entry.added_by_username || 'System'}</strong>
                                </span>
                                <span className="flex items-center gap-1">
                                  <FaClock className="text-red-600" />
                                  {formatDate(entry.added_at)}
                                </span>
                                {entry.block_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <FaBan className="text-red-600" />
                                    Blocked {entry.block_count} attempts
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditIP(entry, 'blacklist')}
                                className="p-3 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => handleRemoveIP(entry.id, 'blacklist')}
                                className="p-3 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Remove"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-gray-200"></div>

              {/* Failed Login Attempts Section */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FaExclamationTriangle className="text-red-600" />
                  Failed Login Attempts
                </h2>

                {/* Blocked IPs */}
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                    <FaBan />
                    Currently Blocked IPs ({blockedIps.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {blockedIps.map(ip => (
                      <div key={ip} className="bg-red-100 px-4 py-2 rounded-lg flex items-center gap-2">
                        <span className="font-semibold text-red-800">{ip}</span>
                        <button
                          onClick={() => handleUnblockIP(ip)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaUnlock />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Failed Attempts List */}
                <div className="space-y-3">
                  {failedAttempts.map(attempt => (
                    <div key={attempt.id} className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <FaExclamationTriangle className="text-yellow-600" />
                            <h4 className="font-bold text-gray-800">Username: {attempt.username}</h4>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">IP: {attempt.ip_address}</p>
                          <p className="text-sm text-gray-700 mb-1">Reason: {attempt.reason || 'Unknown'}</p>
                          <p className="text-sm text-gray-600">Time: {formatDate(attempt.attempt_time)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Alerts & Incidents Tab - Combines Security Alerts and Audit Logs */}
          {activeTab === 'alerts' && (
            <div className="space-y-8 animate-fade-in">
              {/* Security Alerts Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaExclamationTriangle className="text-orange-600" />
                    Security Alerts
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAcknowledgeAllAlerts}
                      className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-2 font-semibold"
                    >
                      <FaCheckCircle />
                      Acknowledge All
                    </button>
                    <button
                      onClick={fetchSecurityAlerts}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FaSync />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Alert Stats */}
                {alertStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-600 text-sm font-medium mb-1">Total Alerts</p>
                          <h3 className="text-3xl font-bold text-gray-800">{alertStats.total}</h3>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                          <FaExclamationTriangle className="text-2xl text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-600 text-sm font-medium mb-1">Unacknowledged</p>
                          <h3 className="text-3xl font-bold text-red-600">{alertStats.unacknowledged}</h3>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                          <FaBan className="text-2xl text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-600 text-sm font-medium mb-1">High Severity</p>
                          <h3 className="text-3xl font-bold text-orange-600">
                            {alertStats.by_severity?.HIGH || 0}
                          </h3>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                          <FaShieldAlt className="text-2xl text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-600 text-sm font-medium mb-1">Critical</p>
                          <h3 className="text-3xl font-bold text-red-600">
                            {alertStats.by_severity?.CRITICAL || 0}
                          </h3>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-red-600 to-red-700 rounded-xl">
                          <FaExclamationTriangle className="text-2xl text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alerts List */}
                <div className="space-y-3">
                  {securityAlerts.map(alert => {
                    const getSeverityColor = () => {
                      switch (alert.severity) {
                        case 'CRITICAL': return 'border-red-500 bg-red-50'
                        case 'HIGH': return 'border-orange-500 bg-orange-50'
                        case 'MEDIUM': return 'border-yellow-500 bg-yellow-50'
                        case 'LOW': return 'border-blue-500 bg-blue-50'
                        default: return 'border-gray-500 bg-gray-50'
                      }
                    }

                    const getSeverityBadge = () => {
                      switch (alert.severity) {
                        case 'CRITICAL': return 'bg-red-200 text-red-800'
                        case 'HIGH': return 'bg-orange-200 text-orange-800'
                        case 'MEDIUM': return 'bg-yellow-200 text-yellow-800'
                        case 'LOW': return 'bg-blue-200 text-blue-800'
                        default: return 'bg-gray-200 text-gray-800'
                      }
                    }

                    return (
                      <div key={alert.id} className={`rounded-xl p-6 border-2 ${getSeverityColor()} ${alert.acknowledged ? 'opacity-60' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <FaExclamationTriangle className="text-xl" />
                              <h4 className="font-bold text-gray-800">{alert.alert_type_display}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityBadge()}`}>
                                {alert.severity_display}
                              </span>
                              {alert.acknowledged && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-800">
                                  <FaCheckCircle className="inline mr-1" />
                                  Acknowledged
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                              <div>
                                <span className="font-semibold">User:</span> {alert.username}
                              </div>
                              <div>
                                <span className="font-semibold">IP:</span> {alert.ip_address || 'N/A'}
                              </div>
                              <div>
                                <span className="font-semibold">Time:</span> {formatDate(alert.created_at)}
                              </div>
                              {alert.acknowledged && (
                                <div>
                                  <span className="font-semibold">Acknowledged by:</span> {alert.acknowledged_by_username}
                                </div>
                              )}
                            </div>
                            {alert.details && (
                              <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs text-gray-600">
                                <span className="font-semibold">Details:</span> {JSON.stringify(alert.details)}
                              </div>
                            )}
                          </div>
                          
                          {!alert.acknowledged && (
                            <button
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold ml-4"
                            >
                              <FaCheckCircle />
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {securityAlerts.length === 0 && (
                    <div className="text-center py-12">
                      <FaShieldAlt className="text-6xl text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No security alerts found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-gray-200"></div>

              {/* Security Audit Logs Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaHistory className="text-blue-600" />
                    Security Audit Logs
                  </h2>
                  <button
                    onClick={fetchSecurityLogs}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaSync />
                    Refresh
                  </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Action</label>
                      <select
                        value={logFilters.action}
                        onChange={(e) => {
                          setLogFilters({ ...logFilters, action: e.target.value })
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">All Actions</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGOUT">Logout</option>
                        <option value="FAILED_LOGIN">Failed Login</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">User</label>
                      <input
                        type="text"
                        value={logFilters.user}
                        onChange={(e) => setLogFilters({ ...logFilters, user: e.target.value })}
                        placeholder="Search by username"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={fetchSecurityLogs}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Timestamp</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Resource</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">IP Address</th>
                          <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {securityLogs.map((log, index) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {formatDate(log.timestamp)}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                              {log.user_username || 'System'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                log.action === 'LOGIN' ? 'bg-green-100 text-green-800' :
                                log.action === 'LOGOUT' ? 'bg-blue-100 text-blue-800' :
                                log.action === 'FAILED_LOGIN' ? 'bg-red-100 text-red-800' :
                                log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {log.model_name || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {log.ip_address || '-'}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => {
                                  setSelectedLogDetails(log)
                                  setShowLogDetailsModal(true)
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center justify-center"
                                title="View Details"
                              >
                                <FaEye className="text-lg" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {securityLogs.length === 0 && (
                    <div className="text-center py-12">
                      <FaHistory className="text-6xl text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No security logs found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Authentication Tab - Combines 2FA Management and Security Policy */}
          {activeTab === 'authentication' && (
            <div className="space-y-8 animate-fade-in">
              {/* Security Policy Configuration Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaCog className="text-blue-600" />
                    Security Policy Configuration
                  </h2>
                  <button
                    onClick={handleSavePolicy}
                    disabled={savingPolicy}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold disabled:opacity-50"
                  >
                    {savingPolicy ? <FaSync className="animate-spin" /> : <FaSave />}
                    {savingPolicy ? 'Saving...' : 'Save Policy'}
                  </button>
                </div>

                {/* Password Policy */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FaLock className="text-red-600" />
                    Password Policy
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Minimum Password Length
                      </label>
                      <input
                        type="number"
                        min="6"
                        max="32"
                        value={securityPolicy.password_min_length}
                        onChange={(e) => setSecurityPolicy({ ...securityPolicy, password_min_length: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Password Expiry (Days)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="365"
                        value={securityPolicy.password_expiry_days}
                        onChange={(e) => setSecurityPolicy({ ...securityPolicy, password_expiry_days: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="require_uppercase"
                        checked={securityPolicy.password_require_uppercase}
                        onChange={(e) => setSecurityPolicy({ ...securityPolicy, password_require_uppercase: e.target.checked })}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <label htmlFor="require_uppercase" className="text-sm font-medium text-gray-700">
                        Require Uppercase Letters
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="require_lowercase"
                        checked={securityPolicy.password_require_lowercase}
                        onChange={(e) => setSecurityPolicy({ ...securityPolicy, password_require_lowercase: e.target.checked })}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <label htmlFor="require_lowercase" className="text-sm font-medium text-gray-700">
                        Require Lowercase Letters
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="require_numbers"
                        checked={securityPolicy.password_require_numbers}
                        onChange={(e) => setSecurityPolicy({ ...securityPolicy, password_require_numbers: e.target.checked })}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <label htmlFor="require_numbers" className="text-sm font-medium text-gray-700">
                        Require Numbers
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="require_special"
                        checked={securityPolicy.password_require_special}
                        onChange={(e) => setSecurityPolicy({ ...securityPolicy, password_require_special: e.target.checked })}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <label htmlFor="require_special" className="text-sm font-medium text-gray-700">
                        Require Special Characters
                      </label>
                    </div>
                  </div>
                </div>

                {/* Session Policy */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FaClock className="text-red-600" />
                    Session Policy
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Session Timeout (Minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="480"
                        value={securityPolicy.session_timeout_minutes}
                        onChange={(e) => setSecurityPolicy({ ...securityPolicy, session_timeout_minutes: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Users will be logged out after this period of inactivity
                      </p>
                    </div>
                  </div>
                </div>

                {/* Login Security */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FaShieldAlt className="text-red-600" />
                    Login Security
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Max Login Attempts
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="10"
                        value={securityPolicy.max_login_attempts}
                        onChange={(e) => setSecurityPolicy({ ...securityPolicy, max_login_attempts: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Lockout Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={securityPolicy.lockout_duration_minutes}
                        onChange={(e) => setSecurityPolicy({ ...securityPolicy, lockout_duration_minutes: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    <div className="flex items-center gap-3 md:col-span-2">
                      <input
                        type="checkbox"
                        id="require_2fa_admins"
                        checked={securityPolicy.require_2fa_for_admins}
                        onChange={(e) => setSecurityPolicy({ ...securityPolicy, require_2fa_for_admins: e.target.checked })}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <label htmlFor="require_2fa_admins" className="text-sm font-medium text-gray-700">
                        Require Two-Factor Authentication for Administrators
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-gray-200"></div>

              {/* Two-Factor Authentication Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaKey className="text-purple-600" />
                    Two-Factor Authentication
                  </h2>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">2FA Coverage</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {twoFAUsers.length > 0 ? Math.round((twoFAUsers.filter(u => u.twoFAEnabled).length / twoFAUsers.length) * 100) : 0}%
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {twoFAUsers.map(user => (
                    <div key={user.id} className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                              <FaUserShield className="text-white text-xl" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-800 text-lg">{user.username}</h4>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </div>
                          
                          {user.twoFAEnabled ? (
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                              <div className="flex items-center gap-2 mb-1">
                                <FaCheckCircle className="text-green-600" />
                                <span className="font-semibold text-green-800">2FA Enabled</span>
                              </div>
                              <div className="text-sm text-gray-700 ml-6">
                                <p>Method: <span className="font-semibold">{user.method}</span></p>
                                <p>Enabled: <span className="font-semibold">{formatDate(user.enabledAt)}</span></p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                              <div className="flex items-center gap-2">
                                <FaExclamationTriangle className="text-yellow-600" />
                                <span className="font-semibold text-yellow-800">2FA Not Enabled</span>
                              </div>
                              <p className="text-sm text-gray-700 ml-6 mt-1">
                                Enable two-factor authentication for enhanced security
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleToggle2FA(user.id, user.twoFAEnabled)}
                          className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all hover:scale-105 ${
                            user.twoFAEnabled
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {user.twoFAEnabled ? <FaUnlock /> : <FaLock />}
                          {user.twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {twoFAUsers.length === 0 && (
                    <div className="text-center py-12">
                      <FaKey className="text-6xl text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No users found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Policy Tab */}
          {/* IP Import Modal */}
          {showIPImport && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaUpload className="text-blue-600" />
                    Import IP Control Rules
                  </h3>
                  <button
                    onClick={() => setShowIPImport(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FaTimes className="text-2xl text-gray-600" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Instructions */}
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <h4 className="font-bold text-blue-800 mb-3">Import Instructions</h4>
                    <ul className="text-sm text-blue-700 space-y-2">
                      <li>• Upload a JSON file with whitelist and/or blacklist arrays</li>
                      <li>• Each entry should have: ip_address, description (optional)</li>
                      <li>• Duplicate IPs will be skipped</li>
                      <li>• Use the Export button to see the expected format</li>
                    </ul>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Select JSON File
                    </label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportIP}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
                    />
                  </div>

                  {/* Example Format */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-2 text-sm">Example Format:</h4>
                    <pre className="text-xs text-gray-700 overflow-x-auto">
{`{
  "whitelist": [
    {
      "ip_address": "192.168.1.0/24",
      "description": "Office Network"
    }
  ],
  "blacklist": [
    {
      "ip_address": "203.0.113.0",
      "description": "Suspicious Activity"
    }
  ]
}`}
                    </pre>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowIPImport(false)}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Audit Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Security Audit</h2>
                <button
                  onClick={runSecurityAudit}
                  disabled={runningAudit}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold disabled:opacity-50"
                >
                  {runningAudit ? <FaSync className="animate-spin" /> : <FaShieldAlt />}
                  {runningAudit ? 'Running Audit...' : 'Run Security Audit'}
                </button>
              </div>

              {auditResults && (
                <div className="space-y-6">
                  {/* Score Card with Summary */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg mb-2 opacity-90">Security Score</h3>
                        <p className="text-6xl font-bold">{auditResults.score}/100</p>
                        <p className="text-sm opacity-90 mt-2">
                          {auditResults.score >= 90 ? 'Excellent' : 
                           auditResults.score >= 75 ? 'Good' : 
                           auditResults.score >= 60 ? 'Fair' : 'Needs Improvement'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-90">Last Audit</p>
                        <p className="font-semibold">{formatDate(auditResults.timestamp)}</p>
                      </div>
                    </div>
                    
                    {/* Summary Stats */}
                    {auditResults.summary && (
                      <div className="grid grid-cols-4 gap-4 pt-6 border-t border-white border-opacity-20">
                        <div className="text-center">
                          <p className="text-3xl font-bold">{auditResults.summary.total_checks}</p>
                          <p className="text-sm opacity-90">Total Checks</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-200">{auditResults.summary.passed}</p>
                          <p className="text-sm opacity-90">Passed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-yellow-200">{auditResults.summary.warnings}</p>
                          <p className="text-sm opacity-90">Warnings</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-red-200">{auditResults.summary.failed}</p>
                          <p className="text-sm opacity-90">Failed</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Audit Checks */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Security Checks</h3>
                    <div className="space-y-3">
                      {auditResults.checks.map((check, index) => (
                        <div key={index} className={`rounded-xl p-6 border-2 ${
                          check.status === 'pass' 
                            ? 'bg-green-50 border-green-300' 
                            : check.status === 'warning'
                            ? 'bg-yellow-50 border-yellow-300'
                            : 'bg-red-50 border-red-300'
                        }`}>
                          <div className="flex items-start gap-3">
                            {check.status === 'pass' ? (
                              <FaCheckCircle className="text-green-600 text-xl mt-1" />
                            ) : check.status === 'warning' ? (
                              <FaExclamationTriangle className="text-yellow-600 text-xl mt-1" />
                            ) : (
                              <FaTimes className="text-red-600 text-xl mt-1" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-800 mb-1">{check.name}</h4>
                              <p className="text-sm text-gray-700">{check.message}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              check.status === 'pass' 
                                ? 'bg-green-200 text-green-800' 
                                : check.status === 'warning'
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-red-200 text-red-800'
                            }`}>
                              {check.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations Section */}
                  {recommendations.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                        <FaExclamationTriangle className="text-orange-600 text-xl" />
                        <h3 className="text-lg font-bold text-gray-800">Security Recommendations</h3>
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                          {recommendations.length} items
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {recommendations.map((rec, index) => (
                          <div key={index} className={`rounded-xl p-5 border-l-4 ${
                            rec.priority === 'high' 
                              ? 'bg-red-50 border-red-500' 
                              : rec.priority === 'medium'
                              ? 'bg-orange-50 border-orange-500'
                              : 'bg-blue-50 border-blue-500'
                          }`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    rec.priority === 'high' 
                                      ? 'bg-red-200 text-red-800' 
                                      : rec.priority === 'medium'
                                      ? 'bg-orange-200 text-orange-800'
                                      : 'bg-blue-200 text-blue-800'
                                  }`}>
                                    {rec.priority.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-gray-600">{rec.category}</span>
                                </div>
                                <h4 className="font-bold text-gray-800 mb-1">{rec.title}</h4>
                                <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <FaKey className="text-purple-600" />
                                  <span className="font-semibold">Action:</span>
                                  <span>{rec.action}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!auditResults && !runningAudit && (
                <div className="text-center py-12">
                  <FaShieldAlt className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No audit results yet</p>
                  <p className="text-gray-400 text-sm">Click "Run Security Audit" to start</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2FA Enable Modal */}
      {showEnableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FaKey className="text-purple-600" />
                Enable 2FA for {showEnableModal.username}
              </h3>
              <button
                onClick={handleCloseEnableModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaTimes className="text-2xl text-gray-600" />
              </button>
            </div>

            {enablingStep === 'initial' && (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-3">About Two-Factor Authentication</h4>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li>• Adds an extra layer of security to the account</li>
                    <li>• Requires a code from an authenticator app when logging in</li>
                    <li>• Backup codes will be generated for account recovery</li>
                    <li>• User will need to set up their authenticator app</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                  <h4 className="font-bold text-yellow-800 mb-2">⚠️ Important</h4>
                  <p className="text-sm text-yellow-700">
                    Make sure to save the backup codes that will be generated. The user will need them if they lose access to their authenticator app.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCloseEnableModal}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartEnable2FA}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
                  >
                    <FaLock />
                    Enable 2FA
                  </button>
                </div>
              </div>
            )}

            {enablingStep === 'qr' && (
              <div className="space-y-6 text-center">
                <p className="text-gray-700">Scan this QR code with your authenticator app (like Google Authenticator or Authy).</p>
                {qrCodeData ? (
                  <div className="flex justify-center">
                    <img src={qrCodeData} alt="2FA QR Code" className="border-4 border-white shadow-lg rounded-xl" />
                  </div>
                ) : (
                  <div className="p-12 bg-gray-100 rounded-xl">Loading QR Code...</div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCloseEnableModal}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setEnablingStep('verify')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {enablingStep === 'verify' && (
              <div className="space-y-6">
                <p className="text-gray-700">Enter the 6-digit code from your authenticator app to verify setup.</p>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-center text-2xl font-mono tracking-widest"
                />
                {twoFAError && (
                  <p className="text-red-600 text-sm">{twoFAError}</p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEnablingStep('qr')}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleVerify2FA}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Verify & Enable
                  </button>
                </div>
              </div>
            )}

            {enablingStep === 'complete' && (
              <div className="space-y-6">
                <div className="bg-green-50 rounded-xl p-6 border border-green-200 text-center">
                  <FaCheckCircle className="text-6xl text-green-600 mx-auto mb-4" />
                  <h4 className="font-bold text-green-800 text-xl mb-2">2FA Enabled Successfully!</h4>
                  <p className="text-green-700">
                    Two-factor authentication has been enabled for {showEnableModal.username}
                  </p>
                </div>

                {backupCodes.length > 0 && (
                  <div className="bg-white rounded-xl p-6 border-2 border-orange-200">
                    <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                      <FaKey className="text-orange-600" />
                      Backup Codes - Save These!
                    </h4>
                    <p className="text-sm text-gray-700 mb-4">
                      These codes can be used if the user loses access to their authenticator app. Each code can only be used once.
                    </p>
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-4 rounded-lg font-mono text-sm">
                      {backupCodes.map((code, index) => (
                        <div key={index} className="bg-white p-2 rounded border border-gray-200 text-center">
                          {code}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const text = backupCodes.join('\n')
                        navigator.clipboard.writeText(text)
                        alert('Backup codes copied to clipboard!')
                      }}
                      className="mt-4 w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                    >
                      Copy All Codes
                    </button>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleCloseEnableModal}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {showLogDetailsModal && selectedLogDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FaFileAlt className="text-blue-600" />
                Audit Log Details
              </h3>
              <button
                onClick={() => {
                  setShowLogDetailsModal(false)
                  setSelectedLogDetails(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaTimes className="text-2xl text-gray-600" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <FaFileAlt />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Timestamp</p>
                    <p className="font-semibold text-gray-800">{formatDate(selectedLogDetails.timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">User</p>
                    <p className="font-semibold text-gray-800">{selectedLogDetails.user_username || 'System'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Action</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                      selectedLogDetails.action === 'LOGIN' ? 'bg-green-100 text-green-800' :
                      selectedLogDetails.action === 'LOGOUT' ? 'bg-blue-100 text-blue-800' :
                      selectedLogDetails.action === 'FAILED_LOGIN' ? 'bg-red-100 text-red-800' :
                      selectedLogDetails.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedLogDetails.action}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Resource</p>
                    <p className="font-semibold text-gray-800">{selectedLogDetails.model_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">IP Address</p>
                    <p className="font-semibold text-gray-800">{selectedLogDetails.ip_address || 'N/A'}</p>
                  </div>
                  {selectedLogDetails.object_id && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Object ID</p>
                      <p className="font-semibold text-gray-800">{selectedLogDetails.object_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Details Section */}
              {selectedLogDetails.details && Object.keys(selectedLogDetails.details).length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FaFileAlt className="text-purple-600" />
                    Additional Details
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                    <table className="w-full">
                      <tbody>
                        {Object.entries(selectedLogDetails.details).map(([key, value]) => (
                          <tr key={key} className="border-b border-gray-200 last:border-0">
                            <td className="py-3 pr-4 text-sm font-semibold text-gray-700 capitalize">
                              {key.replace(/_/g, ' ')}
                            </td>
                            <td className="py-3 text-sm text-gray-800">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* No Details Message */}
              {(!selectedLogDetails.details || Object.keys(selectedLogDetails.details).length === 0) && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center">
                  <FaFileAlt className="text-4xl text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No additional details available for this log entry</p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowLogDetailsModal(false)
                    setSelectedLogDetails(null)
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityCenter
