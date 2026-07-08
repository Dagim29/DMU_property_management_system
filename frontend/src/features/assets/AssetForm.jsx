import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaSave,
  FaTimes,
  FaUpload,
  FaImage,
  FaMapMarkerAlt,
  FaInfoCircle
} from 'react-icons/fa'
import api from '../../services/api'

const AssetForm = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    asset_type: 'EQP',
    status: 'AVAILABLE',
    campus: '',
    room: '',
    description: '',
    purchase_date: '',
    purchase_cost: '',
    current_value: '',
    manufacturer: '',
    model_number: '',
    serial_number: '',
    condition: 'GOOD',
    supplier: '',
    assigned_to: '',
    specifications: {}
  })

  // Dropdown options
  const [campuses, setCampuses] = useState([])
  const [buildings, setBuildings] = useState([])
  const [floors, setFloors] = useState([])
  const [rooms, setRooms] = useState([])
  const [users, setUsers] = useState([])

  // Selected hierarchy
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('')

  // Photo upload
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  // Specifications
  const [specKey, setSpecKey] = useState('')
  const [specValue, setSpecValue] = useState('')

  useEffect(() => {
    fetchCampuses()
    fetchUsers()
  }, [])

  useEffect(() => {
    if (formData.campus) {
      fetchBuildings(formData.campus)
    }
  }, [formData.campus])

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

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/')
      const data = response.data.results || response.data
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
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
      setBuildings([])
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
      setFloors([])
    }
  }

  const fetchRooms = async (floorId) => {
    try {
      const response = await api.get(`/assets/rooms/?floor=${floorId}`)
      const data = response.data.results || response.data
      setRooms(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching rooms:', error)
      setRooms([])
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const addSpecification = () => {
    if (specKey && specValue) {
      setFormData(prev => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [specKey]: specValue
        }
      }))
      setSpecKey('')
      setSpecValue('')
    }
  }

  const removeSpecification = (key) => {
    setFormData(prev => {
      const newSpecs = { ...prev.specifications }
      delete newSpecs[key]
      return { ...prev, specifications: newSpecs }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.campus) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    if (formData.purchase_date) {
      const selectedDate = new Date(formData.purchase_date)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // Allow today
      if (selectedDate > today) {
        setMessage({ type: 'error', text: 'Purchase date cannot be in the future' })
        return
      }
    }

    try {
      setLoading(true)

      const submitData = new FormData()
      submitData.append('name', formData.name)
      submitData.append('asset_type', formData.asset_type)
      submitData.append('status', formData.status)
      submitData.append('campus', formData.campus)
      if (formData.room) submitData.append('room', formData.room)
      if (formData.description) submitData.append('description', formData.description)
      if (formData.purchase_date) submitData.append('purchase_date', formData.purchase_date)
      if (formData.purchase_cost) submitData.append('purchase_cost', formData.purchase_cost)
      if (formData.current_value) submitData.append('current_value', formData.current_value)
      if (formData.assigned_to) submitData.append('assigned_to', formData.assigned_to)

      // Add asset detail fields
      if (formData.manufacturer) submitData.append('manufacturer', formData.manufacturer)
      if (formData.model_number) submitData.append('model_number', formData.model_number)
      if (formData.serial_number) submitData.append('serial_number', formData.serial_number)
      if (formData.condition) submitData.append('condition', formData.condition)
      if (formData.supplier) submitData.append('supplier', formData.supplier)

      submitData.append('specifications', JSON.stringify(formData.specifications))
      if (photoFile) submitData.append('photo', photoFile)

      const response = await api.post('/assets/assets/', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setMessage({
        type: 'success',
        text: `Asset created successfully! Asset ID: ${response.data.asset_id}`
      })

      setTimeout(() => {
        navigate('/dashboard/assets')
      }, 2000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to create asset'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2">Register New Asset</h1>
          <p className="text-blue-100 text-lg">Add a new asset to the inventory system</p>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 animate-slide-down ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            'bg-red-50 border-red-200 text-red-800'
          }`}>
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="hover:opacity-70">
            <FaTimes />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Asset Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Dell Laptop XPS 15"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Asset Type <span className="text-red-500">*</span>
              </label>
              <select
                name="asset_type"
                value={formData.asset_type}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="EQP">Equipment</option>
                <option value="FUR">Furniture</option>
                <option value="VEH">Vehicle</option>
                <option value="BLD">Building Component</option>
                <option value="OTH">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="CONDEMNED">Condemned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Purchase Cost (ETB)
              </label>
              <input
                type="number"
                name="purchase_cost"
                value={formData.purchase_cost}
                onChange={handleInputChange}
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Value (ETB)
              </label>
              <input
                type="number"
                name="current_value"
                value={formData.current_value}
                onChange={handleInputChange}
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter detailed description of the asset..."
            />
          </div>
        </div>

        {/* Asset Details */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaInfoCircle className="text-blue-600" />
            Asset Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Manufacturer/Brand
              </label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Dell, HP, Toyota"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Model Number
              </label>
              <input
                type="text"
                name="model_number"
                value={formData.model_number}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., XPS 15 9520"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Serial Number
              </label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., SN123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Condition
              </label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Supplier/Vendor
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Tech Solutions Ltd."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assign To User
              </label>
              <select
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Not Assigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaMapMarkerAlt className="text-blue-600" />
            Location Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Campus <span className="text-red-500">*</span>
              </label>
              <select
                name="campus"
                value={formData.campus}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                Building
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                disabled={!formData.campus}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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
                Floor
              </label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                disabled={!selectedBuilding}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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
                Room
              </label>
              <select
                name="room"
                value={formData.room}
                onChange={handleInputChange}
                disabled={!selectedFloor}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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

        {/* Specifications */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Specifications</h3>

          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={specKey}
              onChange={(e) => setSpecKey(e.target.value)}
              placeholder="Key (e.g., RAM)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={specValue}
              onChange={(e) => setSpecValue(e.target.value)}
              placeholder="Value (e.g., 16GB)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addSpecification}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Add
            </button>
          </div>

          {Object.keys(formData.specifications).length > 0 && (
            <div className="space-y-2">
              {Object.entries(formData.specifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-sm">
                    <span className="font-semibold">{key}:</span> {value}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSpecification(key)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaImage className="text-blue-600" />
            Asset Photo
          </h3>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
            {photoPreview ? (
              <div className="space-y-4">
                <img src={photoPreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null)
                    setPhotoPreview(null)
                  }}
                  className="text-red-600 hover:text-red-800 transition-colors font-semibold"
                >
                  Remove Photo
                </button>
              </div>
            ) : (
              <>
                <FaUpload className="text-5xl text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Click to upload photo
                </label>
                <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 10MB</p>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaSave />
            {loading ? 'Creating Asset...' : 'Create Asset'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/assets')}
            className="px-6 py-4 bg-gray-500 text-white rounded-xl font-bold hover:bg-gray-600 transition-all flex items-center gap-2"
          >
            <FaTimes />
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default AssetForm
