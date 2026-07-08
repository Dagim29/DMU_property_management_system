import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaSave, FaTimes, FaExchangeAlt } from 'react-icons/fa'
import api from '../../services/api'

const CheckoutForm = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [assets, setAssets] = useState([])
  const [users, setUsers] = useState([])
  const [message, setMessage] = useState(null)
  
  const [formData, setFormData] = useState({
    asset: '',
    checked_out_to: '',
    expected_return_date: '',
    checkout_condition: 'GOOD',
    purpose: '',
    notes: ''
  })

  useEffect(() => {
    fetchAssets()
    fetchUsers()
  }, [])

  const fetchAssets = async () => {
    try {
      setAssetsLoading(true)
      // Fetch only AVAILABLE assets - the backend should handle this correctly
      const response = await api.get('/assets/assets/?status=AVAILABLE')
      const data = response.data.results || response.data
      setAssets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching assets:', error)
      setAssets([])
    } finally {
      setAssetsLoading(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      await api.post('/assets/checkouts/', formData)
      setMessage({ type: 'success', text: 'Asset checked out successfully!' })
      setTimeout(() => navigate('/dashboard/assets/management'), 1500)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to checkout asset' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FaExchangeAlt />
            Checkout Asset
          </h1>
          <p className="text-teal-100 text-lg">Assign an asset to a user temporarily</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl border-2 ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Asset <span className="text-red-500">*</span>
            </label>
            <select
              name="asset"
              value={formData.asset}
              onChange={handleInputChange}
              required
              disabled={assetsLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">
                {assetsLoading ? 'Loading assets...' : assets.length === 0 ? 'No available assets' : 'Select Available Asset'}
              </option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_id} - {asset.name} ({asset.campus_name})
                </option>
              ))}
            </select>
            {!assetsLoading && assets.length === 0 && (
              <p className="text-sm text-orange-600 mt-1">
                No assets available for checkout. All assets may be checked out or under maintenance.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Checkout To <span className="text-red-500">*</span>
            </label>
            <select
              name="checked_out_to"
              value={formData.checked_out_to}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Select User</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Expected Return Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="expected_return_date"
              value={formData.expected_return_date}
              onChange={handleInputChange}
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Checkout Condition <span className="text-red-500">*</span>
            </label>
            <select
              name="checkout_condition"
              value={formData.checkout_condition}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Purpose <span className="text-red-500">*</span>
            </label>
            <textarea
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              required
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Describe the purpose of this checkout..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FaSave />
            {loading ? 'Processing...' : 'Checkout Asset'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/assets/management')}
            className="px-6 py-3 bg-gray-500 text-white rounded-xl font-bold hover:bg-gray-600 transition-all flex items-center gap-2"
          >
            <FaTimes />
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default CheckoutForm
