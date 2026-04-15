import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, X, Loader2, Layers } from 'lucide-react';
import { useAuth } from '@/api/AuthContext';
import { startCheckout } from '@/lib/checkout';

const PLANS = [
  {
    id: 'adventurer',
    name: 'Adventurer',
    price: '$5.99/mo',
    tagline: 'Organizational tools for the solo DM.',
    bullets: [
      '3 active campaigns',
      'Session notes & initiative tracker',
      'Unlimited NPCs, threads, lore',
      'Player portal & invite links',
    ],
    ctaClass: 'text-eg4h-gold border border-eg4h-gold-dark/50 hover:bg-eg4h-gold/10',
  },
  {
    id: 'dm',
    name: 'Dungeon Master',
    price: '$9.99/mo',
    tagline: 'Full AI-enabled DM toolkit.',
    featured: true,
    bullets: [
      '6 active campaigns',
      'Everything in Adventurer',
      'AI Improv Assist',
      'AI NPC generation & session summaries',
      'Homebrew uploads & campaign gallery',
    ],
    ctaClass: 'text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light shadow-[0_2px_10px_rgba(255,215,0,0.3)] hover:shadow-[0_2px_15px_rgba(255,215,0,0.5)]',
  },
  {
    id: 'bundle',
    name: 'Tabletop Bundle',
    price: '$14.99/mo',
    tagline: "DM's Domain + Character Evolver Pro.",
    bullets: [
      'Everything in Dungeon Master',
      'Character Evolver Pro (unlimited chars, AI portraits)',
      'Seamless party-to-campaign sync',
      'Priority support & early access',
    ],
    ctaClass: 'text-eg4h-gold border border-eg4h-gold-dark/50 hover:bg-eg4h-gold/10',
    icon: Layers,
  },
];

export default function UpgradeModal({ onClose, reason }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const handleCheckout = async (plan) => {
    if (!user?.email || loading) return;
    setLoading(plan);
    setError(null);
    const res = await startCheckout(user.email, plan);
    if (!res.ok) {
      setError(res.error);
      setLoading(null);
    }
    // On ok, startCheckout already triggered a redirect — no further UI.
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="dm-panel-raised border border-eg4h-gold-dark/30 rounded-xl p-6 w-full max-w-lg relative my-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-domain-text-dim/40 hover:text-domain-text cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-eg4h-gold to-eg4h-gold-light flex items-center justify-center">
            <Crown className="w-5 h-5 text-eg4h-black" />
          </div>
          <div>
            <h3 className="font-cinzel text-lg text-eg4h-gold">Choose your tier</h3>
            <p className="text-xs font-ui text-domain-text-dim">Cancel anytime.</p>
          </div>
        </div>

        {reason && (
          <div className="mb-4 px-3 py-2 bg-domain-warm/10 border border-domain-warm/20 rounded-lg">
            <p className="text-xs font-crimson text-domain-parchment-dark">{reason}</p>
          </div>
        )}

        <div className="space-y-3">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`rounded-lg border p-4 ${plan.featured ? 'border-eg4h-gold/60 bg-gradient-to-b from-domain-panel-raised to-domain-panel' : 'border-domain-panel-border/50 bg-domain-panel/60'}`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <h4 className={`font-cinzel text-sm ${plan.featured ? 'text-eg4h-gold' : 'text-domain-text'}`}>{plan.name}</h4>
                    {plan.featured && (
                      <span className="text-[9px] font-ui uppercase tracking-widest text-eg4h-gold/80 bg-eg4h-gold/10 border border-eg4h-gold/30 rounded-full px-1.5 py-0.5 whitespace-nowrap">Most popular</span>
                    )}
                  </div>
                  <span className="font-cinzel-decorative text-sm text-domain-text shrink-0">{plan.price}</span>
                </div>
                <p className="text-[11px] font-crimson italic text-domain-text-dim mb-2">{plan.tagline}</p>
                <ul className="space-y-1 mb-3">
                  {plan.bullets.map(b => (
                    <li key={b} className="text-[11px] font-crimson text-domain-text flex gap-1.5">
                      <span className="text-eg4h-gold-dark shrink-0">✦</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={!!loading}
                  className={`block w-full text-center px-4 py-2 font-cinzel text-xs font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${plan.ctaClass}`}
                >
                  {loading === plan.id ? (
                    <><Loader2 className="w-3 h-3 animate-spin inline mr-2" />Redirecting…</>
                  ) : (
                    <>
                      {Icon && <Icon className="w-3.5 h-3.5 inline mr-1.5" />}
                      Subscribe — {plan.price}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-3 px-3 py-2 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-xs font-crimson text-red-300">{error}</p>
          </div>
        )}

        <p className="text-center text-[10px] font-ui text-domain-text-dim/60 mt-3">
          Bundle includes Character Evolver Pro + DM's Domain Dungeon Master.
        </p>
      </motion.div>
    </motion.div>
  );
}
