import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { QrCode, Download, Copy, CheckCircle } from 'lucide-react'

export default function QRCodeGenerator() {
  const { token } = useSelector((state) => state.auth)
  const [assets, setAssets] = useState([])
  const [selectedAsset, setSelectedAsset] = useState('')
  const [qrData, setQrData] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      const response = await axios.get(
        'http://localhost:8000/api/assets/assets/',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setAssets(response.data.results || [])
    } catch (error) {
      console.error('Error fetching assets:', error)
    }
  }

  const generateQR = async () => {
    if (!selectedAsset) return

    try {
      const response = await axios.get(
        `http://localhost:8000/api/owner/qr-generate/test_data/?asset_id=${selectedAsset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setQrData(response.data)
    } catch (error) {
      console.error('Error generating QR:', error)
    }
  }

  const copyEncryptedData = () => {
    navigator.clipboard.writeText(qrData.encrypted_data)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = () => {
    window.open(
      `http://localhost:8000/api/owner/qr-generate/generate/?asset_id=${selectedAsset}`,
      '_blank'
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">QR Code Generator</h1>
              <p className="text-sm text-gray-600">Generate encrypted QR codes for testing</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Asset Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Select Asset
              </label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
              >
                <option value="">Choose an asset...</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.asset_id}>
                    {asset.asset_id} - {asset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateQR}
              disabled={!selectedAsset}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <QrCode className="h-5 w-5" />
              Generate QR Code
            </button>

            {/* QR Code Display */}
            {qrData && (
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Generated QR Code</h3>
                  
                  {/* QR Code Image */}
                  <div className="bg-white p-6 rounded-xl mb-4 flex justify-center">
                    <img
                      src={`http://localhost:8000/api/owner/qr-generate/generate/?asset_id=${selectedAsset}`}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>

                  {/* Encrypted Data */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Encrypted Data (for manual testing)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={qrData.encrypted_data}
                        readOnly
                        className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-mono"
                      />
                      <button
                        onClick={copyEncryptedData}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={downloadQR}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <Download className="h-5 w-5" />
                    Download QR Code
                  </button>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-bold text-blue-900 mb-2">Testing Instructions</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Download the QR code image or display it on another device</li>
                    <li>Go to the QR Scanner page</li>
                    <li>Point your camera at the QR code</li>
                    <li>The scanner should detect and process the code automatically</li>
                    <li>Alternatively, copy the encrypted data and paste it in manual entry mode</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
