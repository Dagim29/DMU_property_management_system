import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Check,
  Trash2,
  Filter,
  RefreshCw,
  Clock,
  Calendar
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NotificationCenter() {
  const { token } = useSelector((state) => state.auth)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all') // all, SUCCESS, WARNING, ERROR, INFO
  const navigate = useNavigate()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/core/notifications/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = response.data
      setNotifications(Array.isArray(data) ? data : (data.results || []))
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await axios.patch(
        `http://localhost:8000/api/core/notifications/${id}/`,
        { is_read: true },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      await Promise.all(
        unreadIds.map(id =>
          axios.patch(
            `http://localhost:8000/api/core/notifications/${id}/`,
            { is_read: true },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      )
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/core/notifications/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false
    if (filter === 'read' && !n.is_read) return false
    if (typeFilter !== 'all' && n.notification_type !== typeFilter) return false
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16 mb-4"></div>
        <p className="text-gray-600">Loading notifications...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Bell className="h-10 w-10" />
                Notification Center
              </h1>
              <p className="text-blue-100 text-lg">
                Stay updated with your assets and requests
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <p className="text-sm text-blue-100">Unread</p>
                <p className="text-3xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8 animate-slide-up">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Read/Unread Filter */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  filter === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  filter === 'unread' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  filter === 'read' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Read ({notifications.length - unreadCount})
              </button>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Types</option>
              <option value="SUCCESS">Success</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Check className="h-4 w-4" />
                Mark All Read
              </button>
            )}
            <button
              onClick={fetchNotifications}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-4 animate-slide-up">
          {filteredNotifications.map((notification, index) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
              onClick={() => handleNotificationClick(notification)}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100 animate-scale-in">
          <Bell className="h-20 w-20 mx-auto text-gray-300 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Notifications</h3>
          <p className="text-gray-600">
            {filter === 'unread'
              ? 'You have no unread notifications'
              : filter === 'read'
              ? 'You have no read notifications'
              : 'You have no notifications yet'}
          </p>
        </div>
      )}
    </div>
  )
}

function NotificationCard({ notification, onMarkAsRead, onDelete, onClick, index }) {
  const getIcon = (type) => {
    const icons = {
      SUCCESS: <CheckCircle className="h-6 w-6 text-green-500" />,
      WARNING: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
      ERROR: <AlertTriangle className="h-6 w-6 text-red-500" />,
      INFO: <Info className="h-6 w-6 text-blue-500" />
    }
    return icons[type] || icons.INFO
  }

  const getBgColor = (type) => {
    const colors = {
      SUCCESS: 'bg-green-50 border-green-200',
      WARNING: 'bg-yellow-50 border-yellow-200',
      ERROR: 'bg-red-50 border-red-200',
      INFO: 'bg-blue-50 border-blue-200'
    }
    return colors[type] || colors.INFO
  }

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(date).toLocaleDateString()
  }

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border-l-4 animate-slide-up cursor-pointer ${
        notification.is_read ? 'border-gray-300' : 'border-blue-500'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${getBgColor(notification.notification_type)}`}>
            {getIcon(notification.notification_type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-1 ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                  {notification.title}
                </h3>
                <p className={`text-sm ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                  {notification.message}
                </p>
              </div>
              
              {!notification.is_read && (
                <span className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{getTimeAgo(notification.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(notification.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {!notification.is_read && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                title="Mark as read"
              >
                <Check className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => onDelete(notification.id)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
