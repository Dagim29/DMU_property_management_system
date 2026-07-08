import { useState, useEffect } from 'react'
import {
  FaCog,
  FaSave,
  FaDatabase,
  FaBell,
  FaShieldAlt,
  FaServer,
  FaCheckCircle,
  FaSpinner,
  FaSync,
  FaTrash,
  FaUndo,
  FaExclamationTriangle,
  FaInfoCircle,
  FaDownload,
  FaUpload,
  FaHistory,
  FaFileExport,
  FaFileImport,
  FaClock,
  FaGlobe,
  FaEnvelope,
  FaLock,
  FaImage,
  FaFileAlt
} from 'react-icons/fa'
import api from '../../services/api'

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Backup management state
  const [backups, setBackups] = useState([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState(null)
  const [backupAction, setBackupAction] = useState(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalSettings, setOriginalSettings] = useState(null)

  const [settings, setSettings] = useState({
    // General Settings
    systemName: 'DMU Property Management System',
    systemEmail: 'admin@dmu.edu.et',
    timezone: 'Africa/Addis_Ababa',
    dateFormat: 'YYYY-MM-DD',

    // Maintenance Settings
    slaEmergency: 24,
    slaHigh: 72,
    slaMedium: 168,
    slaLow: 336,
    autoAssignment: true,
    preventiveMaintenance: true,

    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    notifyOnCreate: true,
    notifyOnAssign: true,
    notifyOnComplete: true,
    notifyOnOverdue: true,

    // Security Settings
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
    sessionTimeout: 60,
    maxLoginAttempts: 5,

    // File Upload Settings
    maxImageSize: 5,
    maxReportSize: 10,
    allowedImageTypes: 'jpg, jpeg, png, gif',
    allowedReportTypes: 'pdf, doc, docx, xls, xlsx',

    // Backup Settings
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 30
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchBackups()
    }
  }, [activeTab])

  const fetchBackups = async () => {
    try {
      setBackupsLoading(true)
      const response = await api.get('/core/backups/')
      setBackups(response.data.results || response.data)
    } catch (err) {
      console.error('Error fetching backups:', err)
    } finally {
      setBackupsLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true)
      setError(null)
      await api.post('/core/backups/create_backup/')
      await fetchBackups()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error creating backup:', err)
      setError('Failed to create backup: ' + (err.response?.data?.error || err.message))
    } finally {
      setCreatingBackup(false)
    }
  }

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return

    try {
      setBackupAction('restoring')
      setError(null)
      await api.post(`/core/backups/${selectedBackup.id}/restore/`)
      setShowRestoreConfirm(false)
      setSelectedBackup(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      // Refresh settings after restore
      await fetchSettings()
    } catch (err) {
      console.error('Error restoring backup:', err)
      setError('Failed to restore backup: ' + (err.response?.data?.error || err.message))
    } finally {
      setBackupAction(null)
    }
  }

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return

    try {
      setBackupAction('deleting')
      setError(null)
      await api.delete(`/core/backups/${selectedBackup.id}/delete_backup/`)
      setShowDeleteConfirm(false)
      setSelectedBackup(null)
      await fetchBackups()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error deleting backup:', err)
      setError('Failed to delete backup: ' + (err.response?.data?.error || err.message))
    } finally {
      setBackupAction(null)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/core/settings/')

      // Convert snake_case from backend to camelCase for frontend
      const data = response.data
      const settingsData = {
        systemName: data.system_name,
        systemEmail: data.system_email,
        timezone: data.timezone,
        dateFormat: data.date_format,
        slaEmergency: data.sla_emergency,
        slaHigh: data.sla_high,
        slaMedium: data.sla_medium,
        slaLow: data.sla_low,
        autoAssignment: data.auto_assignment,
        preventiveMaintenance: data.preventive_maintenance,
        emailNotifications: data.email_notifications,
        smsNotifications: data.sms_notifications,
        notifyOnCreate: data.notify_on_create,
        notifyOnAssign: data.notify_on_assign,
        notifyOnComplete: data.notify_on_complete,
        notifyOnOverdue: data.notify_on_overdue,
        passwordMinLength: data.password_min_length,
        passwordRequireUppercase: data.password_require_uppercase,
        passwordRequireNumbers: data.password_require_numbers,
        passwordRequireSpecial: data.password_require_special,
        sessionTimeout: data.session_timeout,
        maxLoginAttempts: data.max_login_attempts,
        maxImageSize: data.max_image_size,
        maxReportSize: data.max_report_size,
        allowedImageTypes: data.allowed_image_types,
        allowedReportTypes: data.allowed_report_types,
        autoBackup: data.auto_backup,
        backupFrequency: data.backup_frequency,
        backupRetention: data.backup_retention
      }
      setSettings(settingsData)
      setOriginalSettings(settingsData)
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Convert camelCase to snake_case for backend
      const payload = {
        system_name: settings.systemName,
        system_email: settings.systemEmail,
        timezone: settings.timezone,
        date_format: settings.dateFormat,
        sla_emergency: settings.slaEmergency,
        sla_high: settings.slaHigh,
        sla_medium: settings.slaMedium,
        sla_low: settings.slaLow,
        auto_assignment: settings.autoAssignment,
        preventive_maintenance: settings.preventiveMaintenance,
        email_notifications: settings.emailNotifications,
        sms_notifications: settings.smsNotifications,
        notify_on_create: settings.notifyOnCreate,
        notify_on_assign: settings.notifyOnAssign,
        notify_on_complete: settings.notifyOnComplete,
        notify_on_overdue: settings.notifyOnOverdue,
        password_min_length: settings.passwordMinLength,
        password_require_uppercase: settings.passwordRequireUppercase,
        password_require_numbers: settings.passwordRequireNumbers,
        password_require_special: settings.passwordRequireSpecial,
        session_timeout: settings.sessionTimeout,
        max_login_attempts: settings.maxLoginAttempts,
        max_image_size: settings.maxImageSize,
        max_report_size: settings.maxReportSize,
        allowed_image_types: settings.allowedImageTypes,
        allowed_report_types: settings.allowedReportTypes,
        auto_backup: settings.autoBackup,
        backup_frequency: settings.backupFrequency,
        backup_retention: settings.backupRetention
      }

      await api.patch('/core/settings/1/', payload)
      setHasUnsavedChanges(false)
      setOriginalSettings(settings)
      setSaved(true)
      window.dispatchEvent(new CustomEvent('systemSettingsUpdated'))
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: FaCog },
    { id: 'maintenance', label: 'Maintenance', icon: FaServer },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    { id: 'files', label: 'File Upload', icon: FaDatabase },
    { id: 'backup', label: 'Backup', icon: FaDatabase }
  ]

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }

  const handleResetToDefaults = async () => {
    try {
      setSaving(true)
      setError(null)
      await api.post('/core/settings/reset_to_defaults/')
      await fetchSettings()
      setShowResetConfirm(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error resetting settings:', err)
      setError('Failed to reset settings to defaults')
    } finally {
      setSaving(false)
    }
  }

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `system-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const handleImportSettings = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target.result)
        setSettings(importedSettings)
        setHasUnsavedChanges(true)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (err) {
        console.error('Error importing settings:', err)
        setError('Failed to import settings. Invalid file format.')
      }
    }
    reader.readAsText(file)
    event.target.value = null
  }

  const handleDiscardChanges = () => {
    if (originalSettings) {
      setSettings(originalSettings)
      setHasUnsavedChanges(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-6xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">System Settings</h1>
              <p className="text-blue-100 text-lg">Configure system-wide preferences and options</p>
              {hasUnsavedChanges && (
                <div className="mt-3 flex items-center gap-2 bg-yellow-500 bg-opacity-20 border border-yellow-300 rounded-lg px-3 py-2 text-sm">
                  <FaExclamationTriangle />
                  <span>You have unsaved changes</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={fetchSettings}
                disabled={loading}
                className="bg-white text-blue-600 px-4 py-2 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>

              {hasUnsavedChanges && (
                <button
                  onClick={handleDiscardChanges}
                  className="bg-white text-red-600 px-4 py-2 rounded-xl font-semibold hover:bg-red-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <FaUndo />
                  Discard
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="bg-white text-blue-600 px-6 py-2 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-slide-up">
          <FaCheckCircle className="text-green-600 text-xl" />
          <p className="text-green-800 font-semibold">Settings saved successfully!</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-slide-up">
          <p className="text-red-800 font-semibold">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6 border border-gray-100">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
            >
              <tab.icon />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">General Settings</h2>
                  <p className="text-gray-600 mt-1">Basic system configuration and preferences</p>
                </div>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-semibold"
                >
                  <FaUndo />
                  Reset to Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaGlobe className="text-blue-600" />
                    System Name
                  </label>
                  <input
                    type="text"
                    value={settings.systemName}
                    onChange={(e) => handleInputChange('systemName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter system name"
                  />
                  <p className="text-xs text-gray-500 mt-2">Displayed in headers and emails</p>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaEnvelope className="text-purple-600" />
                    System Email
                  </label>
                  <input
                    type="email"
                    value={settings.systemEmail}
                    onChange={(e) => handleInputChange('systemEmail', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="admin@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-2">Used for system notifications</p>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaClock className="text-green-600" />
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Africa/Addis_Ababa">Africa/Addis Ababa (EAT)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">System-wide timezone setting</p>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaHistory className="text-orange-600" />
                    Date Format
                  </label>
                  <select
                    value={settings.dateFormat}
                    onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-31)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/01/2024)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (01/31/2024)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">How dates are displayed</p>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Settings */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Maintenance Settings</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <strong>SLA (Service Level Agreement)</strong> times are in hours. These define the expected response time for each priority level.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Priority SLA (hours)</label>
                  <input
                    type="number"
                    value={settings.slaEmergency}
                    onChange={(e) => handleInputChange('slaEmergency', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">High Priority SLA (hours)</label>
                  <input
                    type="number"
                    value={settings.slaHigh}
                    onChange={(e) => handleInputChange('slaHigh', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Medium Priority SLA (hours)</label>
                  <input
                    type="number"
                    value={settings.slaMedium}
                    onChange={(e) => handleInputChange('slaMedium', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Low Priority SLA (hours)</label>
                  <input
                    type="number"
                    value={settings.slaLow}
                    onChange={(e) => handleInputChange('slaLow', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Auto Assignment</h3>
                    <p className="text-sm text-gray-600">Automatically assign work orders to available technicians</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoAssignment}
                      onChange={(e) => handleInputChange('autoAssignment', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Preventive Maintenance</h3>
                    <p className="text-sm text-gray-600">Enable scheduled preventive maintenance reminders</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.preventiveMaintenance}
                      onChange={(e) => handleInputChange('preventiveMaintenance', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Notification Settings</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Email Notifications</h3>
                    <p className="text-sm text-gray-600">Send notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">SMS Notifications</h3>
                    <p className="text-sm text-gray-600">Send notifications via SMS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smsNotifications}
                      onChange={(e) => handleInputChange('smsNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Notify on Request Creation</h3>
                    <p className="text-sm text-gray-600">Send notification when a new maintenance request is created</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyOnCreate}
                      onChange={(e) => handleInputChange('notifyOnCreate', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Notify on Assignment</h3>
                    <p className="text-sm text-gray-600">Send notification when a work order is assigned</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyOnAssign}
                      onChange={(e) => handleInputChange('notifyOnAssign', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Notify on Completion</h3>
                    <p className="text-sm text-gray-600">Send notification when a work order is completed</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyOnComplete}
                      onChange={(e) => handleInputChange('notifyOnComplete', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Notify on Overdue</h3>
                    <p className="text-sm text-gray-600">Send notification when a work order becomes overdue</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyOnOverdue}
                      onChange={(e) => handleInputChange('notifyOnOverdue', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Security Settings</h2>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  <strong>Warning:</strong> Changing security settings may affect user access. Proceed with caution.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum Password Length</label>
                  <input
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Max Login Attempts</label>
                  <input
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Require Uppercase Letters</h3>
                    <p className="text-sm text-gray-600">Passwords must contain at least one uppercase letter</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.passwordRequireUppercase}
                      onChange={(e) => handleInputChange('passwordRequireUppercase', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Require Numbers</h3>
                    <p className="text-sm text-gray-600">Passwords must contain at least one number</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.passwordRequireNumbers}
                      onChange={(e) => handleInputChange('passwordRequireNumbers', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Require Special Characters</h3>
                    <p className="text-sm text-gray-600">Passwords must contain at least one special character</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.passwordRequireSpecial}
                      onChange={(e) => handleInputChange('passwordRequireSpecial', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Settings */}
          {activeTab === 'files' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">File Upload Settings</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Max Image Size (MB)</label>
                  <input
                    type="number"
                    value={settings.maxImageSize}
                    onChange={(e) => handleInputChange('maxImageSize', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Max Report Size (MB)</label>
                  <input
                    type="number"
                    value={settings.maxReportSize}
                    onChange={(e) => handleInputChange('maxReportSize', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Allowed Image Types</label>
                  <input
                    type="text"
                    value={settings.allowedImageTypes}
                    onChange={(e) => handleInputChange('allowedImageTypes', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="jpg, jpeg, png, gif"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Allowed Report Types</label>
                  <input
                    type="text"
                    value={settings.allowedReportTypes}
                    onChange={(e) => handleInputChange('allowedReportTypes', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="pdf, doc, docx, xls, xlsx"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Backup Settings */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Backup Settings</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> Regular backups help protect your data. Configure automatic backup schedules below.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Automatic Backup</h3>
                    <p className="text-sm text-gray-600">Enable automatic database backups</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoBackup}
                      onChange={(e) => handleInputChange('autoBackup', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Backup Frequency</label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => handleInputChange('backupFrequency', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!settings.autoBackup}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Backup Retention (days)</label>
                  <input
                    type="number"
                    value={settings.backupRetention}
                    onChange={(e) => handleInputChange('backupRetention', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!settings.autoBackup}
                  />
                </div>
              </div>

              {/* Manual Backup Section */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">Manual Backup</h3>
                    <p className="text-gray-600">Create a backup of the database immediately</p>
                  </div>
                  <button
                    onClick={handleCreateBackup}
                    disabled={creatingBackup}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {creatingBackup ? <FaSpinner className="animate-spin" /> : <FaDatabase />}
                    {creatingBackup ? 'Creating...' : 'Create Backup Now'}
                  </button>
                </div>
              </div>

              {/* Backup History */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800 text-lg">Backup History</h3>
                  <button
                    onClick={fetchBackups}
                    disabled={backupsLoading}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaSync className={backupsLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {backupsLoading ? (
                  <div className="text-center py-8">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-2" />
                    <p className="text-gray-600">Loading backups...</p>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="text-center py-8">
                    <FaDatabase className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No backups found</p>
                    <p className="text-gray-400 text-sm">Create your first backup using the button above</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Filename</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Size</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created By</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created At</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {backups.map((backup) => (
                          <tr key={backup.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700 font-mono">{backup.filename}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{backup.file_size_mb} MB</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${backup.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  backup.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                    backup.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                }`}>
                                {backup.status_display}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{backup.backup_type_display}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{backup.created_by_username || 'System'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{formatDate(backup.created_at)}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {backup.status === 'COMPLETED' && (
                                  <button
                                    onClick={() => {
                                      setSelectedBackup(backup)
                                      setShowRestoreConfirm(true)
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Restore"
                                  >
                                    <FaUndo />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedBackup(backup)
                                    setShowDeleteConfirm(true)
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <FaExclamationTriangle className="text-3xl" />
                <h2 className="text-2xl font-bold">Confirm Restore</h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to restore from this backup?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 text-sm font-semibold mb-2">
                  <FaExclamationTriangle className="inline mr-2" />
                  Warning: This action will:
                </p>
                <ul className="text-yellow-700 text-sm list-disc list-inside space-y-1">
                  <li>Replace current database with backup data</li>
                  <li>All changes since backup will be lost</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600">Backup: <span className="font-mono font-semibold text-gray-800">{selectedBackup.filename}</span></p>
                <p className="text-sm text-gray-600">Created: <span className="font-semibold text-gray-800">{formatDate(selectedBackup.created_at)}</span></p>
                <p className="text-sm text-gray-600">Size: <span className="font-semibold text-gray-800">{selectedBackup.file_size_mb} MB</span></p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRestoreConfirm(false)
                    setSelectedBackup(null)
                  }}
                  disabled={backupAction === 'restoring'}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-all font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreBackup}
                  disabled={backupAction === 'restoring'}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {backupAction === 'restoring' ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <FaUndo />
                      Restore
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset to Defaults Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <FaExclamationTriangle className="text-3xl" />
                <h2 className="text-2xl font-bold">Reset to Defaults</h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to reset all settings to their default values?
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-orange-800 text-sm font-semibold mb-2">
                  <FaExclamationTriangle className="inline mr-2" />
                  Warning: This action will:
                </p>
                <ul className="text-orange-700 text-sm list-disc list-inside space-y-1">
                  <li>Reset all configuration to factory defaults</li>
                  <li>Remove all custom settings</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-all font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetToDefaults}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <FaUndo />
                      Reset
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <FaTrash className="text-2xl" />
                <h2 className="text-2xl font-bold">Confirm Delete</h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this backup?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm">
                  <FaExclamationTriangle className="inline mr-2" />
                  This action cannot be undone. The backup file will be permanently deleted.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600">Backup: <span className="font-mono font-semibold text-gray-800">{selectedBackup.filename}</span></p>
                <p className="text-sm text-gray-600">Created: <span className="font-semibold text-gray-800">{formatDate(selectedBackup.created_at)}</span></p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setSelectedBackup(null)
                  }}
                  disabled={backupAction === 'deleting'}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-all font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBackup}
                  disabled={backupAction === 'deleting'}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {backupAction === 'deleting' ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SystemSettings
