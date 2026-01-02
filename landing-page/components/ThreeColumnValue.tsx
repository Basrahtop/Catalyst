'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Store, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ThreeColumnValue() {
  const columns = [
    {
      icon: TrendingUp,
      color: 'blue',
      title: 'Invest with Confidence',
      points: [
        'Blockchain-verified transparency',
        'Browse SMEs on marketplace',
        'Competitive returns (15-25% APY)',
        'Secure escrow protection'
      ],
      cta: 'Browse Opportunities',
      href: '/investor/register',
      gradient: 'from-blue-600 to-indigo-600'
    },
    {
      icon: Store,
      color: 'green',
      title: 'Grow Your Business',
      points: [
        'Apply through trusted agents',
        'Showcase on marketplace (required)',
        'Fast approval (24-48 hours)',
        'Fair interest rates'
      ],
      cta: 'Register Your Business',
      href: '/sme/register',
      gradient: 'from-green-600 to-emerald-600'
    },
    {
      icon: Users,
      color: 'purple',
      title: 'Earn as an Agent',
      points: [
        'Help SMEs access funding',
        'Earn commission per deal',
        'Build your portfolio',
        'Dashboard coming soon'
      ],
      cta: 'Join as Agent',
      href: '/agent/apply',
      gradient: 'from-purple-600 to-pink-600'
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Your Path to Success Starts Here
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Whether you're an investor, business owner, or agent, Catalyst provides the tools you need to succeed
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {columns.map((column, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              whileHover={{ y: -10 }}
              className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-gray-300 hover:shadow-2xl transition-all"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${column.gradient} rounded-xl flex items-center justify-center mb-6`}>
                <column.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{column.title}</h3>
              
              <ul className="space-y-3 mb-8">
                {column.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full bg-${column.color}-600 mt-2`} />
                    <span className="text-gray-600">{point}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={column.href}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${column.gradient} text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-medium`}
              >
                {column.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
