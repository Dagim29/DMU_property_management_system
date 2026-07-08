import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaEye, FaEyeSlash, FaArrowLeft, FaSignInAlt, FaUser, FaLock } from 'react-icons/fa'
import { login, clearError } from './authSlice'

function LoginPage() {
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    return () => {
      dispatch(clearError())
    }
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(login(credentials))
  }

  const quickLogin = (username, password) => {
    setCredentials({ username, password })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-10 rounded-full animate-float"></div>
      <div className="absolute -bottom-36 -left-36 w-[500px] h-[500px] bg-white opacity-5 rounded-full animate-float-slow"></div>

      <div className="container mx-auto px-4 relative z-10 max-w-md">
        <div className="mb-6">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              navigate('/')
            }}
            className="text-white hover:bg-white hover:bg-opacity-10 px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2"
          >
            <FaArrowLeft />
            Back to Home
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 text-center">
            <FaSignInAlt className="text-6xl mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-blue-100">Property Management System</p>
            <p className="text-blue-200 text-sm">Debre Markos University</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Username</label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Password</label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm text-gray-500">Quick Login (Demo)</span>
              </div>
            </div>

            {/* Quick Login Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => quickLogin('admin', 'admin123')}
                className="w-full text-left border-2 border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
              >
                <p className="font-semibold text-gray-800">Admin</p>
                <p className="text-sm text-gray-600">Full system access</p>
              </button>
              <button
                onClick={() => quickLogin('manager', 'manager123')}
                className="w-full text-left border-2 border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
              >
                <p className="font-semibold text-gray-800">Property Manager</p>
                <p className="text-sm text-gray-600">Asset & maintenance management</p>
              </button>
              <button
                onClick={() => quickLogin('supervisor', 'supervisor123')}
                className="w-full text-left border-2 border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
              >
                <p className="font-semibold text-gray-800">Maintenance Supervisor</p>
                <p className="text-sm text-gray-600">Assign & monitor work orders</p>
              </button>
              <button
                onClick={() => quickLogin('technician', 'tech123')}
                className="w-full text-left border-2 border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
              >
                <p className="font-semibold text-gray-800">Technician</p>
                <p className="text-sm text-gray-600">Complete assigned tasks</p>
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Need help? Contact support@dmu.edu.et
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-white text-sm opacity-90">
            © 2026 Debre Markos University. All rights reserved.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default LoginPage
