import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  FaComments,
  FaArrowLeft,
  FaPaperPlane,
  FaBullhorn,
  FaUsers,
  FaSearch,
  FaCheckDouble,
  FaCheck,
  FaTimes,
  FaPlus,
  FaExclamationCircle,
  FaInfoCircle,
  FaThumbtack
} from 'react-icons/fa'
import api from '../../services/api'

const TechnicianCommunication = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useSelector((state) => state.auth)
  const messagesEndRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [announcements, setAnnouncements] = useState([])
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [announcementUnreadCount, setAnnouncementUnreadCount] = useState(0)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('messages') // 'messages' or 'announcements'

  // Helper function to get initials (2 letters)
  const getInitials = (firstName, lastName, fullName) => {
    // If we have first and last name, use them
    if (firstName && lastName) {
      const first = firstName.charAt(0).toUpperCase()
      const last = lastName.charAt(0).toUpperCase()
      return first + last
    }
    
    // If we only have full_name, split it
    if (fullName) {
      const parts = fullName.trim().split(/\s+/)
      if (parts.length >= 2) {
        const first = parts[0].charAt(0).toUpperCase()
        const last = parts[parts.length - 1].charAt(0).toUpperCase()
        return first + last
      }
      if (parts.length === 1 && parts[0].length >= 2) {
        return parts[0].substring(0, 2).toUpperCase()
      }
      if (parts.length === 1 && parts[0].length === 1) {
        return parts[0].toUpperCase() + '?'
      }
    }
    
    return '??'
  }

  useEffect(() => {
    fetchConversations()
    fetchTeamMembers()
    fetchUnreadCount()
    fetchAnnouncements()
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(() => {
      if (selectedConversation) {
        fetchMessages(selectedConversation.other_participant.id, true)
      }
      fetchUnreadCount()
      fetchAnnouncements()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])

  // Auto-open conversation if user parameter is in URL
  useEffect(() => {
    const userId = searchParams.get('user')
    if (userId && conversations.length > 0 && !selectedConversation) {
      // Find the conversation with this user
      const conversation = conversations.find(
        c => c.other_participant.id === parseInt(userId)
      )
      
      if (conversation) {
        setSelectedConversation(conversation)
        setActiveTab('messages')
        // Clear the URL parameter
        setSearchParams({})
      } else {
        // If conversation doesn't exist yet, try to find the user in team members
        fetchTeamMembers().then(() => {
          const member = teamMembers.find(m => m.id === parseInt(userId))
          if (member) {
            handleStartNewConversation(member)
            setSearchParams({})
          }
        })
      }
    }
  }, [searchParams, conversations, teamMembers, selectedConversation])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.other_participant.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/maintenance/communication/messages/conversations/')
      setConversations(response.data || [])
    } catch (err) {
      console.error('Error fetching conversations:', err)
      showToast('Failed to load conversations', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/maintenance/communication/messages/team_members/')
      setTeamMembers(response.data || [])
      return response.data || []
    } catch (err) {
      console.error('Error fetching team members:', err)
      return []
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/maintenance/communication/messages/unread_count/')
      setUnreadCount(response.data.unread_count || 0)
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }

  const fetchMessages = async (userId, silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await api.get(`/maintenance/communication/messages/conversation_with/?user_id=${userId}`)
      setMessages(response.data || [])
      
      // Refresh conversations to update unread counts
      if (!silent) {
        fetchConversations()
        fetchUnreadCount()
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
      if (!silent) showToast('Failed to load messages', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/maintenance/communication/announcements/')
      setAnnouncements(Array.isArray(response.data) ? response.data : [])
      
      // Get unread count
      const unreadResponse = await api.get('/maintenance/communication/announcements/unread_count/')
      setAnnouncementUnreadCount(unreadResponse.data.unread_count || 0)
    } catch (err) {
      console.error('Error fetching announcements:', err)
      setAnnouncements([]) // Set to empty array on error
      setAnnouncementUnreadCount(0)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !selectedConversation) return
    
    try {
      await api.post('/maintenance/communication/messages/', {
        recipient: selectedConversation.other_participant.id,
        message_type: 'DIRECT',
        priority: 'NORMAL',
        message: newMessage
      })
      
      setNewMessage('')
      fetchMessages(selectedConversation.other_participant.id, true)
      fetchConversations()
      showToast('Message sent successfully!')
    } catch (err) {
      console.error('Error sending message:', err)
      showToast('Failed to send message', 'error')
    }
  }

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation)
    setActiveTab('messages')
  }

  const handleStartNewConversation = (member) => {
    // Check if conversation already exists
    const existing = conversations.find(c => 
      c.other_participant.id === member.id
    )
    
    if (existing) {
      setSelectedConversation(existing)
    } else {
      // Create a temporary conversation object
      setSelectedConversation({
        other_participant: member,
        unread_count: 0,
        last_message_preview: null
      })
      setMessages([])
    }
    setActiveTab('messages')
  }

  const markAnnouncementRead = async (announcementId) => {
    try {
      await api.post(`/maintenance/communication/announcements/${announcementId}/mark_read/`)
      fetchAnnouncements()
      showToast('Announcement marked as read')
    } catch (err) {
      console.error('Error marking announcement as read:', err)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'LOW':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'URGENT':
        return <FaExclamationCircle className="text-red-600" />
      case 'GENERAL':
        return <FaInfoCircle className="text-blue-600" />
      case 'SAFETY':
        return <FaExclamationCircle className="text-orange-600" />
      default:
        return <FaBullhorn className="text-purple-600" />
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.other_participant.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredMembers = teamMembers.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !conversations.some(c => c.other_participant.id === member.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Toast Notifications */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg animate-slide-down ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <button
          onClick={() => navigate('/dashboard/technician')}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <FaArrowLeft />
          Back to Dashboard
        </button>
        
        <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FaComments className="text-6xl opacity-80" />
              <div>
                <h1 className="text-4xl font-bold mb-2">Team Communication</h1>
                <p className="text-blue-100 text-lg">Messages and announcements</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'messages'
                    ? 'bg-white text-blue-600 shadow-xl'
                    : 'bg-blue-500 text-white hover:bg-blue-400'
                }`}
              >
                <FaComments />
                Messages
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('announcements')}
                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'announcements'
                    ? 'bg-white text-blue-600 shadow-xl'
                    : 'bg-blue-500 text-white hover:bg-blue-400'
                }`}
              >
                <FaBullhorn />
                Announcements
                {announcementUnreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {announcementUnreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'messages' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Conversations</h2>
                {unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[600px]">
              {filteredConversations.length === 0 && filteredMembers.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No conversations found
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Active Conversations */}
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 relative">
                          {conv.other_participant.profile_photo && conv.other_participant.profile_photo.trim() !== '' ? (
                            <img
                              src={conv.other_participant.profile_photo}
                              alt=""
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ring-blue-100"
                            style={{ display: (conv.other_participant.profile_photo && conv.other_participant.profile_photo.trim() !== '') ? 'none' : 'flex' }}
                          >
                            {getInitials(conv.other_participant.first_name, conv.other_participant.last_name, conv.other_participant.full_name)}
                          </div>
                          {conv.unread_count > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {conv.unread_count}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-bold text-gray-800 truncate">
                              {conv.other_participant.full_name}
                            </p>
                          </div>
                          {conv.last_message_preview && (
                            <p className="text-sm text-gray-600 truncate">
                              {conv.other_participant.message}
                            </p>
                          )}
                          {conv.last_message_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(conv.last_message_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Available Team Members (no conversation yet) */}
                  {filteredMembers.length > 0 && (
                    <>
                      <div className="p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Start New Conversation</p>
                      </div>
                      {filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => handleStartNewConversation(member)}
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 relative">
                              {member.profile_photo && member.profile_photo.trim() !== '' ? (
                                <img
                                  src={member.profile_photo}
                                  alt=""
                                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                    e.target.nextSibling.style.display = 'flex'
                                  }}
                                />
                              ) : null}
                              <div 
                                className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ring-gray-100"
                                style={{ display: (member.profile_photo && member.profile_photo.trim() !== '') ? 'none' : 'flex' }}
                              >
                                {getInitials(member.first_name, member.last_name, member.full_name)}
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-800">{member.full_name}</p>
                              <p className="text-sm text-gray-600">{member.role_display || 'Supervisor'}</p>
                            </div>
                            <FaPlus className="text-blue-600" />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col" style={{ height: '700px' }}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 relative">
                      {selectedConversation.other_participant.profile_photo && selectedConversation.other_participant.profile_photo.trim() !== '' ? (
                        <img
                          src={selectedConversation.other_participant.profile_photo}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ring-blue-100"
                        style={{ display: (selectedConversation.other_participant.profile_photo && selectedConversation.other_participant.profile_photo.trim() !== '') ? 'none' : 'flex' }}
                      >
                        {getInitials(selectedConversation.other_participant.first_name, selectedConversation.other_participant.last_name, selectedConversation.other_participant.full_name)}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-lg">
                        {selectedConversation.other_participant.full_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedConversation.other_participant.role_display || 'Supervisor'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <FaComments className="text-6xl text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No messages yet. Start a conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_info?.id === user.id
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl p-4 ${
                              isOwn
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {msg.subject && (
                              <p className="font-semibold text-sm mb-1">{msg.subject}</p>
                            )}
                            <p>{msg.message}</p>
                            <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                              <span>{new Date(msg.created_at).toLocaleString()}</span>
                              {isOwn && (
                                <span className="ml-2">
                                  {msg.is_read ? (
                                    <FaCheckDouble title="Read" />
                                  ) : (
                                    <FaCheck title="Sent" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-100">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaPaperPlane />
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FaUsers className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Announcements View */
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FaBullhorn className="text-blue-600" />
              Team Announcements
            </h2>

            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <FaBullhorn className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No announcements yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(announcements) && announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`border-2 rounded-xl p-6 transition-all ${
                      announcement.is_pinned
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {announcement.is_pinned && (
                          <FaThumbtack className="text-blue-600" />
                        )}
                        {getCategoryIcon(announcement.category)}
                        <h3 className="text-xl font-bold text-gray-800">
                          {announcement.title}
                        </h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                      {announcement.content}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>By {announcement.author_info?.full_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(announcement.created_at).toLocaleString()}</span>
                        {announcement.expires_at && (
                          <>
                            <span>•</span>
                            <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                      {!announcement.is_read && (
                        <button
                          onClick={() => markAnnouncementRead(announcement.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>

                    {announcement.is_read && (
                      <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
                        <FaCheckDouble />
                        <span>Read</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicianCommunication
