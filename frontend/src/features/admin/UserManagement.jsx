import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { 
  FaUserPlus, 
  FaEdit, 
  FaTrash, 
  FaSearch,
  FaUserShield,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaDownload,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaKey,
  FaUpload,
  FaUserCheck,
  FaUserTimes,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaSync,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight
} from 'react-icons/fa'
import useToast from '../../hooks/useToast'
import api from '../../services/api'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  addDMUHeader, 
  addDMUFooter, 
  getDMUTableStyles, 
  addDMUCSVHeader, 
  addDMUCSVFooter, 
  getDMUExcelCover 
} from '../../utils/pdfExportUtils'

const UserManagement = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const currentUser = useSelector((state) => state.auth.user)
  const [users, setUsers] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [userToReset, setUserToReset] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [copySuccess, setCopySuccess] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [usersPerPage, setUsersPerPage] = useState(10)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'PROPERTY_MANAGER',
    department: '',
    phone: ''
  })

  const departments = [
    { value: 'IT', label: 'Information Technology' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Operations', label: 'Operations' },
    { value: 'Finance', label: 'Finance' },
    { value: 'HR', label: 'Human Resources' },
    { value: 'Administration', label: 'Administration' },
    { value: 'Security', label: 'Security' },
    { value: 'Facilities', label: 'Facilities Management' },
    { value: 'Engineering', label: 'Engineering' },
    { value: 'Property Management', label: 'Property Management' }
  ]

  const roles = [
    { value: 'PROPERTY_MANAGER', label: 'Property Manager', color: 'blue' },
    { value: 'MAINTENANCE_SUPERVISOR', label: 'Maintenance Supervisor', color: 'green' },
    { value: 'MAINTENANCE_TECHNICIAN', label: 'Maintenance Technician', color: 'yellow' },
    { value: 'OWNER', label: 'Owner', color: 'gray' }
  ]

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/users/')
      const data = response.data
      if (data.results !== undefined) {
        // Paginated response
        setUsers(data.results)
        setTotalCount(data.count ?? data.results.length)
      } else {
        // Non-paginated response (full list)
        const list = Array.isArray(data) ? data : []
        setUsers(list)
        setTotalCount(list.length)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setModalMode('create')
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'PROPERTY_MANAGER',
      department: '',
      phone: ''
    })
    setShowPassword(false)
    setPasswordStrength(0)
    setCopySuccess(false)
    setFormErrors({})
    setShowModal(true)
  }

  const handleEditUser = (user) => {
    setModalMode('edit')
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      department: user.department || '',
      phone: user.phone || ''
    })
    setShowPassword(false)
    setPasswordStrength(0)
    setCopySuccess(false)
    setFormErrors({})
    setShowModal(true)
  }

  const handleDeleteClick = (user) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/users/users/${userToDelete.id}/`)
      fetchUsers()
      setShowDeleteConfirm(false)
      setUserToDelete(null)
    } catch (error) {
      console.error('Error deleting user:', error)
      showError('Failed to delete user')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      if (modalMode === 'create') {
        await api.post('/users/users/', formData)
      } else {
        const updateData = { ...formData }
        if (!updateData.password) {
          delete updateData.password
        }
        await api.patch(`/users/users/${selectedUser.id}/`, updateData)
      }
      fetchUsers()
      setShowModal(false)
      setFormErrors({})
    } catch (error) {
      console.error('Error saving user:', error)
      if (error.response?.data) {
        // Handle backend validation errors
        const backendErrors = {}
        Object.keys(error.response.data).forEach(key => {
          backendErrors[key] = Array.isArray(error.response.data[key]) 
            ? error.response.data[key][0] 
            : error.response.data[key]
        })
        setFormErrors(backendErrors)
      } else {
        showError('Failed to save user')
      }
    }
  }

  const validateForm = () => {
    const errors = {}

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores'
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    // Password validation (only for create mode or if password is provided in edit mode)
    if (modalMode === 'create' || formData.password) {
      if (!formData.password) {
        errors.password = 'Password is required'
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters'
      } else if (!/(?=.*[a-z])/.test(formData.password)) {
        errors.password = 'Password must contain at least one lowercase letter'
      } else if (!/(?=.*[A-Z])/.test(formData.password)) {
        errors.password = 'Password must contain at least one uppercase letter'
      } else if (!/(?=.*[0-9])/.test(formData.password)) {
        errors.password = 'Password must contain at least one number'
      } else if (!/(?=.*[^a-zA-Z0-9])/.test(formData.password)) {
        errors.password = 'Password must contain at least one special character'
      }
    }

    // First name validation
    const nameRegex = /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F' -]*[a-zA-Z\u00C0-\u024F]$|^[a-zA-Z\u00C0-\u024F]$/
    const fn = formData.first_name.trim()
    if (!fn) {
      errors.first_name = 'First name is required'
    } else if (fn.length < 2) {
      errors.first_name = 'First name must be at least 2 characters'
    } else if (fn.length > 50) {
      errors.first_name = 'First name must not exceed 50 characters'
    } else if (/[0-9]/.test(fn)) {
      errors.first_name = 'First name must not contain numbers'
    } else if (/[^a-zA-Z\u00C0-\u024F' \-]/.test(fn)) {
      errors.first_name = 'First name can only contain letters, hyphens, apostrophes, or spaces'
    } else if (/[-']{2,}/.test(fn)) {
      errors.first_name = 'First name cannot have consecutive hyphens or apostrophes'
    } else if (/^[-' ]|[-' ]$/.test(fn)) {
      errors.first_name = 'First name cannot start or end with a hyphen, apostrophe, or space'
    } else if (!nameRegex.test(fn)) {
      errors.first_name = 'Please enter a valid first name'
    }

    // Last name validation
    const ln = formData.last_name.trim()
    if (!ln) {
      errors.last_name = 'Last name is required'
    } else if (ln.length < 2) {
      errors.last_name = 'Last name must be at least 2 characters'
    } else if (ln.length > 50) {
      errors.last_name = 'Last name must not exceed 50 characters'
    } else if (/[0-9]/.test(ln)) {
      errors.last_name = 'Last name must not contain numbers'
    } else if (/[^a-zA-Z\u00C0-\u024F' \-]/.test(ln)) {
      errors.last_name = 'Last name can only contain letters, hyphens, apostrophes, or spaces'
    } else if (/[-']{2,}/.test(ln)) {
      errors.last_name = 'Last name cannot have consecutive hyphens or apostrophes'
    } else if (/^[-' ]|[-' ]$/.test(ln)) {
      errors.last_name = 'Last name cannot start or end with a hyphen, apostrophe, or space'
    } else if (!nameRegex.test(ln)) {
      errors.last_name = 'Please enter a valid last name'
    }

    // Role validation
    if (!formData.role) {
      errors.role = 'Role is required'
    }

    // Phone validation (Ethiopian format: +251 followed by 9 digits)
    if (formData.phone) {
      const phoneRegex = /^\+251[79]\d{8}$/
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        errors.phone = 'Please enter a valid Ethiopian phone number (e.g., +251911234567)'
      }
    }

    return errors
  }

  const clearFieldError = (fieldName) => {
    if (formErrors[fieldName]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  // Real-time validation for username
  const validateUsernameRealTime = async (username) => {
    if (!username) return
    
    // Basic validation
    if (username.length < 3) {
      setFormErrors(prev => ({ ...prev, username: 'Username must be at least 3 characters' }))
      return
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setFormErrors(prev => ({ ...prev, username: 'Username can only contain letters, numbers, and underscores' }))
      return
    }

    // Check for duplicate username (only in create mode)
    if (modalMode === 'create') {
      try {
        setCheckingDuplicate(true)
        const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase())
        if (existingUser) {
          setFormErrors(prev => ({ ...prev, username: '❌ This username is already taken' }))
        } else {
          setFormErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.username
            return newErrors
          })
        }
      } catch (error) {
        console.error('Error checking username:', error)
      } finally {
        setCheckingDuplicate(false)
      }
    }
  }

  // Real-time validation for email
  const validateEmailRealTime = async (email) => {
    if (!email) return
    
    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
      return
    }

    // Check for duplicate email
    try {
      setCheckingDuplicate(true)
      const existingUser = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        (modalMode === 'create' || u.id !== selectedUser?.id)
      )
      if (existingUser) {
        setFormErrors(prev => ({ ...prev, email: '❌ This email is already registered' }))
      } else {
        setFormErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.email
          return newErrors
        })
      }
    } catch (error) {
      console.error('Error checking email:', error)
    } finally {
      setCheckingDuplicate(false)
    }
  }

  // Real-time password validation
  const validatePasswordRealTime = (password) => {
    if (!password && modalMode === 'edit') {
      clearFieldError('password')
      return
    }

    if (!password) {
      setFormErrors(prev => ({ ...prev, password: 'Password is required' }))
      return
    }

    if (password.length < 8) {
      setFormErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }))
      return
    }

    if (!/(?=.*[a-z])/.test(password)) {
      setFormErrors(prev => ({ ...prev, password: 'Password must contain at least one lowercase letter' }))
      return
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      setFormErrors(prev => ({ ...prev, password: 'Password must contain at least one uppercase letter' }))
      return
    }

    if (!/(?=.*[0-9])/.test(password)) {
      setFormErrors(prev => ({ ...prev, password: 'Password must contain at least one number' }))
      return
    }

    if (!/(?=.*[^a-zA-Z0-9])/.test(password)) {
      setFormErrors(prev => ({ ...prev, password: 'Password must contain at least one special character' }))
      return
    }

    clearFieldError('password')
  }

  // Real-time validation for name fields (first/last name)
  const validateNameRealTime = (value, field) => {
    const name = value.trim()
    const label = field === 'first_name' ? 'First name' : 'Last name'
    const nameRegex = /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F' -]*[a-zA-Z\u00C0-\u024F]$|^[a-zA-Z\u00C0-\u024F]$/

    if (!name) {
      setFormErrors(prev => ({ ...prev, [field]: `${label} is required` }))
      return
    }
    if (name.length < 2) {
      setFormErrors(prev => ({ ...prev, [field]: `${label} must be at least 2 characters` }))
      return
    }
    if (name.length > 50) {
      setFormErrors(prev => ({ ...prev, [field]: `${label} must not exceed 50 characters` }))
      return
    }
    if (/[0-9]/.test(name)) {
      setFormErrors(prev => ({ ...prev, [field]: `${label} must not contain numbers` }))
      return
    }
    if (/[^a-zA-Z\u00C0-\u024F' \-]/.test(name)) {
      setFormErrors(prev => ({ ...prev, [field]: `${label} can only contain letters, hyphens, apostrophes, or spaces` }))
      return
    }
    if (/[-']{2,}/.test(name)) {
      setFormErrors(prev => ({ ...prev, [field]: `${label} cannot have consecutive hyphens or apostrophes` }))
      return
    }
    if (/^[-' ]|[-' ]$/.test(name)) {
      setFormErrors(prev => ({ ...prev, [field]: `${label} cannot start or end with a hyphen, apostrophe, or space` }))
      return
    }
    if (!nameRegex.test(name)) {
      setFormErrors(prev => ({ ...prev, [field]: `Please enter a valid ${label.toLowerCase()}` }))
      return
    }
    clearFieldError(field)
  }

  const getRoleColor = (role) => {
    const roleObj = roles.find(r => r.value === role)
    return roleObj?.color || 'gray'
  }

  const getRoleBadgeClasses = (role) => {
    const colors = {
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[getRoleColor(role)] || colors.gray
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = !filterRole || user.role === filterRole
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterRole, filterStatus])

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const stats = {
    total: totalCount,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length
  }

  const exportData = (format) => {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `users-${timestamp}`

    if (format === 'csv') {
      exportAsCSV(filename)
    } else if (format === 'excel') {
      exportAsExcel(filename)
    } else if (format === 'pdf') {
      exportAsPDF(filename)
    }

    setShowExportMenu(false)
  }

  const exportAsCSV = (filename) => {
    const now = new Date()
    const exportedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name} (${currentUser.username})` : 'Unknown'
    
    // Use DMU CSV Header
    let csvContent = addDMUCSVHeader(
      'USER MANAGEMENT REPORT',
      exportedBy,
      [
        { label: 'Search Term', value: searchTerm || 'None' },
        { label: 'Role Filter', value: filterRole ? roles.find(r => r.value === filterRole)?.label : 'All Roles' },
        { label: 'Status Filter', value: filterStatus ? (filterStatus === 'active' ? 'Active Only' : 'Inactive Only') : 'All Status' }
      ]
    )
    
    // Statistics
    csvContent += 'SUMMARY STATISTICS\n'
    csvContent += '─────────────────────────────────────────────────────────────\n'
    csvContent += `Total Users in System:,${users.length}\n`
    csvContent += `Filtered Results:,${filteredUsers.length}\n`
    csvContent += `Active Users:,${filteredUsers.filter(u => u.is_active).length}\n`
    csvContent += `Inactive Users:,${filteredUsers.filter(u => !u.is_active).length}\n`
    csvContent += `Super Admins:,${filteredUsers.filter(u => u.role === 'SUPER_ADMIN').length}\n`
    csvContent += `Property Managers:,${filteredUsers.filter(u => u.role === 'PROPERTY_MANAGER').length}\n`
    csvContent += `Maintenance Supervisors:,${filteredUsers.filter(u => u.role === 'MAINTENANCE_SUPERVISOR').length}\n`
    csvContent += `Maintenance Technicians:,${filteredUsers.filter(u => u.role === 'MAINTENANCE_TECHNICIAN').length}\n`
    csvContent += `Owners:,${filteredUsers.filter(u => u.role === 'OWNER').length}\n\n`
    
    // Department Breakdown
    const deptCounts = {}
    filteredUsers.forEach(u => {
      const dept = u.department || 'Unassigned'
      deptCounts[dept] = (deptCounts[dept] || 0) + 1
    })
    csvContent += 'USERS BY DEPARTMENT\n'
    csvContent += '─────────────────────────────────────────────────────────────\n'
    Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).forEach(([dept, count]) => {
      csvContent += `${dept}:,${count}\n`
    })
    csvContent += '\n'
    
    // User Data
    csvContent += '═══════════════════════════════════════════════════════════════\n'
    csvContent += '                        USER DATA\n'
    csvContent += '═══════════════════════════════════════════════════════════════\n\n'
    csvContent += 'Username,Email,First Name,Last Name,Role,Department,Phone,Status,Date Joined,Last Login\n'
    
    filteredUsers.forEach(user => {
      csvContent += `"${user.username}",`
      csvContent += `"${user.email}",`
      csvContent += `"${user.first_name}",`
      csvContent += `"${user.last_name}",`
      csvContent += `"${roles.find(r => r.value === user.role)?.label || user.role}",`
      csvContent += `"${user.department || '-'}",`
      csvContent += `"${user.phone || '-'}",`
      csvContent += `"${user.is_active ? 'Active' : 'Inactive'}",`
      csvContent += `"${user.date_joined ? new Date(user.date_joined).toLocaleDateString() : '-'}",`
      csvContent += `"${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}"\n`
    })
    
    // Use DMU CSV Footer
    csvContent += addDMUCSVFooter(filteredUsers.length, 'users')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportAsExcel = (filename) => {
    const now = new Date()
    const exportedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name} (${currentUser.username})` : 'Unknown'
    const wb = XLSX.utils.book_new()

    // ===== COVER SHEET WITH DMU BRANDING =====
    const coverSheet = getDMUExcelCover(
      'USER MANAGEMENT REPORT',
      exportedBy,
      [
        { label: 'Search Term', value: searchTerm || 'None' },
        { label: 'Role Filter', value: filterRole ? roles.find(r => r.value === filterRole)?.label : 'All Roles' },
        { label: 'Status Filter', value: filterStatus ? (filterStatus === 'active' ? 'Active Only' : 'Inactive Only') : 'All Status' }
      ],
      [
        { label: 'Total Users in System', value: users.length },
        { label: 'Filtered Results', value: filteredUsers.length },
        { label: 'Active Users', value: filteredUsers.filter(u => u.is_active).length },
        { label: 'Inactive Users', value: filteredUsers.filter(u => !u.is_active).length },
        { label: 'Super Admins', value: filteredUsers.filter(u => u.role === 'SUPER_ADMIN').length },
        { label: 'Property Managers', value: filteredUsers.filter(u => u.role === 'PROPERTY_MANAGER').length },
        { label: 'Maintenance Supervisors', value: filteredUsers.filter(u => u.role === 'MAINTENANCE_SUPERVISOR').length },
        { label: 'Maintenance Technicians', value: filteredUsers.filter(u => u.role === 'MAINTENANCE_TECHNICIAN').length },
        { label: 'Owners', value: filteredUsers.filter(u => u.role === 'OWNER').length }
      ]
    )
    
    XLSX.utils.book_append_sheet(wb, coverSheet, 'Report Info')

    // ===== USER DATA SHEET =====
    const userData = [
      ['Username', 'Email', 'First Name', 'Last Name', 'Role', 'Department', 'Phone', 'Status', 'Date Joined', 'Last Login']
    ]

    filteredUsers.forEach(user => {
      userData.push([
        user.username,
        user.email,
        user.first_name,
        user.last_name,
        roles.find(r => r.value === user.role)?.label || user.role,
        user.department || '-',
        user.phone || '-',
        user.is_active ? 'Active' : 'Inactive',
        user.date_joined ? new Date(user.date_joined).toLocaleDateString() : '-',
        user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'
      ])
    })

    const userSheet = XLSX.utils.aoa_to_sheet(userData)
    
    // Set column widths
    userSheet['!cols'] = [
      { wch: 15 }, // Username
      { wch: 25 }, // Email
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }, // Role
      { wch: 20 }, // Department
      { wch: 15 }, // Phone
      { wch: 10 }, // Status
      { wch: 12 }, // Date Joined
      { wch: 12 }  // Last Login
    ]
    
    XLSX.utils.book_append_sheet(wb, userSheet, 'User Data')

    // ===== STATISTICS BY ROLE SHEET =====
    const roleStats = {}
    filteredUsers.forEach(user => {
      const roleName = roles.find(r => r.value === user.role)?.label || user.role
      roleStats[roleName] = (roleStats[roleName] || 0) + 1
    })

    const roleStatsData = [
      ['Role Statistics'],
      [''],
      ['Role', 'Count', 'Percentage']
    ]
    
    Object.entries(roleStats).forEach(([role, count]) => {
      const percentage = ((count / filteredUsers.length) * 100).toFixed(1)
      roleStatsData.push([role, count, `${percentage}%`])
    })
    
    roleStatsData.push(['', '', ''])
    roleStatsData.push(['Total', filteredUsers.length, '100%'])

    const roleStatsSheet = XLSX.utils.aoa_to_sheet(roleStatsData)
    roleStatsSheet['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, roleStatsSheet, 'Role Statistics')

    // ===== DEPARTMENT BREAKDOWN SHEET =====
    const deptCounts = {}
    filteredUsers.forEach(u => {
      const dept = u.department || 'Unassigned'
      deptCounts[dept] = (deptCounts[dept] || 0) + 1
    })

    const deptData = [
      ['Department Breakdown'],
      [''],
      ['Department', 'User Count', 'Percentage']
    ]
    
    Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).forEach(([dept, count]) => {
      const percentage = ((count / filteredUsers.length) * 100).toFixed(1)
      deptData.push([dept, count, `${percentage}%`])
    })
    
    deptData.push(['', '', ''])
    deptData.push(['Total', filteredUsers.length, '100%'])

    const deptSheet = XLSX.utils.aoa_to_sheet(deptData)
    deptSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, deptSheet, 'Department Breakdown')

    // ===== ACTIVE VS INACTIVE SHEET =====
    const activeCount = filteredUsers.filter(u => u.is_active).length
    const inactiveCount = filteredUsers.filter(u => !u.is_active).length

    const statusData = [
      ['User Status Analysis'],
      [''],
      ['Status', 'Count', 'Percentage'],
      ['Active', activeCount, `${((activeCount / filteredUsers.length) * 100).toFixed(1)}%`],
      ['Inactive', inactiveCount, `${((inactiveCount / filteredUsers.length) * 100).toFixed(1)}%`],
      ['', '', ''],
      ['Total', filteredUsers.length, '100%']
    ]

    const statusSheet = XLSX.utils.aoa_to_sheet(statusData)
    statusSheet['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, statusSheet, 'Status Analysis')

    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  const exportAsPDF = (filename) => {
    try {
      const now = new Date()
      const exportedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name} (${currentUser.username})` : 'Unknown'
      const doc = new jsPDF()
      
      // ===== ADD DMU HEADER =====
      let yPos = addDMUHeader(doc, 'USER MANAGEMENT REPORT', {
        exportedBy,
        filters: [
          { label: 'Search', value: searchTerm || 'None' },
          { label: 'Role', value: filterRole ? roles.find(r => r.value === filterRole)?.label : 'All' },
          { label: 'Status', value: filterStatus ? (filterStatus === 'active' ? 'Active' : 'Inactive') : 'All' }
        ]
      })
      
      yPos += 3
      
      // ===== SUMMARY TABLE (COMPACT) =====
      const summaryData = [
        ['Total Users', users.length.toString()],
        ['Filtered Results', filteredUsers.length.toString()],
        ['Active', filteredUsers.filter(u => u.is_active).length.toString()],
        ['Inactive', filteredUsers.filter(u => !u.is_active).length.toString()]
      ]
      
      autoTable(doc, {
        startY: yPos,
        head: [['Summary', 'Count']],
        body: summaryData,
        theme: 'grid',
        headStyles: { 
          fillColor: [10, 37, 64],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' }
        },
        margin: { left: 14 }
      })
      
      yPos = doc.lastAutoTable.finalY + 8
      
      // ===== MAIN USER DATA TABLE =====
      const tableData = filteredUsers.map(user => [
        user.username,
        user.email,
        `${user.first_name} ${user.last_name}`,
        roles.find(r => r.value === user.role)?.label || user.role,
        user.department || '-',
        user.phone || '-',
        user.is_active ? 'Active' : 'Inactive'
      ])
      
      const tableStyles = getDMUTableStyles()
      
      autoTable(doc, {
        startY: yPos,
        head: [['Username', 'Email', 'Full Name', 'Role', 'Department', 'Phone', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          ...tableStyles.headStyles,
          fontSize: 8
        },
        styles: { 
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 38 },
          2: { cellWidth: 30 },
          3: { cellWidth: 32 },
          4: { cellWidth: 22 },
          5: { cellWidth: 24 },
          6: { cellWidth: 15, halign: 'center' }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Add DMU footer on each page
          addDMUFooter(doc, exportedBy)
        }
      })
      
      doc.save(`${filename}.pdf`)
    } catch (error) {
      console.error('PDF Export Error:', error)
      showError('Failed to export PDF. Please try again.')
    }
  }

  // Bulk Operations
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id))
    }
  }

  const handleBulkActivate = async () => {
    if (!window.confirm(`Activate ${selectedUsers.length} users?`)) return

    try {
      await Promise.all(
        selectedUsers.map(userId => 
          api.patch(`/users/users/${userId}/`, { is_active: true })
        )
      )
      fetchUsers()
      setSelectedUsers([])
      showSuccess('Users activated successfully')
    } catch (error) {
      console.error('Error activating users:', error)
      showError('Failed to activate users')
    }
  }

  const handleBulkDeactivate = async () => {
    if (!window.confirm(`Deactivate ${selectedUsers.length} users?`)) return

    try {
      await Promise.all(
        selectedUsers.map(userId => 
          api.patch(`/users/users/${userId}/`, { is_active: false })
        )
      )
      fetchUsers()
      setSelectedUsers([])
      showSuccess('Users deactivated successfully')
    } catch (error) {
      console.error('Error deactivating users:', error)
      showError('Failed to deactivate users')
    }
  }

  // Password Reset
  const handlePasswordResetClick = (user) => {
    setUserToReset(user)
    setNewPassword(generateRandomPassword())
    setShowPasswordReset(true)
  }

  const generateRandomPassword = () => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  const generateSecurePassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const special = '!@#$%^&*'
    
    let password = ''
    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]
    
    // Fill the rest randomly
    const allChars = lowercase + uppercase + numbers + special
    for (let i = password.length; i < 14; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('')
    
    setFormData({ ...formData, password })
    calculatePasswordStrength(password)
  }

  const calculatePasswordStrength = (password) => {
    let strength = 0
    if (password.length >= 8) strength += 20
    if (password.length >= 12) strength += 20
    if (/[a-z]/.test(password)) strength += 20
    if (/[A-Z]/.test(password)) strength += 20
    if (/[0-9]/.test(password)) strength += 10
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10
    setPasswordStrength(strength)
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500'
    if (passwordStrength < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 40) return 'Weak'
    if (passwordStrength < 70) return 'Medium'
    return 'Strong'
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formData.password)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 8) {
      showWarning('Password must be at least 8 characters')
      return
    }

    try {
      await api.patch(`/users/users/${userToReset.id}/`, { password: newPassword })
      showSuccess(`Password reset successfully for ${userToReset.username}`)
      setShowPasswordReset(false)
      setUserToReset(null)
      setNewPassword('')
    } catch (error) {
      console.error('Error resetting password:', error)
      showError('Failed to reset password')
    }
  }

  // Import functionality
  const handleImportFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const fileExtension = file.name.split('.').pop().toLowerCase()
    
    if (fileExtension === 'csv') {
      setImportFile(file)
      previewImportCSV(file)
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      setImportFile(file)
      previewImportExcel(file)
    } else {
      showWarning('Please select a CSV or Excel file (.csv, .xlsx, .xls)')
    }
  }

  const previewImportCSV = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          showWarning('File is empty or has no data rows')
          setImportFile(null)
          return
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        
        const preview = lines.slice(1, 6).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const user = {}
          headers.forEach((header, i) => {
            user[header] = values[i] || ''
          })
          return { ...user, row: index + 2 }
        })

        setImportPreview({
          total: lines.length - 1,
          preview: preview,
          headers: headers,
          fileType: 'CSV'
        })
      } catch (error) {
        console.error('Error parsing CSV:', error)
        showError('Failed to parse CSV file. Please check the format.')
        setImportFile(null)
      }
    }
    reader.readAsText(file)
  }

  const previewImportExcel = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        
        if (jsonData.length < 2) {
          showWarning('Excel file is empty or has no data rows')
          setImportFile(null)
          return
        }

        const headers = jsonData[0].map(h => String(h).trim())
        const preview = jsonData.slice(1, 6).map((row, index) => {
          const user = {}
          headers.forEach((header, i) => {
            user[header] = row[i] ? String(row[i]).trim() : ''
          })
          return { ...user, row: index + 2 }
        })

        setImportPreview({
          total: jsonData.length - 1,
          preview: preview,
          headers: headers,
          fileType: 'Excel'
        })
      } catch (error) {
        console.error('Error parsing Excel:', error)
        showError('Failed to parse Excel file. Please check the format.')
        setImportFile(null)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImportUsers = async () => {
    if (!importFile) return

    const fileExtension = importFile.name.split('.').pop().toLowerCase()
    
    if (fileExtension === 'csv') {
      await importFromCSV()
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      await importFromExcel()
    }
  }

  const importFromCSV = async () => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target.result
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        
        const results = await processImportData(lines.slice(1), headers, 'CSV')
        showImportResults(results)
      } catch (error) {
        console.error('Error importing CSV:', error)
        showError('Failed to import users from CSV')
      }
    }
    reader.readAsText(importFile)
  }

  const importFromExcel = async () => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        
        const headers = jsonData[0].map(h => String(h).trim())
        const results = await processImportData(jsonData.slice(1), headers, 'Excel')
        showImportResults(results)
      } catch (error) {
        console.error('Error importing Excel:', error)
        showError('Failed to import users from Excel')
      }
    }
    reader.readAsArrayBuffer(importFile)
  }

  const processImportData = async (dataRows, headers, fileType) => {
    let successCount = 0
    let errorCount = 0
    const errors = []

    for (let i = 0; i < dataRows.length; i++) {
      const rowData = fileType === 'CSV' 
        ? dataRows[i].split(',').map(v => v.trim().replace(/"/g, ''))
        : dataRows[i]

      const userData = {}
      headers.forEach((header, index) => {
        const value = rowData[index]
        userData[header] = value ? String(value).trim() : ''
      })

      // Skip empty rows
      if (!userData.username && !userData.email) {
        continue
      }

      try {
        await api.post('/users/users/', userData)
        successCount++
      } catch (error) {
        errorCount++
        const errorMsg = error.response?.data 
          ? Object.entries(error.response.data).map(([key, val]) => `${key}: ${Array.isArray(val) ? val[0] : val}`).join(', ')
          : 'Unknown error'
        errors.push({
          row: i + 2,
          username: userData.username || 'N/A',
          error: errorMsg
        })
      }
    }

    return { successCount, errorCount, errors }
  }

  const showImportResults = (results) => {
    const { successCount, errorCount, errors } = results
    
    if (errorCount === 0) {
      showSuccess(`Import successful! ${successCount} user(s) imported successfully.`)
    } else {
      let message = `Import completed with some errors:\n\n`
      message += `✓ Success: ${successCount}\n`
      message += `✗ Failed: ${errorCount}\n\n`
      
      if (errors.length > 0) {
        message += `First 5 errors:\n`
        errors.slice(0, 5).forEach(err => {
          message += `\nRow ${err.row} (${err.username}): ${err.error}`
        })
        
        if (errors.length > 5) {
          message += `\n\n... and ${errors.length - 5} more errors`
        }
      }
      
      alert(message)
    }

    fetchUsers()
    setShowImportModal(false)
    setImportFile(null)
    setImportPreview(null)
  }

  const downloadImportTemplate = (format = 'csv') => {
    if (format === 'csv') {
      const template = 'username,email,password,first_name,last_name,role,department,phone\n' +
                      'jdoe,jdoe@example.com,Password123!,John,Doe,PROPERTY_MANAGER,IT,+251911234567\n' +
                      'asmith,asmith@example.com,Password123!,Alice,Smith,MAINTENANCE_SUPERVISOR,Maintenance,+251922345678\n' +
                      'bwilson,bwilson@example.com,Password123!,Bob,Wilson,MAINTENANCE_TECHNICIAN,Maintenance,+251933456789\n'
      
      const blob = new Blob([template], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'user_import_template.csv'
      a.click()
    } else if (format === 'excel') {
      const wb = XLSX.utils.book_new()
      const wsData = [
        ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'department', 'phone'],
        ['jdoe', 'jdoe@example.com', 'Password123!', 'John', 'Doe', 'PROPERTY_MANAGER', 'IT', '+251911234567'],
        ['asmith', 'asmith@example.com', 'Password123!', 'Alice', 'Smith', 'MAINTENANCE_SUPERVISOR', 'Maintenance', '+251922345678'],
        ['bwilson', 'bwilson@example.com', 'Password123!', 'Bob', 'Wilson', 'MAINTENANCE_TECHNICIAN', 'Maintenance', '+251933456789']
      ]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      XLSX.utils.book_append_sheet(wb, ws, 'Users')
      XLSX.writeFile(wb, 'user_import_template.xlsx')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="spinner w-16 h-16"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">User Management</h1>
              <p className="text-purple-100 text-lg">Manage system users and permissions</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateUser}
                className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <FaUserPlus />
                Add New User
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <FaUpload />
                Import Users
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <FaDownload />
                  Export Users
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-scale-in">
                    <div className="p-2">
                      <button
                        onClick={() => exportData('csv')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <FaFileCsv className="text-green-600 text-xl" />
                        <div>
                          <p className="font-semibold text-gray-800">Export as CSV</p>
                          <p className="text-xs text-gray-500">Comma-separated values</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => exportData('excel')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <FaFileExcel className="text-green-700 text-xl" />
                        <div>
                          <p className="font-semibold text-gray-800">Export as Excel</p>
                          <p className="text-xs text-gray-500">Microsoft Excel format</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => exportData('pdf')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <FaFilePdf className="text-red-600 text-xl" />
                        <div>
                          <p className="font-semibold text-gray-800">Export as PDF</p>
                          <p className="text-xs text-gray-500">Portable document format</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Users</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.total}</h3>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <FaUsers className="text-2xl text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Active Users</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.active}</h3>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
              <FaCheckCircle className="text-2xl text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-scale-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Inactive Users</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.inactive}</h3>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
              <FaUserTimes className="text-2xl text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-bold text-purple-600">{filteredUsers.length}</span> of <span className="font-bold">{users.length}</span> users
              {totalPages > 1 && (
                <span className="ml-2 text-gray-500">
                  • Page {currentPage} of {totalPages}
                </span>
              )}
            </p>
          </div>
          {(searchTerm || filterRole || filterStatus) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterRole('')
                setFilterStatus('')
              }}
              className="text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-2"
            >
              <FaTimes />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <div className="bg-indigo-600 rounded-xl shadow-lg p-4 mb-6 animate-slide-down">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-white font-semibold">
                {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedUsers([])}
                className="text-white hover:text-indigo-200 text-sm"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBulkActivate}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 font-semibold"
              >
                <FaUserCheck />
                Activate
              </button>
              <button
                onClick={handleBulkDeactivate}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 font-semibold"
              >
                <FaUserTimes />
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table - Enhanced Professional Design */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <th className="px-6 py-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={selectAllUsers}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-white cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaUsers className="text-sm" />
                    User
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentUsers.map((user, index) => (
                <tr 
                  key={user.id} 
                  className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200 group animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md group-hover:shadow-lg transition-shadow">
                          {user.first_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        {user.is_active && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500 font-medium">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-700 font-medium">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${getRoleBadgeClasses(user.role)} shadow-sm`}>
                      <FaUserShield className="text-xs" />
                      {roles.find(r => r.value === user.role)?.label || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-700 font-medium">
                      {user.department ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold border border-gray-200">
                          {user.department}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold border-2 border-green-200 shadow-sm">
                        <FaCheckCircle className="text-sm" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold border-2 border-red-200 shadow-sm">
                        <FaTimesCircle className="text-sm" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handlePasswordResetClick(user)}
                        className="p-2.5 text-orange-600 hover:bg-orange-100 rounded-lg transition-all hover:scale-110 border border-transparent hover:border-orange-300 group/btn"
                        title="Reset Password"
                      >
                        <FaKey className="text-sm group-hover/btn:animate-pulse" />
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all hover:scale-110 border border-transparent hover:border-blue-300 group/btn"
                        title="Edit User"
                      >
                        <FaEdit className="text-sm group-hover/btn:animate-pulse" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="p-2.5 text-red-600 hover:bg-red-100 rounded-lg transition-all hover:scale-110 border border-transparent hover:border-red-300 group/btn"
                        title="Delete User"
                      >
                        <FaTrash className="text-sm group-hover/btn:animate-pulse" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="inline-block p-6 bg-white rounded-2xl shadow-lg mb-4">
              <FaUsers className="text-6xl text-gray-300 mx-auto" />
            </div>
            <p className="text-gray-600 text-xl font-bold mb-2">No users found</p>
            <p className="text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Pagination Controls - Enhanced */}
        {filteredUsers.length > 0 && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 px-6 py-5 rounded-b-xl">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Results Info */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                  <span className="text-sm text-gray-600">Showing</span>
                  <span className="font-bold text-purple-600 text-base">{indexOfFirstUser + 1}</span>
                  <span className="text-sm text-gray-600">to</span>
                  <span className="font-bold text-purple-600 text-base">{Math.min(indexOfLastUser, filteredUsers.length)}</span>
                  <span className="text-sm text-gray-600">of</span>
                  <span className="font-bold text-purple-600 text-base">{filteredUsers.length}</span>
                </div>
                
                {/* Per Page Selector */}
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                  <label className="text-sm text-gray-600 font-semibold">Per page:</label>
                  <select
                    value={usersPerPage}
                    onChange={(e) => {
                      setUsersPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-3 py-1 border-2 border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className={`p-2.5 rounded-lg transition-all border-2 ${
                    currentPage === 1
                      ? 'text-gray-300 border-gray-200 cursor-not-allowed bg-gray-50'
                      : 'text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 bg-white shadow-sm'
                  }`}
                  title="First Page"
                >
                  <FaAngleDoubleLeft className="text-sm" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-4 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 border-2 ${
                    currentPage === 1
                      ? 'text-gray-300 border-gray-200 cursor-not-allowed bg-gray-50'
                      : 'text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 bg-white shadow-sm'
                  }`}
                >
                  <FaChevronLeft className="text-xs" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page Numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers().map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-400 font-bold">
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-4 py-2.5 rounded-lg font-bold transition-all border-2 ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-600 shadow-lg scale-110'
                            : 'text-gray-700 border-gray-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 bg-white shadow-sm'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}
                </div>

                {/* Mobile Page Indicator */}
                <div className="sm:hidden px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold shadow-lg border-2 border-purple-600">
                  {currentPage} / {totalPages}
                </div>

                {/* Next Page */}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 border-2 ${
                    currentPage === totalPages
                      ? 'text-gray-300 border-gray-200 cursor-not-allowed bg-gray-50'
                      : 'text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 bg-white shadow-sm'
                  }`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <FaChevronRight className="text-xs" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`p-2.5 rounded-lg transition-all border-2 ${
                    currentPage === totalPages
                      ? 'text-gray-300 border-gray-200 cursor-not-allowed bg-gray-50'
                      : 'text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 bg-white shadow-sm'
                  }`}
                  title="Last Page"
                >
                  <FaAngleDoubleRight className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white rounded-t-2xl">
              <h2 className="text-2xl font-bold">
                {modalMode === 'create' ? 'Create New User' : 'Edit User'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => {
                        setFormData({ ...formData, username: e.target.value })
                        clearFieldError('username')
                      }}
                      onBlur={(e) => validateUsernameRealTime(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.username ? 'border-red-500' : 
                        formData.username && !formErrors.username && modalMode === 'create' ? 'border-green-500' : 
                        'border-gray-300'
                      }`}
                      disabled={modalMode === 'edit'}
                    />
                    {checkingDuplicate && formData.username && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    {!checkingDuplicate && formData.username && !formErrors.username && modalMode === 'create' && formData.username.length >= 3 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <FaCheckCircle className="text-green-500 text-xl" />
                      </div>
                    )}
                  </div>
                  {formErrors.username && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-slide-down">
                      <FaTimesCircle /> {formErrors.username}
                    </p>
                  )}
                  {!formErrors.username && formData.username && modalMode === 'create' && formData.username.length >= 3 && !checkingDuplicate && (
                    <p className="text-green-500 text-xs mt-1 flex items-center gap-1 animate-slide-down">
                      <FaCheckCircle /> Username is available
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value })
                        clearFieldError('email')
                      }}
                      onBlur={(e) => validateEmailRealTime(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.email ? 'border-red-500' : 
                        formData.email && !formErrors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-green-500' : 
                        'border-gray-300'
                      }`}
                    />
                    {checkingDuplicate && formData.email && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    {!checkingDuplicate && formData.email && !formErrors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <FaCheckCircle className="text-green-500 text-xl" />
                      </div>
                    )}
                  </div>
                  {formErrors.email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-slide-down">
                      <FaTimesCircle /> {formErrors.email}
                    </p>
                  )}
                  {!formErrors.email && formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && !checkingDuplicate && (
                    <p className="text-green-500 text-xs mt-1 flex items-center gap-1 animate-slide-down">
                      <FaCheckCircle /> Email is valid and available
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password {modalMode === 'create' ? <span className="text-red-500">*</span> : '(leave blank to keep current)'}
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={modalMode === 'create'}
                          value={formData.password}
                          onChange={(e) => {
                            setFormData({ ...formData, password: e.target.value })
                            calculatePasswordStrength(e.target.value)
                            clearFieldError('password')
                          }}
                          onBlur={(e) => validatePasswordRealTime(e.target.value)}
                          className={`w-full px-4 py-3 pr-24 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            formErrors.password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter password"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                          {formData.password && (
                            <button
                              type="button"
                              onClick={copyToClipboard}
                              className={`p-2 rounded-lg transition-all ${
                                copySuccess 
                                  ? 'text-green-600 bg-green-100' 
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                              }`}
                              title={copySuccess ? 'Copied!' : 'Copy to clipboard'}
                            >
                              {copySuccess ? <FaCheckCircle /> : <FaCopy />}
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={generateSecurePassword}
                        className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2 whitespace-nowrap"
                        title="Generate secure password"
                      >
                        <FaSync />
                        Generate
                      </button>
                    </div>
                    
                    {formErrors.password && (
                      <p className="text-red-500 text-xs flex items-center gap-1 animate-slide-down">
                        <FaTimesCircle /> {formErrors.password}
                      </p>
                    )}
                    
                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="space-y-2 animate-slide-down">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 font-medium">Password Strength:</span>
                          <span className={`font-bold ${
                            passwordStrength < 40 ? 'text-red-600' : 
                            passwordStrength < 70 ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {getPasswordStrengthLabel()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${getPasswordStrengthColor()}`}
                            style={{ width: `${passwordStrength}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className={`px-2 py-1 rounded ${formData.password.length >= 8 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {formData.password.length >= 8 ? '✓' : '○'} 8+ characters
                          </span>
                          <span className={`px-2 py-1 rounded ${/[A-Z]/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {/[A-Z]/.test(formData.password) ? '✓' : '○'} Uppercase
                          </span>
                          <span className={`px-2 py-1 rounded ${/[a-z]/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {/[a-z]/.test(formData.password) ? '✓' : '○'} Lowercase
                          </span>
                          <span className={`px-2 py-1 rounded ${/[0-9]/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {/[0-9]/.test(formData.password) ? '✓' : '○'} Number
                          </span>
                          <span className={`px-2 py-1 rounded ${/[^a-zA-Z0-9]/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {/[^a-zA-Z0-9]/.test(formData.password) ? '✓' : '○'} Special char
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => {
                      setFormData({ ...formData, role: e.target.value })
                      clearFieldError('role')
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.role ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  {formErrors.role && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <FaTimesCircle /> {formErrors.role}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      setFormData({ ...formData, department: e.target.value })
                      clearFieldError('department')
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.department ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.value} value={dept.value}>{dept.label}</option>
                    ))}
                  </select>
                  {formErrors.department && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <FaTimesCircle /> {formErrors.department}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => {
                        setFormData({ ...formData, first_name: e.target.value })
                        clearFieldError('first_name')
                      }}
                      onBlur={(e) => validateNameRealTime(e.target.value, 'first_name')}
                      placeholder="e.g. Abebe"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.first_name ? 'border-red-500' :
                        formData.first_name.trim() && !formErrors.first_name ? 'border-green-500' :
                        'border-gray-300'
                      }`}
                    />
                    {formData.first_name.trim() && !formErrors.first_name && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <FaCheckCircle className="text-green-500 text-xl" />
                      </div>
                    )}
                  </div>
                  {formErrors.first_name ? (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-slide-down">
                      <FaTimesCircle /> {formErrors.first_name}
                    </p>
                  ) : formData.first_name.trim() && formData.first_name.trim().length >= 2 && (
                    <p className="text-green-500 text-xs mt-1 flex items-center gap-1 animate-slide-down">
                      <FaCheckCircle /> Looks good!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => {
                        setFormData({ ...formData, last_name: e.target.value })
                        clearFieldError('last_name')
                      }}
                      onBlur={(e) => validateNameRealTime(e.target.value, 'last_name')}
                      placeholder="e.g. Kebede"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.last_name ? 'border-red-500' :
                        formData.last_name.trim() && !formErrors.last_name ? 'border-green-500' :
                        'border-gray-300'
                      }`}
                    />
                    {formData.last_name.trim() && !formErrors.last_name && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <FaCheckCircle className="text-green-500 text-xl" />
                      </div>
                    )}
                  </div>
                  {formErrors.last_name ? (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-slide-down">
                      <FaTimesCircle /> {formErrors.last_name}
                    </p>
                  ) : formData.last_name.trim() && formData.last_name.trim().length >= 2 && (
                    <p className="text-green-500 text-xs mt-1 flex items-center gap-1 animate-slide-down">
                      <FaCheckCircle /> Looks good!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                    <span className="text-gray-500 text-xs ml-2">(Ethiopian format)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-medium">+251</span>
                    </div>
                    <input
                      type="tel"
                      value={formData.phone.startsWith('+251') ? formData.phone.slice(4) : formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 9)
                        setFormData({ ...formData, phone: value ? `+251${value}` : '' })
                        clearFieldError('phone')
                      }}
                      className={`w-full pl-16 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="911234567"
                      maxLength="9"
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <FaTimesCircle /> {formErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* General Error Message */}
              {Object.keys(formErrors).length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 animate-slide-down">
                  <div className="flex items-start gap-3">
                    <FaTimesCircle className="text-red-600 text-xl mt-0.5" />
                    <div>
                      <h4 className="font-bold text-red-800 mb-1">Please fix the following errors:</h4>
                      <ul className="text-sm text-red-700 list-disc list-inside">
                        {Object.values(formErrors).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormErrors({})
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <FaTrash className="text-3xl text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 text-center mb-2">Delete User</h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <span className="font-semibold">{userToDelete?.username}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && userToReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <FaKey className="text-2xl" />
                <h2 className="text-2xl font-bold">Reset Password</h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Reset password for <span className="font-semibold">{userToReset.username}</span>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                    placeholder="Enter new password"
                  />
                  <button
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                    title="Generate Random Password"
                  >
                    <FaSync />
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(newPassword)
                        showSuccess('Password copied to clipboard!')
                      } catch (err) {
                        console.error('Failed to copy:', err)
                      }
                    }}
                    disabled={!newPassword}
                    className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy Password"
                  >
                    <FaCopy />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 text-sm">
                  <FaLock className="inline mr-2" />
                  Make sure to share this password securely with the user. They should change it after first login.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordReset(false)
                    setUserToReset(null)
                    setNewPassword('')
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordReset}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Users Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 text-white rounded-t-2xl sticky top-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FaUpload className="text-2xl" />
                  <h2 className="text-2xl font-bold">Import Users from CSV or Excel</h2>
                </div>
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                    setImportPreview(null)
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaDownload className="text-3xl text-blue-600 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-800 mb-2">Download Template</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Download a template file with the required format and sample data. Choose your preferred format:
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => downloadImportTemplate('csv')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
                      >
                        <FaFileCsv />
                        CSV Template
                      </button>
                      <button
                        onClick={() => downloadImportTemplate('excel')}
                        className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-semibold flex items-center gap-2"
                      >
                        <FaFileExcel />
                        Excel Template
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Required Fields Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                  <FaCheckCircle />
                  Required Fields
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-yellow-700">
                  <div>• username (unique, 3+ chars)</div>
                  <div>• email (valid format)</div>
                  <div>• password (8+ chars, mixed case, number, special)</div>
                  <div>• first_name (2+ chars)</div>
                  <div>• last_name (2+ chars)</div>
                  <div>• role (see template for valid values)</div>
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  Optional fields: department, phone
                </p>
              </div>

              {/* File Upload */}
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all mb-6 ${
                importFile 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'
              }`}>
                {importFile ? (
                  <div className="animate-scale-in">
                    <FaCheckCircle className="text-5xl text-green-500 mx-auto mb-4" />
                    <p className="font-bold text-gray-800 mb-2">File Selected</p>
                    <p className="text-sm text-gray-600 mb-1">{importFile.name}</p>
                    <p className="text-xs text-gray-500 mb-4">
                      {importPreview?.fileType} format • {importPreview?.total} user(s)
                    </p>
                    <button
                      onClick={() => {
                        setImportFile(null)
                        setImportPreview(null)
                      }}
                      className="text-red-600 hover:text-red-700 font-semibold text-sm"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <>
                    <FaUpload className="text-5xl text-gray-400 mx-auto mb-4" />
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleImportFileChange}
                      className="hidden"
                      id="user-file-upload"
                    />
                    <label
                      htmlFor="user-file-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-lg"
                    >
                      Click to upload CSV or Excel file
                    </label>
                    <p className="text-sm text-gray-500 mt-2">Supports .csv, .xlsx, .xls files</p>
                  </>
                )}
              </div>

              {/* Preview */}
              {importPreview && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 animate-slide-down">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-gray-800">
                      Preview ({importPreview.total} user{importPreview.total !== 1 ? 's' : ''})
                    </h4>
                    <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                      {importPreview.fileType}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-200">
                        <tr>
                          {importPreview.headers.map((header, i) => (
                            <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importPreview.preview.map((user, i) => (
                          <tr key={i} className="bg-white hover:bg-gray-50">
                            {importPreview.headers.map((header, j) => (
                              <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                {user[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.total > 5 && (
                      <p className="text-sm text-gray-500 mt-3 text-center">
                        Showing first 5 of {importPreview.total} users
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                    setImportPreview(null)
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportUsers}
                  disabled={!importFile}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaUpload />
                  Import {importPreview?.total || ''} User{importPreview?.total !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
