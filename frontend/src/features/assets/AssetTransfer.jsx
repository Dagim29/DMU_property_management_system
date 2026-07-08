import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  FaExchangeAlt,
  FaTimes,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaBuilding,
  FaArrowRight,
  FaClipboardList,
  FaCalendarAlt,
  FaInfoCircle,
  FaTruck,
  FaBolt,
  FaClock
} from 'react-icons/fa'
import api from '../../services/api'

const AssetTransfer = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)

  // Asset data
  const [asset, setAsset] = useState(null)

  // Transfer data
  const [transferData, setTransferData] = useState({
    to_room: '',
    reason: '',
    transfer_type: 'PERMANENT',
    reason_category: '',
    scheduled_date: '',
    special_requirements: '',
    transportation_method: ''
  })

  // Dropdown options
  const [campuses, setCampuses] = useState([])
  const [buildings, setBuildings] = useState([])
  const [floors, setFloors] = useState([])
  const [rooms, setRooms] = useState([])

  // Selected hierarchy
  const [selectedCampus, setSelectedCampus] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('')

  useEffect(() => {
    fetchAsset()
    fetchCampuses()
  }, [id])

  useEffect(() => {
    if (selectedCampus) {
      fetchBuildings(selectedCampus)
    }
  }, [selectedCampus])

  useEffect(() => {
    if (selectedBuilding) {
      fetchFloors(selectedBuilding)
    }
  }, [selectedBuilding])

  useEffect(() => {
    if (selectedFloor) {
      fetchRooms(selectedFloor)
    }
  }, [selectedFloor])

  const fetchAsset = async () => {
    try {
      setFetchLoading(true)
      const response = await api.get(`/assets/assets/${id}/`)
      setAsset(response.data)
    } catch (error) {
      console.error('Error fetching asset:', error)
      setMessage({ type: 'error', text: 'Failed to load asset' })
    } finally {
      setFetchLoading(false)
    }
  }

  const fetchCampuses = async () => {
    try {
      const response = await api.get('/assets/campuses/')
      const data = response.data.results || response.data
      setCampuses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching campuses:', error)
      setCampuses([])
    }
  }

  const fetchBuildings = async (campusId) => {
    try {
      const response = await api.get(`/assets/buildings/?campus=${campusId}`)
      const data = response.data.results || response.data
      setBuildings(Array.isArray(data) ? data : [])
      setFloors([])
      setRooms([])
      setSelectedBuilding('')
      setSelectedFloor('')
    } catch (error) {
      console.error('Error fetching buildings:', error)
    }
  }

  const fetchFloors = async (buildingId) => {
    try {
      const response = await api.get(`/assets/floors/?building=${buildingId}`)
      const data = response.data.results || response.data
      setFloors(Array.isArray(data) ? data : [])
      setRooms([])
      setSelectedFloor('')
    } catch (error) {
      console.error('Error fetching floors:', error)
    }
  }

  const fetchRooms = async (floorId) => {
    try {
      const response = await api.get(`/assets/rooms/?floor=${floorId}`)
      const data = response.data.results || response.data
      setRooms(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setTransferData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!transferData.to_room) {
      setMessage({ type: 'error', text: 'Please select a destination room' })
      return
    }

    if (!transferData.reason) {
      setMessage({ type: 'error', text: 'Please provide a reason for transfer' })
      return
    }

    if (!transferData.reason_category) {
      setMessage({ type: 'error', text: 'Please select a reason category' })
      return
    }

    try {
      setLoading(true)

      // Complete transfer payload with all fields
      const transferPayload = {
        asset: asset.id,  // Use database ID, not asset_id
        from_room: asset.room || null,  // Ensure null if no room
        to_room: parseInt(transferData.to_room),  // Ensure integer
        reason: transferData.reason,
        transfer_type: transferData.transfer_type,
        reason_category: transferData.reason_category,
        scheduled_date: transferData.scheduled_date || null,
        transportation_method: transferData.transportation_method || null,
        special_requirements: transferData.special_requirements || null
      }

      console.log('Transfer payload:', transferPayload)  // Debug log

      await api.post('/assets/transfers/', transferPayload)

      setMessage({
        type: 'success',
        text: 'Asset transferred successfully! Transfer document is available in Transfer History.'
      })

      setTimeout(() => {
        navigate('/dashboard/assets/transfer-approvals')
      }, 2000)
    } catch (error) {
      console.error('Transfer error:', error.response?.data)  // Debug log

      // Extract error message
      let errorMessage = 'Failed to create transfer request'

      if (error.response?.data) {
        const errorData = error.response.data

        // Handle validation errors
        if (typeof errorData === 'object' && !errorData.error) {
          const errors = Object.entries(errorData)
            .map(([field, messages]) => {
              const msgArray = Array.isArray(messages) ? messages : [messages]
              return `${field}: ${msgArray.join(', ')}`
            })
            .join('; ')
          errorMessage = errors || errorMessage
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }
      }

      setMessage({
        type: 'error',
        text: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Asset not found
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <button
          onClick={() => navigate(`/dashboard/assets/${id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <FaArrowLeft />
          Back to Asset Details
        </button>

        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <FaExchangeAlt className="text-6xl opacity-80" />
            <div>
              <h1 className="text-4xl font-bold mb-2">Transfer Asset</h1>
              <p className="text-teal-100 text-lg">Move asset to a new location</p>
              <p className="text-teal-200 text-sm mt-2">
                Asset: {asset.asset_id} - {asset.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 animate-slide-down ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
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

      {/* Step Indicator */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Transfer Type', icon: FaInfoCircle },
            { num: 2, label: 'Destination', icon: FaMapMarkerAlt },
            { num: 3, label: 'Details', icon: FaClipboardList },
            { num: 4, label: 'Review', icon: FaCheckCircle }
          ].map((step, index) => (
            <div key={step.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${currentStep >= step.num
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                  }`}>
                  {currentStep > step.num ? (
                    <FaCheckCircle />
                  ) : (
                    <step.icon />
                  )}
                </div>
                <span className={`mt-2 text-sm font-semibold ${currentStep >= step.num ? 'text-teal-600' : 'text-gray-500'
                  }`}>
                  {step.label}
                </span>
              </div>
              {index < 3 && (
                <div className={`h-1 flex-1 mx-2 transition-all ${currentStep > step.num ? 'bg-teal-600' : 'bg-gray-200'
                  }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Location */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaMapMarkerAlt className="text-blue-600" />
            Current Location
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Campus</p>
              <p className="font-semibold text-gray-800">{asset.campus_name}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Room</p>
              <p className="font-semibold text-gray-800">{asset.room_info || 'Not assigned'}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {asset.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Transfer Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Step 1: Transfer Type Selection */}
            {currentStep === 1 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Select Transfer Type</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Permanent Transfer */}
                  <button
                    type="button"
                    onClick={() => setTransferData({ ...transferData, transfer_type: 'PERMANENT' })}
                    className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${transferData.transfer_type === 'PERMANENT'
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                      }`}
                  >
                    <FaExchangeAlt className="text-4xl text-teal-600 mb-4 mx-auto" />
                    <h4 className="font-bold text-lg mb-2">Permanent Transfer</h4>
                    <p className="text-sm text-gray-600">
                      Move asset to new location permanently. Requires dual approval.
                    </p>
                  </button>

                  {/* Temporary Transfer */}
                  <button
                    type="button"
                    onClick={() => setTransferData({ ...transferData, transfer_type: 'TEMPORARY' })}
                    className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${transferData.transfer_type === 'TEMPORARY'
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                      }`}
                  >
                    <FaClock className="text-4xl text-blue-600 mb-4 mx-auto" />
                    <h4 className="font-bold text-lg mb-2">Temporary Transfer</h4>
                    <p className="text-sm text-gray-600">
                      Temporary relocation with planned return date.
                    </p>
                  </button>

                  {/* Emergency Transfer */}
                  <button
                    type="button"
                    onClick={() => setTransferData({ ...transferData, transfer_type: 'EMERGENCY' })}
                    className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${transferData.transfer_type === 'EMERGENCY'
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                      }`}
                  >
                    <FaBolt className="text-4xl text-red-600 mb-4 mx-auto" />
                    <h4 className="font-bold text-lg mb-2">Emergency Transfer</h4>
                    <p className="text-sm text-gray-600">
                      Urgent transfer with expedited approval process.
                    </p>
                  </button>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
                  >
                    Next: Select Destination
                    <FaArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Destination Selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FaBuilding className="text-teal-600" />
                    New Location
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Campus <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedCampus}
                        onChange={(e) => setSelectedCampus(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="">Select Campus</option>
                        {campuses.map(campus => (
                          <option key={campus.id} value={campus.id}>
                            {campus.name} ({campus.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Building <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedBuilding}
                        onChange={(e) => setSelectedBuilding(e.target.value)}
                        disabled={!selectedCampus}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="">Select Building</option>
                        {buildings.map(building => (
                          <option key={building.id} value={building.id}>
                            {building.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Floor <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedFloor}
                        onChange={(e) => setSelectedFloor(e.target.value)}
                        disabled={!selectedBuilding}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="">Select Floor</option>
                        {floors.map(floor => (
                          <option key={floor.id} value={floor.id}>
                            Floor {floor.number}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Room <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="to_room"
                        value={transferData.to_room}
                        onChange={handleInputChange}
                        disabled={!selectedFloor}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="">Select Room</option>
                        {rooms.map(room => (
                          <option key={room.id} value={room.id}>
                            Room {room.number} {room.name && `- ${room.name}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <FaArrowLeft />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={!transferData.to_room}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Transfer Details
                    <FaArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Transfer Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Reason Category */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Transfer Reason</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Reason Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="reason_category"
                        value={transferData.reason_category}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select Category</option>
                        <option value="DEPT_RELOCATION">Department Relocation</option>
                        <option value="SPACE_OPTIMIZATION">Space Optimization</option>
                        <option value="MAINTENANCE">Maintenance Requirements</option>
                        <option value="USER_REQUEST">User Request</option>
                        <option value="EQUIPMENT_UPGRADE">Equipment Upgrade</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Scheduled Date
                      </label>
                      <input
                        type="date"
                        name="scheduled_date"
                        value={transferData.scheduled_date}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Detailed Justification <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="reason"
                      value={transferData.reason}
                      onChange={handleInputChange}
                      required
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="Provide detailed explanation for this transfer..."
                    />
                  </div>
                </div>

                {/* Special Requirements */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Additional Details</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Transportation Method
                      </label>
                      <select
                        name="transportation_method"
                        value={transferData.transportation_method}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select Method</option>
                        <option value="MANUAL">Manual Carry</option>
                        <option value="CART">Cart/Trolley</option>
                        <option value="VEHICLE">Vehicle Transport</option>
                        <option value="PROFESSIONAL">Professional Movers</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Special Requirements
                      </label>
                      <textarea
                        name="special_requirements"
                        value={transferData.special_requirements}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        placeholder="Any special handling, equipment, or considerations..."
                      />
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <FaArrowLeft />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    disabled={!transferData.reason || !transferData.reason_category}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Review
                    <FaArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* Transfer Summary */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">Review Transfer Request</h3>

                  {/* Transfer Type */}
                  <div className="mb-6 p-4 bg-teal-50 rounded-lg border-l-4 border-teal-600">
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      {transferData.transfer_type === 'PERMANENT' && <FaExchangeAlt className="text-teal-600" />}
                      {transferData.transfer_type === 'TEMPORARY' && <FaClock className="text-blue-600" />}
                      {transferData.transfer_type === 'EMERGENCY' && <FaBolt className="text-red-600" />}
                      Transfer Type
                    </h4>
                    <p className="text-lg font-bold text-teal-600">
                      {transferData.transfer_type.replace('_', ' ')}
                    </p>
                  </div>

                  {/* Asset Information */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-3">Asset Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Asset ID:</span>
                        <span className="font-semibold text-gray-800">{asset.asset_id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold text-gray-800">{asset.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-semibold text-gray-800">{asset.asset_type || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Status:</span>
                        <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                          {asset.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location Change - Enhanced */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-teal-600" />
                      Location Change
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* From Location */}
                      <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                        <p className="text-xs font-semibold text-blue-600 mb-3 uppercase">Current Location</p>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <FaBuilding className="text-blue-600 mt-1" />
                            <div>
                              <p className="text-xs text-gray-600">Campus</p>
                              <p className="font-semibold text-gray-800">{asset.campus_name || 'Not assigned'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <FaMapMarkerAlt className="text-blue-600 mt-1" />
                            <div>
                              <p className="text-xs text-gray-600">Room</p>
                              <p className="font-semibold text-gray-800">{asset.room_info || 'Not assigned'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="hidden md:flex items-center justify-center">
                        <FaArrowRight className="text-4xl text-teal-600" />
                      </div>
                      <div className="md:hidden flex items-center justify-center py-2">
                        <FaArrowRight className="text-3xl text-teal-600 transform rotate-90" />
                      </div>

                      {/* To Location */}
                      <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                        <p className="text-xs font-semibold text-green-600 mb-3 uppercase">New Location</p>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <FaBuilding className="text-green-600 mt-1" />
                            <div>
                              <p className="text-xs text-gray-600">Campus</p>
                              <p className="font-semibold text-gray-800">
                                {campuses.find(c => c.id === parseInt(selectedCampus))?.name || 'Not selected'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <FaBuilding className="text-green-600 mt-1" />
                            <div>
                              <p className="text-xs text-gray-600">Building</p>
                              <p className="font-semibold text-gray-800">
                                {buildings.find(b => b.id === parseInt(selectedBuilding))?.name || 'Not selected'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <FaMapMarkerAlt className="text-green-600 mt-1" />
                            <div>
                              <p className="text-xs text-gray-600">Floor</p>
                              <p className="font-semibold text-gray-800">
                                Floor {floors.find(f => f.id === parseInt(selectedFloor))?.number || 'Not selected'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <FaMapMarkerAlt className="text-green-600 mt-1" />
                            <div>
                              <p className="text-xs text-gray-600">Room</p>
                              <p className="font-semibold text-gray-800">
                                Room {rooms.find(r => r.id === parseInt(transferData.to_room))?.number || 'Not selected'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Details */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FaClipboardList className="text-teal-600" />
                      Transfer Details
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-gray-600">Category</span>
                          <p className="font-semibold text-gray-800">
                            {transferData.reason_category.replace('_', ' ')}
                          </p>
                        </div>
                        {transferData.scheduled_date && (
                          <div>
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <FaCalendarAlt /> Scheduled Date
                            </span>
                            <p className="font-semibold text-gray-800">
                              {new Date(transferData.scheduled_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      {transferData.transportation_method && (
                        <div>
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <FaTruck /> Transportation Method
                          </span>
                          <p className="font-semibold text-gray-800">{transferData.transportation_method}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-gray-600">Reason</span>
                        <p className="mt-1 p-3 bg-white rounded border border-gray-200 text-sm text-gray-800">
                          {transferData.reason}
                        </p>
                      </div>
                      {transferData.special_requirements && (
                        <div>
                          <span className="text-xs text-gray-600">Special Requirements</span>
                          <p className="mt-1 p-3 bg-white rounded border border-gray-200 text-sm text-gray-800">
                            {transferData.special_requirements}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approval Process Info */}
                  {/* <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <FaInfoCircle className="text-yellow-600 text-2xl mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-800 mb-2">Dual Approval Process</h4>
                        <p className="text-sm text-yellow-700 mb-2">
                          This transfer request requires approval from both source and destination departments.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-yellow-700">
                          <span className="px-2 py-1 bg-yellow-100 rounded font-semibold">Step 1:</span>
                          <span>Source Department Approval</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-yellow-700 mt-1">
                          <span className="px-2 py-1 bg-yellow-100 rounded font-semibold">Step 2:</span>
                          <span>Destination Department Approval</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-yellow-700 mt-1">
                          <span className="px-2 py-1 bg-yellow-100 rounded font-semibold">Step 3:</span>
                          <span>Transfer Completed</span>
                        </div>
                      </div>
                    </div>
                  </div> */}
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <FaArrowLeft />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FaCheckCircle />
                    {loading ? 'Submitting...' : 'Submit Transfer Request'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default AssetTransfer
