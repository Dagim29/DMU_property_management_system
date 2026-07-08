import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  FaSave, 
  FaTimes, 
  FaUpload, 
  FaImage,
  FaTrash,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa'
import api from '../../services/api'

const AssetEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
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
    specifications: {},
    assigned_to: ''
  })

  // Original data for comparison
  const [originalData, setOriginalData] = useState(null)

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
  const [currentPhoto, setCurrentPhoto] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  // Specifications
  const [specKey, setSpecKey] = useState('')
  const [specValue, setSpecValue] = useState('')

  useEffect(() => {
    fetchAsset()
    fetchCampuses()
    fetchUsers()
  }, [id])

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

  const fetchAsset = async () => {
    try {
      setFetchLoading(true)
      const response = await api.get(`/assets/assets/${id}/`)
      const asset = response.data
      
      setFormData({
        name: asset.name || '',
        asset_type: asset.asset_type || 'EQP',
        status: asset.status || 'AVAILABLE',
        campus: asset.campus || '',
        room: asset.room || '',
        description: asset.description || '',
        purchase_date: asset.purchase_date || '',
        purchase_cost: asset.purchase_cost || '',
        current_value: asset.current_value || '',
        manufacturer: asset.manufacturer || '',
        model_number: asset.model_number || '',
        serial_number: asset.serial_number || '',
        condition: asset.condition || 'GOOD',
        supplier: asset.supplier || '',
        specifications: asset.specifications || {},
        assigned_to: asset.assigned_to || ''
      })
      
      setOriginalData(asset)
      setCurrentPhoto(asset.photo)
      
      // Set building and floor if room is assigned
      if (asset.room) {
        const roomResponse = await api.get(`/assets/rooms/${asset.room}/`)
        const room = roomResponse.data
        setSelectedFloor(room.floor)
        
        const floorResponse = await api.get(`/assets/floors/${room.floor}/`)
        const floor = floorResponse.data
        setSelectedBuilding(floor.building)
      }
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

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/users/')
      const data = response.data.results || response.data
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching users:', error)
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
      setRemovePhoto(false)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setRemovePhoto(true)
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

  const getChanges = () => {
    const changes = {}
    Object.keys(formData).forEach(key => {
      if (JSON.stringify(formData[key]) !== JSON.stringify(originalData[key])) {
        changes[key] = formData[key]
      }
    })
    return changes
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.campus) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    try {
      setLoading(true)
      
      const submitData = new FormData()
      
      // Only send changed fields
      const changes = getChanges()
      Object.keys(changes).forEach(key => {
        if (key === 'specifications') {
          submitData.append(key, JSON.stringify(changes[key]))
        } else if (changes[key] !== null && changes[key] !== '') {
          submitData.append(key, changes[key])
        }
      })
      
      if (photoFile) {
        submitData.append('photo', photoFile)
      } else if (removePhoto) {
        submitData.append('photo', '')
      }

      await api.patch(`/assets/assets/${id}/`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setMessage({ 
        type: 'success', 
        text: 'Asset updated successfully!' 
      })
      
      setTimeout(() => {
        navigate(`/dashboard/assets/${id}`)
      }, 1500)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update asset' 
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
        
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2">Edit Asset</h1>
          <p className="text-orange-100 text-lg">Update asset information</p>
          {originalData && (
            <p className="text-orange-200 text-sm mt-2">Asset ID: {originalData.asset_id}</p>
          )}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="CONDEMNED">Condemned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assigned To
              </label>
              <select
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Not Assigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.username})
                  </option>
                ))}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Asset Details */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Asset Details</h3>
          
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., Tech Solutions Ltd."
              />
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Location Information</h3>
          
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <input
              type="text"
              value={specValue}
              onChange={(e) => setSpecValue(e.target.value)}
              placeholder="Value (e.g., 16GB)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addSpecification}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
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
            <FaImage className="text-orange-600" />
            Asset Photo
          </h3>
          
          {currentPhoto && !photoPreview && !removePhoto && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Current Photo:</p>
              <img src={currentPhoto} alt="Current" className="max-h-48 rounded-lg mb-2" />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-red-600 hover:text-red-800 transition-colors font-semibold flex items-center gap-2"
              >
                <FaTrash />
                Remove Current Photo
              </button>
            </div>
          )}
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-500 transition-colors">
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
                  Remove New Photo
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
                  className="cursor-pointer text-orange-600 hover:text-orange-700 font-semibold"
                >
                  Click to upload new photo
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
            className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaSave />
            {loading ? 'Updating Asset...' : 'Update Asset'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/dashboard/assets/${id}`)}
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

export default AssetEdit
