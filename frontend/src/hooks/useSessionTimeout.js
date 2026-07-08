import { useEffect, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../features/auth/authSlice'

/**
 * Custom hook to handle session timeout and inactivity detection
 * @param {number|null} timeoutMinutes - Session timeout in minutes from SystemSettings (null to disable)
 * @param {number} warningMinutes - Minutes before timeout to show warning (default: 5)
 */
const useSessionTimeout = (timeoutMinutes = 60, warningMinutes = 5) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const timeoutRef = useRef(null)
  const warningTimeoutRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  // Convert minutes to milliseconds
  const timeoutMs = timeoutMinutes * 60 * 1000
  const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000
  const isEnabled = !!timeoutMinutes

  const handleLogout = useCallback(() => {
    if (!isEnabled) return
    
    dispatch(logout())
    navigate('/login')
    
    // Show notification
    const event = new CustomEvent('session-expired', {
      detail: { message: 'Your session has expired due to inactivity. Please login again.' }
    })
    window.dispatchEvent(event)
  }, [dispatch, navigate, isEnabled])

  const showWarning = useCallback(() => {
    if (!isEnabled) return
    
    const event = new CustomEvent('session-warning', {
      detail: { 
        message: `Your session will expire in ${warningMinutes} minutes due to inactivity.`,
        minutesRemaining: warningMinutes
      }
    })
    window.dispatchEvent(event)
  }, [warningMinutes, isEnabled])

  const resetTimer = useCallback(() => {
    if (!isEnabled) return
    
    lastActivityRef.current = Date.now()

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      showWarning()
    }, warningMs)

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout()
    }, timeoutMs)
  }, [timeoutMs, warningMs, showWarning, handleLogout, isEnabled])

  useEffect(() => {
    if (!isEnabled) return

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    // Throttle activity detection to avoid excessive timer resets
    let throttleTimeout = null
    const handleActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          resetTimer()
          throttleTimeout = null
        }, 1000) // Throttle to once per second
      }
    }

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Initialize timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout)
      }
    }
  }, [resetTimer, isEnabled])

  return {
    resetTimer,
    lastActivity: lastActivityRef.current
  }
}

export default useSessionTimeout
