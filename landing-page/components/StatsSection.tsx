'use client';

import { motion } from 'framer-motion';

export default function StatsSection() {
  const stats = [
    { value: '₦2.5B+', label: 'Total Funded', color: 'blue' },
    { value: '500+', label: 'SMEs Empowered', color: 'green' },
    { value: '2,000+', label: 'Active Investors', color: 'indigo' },
    { value: '150+', label: 'Verified Agents', color: 'purple' },
    { value: '98%', label: 'Success Rate', color: 'pink' }
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute w-2 h-2 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-poppins font-bold text-white mb-4">
            Making Real Impact Across Africa
          </h2>
          <p className="text-xl font-inter font-light text-blue-200">
            Join thousands of investors, businesses, and agents building the future
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className={`text-4xl md:text-5xl font-poppins font-bold text-${stat.color}-400 mb-2`}
              >
                {stat.value}
              </motion.p>
              <p className="font-inter font-light text-blue-200">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
