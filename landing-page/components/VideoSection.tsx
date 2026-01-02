'use client';

import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

export default function VideoSection() {
  return (
    <section id="video-section" className="py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-inter font-light tracking-[0.3em] uppercase text-blue-300 mb-4">
            SEE CATALYST IN ACTION
          </p>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-poppins font-bold text-white mb-6">
            Watch How We're <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Transforming</span> SME Funding
          </h2>
          <p className="text-xl font-inter font-light text-blue-100 max-w-3xl mx-auto">
            Discover how our blockchain-powered platform connects investors with verified SMEs across Africa through transparent, secure transactions
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 border-4 border-white/10">
            {/* Video Embed */}
            <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900">
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/OFdy6mkUasg?autoplay=0&rel=0&modestbranding=1&controls=1"
                title="Catalyst Platform Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              
              {/* Fallback for when video isn't loaded */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 opacity-0 hover:opacity-0 transition-opacity">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/40 flex items-center justify-center cursor-pointer"
                >
                  <Play className="w-12 h-12 text-white ml-2" />
                </motion.div>
              </div>
            </div>

            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-20 -z-10" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
