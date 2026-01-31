'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LandingPage() {

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/background2.jpg)',
          }}
        />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 lg:px-12 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center group">
              <span className="font-bold text-2xl md:text-4xl tracking-wider transition-colors group-hover:opacity-90" style={{ color: '#36454F', fontFamily: 'var(--font-lilita)' }}>
                SketchNFT
              </span>
            </Link>
          </div>

          {/* Right side - Navigation + Connect Button */}
          <div className="flex items-center gap-4 md:gap-8">
            {/* Navigation - Always visible */}
            <nav className="flex items-center gap-4 md:gap-8 font-medium text-xs md:text-sm tracking-wider uppercase">
              <Link href="/collection" className="text-gray-700 hover:text-gray-900 transition-colors">Collection</Link>
            </nav>

            <div className="flex items-center">
              <Link href="/generate">
                <motion.button
                  whileHover={{ scale: 1.02, opacity: 0.9 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 md:px-8 py-2 md:py-3.5 font-semibold text-sm md:text-base uppercase tracking-wider transition-all rounded-full shadow-lg"
                  style={{ backgroundColor: '#36454F', color: '#FFFFFF' }}
                >
                  Open App
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Centered Video Container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative h-full w-full max-w-[71.5rem] ml-57"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/veo-generated-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </motion.div>
      </div>

      {/* Text Overlay - Bottom Left */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="absolute bottom-24 left-6 lg:left-12 z-10"
      >
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight uppercase"
          style={{
            letterSpacing: '-0.02em',
            color: '#36454F',
            textShadow: '2px 2px 4px rgba(255, 255, 255, 0.5)',
            fontFamily: 'var(--font-share-tech)'
          }}
        >
          CREATE THE
          <br />
          FUTURE. MINT THE
          <br />
          ADVENTURE.
        </h1>
      </motion.div>
    </div>
  );
}
