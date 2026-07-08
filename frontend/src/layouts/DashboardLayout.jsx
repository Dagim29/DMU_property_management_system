import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useState, useEffect } from 'react'
import { 
  FaTachometerAlt, 
  FaBox, 
  FaChartBar, 
  FaUsers, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaClipboardList,
  FaWrench,
  FaHistory,
  FaCog,
  FaUserCircle,
  FaBell,
  FaHeartbeat,
  FaTasks,
  FaFileAlt,
  FaCalendar,
  FaChartLine,
  FaClock,
  FaShieldAlt,
  FaComments,
  FaUndo,
  FaExchangeAlt
} from 'react-icons/fa'
import { logout } from '../features/auth/authSlice'
import dmuLogo from '../assets/images/branding/dmu-logo.png'
import NotificationDropdown from '../features/notifications/NotificationDropdown'
import api from '../services/api'

function DashboardLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useSelector((state) => state.auth)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [systemName, setSystemName] = useState('DMU Property Management System')

  useEffect(() => {
    const fetchSystemName = async () => {
      try {
        const response = await api.get('/core/settings/')
        setSystemName(response.data.system_name || 'DMU Property Management System')
      } catch (err) {
        console.error('Error fetching system name:', err)
      }
    }
    
    fetchSystemName()
    
    window.addEventListener('systemSettingsUpdated', fetchSystemName)
    
    return () => {
      window.removeEventListener('systemSettingsUpdated', fetchSystemName)
    }
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/', { replace: true })
  }

  const menuItems = []

  // Owner menu items (Staff and Students) - ONLY for OWNER role
  if (user?.role === 'OWNER') {
    menuItems.push(
      { 
        text: 'Owner Dashboard', 
        icon: FaTachometerAlt, 
        path: '/dashboard/owner',
        color: 'from-blue-500 to-blue-600'
      },
      { 
        text: 'My Assets', 
        icon: FaBox, 
        path: '/dashboard/owner/my-assets',
        color: 'from-purple-500 to-purple-600'
      },
      { 
        text: 'My Asset Requests', 
        icon: FaClipboardList, 
        path: '/dashboard/owner/my-asset-requests',
        color: 'from-indigo-500 to-indigo-600'
      },
      { 
        text: 'My Checkouts', 
        icon: FaHistory, 
        path: '/dashboard/owner/my-checkouts',
        color: 'from-green-500 to-green-600'
      },
      { 
        text: 'Maintenance Requests', 
        icon: FaWrench, 
        path: '/dashboard/owner/my-requests',
        color: 'from-orange-500 to-orange-600'
      },
      { 
        text: 'New Maintenance', 
        icon: FaCog, 
        path: '/dashboard/owner/my-requests/new',
        color: 'from-red-500 to-red-600'
      },
      { 
        text: 'My Profile', 
        icon: FaUserCircle, 
        path: '/dashboard/profile',
        color: 'from-gray-500 to-gray-600'
      }
    )
  }

  // Maintenance Supervisor menu items
  else if (user?.role === 'MAINTENANCE_SUPERVISOR') {
    menuItems.push(
      { 
        text: 'Supervisor Dashboard', 
        icon: FaTachometerAlt, 
        path: '/dashboard/supervisor',
        color: 'from-blue-500 to-blue-600'
      },
      { 
        text: 'Assign Requests', 
        icon: FaUserCircle, 
        path: '/dashboard/supervisor/assign',
        color: 'from-orange-500 to-red-600'
      },
      { 
        text: 'Manage Team', 
        icon: FaUsers, 
        path: '/dashboard/supervisor/technicians',
        color: 'from-indigo-500 to-indigo-600'
      },
      { 
        text: 'Work Orders', 
        icon: FaWrench, 
        path: '/dashboard/maintenance/work-orders',
        color: 'from-teal-500 to-teal-600'
      },
      { 
        text: 'Cost Tracking', 
        icon: FaHistory, 
        path: '/dashboard/maintenance/costs',
        color: 'from-emerald-500 to-emerald-600'
      },
      { 
        text: 'Preventive Tasks', 
        icon: FaTasks, 
        path: '/dashboard/maintenance/preventive',
        color: 'from-cyan-500 to-cyan-600'
      },
      { 
        text: 'Reports', 
        icon: FaFileAlt, 
        path: '/dashboard/supervisor/reports',
        color: 'from-purple-500 to-purple-600'
      }
    )
  }

  // Maintenance Technician menu items
  else if (user?.role === 'MAINTENANCE_TECHNICIAN') {
    menuItems.push(
      { 
        text: 'My Dashboard', 
        icon: FaTachometerAlt, 
        path: '/dashboard/technician',
        color: 'from-blue-500 to-blue-600'
      },
      { 
        text: 'My Work Orders', 
        icon: FaWrench, 
        path: '/dashboard/technician/work-orders',
        color: 'from-orange-500 to-orange-600'
      },
      { 
        text: 'Schedule', 
        icon: FaCalendar, 
        path: '/dashboard/technician/schedule',
        color: 'from-purple-500 to-purple-600'
      },
      { 
        text: 'Team Communication', 
        icon: FaComments, 
        path: '/dashboard/technician/communication',
        color: 'from-cyan-500 to-blue-500'
      },
      { 
        text: 'Performance', 
        icon: FaChartLine, 
        path: '/dashboard/technician/performance',
        color: 'from-green-500 to-green-600'
      },
      { 
        text: 'Time Tracking', 
        icon: FaClock, 
        path: '/dashboard/technician/time-tracking',
        color: 'from-indigo-500 to-indigo-600'
      },
      { 
        text: 'Leaderboard & Badges', 
        icon: FaChartBar, 
        path: '/dashboard/technician/leaderboard',
        color: 'from-yellow-500 to-amber-500'
      }
    )
  }

  // Property Manager menu items (for PROPERTY_MANAGER role)
  else if (user?.role === 'PROPERTY_MANAGER') {
    menuItems.push(
      { 
        text: 'Dashboard', 
        icon: FaTachometerAlt, 
        path: '/dashboard',
        color: 'from-blue-500 to-blue-600'
      },
      { 
        text: 'Asset Management', 
        icon: FaBox, 
        path: '/dashboard/assets/management',
        color: 'from-purple-500 to-purple-600'
      },
      { 
        text: 'Maintenance', 
        icon: FaWrench, 
        path: '/dashboard/maintenance/requests',
        color: 'from-cyan-500 to-cyan-600'
      },
      { 
        text: 'Reports', 
        icon: FaFileAlt, 
        path: '/dashboard/reports',
        color: 'from-indigo-500 to-indigo-600'
      }
    )
  }

  // Admin-only menu items (for Super Admin)
  else if (user?.role === 'SUPER_ADMIN') {
    menuItems.push(
      { 
        text: 'Admin Dashboard', 
        icon: FaTachometerAlt, 
        path: '/dashboard',
        color: 'from-blue-500 to-blue-600'
      },
      { 
        text: 'User Management', 
        icon: FaUsers, 
        path: '/dashboard/admin/users',
        color: 'from-red-500 to-red-600'
      },
      { 
        text: 'Security Center', 
        icon: FaShieldAlt, 
        path: '/dashboard/admin/security',
        color: 'from-orange-500 to-red-600'
      },
      { 
        text: 'Audit Log', 
        icon: FaHistory, 
        path: '/dashboard/admin/audit-log',
        color: 'from-indigo-500 to-indigo-600'
      },
      { 
        text: 'System Health', 
        icon: FaHeartbeat, 
        path: '/dashboard/admin/system-health',
        color: 'from-pink-500 to-pink-600'
      },

      { 
        text: 'System Settings', 
        icon: FaCog, 
        path: '/dashboard/admin/settings',
        color: 'from-gray-500 to-gray-600'
      }
    )
  }

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 fixed top-0 left-0 right-0 z-30 shadow-lg">
        <div className="flex items-center justify-between px-6 h-16">
          {/* Left: Logo and Menu Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-white hover:bg-white/20 p-2 rounded-lg transition-all"
            >
              {sidebarOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src={dmuLogo} alt="DMU Logo" className="h-10 w-10 bg-white rounded-lg p-1" />
              <div className="hidden md:block">
                <h1 className="text-lg font-bold text-white">{systemName}</h1>
                <p className="text-xs text-blue-100">Asset & Maintenance System</p>
              </div>
            </Link>
          </div>

          {/* Right: User Info and Actions */}
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            
            <button
              onClick={() => navigate('/dashboard/profile')}
              className="hidden sm:flex items-center gap-3 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/20 transition-all"
            >
              {user?.profile_photo ? (
                <img 
                  key={user.profile_photo}
                  src={user.profile_photo} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover border-2 border-white"
                />
              ) : (
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-semibold text-white">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-blue-100">{user?.role?.replace('_', ' ')}</p>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-white hover:bg-red-500/20 rounded-lg transition-all"
              title="Logout"
            >
              <FaSignOutAlt className="text-xl" />
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 bottom-0 bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-700 transform transition-all duration-300 z-20 shadow-xl overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-56'
        } w-56`}
      >
        {/* Collapse Toggle Button - Desktop Only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-white rounded-full items-center justify-center shadow-lg hover:shadow-xl transition-all z-30 border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {sidebarCollapsed ? (
            <FaBars className="text-xs" />
          ) : (
            <FaTimes className="text-xs" />
          )}
        </button>

        <div className={`p-3 ${sidebarCollapsed ? 'p-2' : ''}`}>
          <nav>
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.text}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all group relative ${
                      isActive(item.path)
                        ? 'bg-white text-blue-700 shadow-lg font-semibold'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    title={sidebarCollapsed ? item.text : ''}
                  >
                    <item.icon className={`${isActive(item.path) ? 'text-blue-700' : 'text-blue-200 group-hover:text-white'} ${sidebarCollapsed ? 'text-xl' : 'text-lg'}`} />
                    {!sidebarCollapsed && (
                      <span className="font-medium text-sm">{item.text}</span>
                    )}
                    
                    {/* Tooltip for collapsed state */}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl">
                        {item.text}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className={`absolute bottom-0 left-0 right-0 bg-white/10 backdrop-blur-sm border-t border-white/20 ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              {user?.profile_photo ? (
                <img 
                  key={user.profile_photo}
                  src={user.profile_photo} 
                  alt="Profile" 
                  className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => navigate('/dashboard/profile')}
                  title={`${user?.first_name} ${user?.last_name}`}
                />
              ) : (
                <FaUserCircle 
                  className="text-3xl text-white cursor-pointer hover:scale-110 transition-transform" 
                  onClick={() => navigate('/dashboard/profile')}
                  title={`${user?.first_name} ${user?.last_name}`}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              {user?.profile_photo ? (
                <img 
                  key={user.profile_photo}
                  src={user.profile_photo} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
                />
              ) : (
                <FaUserCircle className="text-2xl text-white flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-blue-100 truncate">{user?.email}</p>
                <p className="text-xs text-blue-200 mt-0.5">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className={`pt-16 min-h-screen transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-56'
      }`}>
        <Outlet />
      </main>
    </div>
  )
}

export default DashboardLayout
