import { useState, useEffect } from 'react'
import { FaClock, FaTimes } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'

const SessionTimeoutWarning = () => {
  const [showWarning, setShowWarning] = useState(false)
  const [showExpired, setShowExpired] = useState(false)
  const [minutesRemaining, setMinutesRemaining] = useState(5)

  useEffect(() => {
    const handleWarning = (event) => {
      setMinutesRemaining(event.detail.minutesRemaining)
      setShowWarning(true)
    }

    const handleExpired = (event) => {
      setShowWarning(false)
      setShowExpired(true)
      
      // Auto-hide expired message after 5 seconds
      setTimeout(() => {
        setShowExpired(false)
      }, 5000)
    }

    window.addEventListener('session-warning', handleWarning)
    window.addEventListener('session-expired', handleExpired)

    return () => {
      window.removeEventListener('session-warning', handleWarning)
      window.removeEventListener('session-expired', handleExpired)
    }
  }, [])

  const handleDismiss = () => {
    setShowWarning(false)
  }

  return (
    <>
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-[9999] max-w-md"
          >
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <FaClock className="text-yellow-600 text-2xl animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="text-yellow-800 font-bold text-lg mb-1">
                    Session Timeout Warning
                  </h3>
                  <p className="text-yellow-700 text-sm">
                    Your session will expire in <strong>{minutesRemaining} minutes</strong> due to inactivity.
                  </p>
                  <p className="text-yellow-600 text-xs mt-2">
                    Move your mouse or press any key to stay logged in.
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 text-yellow-600 hover:text-yellow-800 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExpired && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaClock className="text-red-600 text-4xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Session Expired
              </h2>
              <p className="text-gray-600 mb-4">
                Your session has expired due to inactivity. You will be redirected to the login page.
              </p>
              <div className="text-sm text-gray-500">
                Redirecting in a moment...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default SessionTimeoutWarning
