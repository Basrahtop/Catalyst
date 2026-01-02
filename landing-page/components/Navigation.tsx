'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGetStartedOpen, setIsGetStartedOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glassmorphism shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Catalyst</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link href="https://catalyst-investors.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Investors
            </Link>
            <Link href="https://catalyst-sme-portal-eckiizc0l.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-green-600 transition-colors font-medium">
              SMEs
            </Link>
            <Link href="/agent" className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
              Agents
            </Link>
            <Link href="https://catalyst-marketplace-4vi7grnn6.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Marketplace
            </Link>
            <Link href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              How It Works
            </Link>
            <Link href="#about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              About Us
            </Link>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link
              href="/login"
              className="px-5 py-2.5 text-gray-700 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-all font-medium"
            >
              Login
            </Link>
            
            <div className="relative">
              <button
                onClick={() => setIsGetStartedOpen(!isGetStartedOpen)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-medium flex items-center space-x-2"
              >
                <span>Get Started</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isGetStartedOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isGetStartedOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-56 glassmorphism rounded-xl shadow-xl overflow-hidden"
                  >
                    <Link
                      href="https://catalyst-investors.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-6 py-4 hover:bg-blue-50 transition-colors border-b border-gray-100"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 text-lg">💰</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Invest Now</p>
                          <p className="text-xs text-gray-600">Start earning returns</p>
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="https://catalyst-sme-portal-eckiizc0l.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-6 py-4 hover:bg-green-50 transition-colors border-b border-gray-100"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-green-600 text-lg">🏪</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Get Funding</p>
                          <p className="text-xs text-gray-600">Grow your business</p>
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/agent"
                      className="block px-6 py-4 hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="text-purple-600 text-lg">🤝</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Become an Agent</p>
                          <p className="text-xs text-gray-600">Earn commissions</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden glassmorphism"
          >
            <div className="px-4 py-6 space-y-4">
              <Link href="https://catalyst-investors.vercel.app/" target="_blank" rel="noopener noreferrer" className="block py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Investors
              </Link>
              <Link href="https://catalyst-sme-portal-eckiizc0l.vercel.app/" target="_blank" rel="noopener noreferrer" className="block py-2 text-gray-700 hover:text-green-600 transition-colors font-medium">
                SMEs
              </Link>
              <Link href="/agent" className="block py-2 text-gray-700 hover:text-purple-600 transition-colors font-medium">
                Agents
              </Link>
              <Link href="https://catalyst-marketplace-4vi7grnn6.vercel.app/" target="_blank" rel="noopener noreferrer" className="block py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Marketplace
              </Link>
              <Link href="#how-it-works" className="block py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium">
                How It Works
              </Link>
              <Link href="#about" className="block py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium">
                About Us
              </Link>
              
              <div className="pt-4 space-y-3 border-t border-gray-200">
                <Link
                  href="/login"
                  className="block w-full py-3 text-center text-gray-700 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-all font-medium"
                >
                  Login
                </Link>
                <Link
                  href="https://catalyst-investors.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Invest Now
                </Link>
                <Link
                  href="https://catalyst-sme-portal-eckiizc0l.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 text-center bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Get Funding
                </Link>
                <Link
                  href="/agent"
                  className="block w-full py-3 text-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Become an Agent
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
