import { useNavigate } from 'react-router-dom'
import { FaHome, FaArrowLeft } from 'react-icons/fa'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center text-white">
          <h1 className="text-9xl md:text-[12rem] font-bold mb-4">404</h1>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Page Not Found</h2>
          <p className="text-lg md:text-xl mb-8 opacity-90">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center gap-2"
            >
              <FaHome />
              Go Home
            </button>
            <button
              onClick={() => navigate(-1)}
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:bg-opacity-10 transition-all duration-300 flex items-center gap-2"
            >
              <FaArrowLeft />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound
