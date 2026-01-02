'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Clock } from 'lucide-react';

const platforms = [
  {
    name: 'Investor Dashboard',
    description: 'Discover verified SMEs, track investments, earn returns',
    url: 'https://catalyst-investors.vercel.app/',
    screenshot: '/investor-dashboard.png',
    color: 'blue',
    available: true,
  },
  {
    name: 'SME Portal',
    description: 'Apply for funding, manage campaigns, grow your business',
    url: 'https://catalyst-sme-portal-eckiizc0l.vercel.app/',
    screenshot: '/sme-portal.png',
    color: 'green',
    available: true,
  },
  {
    name: 'Marketplace',
    description: 'Browse investment opportunities, compare SMEs, invest smartly',
    url: 'https://catalyst-marketplace-4vi7grnn6.vercel.app/',
    screenshot: '/marketplace.png',
    color: 'indigo',
    available: true,
  },
  {
    name: 'Agent Portal',
    description: 'Connect SMEs with investors, earn commissions, build your network',
    url: '/agent',
    screenshot: '/agent-portal.png',
    color: 'purple',
    available: false,
  },
];

export default function PlatformShowcase() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-20"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-blue-600 tracking-[0.3em] uppercase mb-4">
            EXPLORE OUR ECOSYSTEM
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-poppins font-bold text-gray-900 mb-6">
            Experience Our <span className="text-gradient-blue">Platforms</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto font-inter font-light">
            Four powerful tools designed to revolutionize SME funding in Africa. Each platform serves a unique role in our ecosystem.
          </p>
        </motion.div>

        {/* Platform Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link
                href={platform.url}
                target={platform.available ? '_blank' : '_self'}
                rel={platform.available ? 'noopener noreferrer' : ''}
                className="group block relative rounded-2xl overflow-hidden bg-white border-2 border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-2xl"
              >
                {/* Screenshot Container */}
                <div className="relative aspect-video overflow-hidden bg-gray-100">
                  {platform.available ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={platform.screenshot}
                        alt={`${platform.name} Screenshot`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/0 to-gray-900/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
                      <Clock className="w-20 h-20 text-purple-300" />
                    </div>
                  )}

                  {/* Coming Soon Badge */}
                  {!platform.available && (
                    <div className="absolute top-4 right-4 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full shadow-lg">
                      Coming Soon
                    </div>
                  )}

                  {/* View Platform Button */}
                  {platform.available && (
                    <div className="absolute bottom-4 right-4 px-5 py-2.5 bg-white text-gray-900 rounded-lg font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center space-x-2 shadow-xl">
                      <span>View Platform</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Platform Info */}
                <div className="p-6">
                  <h3 className={`text-2xl font-poppins font-bold mb-2 text-gradient-${platform.color}`}>
                    {platform.name}
                  </h3>
                  <p className="text-gray-600 font-inter font-light">
                    {platform.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
