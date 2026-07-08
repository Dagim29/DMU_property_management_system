import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaSearch, FaPlus, FaTasks, FaExclamationTriangle, FaTimes, FaEye, FaDownload, FaChevronDown } from 'react-icons/fa'
import api from '../../services/api'

const priorityColors = {
  EMERGENCY: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  LOW: 'bg-gray-100 text-gray-800',
}

const statusColors = {
  SUBMITTED: 'bg-gray-100 text-gray-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  WAITING_PARTS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const MaintenanceRequestList = () => {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  useEffect(() => {
    setPage(0)
  }, [searchTerm, statusFilter, priorityFilter, rowsPerPage])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [technicians, setTechnicians] = useState([])
  const [selectedTechnician, setSelectedTechnician] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchRequests()
    if (user?.role === 'MAINTENANCE_SUPERVISOR') {
      fetchTechnicians()
    }
  }, [statusFilter, priorityFilter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      
      const response = await api.get('/maintenance/requests/', { params })
      // Handle both paginated and non-paginated responses
      const data = response.data.results || response.data
      setRequests(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError('Failed to load maintenance requests')
      console.error('Requests error:', err)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/users/users/', {
        params: { role: 'MAINTENANCE_TECHNICIAN' }
      })
      // Handle both paginated and non-paginated responses
      const data = response.data.results || response.data
      setTechnicians(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load technicians:', err)
      setTechnicians([])
    }
  }

  const handleAssignRequest = async () => {
    if (!selectedTechnician) return
    
    try {
      await api.patch(`/maintenance/requests/${selectedRequest.id}/assign/`, {
        assigned_to: selectedTechnician
      })
      setAssignDialogOpen(false)
      setSelectedRequest(null)
      setSelectedTechnician('')
      fetchRequests()
    } catch (err) {
      console.error('Failed to assign request:', err)
      showError('Failed to assign request')
    }
  }

  const filteredRequests = requests.filter((request) =>
    request.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const paginatedRequests = filteredRequests.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  const totalPages = Math.ceil(filteredRequests.length / rowsPerPage)

  const exportRequests = async (format) => {
    try {
      setExporting(true)
      setShowExportMenu(false)
      
      if (format === 'csv') {
        // Client-side CSV generation
        const headers = ['Request ID', 'Asset ID', 'Asset Name', 'Category', 'Priority', 'Status', 'Assigned To', 'Requested By', 'Created Date']
        const csvData = [
          headers,
          ...filteredRequests.map(request => [
            request.request_id,
            request.asset_id || '',
            request.asset_name || '',
            request.category,
            request.priority,
            request.status,
            request.assigned_to_name || 'Unassigned',
            request.requested_by_name || '',
            new Date(request.created_at).toLocaleString()
          ])
        ]
        
        const csvContent = csvData.map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `maintenance-requests-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
      } else if (format === 'excel') {
        // Client-side Excel generation
        const XLSX = await import('xlsx')
        const worksheet = XLSX.utils.json_to_sheet(
          filteredRequests.map(request => ({
            'Request ID': request.request_id,
            'Asset ID': request.asset_id || '',
            'Asset Name': request.asset_name || '',
            'Category': request.category,
            'Priority': request.priority,
            'Status': request.status,
            'Assigned To': request.assigned_to_name || 'Unassigned',
            'Requested By': request.requested_by_name || '',
            'Created Date': new Date(request.created_at).toLocaleString()
          }))
        )
        
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Maintenance Requests')
        XLSX.writeFile(workbook, `maintenance-requests-${new Date().toISOString().split('T')[0]}.xlsx`)
        
      } else if (format === 'pdf') {
        // Client-side PDF generation
        const { jsPDF } = await import('jspdf')
        await import('jspdf-autotable')
        
        const doc = new jsPDF()
        
        // Title
        doc.setFontSize(18)
        doc.text('Maintenance Requests Report', 14, 20)
        doc.setFontSize(11)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
        doc.text(`Total Requests: ${filteredRequests.length}`, 14, 35)
        
        // Table
        const tableData = filteredRequests.map(request => [
          request.request_id,
          request.asset_id || '',
          request.category,
          request.priority,
          request.status,
          request.assigned_to_name || 'Unassigned'
        ])
        
        const autoTable = (await import('jspdf-autotable')).default
        autoTable(doc, {
          startY: 40,
          head: [['Request ID', 'Asset ID', 'Category', 'Priority', 'Status', 'Assigned To']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235] },
          styles: { fontSize: 9 }
        })
        
        doc.save(`maintenance-requests-${new Date().toISOString().split('T')[0]}.pdf`)
      }
    } catch (error) {
      console.error('Export error:', error)
      showError('Failed to export. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header with Gradient */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FaTasks className="text-6xl opacity-80" />
              <div>
                <h1 className="text-4xl font-bold mb-2">Maintenance Requests</h1>
                <p className="text-purple-100 text-lg">Track and manage all maintenance requests</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting}
                  className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <FaDownload />
                  {exporting ? 'Exporting...' : 'Export'}
                  <FaChevronDown className="text-sm" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <button
                      onClick={() => exportRequests('csv')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 text-gray-700"
                    >
                      <FaDownload className="text-green-600" />
                      <span className="font-medium">Export as CSV</span>
                    </button>
                    <button
                      onClick={() => exportRequests('excel')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 text-gray-700"
                    >
                      <FaDownload className="text-green-600" />
                      <span className="font-medium">Export as Excel</span>
                    </button>
                    <button
                      onClick={() => exportRequests('pdf')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                    >
                      <FaDownload className="text-red-600" />
                      <span className="font-medium">Export as PDF</span>
                    </button>
                  </div>
                )}
              </div>
              {(user?.role === 'PROPERTY_MANAGER' || user?.role === 'OWNER') && (
                <button
                  onClick={() => navigate('/dashboard/maintenance/requests/new')}
                  className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <FaPlus />
                  New Request
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3 animate-slide-down">
          <FaExclamationTriangle className="text-2xl" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="hover:opacity-70">
            <FaTimes />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[250px] relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Request ID, Asset ID, or Description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
            >
              <option value="">All Status</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_PARTS">Waiting Parts</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
            >
              <option value="">All Priority</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            {(searchTerm || statusFilter || priorityFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
                className="px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-semibold flex items-center gap-2"
              >
                <FaTimes />
                Clear Filters
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border-2 border-gray-100">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2 border-purple-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Request ID</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Asset</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Priority</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Assigned To</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Requested By</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <FaTasks className="text-5xl text-gray-300" />
                        <p className="text-lg font-medium">No maintenance requests found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-purple-50 transition-all duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{request.request_id}</span>
                          {request.is_overdue && (
                            <FaExclamationTriangle className="text-red-500 animate-pulse" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800">{request.asset_id}</p>
                          <p className="text-sm text-gray-500">{request.asset_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-700">{request.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-4 py-2 rounded-full text-xs font-bold ${priorityColors[request.priority]} shadow-sm`}>
                          {request.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-4 py-2 rounded-full text-xs font-bold ${statusColors[request.status]} shadow-sm`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-700">
                          {request.assigned_to_name || <span className="text-gray-400 italic">Unassigned</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-700">{request.requested_by_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => navigate(`/dashboard/maintenance/requests/${request.id}`)}
                            className="text-purple-600 hover:text-purple-800 hover:scale-110 transition-all"
                            title="View Details"
                          >
                            <FaEye className="text-xl" />
                          </button>
                          {user?.role === 'MAINTENANCE_SUPERVISOR' && 
                           request.status === 'SUBMITTED' && (
                            <button
                              onClick={() => {
                                setSelectedRequest(request)
                                setAssignDialogOpen(true)
                              }}
                              className="text-green-600 hover:text-green-800 hover:scale-110 transition-all"
                              title="Assign Technician"
                            >
                              <FaTasks className="text-xl" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredRequests.length > 0 && (
            <div className="flex flex-wrap items-center justify-between mt-6 pt-6 border-t-2 border-gray-100 gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-gray-600">
                  Showing <span className="font-bold text-purple-600">{page * rowsPerPage + 1}</span> to <span className="font-bold text-purple-600">{Math.min((page + 1) * rowsPerPage, filteredRequests.length)}</span> of <span className="font-bold text-purple-600">{filteredRequests.length}</span> requests
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="px-2 py-1 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={filteredRequests.length > 0 ? filteredRequests.length : 100}>All</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-6 py-2 border-2 border-gray-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2 px-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl bg-gray-50">
                  Page {page + 1} of {totalPages}
                </div>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-6 py-2 border-2 border-gray-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign Dialog */}
      {assignDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-slide-up">
            <div className="flex justify-between items-center p-6 border-b-2 border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <h2 className="text-2xl font-bold text-gray-800">Assign Technician</h2>
              <button
                onClick={() => setAssignDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:scale-110 transition-all"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-gray-700 font-bold mb-3">Select Technician</label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
              >
                <option value="">Choose a technician...</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.first_name} {tech.last_name} ({tech.username})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t-2 border-gray-100">
              <button
                onClick={() => setAssignDialogOpen(false)}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignRequest}
                disabled={!selectedTechnician}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaintenanceRequestList
