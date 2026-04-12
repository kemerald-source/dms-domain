import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/api/AuthContext';

export default function Landing() {
  const { isAuthenticated, loading, login } = useAuth();
  const navigate = useNavigate();

  // After OAuth redirect, user lands back on / with auth resolved — send them to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  // Strip leftover OAuth hash fragments (#access_token=...) so the widget
  // cannot re-authenticate from a stale token after the user has logged out.
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/demo');
    }
  };

  return (
    <div className="dm-study-bg relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: 'url(/bg-dmdlanding.png)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-domain-bg/60 via-transparent to-domain-bg" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
        {/* Logo */}
        <motion.img
          src="/dmd-logo.png"
          alt="DM's Domain"
          className="w-48 h-48 md:w-64 md:h-64 mb-8 drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Title */}
        <motion.h1
          className="font-cinzel-decorative text-4xl md:text-6xl lg:text-7xl font-bold text-gold-gradient mb-6 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          DM's Domain
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="font-crimson text-xl md:text-2xl lg:text-3xl text-domain-text italic mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Your world. Your story. Never forgotten.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          onClick={handleCTA}
          className="group relative px-10 py-4 font-cinzel text-lg md:text-xl font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold via-eg4h-gold-light to-eg4h-gold rounded-lg shadow-[0_4px_20px_rgba(255,215,0,0.4)] hover:shadow-[0_4px_30px_rgba(255,215,0,0.6)] transition-all duration-300 hover:scale-105 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          Enter Your Domain
          <span className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.button>

        {/* EG4H branding */}
        <motion.p
          className="mt-16 text-sm text-domain-text-dim font-ui"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          An <span className="text-eg4h-gold-dark font-semibold">Evil Genius 4 Hire</span> production
        </motion.p>
      </div>
    </div>
  );
}
