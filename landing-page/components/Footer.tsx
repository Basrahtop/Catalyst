'use client';

import Link from 'next/link';
import { Mail, Github, Twitter, Linkedin, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Final CTA Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-poppins font-bold text-white mb-4">
            Join Africa's Fastest-Growing Funding Ecosystem
          </h2>
          <p className="text-xl font-inter font-light text-white/90 mb-8">
            2,000+ Investors, 500+ SMEs, 150+ Agents - Which will you be?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="https://catalyst-investors.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-poppins font-semibold hover:bg-gray-100 transition-all"
            >
              Invest Now
            </Link>
            <Link
              href="https://catalyst-sme-portal-eckiizc0l.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-green-600 text-white rounded-lg font-poppins font-semibold hover:bg-green-700 transition-all"
            >
              Get Funding
            </Link>
            <Link
              href="/agent/apply"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-poppins font-semibold hover:bg-white hover:text-purple-600 transition-all"
            >
              Become Agent
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="text-2xl font-poppins font-bold text-white">Catalyst</span>
            </div>
            <p className="font-inter text-gray-400 mb-6">
              Africa's first blockchain-powered SME funding marketplace
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="hover:text-blue-400 transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
              <Link href="#" className="hover:text-blue-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </Link>
              <Link href="#" className="hover:text-blue-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="hover:text-blue-400 transition-colors">
                <Github className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-poppins font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 font-inter">
              <li><Link href="https://catalyst-investors.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">For Investors</Link></li>
              <li><Link href="https://catalyst-sme-portal-eckiizc0l.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">For SMEs</Link></li>
              <li><Link href="/agent/apply" className="hover:text-white transition-colors">For Agents</Link></li>
              <li><Link href="https://catalyst-marketplace-4vi7grnn6.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Marketplace</Link></li>
              <li><Link href="https://catalyst-wine.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-poppins font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2 font-inter">
              <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-poppins font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 font-inter">
              <li><Link href="https://catalyst-wine.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">FAQs</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Support</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Terms & Privacy</Link></li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-gray-800 pt-12 mb-12">
          <div className="max-w-md mx-auto text-center">
            <h4 className="font-poppins font-semibold text-white mb-2">Stay Updated</h4>
            <p className="font-inter text-gray-400 mb-4">Join 5,000+ subscribers</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white font-inter"
              />
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-poppins font-medium">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 text-center text-sm font-inter text-gray-400">
          <p>© 2026 Catalyst. All rights reserved. Built with ❤️ in Africa</p>
        </div>
      </div>
    </footer>
  );
}
