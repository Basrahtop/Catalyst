'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Mail, Users, TrendingUp, Award, DollarSign } from 'lucide-react';
import { useState } from 'react';

export default function AgentPortalComingSoon() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add email to waitlist (could be API call or simple console log for now)
    console.log('Waitlist signup:', email);
    setSubmitted(true);
  };

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Connect SMEs',
      description: 'Link verified businesses with investors and earn commissions',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Real-Time Dashboard',
      description: 'Track your referrals, commissions, and performance metrics',
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: 'Competitive Commissions',
      description: 'Earn up to 5% on successful funding connections',
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Agent Verification',
      description: 'Build your reputation with blockchain-verified credentials',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Back Link */}
        <div className="p-6">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-purple-200 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-inter">Back to Catalyst</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Main Message */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center lg:text-left"
              >
                <div className="inline-block mb-6 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-400/30">
                  <p className="text-sm text-purple-200 font-semibold tracking-wider">
                    COMING SOON
                  </p>
                </div>

                <h1 className="text-5xl sm:text-6xl md:text-7xl font-poppins font-bold text-white mb-6">
                  Agent Portal
                  <span className="block text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text mt-2">
                    Launching Soon
                  </span>
                </h1>

                <p className="text-xl sm:text-2xl text-purple-100 font-inter font-light mb-8 max-w-2xl">
                  Join Africa's first blockchain-verified agent network. Connect SMEs with investors and earn competitive commissions.
                </p>

                {/* Email Signup */}
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full px-6 py-4 rounded-lg bg-white/10 border-2 border-purple-400/30 text-white placeholder-purple-200/50 font-inter focus:outline-none focus:border-purple-400 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-poppins font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/50 whitespace-nowrap"
                      >
                        Join Waitlist
                      </button>
                    </div>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 p-6 bg-green-500/20 border border-green-400/30 rounded-lg"
                  >
                    <p className="text-green-200 font-inter text-lg">
                      ✓ You're on the waitlist! We'll notify you when the Agent Portal launches.
                    </p>
                  </motion.div>
                )}

                <div className="flex items-center justify-center lg:justify-start space-x-8 text-purple-200">
                  <div>
                    <p className="text-3xl font-bold text-white">150+</p>
                    <p className="text-sm font-inter">Active Agents</p>
                  </div>
                  <div className="w-px h-12 bg-purple-400/30"></div>
                  <div>
                    <p className="text-3xl font-bold text-white">₦1.5B+</p>
                    <p className="text-sm font-inter">Facilitated</p>
                  </div>
                  <div className="w-px h-12 bg-purple-400/30"></div>
                  <div>
                    <p className="text-3xl font-bold text-white">5%</p>
                    <p className="text-sm font-inter">Commission</p>
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Features */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6"
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                    className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-poppins font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-purple-200 font-inter font-light">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-16 text-center"
            >
              <p className="text-purple-200 font-inter mb-4">
                Want to learn more about becoming an agent?
              </p>
              <Link
                href="mailto:agents@catalyst-africa.com"
                className="inline-flex items-center space-x-2 text-white hover:text-purple-300 transition-colors font-inter font-semibold"
              >
                <Mail className="w-5 h-5" />
                <span>Contact our Agent Relations team</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
