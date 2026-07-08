import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  FaBox,
  FaTools,
  FaChartBar,
  FaShieldAlt,
  FaArrowRight,
  FaCheckCircle,
  FaArrowDown,
  FaArrowUp,
} from 'react-icons/fa'
import dmuLogo from '../assets/images/branding/dmu-logo.png'
import campusImage from '../assets/images/campus/campus-main.jpg'
import campusImage1 from '../assets/images/campus/campus.jpg'

// ─── Animated Counter Hook ───────────────────────────────────────────────────
const useCountUp = (target, duration = 2000, active = false) => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, active])
  return count
}

// ─── Intersection Observer Hook ──────────────────────────────────────────────
const useInView = (threshold = 0.15) => {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, inView]
}

// ─── Animated Section Wrapper ─────────────────────────────────────────────────
const AnimatedSection = ({ children, className = '', delay = 0 }) => {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useSelector((state) => state.auth)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [statsRef, statsInView] = useInView(0.3)

  const assetsCount = useCountUp(1200, 2000, statsInView)
  const slaCount = useCountUp(98, 2000, statsInView)
  const uptimeCount = useCountUp(999, 2000, statsInView)

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const scrollDown = useCallback(() => {
    window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' })
  }, [])

  const features = [
    {
      icon: FaBox,
      title: 'Asset Management',
      description:
        'Comprehensive tracking and management of all university assets with QR codes and location monitoring.',
    },
    {
      icon: FaTools,
      title: 'Maintenance System',
      description:
        'Streamlined maintenance request submission, assignment, and tracking with SLA compliance.',
    },
    {
      icon: FaChartBar,
      title: 'Reports & Analytics',
      description:
        'Real-time insights and comprehensive reports on asset inventory and maintenance costs.',
    },
    {
      icon: FaShieldAlt,
      title: 'Secure & Compliant',
      description:
        'Role-based access control with complete audit trails for regulatory compliance.',
    },
  ]

  const benefits = [
    'Complete asset visibility across all campuses',
    'Automated SLA tracking and escalation',
    'Comprehensive audit trails for compliance',
    'Mobile-friendly interface for field staff',
    'Real-time reporting and analytics',
    'Preventive maintenance scheduling',
  ]



  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

      {/* ── Navigation Bar ─────────────────────────────────────────────── */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1">
                <img src={dmuLogo} alt="DMU Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#0A2540]">DMU Property Management System</h1>
                <p className="text-xs text-gray-600">Debre Markos University</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="bg-[#0A2540] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#D4AF37] hover:text-[#0A2540] transition-all duration-300"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#0A2540] via-[#0d2f52] to-[#0A2540] text-white overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container mx-auto px-4 py-10 md:py-16 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left Column */}
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">System Operational</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                Property Management
                <span className="block text-[#D4AF37] mt-2">System</span>
              </h1>

              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Comprehensive asset tracking and maintenance management solution for Debre Markos University
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="group bg-[#D4AF37] text-[#0A2540] px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#f4d03f] transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1"
                >
                  Access System
                  <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Animated Stats */}
              <div ref={statsRef} className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/20">
                <div>
                  <div className="text-3xl font-bold text-[#D4AF37] mb-1">{assetsCount.toLocaleString()}+</div>
                  <div className="text-sm text-blue-200">Assets Managed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#D4AF37] mb-1">{slaCount}%</div>
                  <div className="text-sm text-blue-200">SLA Compliance</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#D4AF37] mb-1">
                    {(uptimeCount / 10).toFixed(1)}%
                  </div>
                  <div className="text-sm text-blue-200">Uptime</div>
                </div>
              </div>
            </div>

            {/* Right Column — Campus Image */}
            <div className="hidden md:block animate-float">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] rounded-3xl blur-2xl opacity-30" />
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 min-h-[350px]">
                  <img
                    src={campusImage}
                    alt="Debre Markos University Campus"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 w-16 h-16 bg-white rounded-xl shadow-xl p-2">
                    <img src={dmuLogo} alt="DMU Logo" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll-down cue */}
        <button
          onClick={scrollDown}
          aria-label="Scroll down"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50 hover:text-white transition-colors animate-bounce z-20"
        >
          <FaArrowDown className="text-2xl" />
        </button>

        {/* Wave Divider */}
        <div className="absolute -bottom-6 left-0 right-0">
          <svg viewBox="0 0 1440 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0,50 C200,95 400,5 600,50 C800,95 1000,5 1200,50 C1300,72 1380,38 1440,50 L1440,100 L0,100 Z"
              fill="white"
            />
          </svg>
        </div>
      </div>


      {/* ── Features Section ────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-20">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#0A2540] mb-4">Core Features</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to manage university property efficiently
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 100}>
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 h-full group">
                <div className="w-16 h-16 bg-gradient-to-br from-[#0A2540] to-[#0d2f52] rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="text-3xl text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-bold text-[#0A2540] mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>

      {/* ── Benefits Section ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-50 to-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Benefits list */}
            <AnimatedSection>
              <h2 className="text-4xl md:text-5xl font-bold text-[#0A2540] mb-6">
                Why Choose Our System?
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Built specifically for educational institutions with a focus on efficiency, compliance, and ease of use.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, i) => (
                  <AnimatedSection key={benefit} delay={i * 80}>
                    <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-md hover:shadow-lg hover:border-l-4 hover:border-[#0A2540] hover:-translate-x-0 hover:translate-x-1 transition-all duration-200 cursor-default">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                        <FaCheckCircle className="text-white text-sm" />
                      </div>
                      <p className="text-gray-700 font-medium">{benefit}</p>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </AnimatedSection>

            {/* Campus Image */}
            <AnimatedSection delay={200} className="animate-float">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-3xl blur-2xl opacity-20" />
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white min-h-[350px]">
                  <img
                    src={campusImage1}
                    alt="DMU Campus Facilities"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>

      {/* ── CTA Section ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-20">
        <AnimatedSection>
          <div className="bg-gradient-to-br from-[#0A2540] to-[#0d2f52] rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37] rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Join the 1,200+ assets already tracked and managed across Debre Markos University.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="group bg-[#D4AF37] text-[#0A2540] px-12 py-5 rounded-xl text-xl font-bold hover:bg-[#f4d03f] transition-all duration-300 inline-flex items-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                Sign In Now
                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </AnimatedSection>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#0A2540] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                  <img src={dmuLogo} alt="DMU Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">DMU</h3>
                  <p className="text-xs text-blue-200">Property Management</p>
                </div>
              </div>
              <p className="text-blue-200 text-sm leading-relaxed">
                Debre Markos University<br />
                Comprehensive asset and maintenance management solution
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-[#D4AF37]">Quick Links</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="block text-blue-200 hover:text-white transition-colors text-sm"
                >
                  → Sign In
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="block text-blue-200 hover:text-white transition-colors text-sm"
                >
                  → Asset Management
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="block text-blue-200 hover:text-white transition-colors text-sm"
                >
                  → Maintenance Requests
                </button>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-[#D4AF37]">Contact</h3>
              <p className="text-blue-200 text-sm leading-relaxed">
                Email: support@dmu.edu.et<br />
                Debre Markos, Ethiopia<br />
                Amhara Region
              </p>
            </div>
          </div>

          <div className="border-t border-white/20 pt-8 text-center">
            <p className="text-blue-300 text-sm">
              © 2026 Debre Markos University. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* ── Back to Top Button ───────────────────────────────────────────── */}
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        style={{
          opacity: showBackToTop ? 1 : 0,
          pointerEvents: showBackToTop ? 'auto' : 'none',
          transform: showBackToTop ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
        className="fixed bottom-8 right-8 z-50 w-12 h-12 bg-[#D4AF37] text-[#0A2540] rounded-full shadow-xl flex items-center justify-center hover:bg-[#f4d03f] hover:shadow-2xl hover:-translate-y-1"
      >
        <FaArrowUp className="text-lg" />
      </button>
    </div>
  )
}

export default LandingPage
