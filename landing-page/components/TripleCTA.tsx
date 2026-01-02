'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function TripleCTA() {
  const ctas = [
    {
      title: 'Start Investing Today',
      description: 'Browse verified SMEs on our marketplace',
      cta: 'Explore Opportunities',
      href: 'https://catalyst-investors.vercel.app/',
      external: true,
      gradient: 'from-blue-600 to-indigo-600',
      hoverGradient: 'from-blue-700 to-indigo-700',
      icon: '💰'
    },
    {
      title: 'Get Your Business Funded',
      description: 'Register, work with an agent, list on marketplace',
      cta: 'Register Now',
      href: 'https://catalyst-sme-portal-eckiizc0l.vercel.app/',
      external: true,
      gradient: 'from-green-600 to-emerald-600',
      hoverGradient: 'from-green-700 to-emerald-700',
      icon: '🏪'
    },
    {
      title: 'Become a Funding Agent',
      description: 'Help SMEs grow and earn commissions',
      cta: 'Join Agent Network',
      href: '/agent/apply',
      external: false,
      gradient: 'from-purple-600 to-pink-600',
      hoverGradient: 'from-purple-700 to-pink-700',
      icon: '🤝'
    }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-6">
          {ctas.map((cta, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="relative group"
            >
              <Link
                href={cta.href}
                target={cta.external ? "_blank" : undefined}
                rel={cta.external ? "noopener noreferrer" : undefined}
                className={`block p-8 bg-gradient-to-br ${cta.gradient} rounded-2xl text-white hover:shadow-2xl transition-all h-full`}
              >
                <div className="text-5xl mb-4">{cta.icon}</div>
                <h3 className="text-2xl font-poppins font-bold mb-3">{cta.title}</h3>
                <p className="font-inter text-white/90 mb-6">{cta.description}</p>
                <div className="inline-flex items-center gap-2 font-poppins font-semibold group-hover:gap-4 transition-all">
                  {cta.cta}
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
