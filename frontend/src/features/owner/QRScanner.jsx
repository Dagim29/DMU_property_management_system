import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera,
  X,
  Zap,
  Package,
  Wrench,
  Clock,
  Share2,
  Star,
  AlertCircle,
  CheckCircle,
  Loader,
  Keyboard,
  Upload,
  Image as ImageIcon
} from 'lucide-react'
import useToast from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

export default function QRScanner() {
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const [scanning, setScanning] = useState(false)
  const [scannedAsset, setScannedAsset] = useState(null)
  const [availableActions, setAvailableActions] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cameraPermission, setCameraPermission] = useState(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualAssetId, setManualAssetId] = useState('')
  const [captureMode, setCaptureMode] = useState(false) // New: manual capture mode
  const [uploadMode, setUploadMode] = useState(false) // New: image upload mode
  const [uploadedImage, setUploadedImage] = useState(null) // Preview of uploaded image
  
  const html5QrCodeRef = useRef(null)
  const scannerRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {
          // Ignore errors on cleanup
        })
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      setScanning(true)
      setCaptureMode(true)
      
      // Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check if element exists
      const element = document.getElementById("qr-reader")
      if (!element) {
        throw new Error("QR reader element not found")
      }
      
      // Initialize scanner
      html5QrCodeRef.current = new Html5Qrcode("qr-reader")
      
      // Start camera with a dummy callback (we'll use manual capture)
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        () => {}, // Dummy success callback (required by library)
        () => {}  // Dummy error callback
      )
      
      setCameraPermission('granted')
    } catch (err) {
      console.error('Error starting scanner:', err)
      setError('Failed to access camera. Please check permissions.')
      setCameraPermission('denied')
      setScanning(false)
      setCaptureMode(false)
    }
  }

  const captureImage = async () => {
    if (!html5QrCodeRef.current) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Pause the camera
      await html5QrCodeRef.current.pause()
      
      // Get the video element
      const video = document.querySelector('#qr-reader video')
      if (!video) {
        throw new Error("Camera not ready")
      }
      
      // Create canvas and capture frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png')
      })
      
      if (!blob) {
        throw new Error("Failed to capture image")
      }
      
      // Create file and scan
      const file = new File([blob], "capture.png", { type: "image/png" })
      const qrCodeMessage = await html5QrCodeRef.current.scanFile(file, false)
      
      // Stop camera and process
      await stopScanning()
      await processQRCode(qrCodeMessage)
    } catch (err) {
      console.error('Error capturing QR code:', err)
      setError('No QR code detected. Align the QR code and try again.')
      setLoading(false)
      
      // Resume camera if still running
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.resume()
        } catch (resumeErr) {
          console.error('Error resuming camera:', resumeErr)
        }
      }
    }
  }

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
    setScanning(false)
    setCaptureMode(false)
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file')
      return
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file is too large. Maximum size is 10MB')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target.result)
      }
      reader.readAsDataURL(file)
      
      // Initialize Html5Qrcode for file scanning
      const html5QrCode = new Html5Qrcode("qr-reader-upload")
      
      // Scan the uploaded file
      const qrCodeMessage = await html5QrCode.scanFile(file, false)
      
      // Process the QR code
      await processQRCode(qrCodeMessage)
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Error scanning uploaded image:', err)
      setError('No QR code detected in the uploaded image. Please try another image.')
      setLoading(false)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const onScanSuccess = async (decodedText) => {
    // This is for auto-scan mode (not used in manual capture mode)
    await stopScanning()
    await processQRCode(decodedText)
  }

  const onScanFailure = () => {
    // Ignore scan failures (happens frequently)
  }

  const processQRCode = async (qrData) => {
    setLoading(true)
    setError(null)
    
    let queryData = qrData.trim()
    let isUrl = false
    let urlAssetId = null
    
    // Check if the QR data contains our frontend URL
    const urlMatch = queryData.match(/\/dashboard\/assets\/([a-zA-Z0-9-]+)/)
    if (urlMatch) {
      isUrl = true
      urlAssetId = urlMatch[1] // UUID of the asset
    }

    // Check if QR data contains a plain asset ID (starts with DMU-)
    const idMatch = queryData.match(/DMU-[A-Z]+-[A-Z]+-\d+/)
    const isPlainAssetId = idMatch !== null
    const assetIdQuery = idMatch ? idMatch[0] : null
    
    if (isPlainAssetId || isUrl) {
      // Skip encryption attempt for plain asset IDs or URLs
      try {
        let apiUrl = `http://localhost:8000/api/assets/assets/?search=${assetIdQuery}`
        if (isUrl && urlAssetId) {
          apiUrl = `http://localhost:8000/api/assets/assets/${urlAssetId}/`
        }

        const response = await axios.get(
          apiUrl,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        
        const asset = isUrl ? response.data : (response.data.results && response.data.results.length > 0 ? response.data.results[0] : null)
        
        if (asset && !asset.detail) {
          setScannedAsset(asset)
          setAvailableActions(['view_details', 'view_history', 'report_maintenance', 'share'])
          setLoading(false)
        } else {
          setError('Asset not found. Please check the QR code or asset ID.')
          setLoading(false)
        }
      } catch (err) {
        console.error('Error processing plain asset ID / URL:', err)
        setError('Failed to find asset. Please try again or enter the asset ID manually.')
        setLoading(false)
      }
      return
    }
    
    // Try encrypted QR code for non-plain-text data
    try {
      const response = await axios.post(
        'http://localhost:8000/api/owner/qr/scan/',
        { qr_data: qrData },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setScannedAsset(response.data.asset)
      setAvailableActions(response.data.actions)
      setLoading(false)
    } catch (err) {
      // If encrypted scan fails, try as plain asset ID (fallback for edge cases)
      if (err.response?.status === 400 && err.response?.data?.is_encrypted === false) {
        try {
          const response = await axios.get(
            `http://localhost:8000/api/assets/assets/?search=${qrData}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          
          if (response.data.results && response.data.results.length > 0) {
            const asset = response.data.results[0]
            setScannedAsset(asset)
            setAvailableActions(['view_details', 'view_history', 'report_maintenance', 'share'])
            setLoading(false)
          } else {
            setError('Asset not found. Please check the QR code or asset ID.')
            setLoading(false)
          }
        } catch (plainErr) {
          console.error('Error processing plain asset ID:', plainErr)
          setError('Failed to find asset. Please try again or enter the asset ID manually.')
          setLoading(false)
        }
      } else {
        console.error('Error processing QR code:', err)
        setError(err.response?.data?.error || 'Failed to process QR code. Please try again.')
        setLoading(false)
      }
    }
  }

  const handleManualEntry = async () => {
    if (!manualAssetId.trim()) {
      setError('Please enter an asset ID')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // For manual entry, we'll fetch the asset directly
      const response = await axios.get(
        `http://localhost:8000/api/assets/assets/?search=${manualAssetId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (response.data.results && response.data.results.length > 0) {
        const asset = response.data.results[0]
        setScannedAsset(asset)
        setAvailableActions(['view_details', 'view_history', 'report_maintenance', 'share'])
        setManualEntry(false)
      } else {
        setError('Asset not found')
      }
    } catch (err) {
      console.error('Error fetching asset:', err)
      setError('Failed to fetch asset')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (action) => {
    switch (action) {
      case 'view_details':
        // Route to owner-specific asset detail view
        navigate(`/dashboard/owner/asset-detail/${scannedAsset.id}`)
        break
      case 'view_history':
        // Route to asset history in owner portal
        navigate(`/dashboard/owner/asset-detail/${scannedAsset.id}`, { state: { activeTab: 'history' } })
        break
      case 'report_maintenance':
        // Route to quick maintenance form with asset pre-selected
        navigate(`/dashboard/owner/qr-maintenance/${scannedAsset.id}`)
        break
      case 'request_checkout':
        // This action is for assets not yet checked out
        navigate(`/dashboard/owner/my-checkouts`, { state: { requestCheckout: scannedAsset.id } })
        break
      case 'view_my_asset':
        // Route to owner asset detail view
        navigate(`/dashboard/owner/asset-detail/${scannedAsset.id}`)
        break
      case 'share':
        handleShare()
        break
      default:
        break
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: scannedAsset.name,
        text: `Check out this asset: ${scannedAsset.asset_id}`,
        url: window.location.origin + `/dashboard/assets/${scannedAsset.id}`
      }).catch(console.error)
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(
        `${scannedAsset.name} (${scannedAsset.asset_id})\n${window.location.origin}/dashboard/assets/${scannedAsset.id}`
      )
      showSuccess('Asset info copied to clipboard!')
    }
  }

  const resetScanner = () => {
    setScannedAsset(null)
    setAvailableActions([])
    setError(null)
    setManualAssetId('')
    setUploadMode(false)
    setUploadedImage(null)
  }

  const getActionIcon = (action) => {
    const icons = {
      view_details: Package,
      view_history: Clock,
      report_maintenance: Wrench,
      request_checkout: CheckCircle,
      view_my_asset: Star,
      share: Share2
    }
    return icons[action] || Package
  }

  const getActionLabel = (action) => {
    const labels = {
      view_details: 'View Details',
      view_history: 'View History',
      report_maintenance: 'Report Issue',
      request_checkout: 'Request Checkout',
      view_my_asset: 'My Asset',
      share: 'Share'
    }
    return labels[action] || action
  }

  const getActionColor = (action) => {
    const colors = {
      view_details: 'from-blue-500 to-blue-600',
      view_history: 'from-purple-500 to-purple-600',
      report_maintenance: 'from-orange-500 to-orange-600',
      request_checkout: 'from-green-500 to-green-600',
      view_my_asset: 'from-indigo-500 to-indigo-600',
      share: 'from-pink-500 to-pink-600'
    }
    return colors[action] || 'from-gray-500 to-gray-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">QR Scanner</h1>
                <p className="text-sm text-gray-600">Scan asset QR codes for quick access</p>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {!scannedAsset ? (
          <>
            {/* Hidden file input for image upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {/* Hidden div for Html5Qrcode file scanning */}
            <div id="qr-reader-upload" style={{ display: 'none' }}></div>
            
            {/* Scanner View */}
            {!manualEntry && !uploadMode ? (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                {!scanning ? (
                  <div className="text-center py-12">
                    <div className="mb-6">
                      <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                        <Camera className="h-16 w-16 text-indigo-600" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Scan</h2>
                    <p className="text-gray-600 mb-8">
                      Point your camera at an asset QR code
                    </p>
                    
                    {error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                          <p className="font-semibold text-red-900">Error</p>
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <button
                        onClick={startScanning}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                      >
                        <Camera className="h-5 w-5" />
                        Start Scanning
                      </button>
                      
                      <button
                        onClick={triggerFileUpload}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                      >
                        <Upload className="h-5 w-5" />
                        Upload QR Image
                      </button>
                      
                      <button
                        onClick={() => setManualEntry(true)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                      >
                        <Keyboard className="h-5 w-5" />
                        Enter Asset ID Manually
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div id="qr-reader" ref={scannerRef} className="rounded-xl overflow-hidden mb-4" style={{ width: '100%' }}></div>
                    
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    )}
                    
                    {loading && (
                      <div className="flex items-center justify-center gap-2 text-indigo-600 mb-4">
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Processing QR code...</span>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <button
                        onClick={captureImage}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50"
                      >
                        <Camera className="h-5 w-5" />
                        {loading ? 'Processing...' : 'Capture QR Code'}
                      </button>
                      
                      <button
                        onClick={stopScanning}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                      >
                        <X className="h-5 w-5" />
                        Stop Camera
                      </button>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-sm text-blue-800">
                        <strong>Tip:</strong> Align the QR code within the square frame, then tap "Capture QR Code" to scan.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : uploadMode ? (
              /* Image Upload View */
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Upload QR Code Image</h2>
                
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                
                {uploadedImage && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Preview:</p>
                    <img
                      src={uploadedImage}
                      alt="Uploaded QR Code"
                      className="w-full max-w-md mx-auto rounded-xl border-2 border-gray-200"
                    />
                  </div>
                )}
                
                {loading && (
                  <div className="flex items-center justify-center gap-2 text-indigo-600 mb-4 py-8">
                    <Loader className="h-6 w-6 animate-spin" />
                    <span>Scanning QR code from image...</span>
                  </div>
                )}
                
                <div className="space-y-3">
                  <button
                    onClick={triggerFileUpload}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50"
                  >
                    <ImageIcon className="h-5 w-5" />
                    {uploadedImage ? 'Upload Another Image' : 'Choose Image'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setUploadMode(false)
                      setUploadedImage(null)
                      setError(null)
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                  >
                    <Camera className="h-5 w-5" />
                    Use Camera Instead
                  </button>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Upload a clear image of the QR code. Supported formats: JPG, PNG, GIF. Max size: 10MB.
                  </p>
                </div>
              </div>
            ) : manualEntry ? (
              /* Manual Entry View */
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Enter Asset ID</h2>
                
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                
                <input
                  type="text"
                  value={manualAssetId}
                  onChange={(e) => setManualAssetId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualEntry()}
                  placeholder="e.g., DMU-MAIN-EQP-00001"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none mb-4"
                />
                
                <div className="space-y-3">
                  <button
                    onClick={handleManualEntry}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Find Asset
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setManualEntry(false)
                      setError(null)
                      setManualAssetId('')
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                  >
                    <Camera className="h-5 w-5" />
                    Use Camera Instead
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          /* Scanned Asset Actions */
          <div className="space-y-6">
            {/* Asset Info Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  {scannedAsset.photo ? (
                    <img
                      src={scannedAsset.photo}
                      alt={scannedAsset.name}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                      <Package className="h-10 w-10 text-indigo-600" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{scannedAsset.name}</h2>
                    <p className="text-sm text-gray-600 mb-2">{scannedAsset.asset_id}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        scannedAsset.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                        scannedAsset.status === 'IN_USE' ? 'bg-blue-100 text-blue-800' :
                        scannedAsset.status === 'UNDER_MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {scannedAsset.status.replace('_', ' ')}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                        {scannedAsset.asset_type}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetScanner}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              
              {scannedAsset.description && (
                <p className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-200">
                  {scannedAsset.description}
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-600" />
                Quick Actions
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {availableActions.map((action) => {
                  const Icon = getActionIcon(action)
                  return (
                    <button
                      key={action}
                      onClick={() => handleAction(action)}
                      className={`flex flex-col items-center gap-2 p-4 bg-gradient-to-br ${getActionColor(action)} text-white rounded-xl hover:shadow-lg transition-all`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-semibold">{getActionLabel(action)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Scan Another */}
            <button
              onClick={resetScanner}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              <Camera className="h-5 w-5" />
              Scan Another Asset
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
