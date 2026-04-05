import { motion } from 'framer-motion';
import { Crown, X, Sparkles, Users, Scroll, Globe, MessageSquare, BookOpen } from 'lucide-react';
import { STRIPE_PRICES } from '@/lib/tier';

const FEATURES = [
  { icon: Sparkles, text: 'AI-powered NPC generation' },
  { icon: Sparkles, text: 'AI Improv Assist suggestions' },
  { icon: BookOpen, text: 'AI session summaries' },
  { icon: MessageSquare, text: 'Secret player messaging' },
  { icon: Users, text: 'Unlimited NPCs per campaign' },
  { icon: Scroll, text: 'Unlimited story threads' },
  { icon: Globe, text: 'Unlimited world lore entries' },
  { icon: Crown, text: 'Unlimited campaigns' },
];

export default function UpgradeModal({ onClose, reason }) {
  const checkoutUrl = `https://buy.stripe.com/${STRIPE_PRICES.dm}`;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="dm-panel-raised border border-eg4h-gold-dark/30 rounded-xl p-6 w-full max-w-md relative"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-domain-text-dim/40 hover:text-domain-text cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-eg4h-gold to-eg4h-gold-light flex items-center justify-center">
            <Crown className="w-5 h-5 text-eg4h-black" />
          </div>
          <div>
            <h3 className="font-cinzel text-lg text-eg4h-gold">Dungeon Master Tier</h3>
            <p className="text-xs font-ui text-domain-text-dim">Unlock the full DM toolkit</p>
          </div>
        </div>

        {reason && (
          <div className="mb-4 px-3 py-2 bg-domain-warm/10 border border-domain-warm/20 rounded-lg">
            <p className="text-xs font-crimson text-domain-parchment-dark">{reason}</p>
          </div>
        )}

        <div className="space-y-2 mb-6">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 text-eg4h-gold/70 shrink-0" />
              <span className="text-sm font-crimson text-domain-text">{text}</span>
            </div>
          ))}
        </div>

        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-5 py-3 font-cinzel text-sm font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg shadow-[0_2px_10px_rgba(255,215,0,0.3)] hover:shadow-[0_2px_15px_rgba(255,215,0,0.5)] transition-all hover:scale-[1.02]"
        >
          Upgrade — $5.99/mo
        </a>

        <p className="text-center text-[10px] font-ui text-domain-text-dim/60 mt-3">
          Cancel anytime. Includes all current and future DM tools.
        </p>
      </motion.div>
    </motion.div>
  );
}
