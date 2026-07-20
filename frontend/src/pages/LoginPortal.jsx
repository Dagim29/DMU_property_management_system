import { useState, useEffect } from 'react'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FaEye, FaEyeSlash, FaShieldAlt, FaCheckCircle, FaChartLine, FaClock, FaArrowLeft, FaPhone, FaEnvelope, FaBuilding, FaUserLock, FaTimes } from 'react-icons/fa'
import { login, clearError } from '../features/auth/authSlice'
import dmuLogo from '../assets/images/branding/dmu-logo.png'

const LoginPortal = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth)
  
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [currentBenefit, setCurrentBenefit] = useState(0)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const benefits = [
    { icon: FaChartLine, text: 'Managing 1,200+ Assets', subtext: 'Real-time Tracking' },
    { icon: FaShieldAlt, text: 'Maintenance SLA: 98% Compliance', subtext: 'Automated Escalation' },
    { icon: FaCheckCircle, text: 'Complete Audit Trail', subtext: 'Regulatory Ready' },
    { icon: FaClock, text: '60% Faster Response Time', subtext: 'Optimized Workflows' },
  ]

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    return () => {
      dispatch(clearError())
    }
  }, [dispatch])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBenefit((prev) => (prev + 1) % benefits.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(login(credentials))
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gray-50">
      {/* Back Button - Minimal Arrow at Edge */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-50 p-2 text-gray-800 lg:text-white hover:text-[#D4AF37] transition-colors duration-300"
        aria-label="Back to home"
      >
        <FaArrowLeft className="text-2xl" />
      </button>

      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230A2540' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Left Panel - Deep Blue Gradient */}
      <div className="hidden lg:flex lg:w-[40%] relative bg-gradient-to-br from-[#0A2540] via-[#0d2f52] to-[#0A2540]">
        {/* Topographic Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="topo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M10 10 Q 30 30, 50 10 T 90 10" stroke="#D4AF37" strokeWidth="0.5" fill="none" opacity="0.3"/>
                <path d="M10 30 Q 30 50, 50 30 T 90 30" stroke="#D4AF37" strokeWidth="0.5" fill="none" opacity="0.3"/>
                <path d="M10 50 Q 30 70, 50 50 T 90 50" stroke="#D4AF37" strokeWidth="0.5" fill="none" opacity="0.3"/>
                <path d="M10 70 Q 30 90, 50 70 T 90 70" stroke="#D4AF37" strokeWidth="0.5" fill="none" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#topo)"/>
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo and Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-2xl p-2">
                <img src={dmuLogo} alt="DMU Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#D4AF37]">DMU</h1>
                <p className="text-sm text-blue-200">Debre Markos University</p>
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3 leading-tight">
              Smart Asset<br />Stewardship
            </h2>
            <p className="text-blue-200 text-lg">
              Enterprise Property Management System
            </p>
          </motion.div>

          {/* Rotating Benefits Carousel */}
          <div className="my-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBenefit}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
                className="backdrop-blur-md bg-white/10 rounded-2xl p-8 border border-white/20 shadow-2xl"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#D4AF37] to-[#f4d03f] rounded-xl flex items-center justify-center flex-shrink-0">
                    {React.createElement(benefits[currentBenefit].icon, { className: "text-2xl text-[#0A2540]" })}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 text-white">
                      {benefits[currentBenefit].text}
                    </h3>
                    <p className="text-blue-200 text-lg">
                      {benefits[currentBenefit].subtext}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {benefits.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBenefit(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentBenefit
                      ? 'w-8 bg-[#D4AF37]'
                      : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to benefit ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="flex items-center gap-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-blue-200">System Operational</span>
            </div>
            <div className="w-px h-4 bg-white/20"></div>
            <span className="text-blue-200">99.9% Uptime</span>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <motion.div variants={itemVariants} className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-lg p-2">
                <img src={dmuLogo} alt="DMU Logo" className="w-full h-full object-contain" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-[#0A2540]">DMU</h1>
                <p className="text-xs text-gray-600">Property Management</p>
              </div>
            </div>
          </motion.div>

          {/* Login Card */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10 border border-gray-100 relative"
          >
            {/* Gold Accent Line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent rounded-full"></div>

            {/* Header */}
            <motion.div variants={itemVariants} className="text-center mb-8">
              <h2 className="text-3xl font-bold text-[#0A2540] mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to DMU Property Management</p>
            </motion.div>

            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg"
              >
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email/ID Field */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email or Staff ID
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A2540] focus:border-transparent outline-none transition-all shadow-inner bg-gray-50"
                  placeholder="Enter your email or staff ID"
                />
              </motion.div>

              {/* Password Field */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    required
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A2540] focus:border-transparent outline-none transition-all shadow-inner bg-gray-50"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0A2540] transition-colors"
                  >
                    {showPassword ? <FaEyeSlash className="text-xl" /> : <FaEye className="text-xl" />}
                  </button>
                </div>
              </motion.div>

              {/* Remember Me & Forgot Password */}
              <motion.div variants={itemVariants} className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#0A2540] border-gray-300 rounded focus:ring-[#0A2540] cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-[#0A2540] transition-colors">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#0A2540] hover:text-[#D4AF37] font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </motion.div>

              {/* Submit Button */}
              <motion.div variants={itemVariants}>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full bg-gradient-to-r from-[#0A2540] to-[#0d2f52] text-white py-4 rounded-xl font-bold text-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Signing In...
                      </>
                    ) : (
                      <>
                        <FaShieldAlt />
                        Secure Login
                      </>
                    )}
                  </span>
                  {/* Gold Underline Animation */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </button>
              </motion.div>
            </form>

            {/* Footer Note */}
            <motion.div variants={itemVariants} className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Authorized personnel only. All activities are logged.
              </p>
            </motion.div>
          </motion.div>

          {/* Support Link */}
          <motion.div variants={itemVariants} className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <button className="text-[#0A2540] hover:text-[#D4AF37] font-medium transition-colors">
                Contact IT Support
              </button>
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowForgotPassword(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#0A2540] to-[#0d2f52] p-4 text-white relative">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
                >
                  <FaTimes className="text-lg" />
                </button>
                <div className="flex items-center gap-2">
                  <FaUserLock className="text-xl" />
                  <div>
                    <h2 className="text-lg font-bold">Password Reset</h2>
                    <p className="text-white/70 text-xs">Contact IT Support</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <p className="text-sm text-gray-600 mb-4">
                  For security, password resets require IT Support verification.
                </p>
                
                <div className="space-y-2.5 mb-4">
                  {/* Phone */}
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="bg-[#D4AF37] p-2 rounded-lg">
                      <FaPhone className="text-white text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">Phone</p>
                      <p className="text-sm text-gray-700">+251-58-771-1811</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="bg-[#D4AF37] p-2 rounded-lg">
                      <FaEnvelope className="text-white text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">Email</p>
                      <p className="text-sm text-gray-700">itsupport@dmu.edu.et</p>
                    </div>
                  </div>

                  {/* Office */}
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="bg-[#D4AF37] p-2 rounded-lg">
                      <FaBuilding className="text-white text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">IT Office</p>
                      <p className="text-sm text-gray-700">Mon-Fri: 8AM - 5PM</p>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-900 font-medium mb-1">📋 Please Prepare:</p>
                  <ul className="text-xs text-blue-800 space-y-0.5 ml-3">
                    <li>• Username or ID number</li>
                    <li>• Valid identification</li>
                  </ul>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full bg-gradient-to-r from-[#0A2540] to-[#0d2f52] text-white py-2.5 rounded-lg font-semibold text-sm hover:shadow-lg transition-all duration-300"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LoginPortal
