'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Shield, Zap, ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-20">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-20 -left-20 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Centered Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8"
          >
            {/* Small Overline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-sm font-inter font-light tracking-[0.3em] uppercase text-gray-500"
            >
              EMPOWERING AFRICAN SMES
            </motion.p>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="space-y-2"
            >
              <h1 className="font-poppins font-bold leading-tight">
                <span className="block text-4xl sm:text-5xl md:text-6xl text-gray-900 mb-2">
                  Through Blockchain-Verified
                </span>
                <span className="block text-5xl sm:text-6xl md:text-7xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-black">
                  INVESTMENTS
                </span>
              </h1>
            </motion.div>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-lg sm:text-xl font-inter font-light text-gray-600 max-w-3xl mx-auto leading-relaxed"
            >
              Connecting verified investors with growth-ready SMEs through transparent, 
              on-chain transactions. Build wealth, grow businesses, earn commissions.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <Link
                href="https://catalyst-investors.vercel.app/"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-2xl transform hover:scale-105 transition-all text-center"
              >
                Start Investing
              </Link>
              <Link
                href="https://catalyst-sme-portal-eckiizc0l.vercel.app/"
                className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 rounded-xl font-semibold hover:border-green-600 hover:text-green-600 hover:shadow-lg transition-all text-center"
              >
                Get Funding
              </Link>
              <Link
                href="/agent"
                className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 rounded-xl font-semibold hover:border-purple-600 hover:text-purple-600 hover:shadow-lg transition-all text-center"
              >
                Become an Agent
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="flex flex-wrap items-center justify-center gap-8 pt-12 border-t border-gray-200 max-w-4xl mx-auto"
            >
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">₦2.5B+</p>
                <p className="text-sm text-gray-600">Funded</p>
              </div>
              <div className="w-px h-12 bg-gray-300" />
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">500+</p>
                <p className="text-sm text-gray-600">SMEs</p>
              </div>
              <div className="w-px h-12 bg-gray-300" />
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">150+</p>
                <p className="text-sm text-gray-600">Agents</p>
              </div>
              <div className="w-px h-12 bg-gray-300" />
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">98%</p>
                <p className="text-sm text-gray-600">Success Rate</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Floating Dashboard Cards */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto"
          >
            {/* Card 1 */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="glassmorphism p-6 rounded-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Portfolio Growth</p>
                  <p className="text-2xl font-bold text-blue-600">+23.5%</p>
                </div>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="glassmorphism p-6 rounded-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Verified SMEs</p>
                  <p className="text-2xl font-bold text-green-600">100%</p>
                </div>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="glassmorphism p-6 rounded-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Active Agents</p>
                  <p className="text-2xl font-bold text-purple-600">150+</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-gray-400 rounded-full flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-gray-400 rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
