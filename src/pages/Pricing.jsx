import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '@/api/AuthContext';
import { startCheckout, stashIntendedPlan } from '@/lib/checkout';
import Footer from '@/components/Footer';

function GoldButton({ onClick, disabled, children, variant, className = '' }) {
  const base =
    'font-cinzel text-sm font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
  const filled =
    'text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light shadow-[0_2px_10px_rgba(255,215,0,0.3)] hover:shadow-[0_2px_15px_rgba(255,215,0,0.5)]';
  const ghost =
    'text-eg4h-gold border border-eg4h-gold-dark/50 hover:bg-eg4h-gold/10';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variant === 'ghost' ? ghost : filled} ${className}`}
    >
      {children}
    </button>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const handleBack = () => {
    if (isAuthenticated) navigate('/dashboard');
    else navigate('/');
  };

  const enterDemo = () => navigate('/demo');

  const pickPlan = (plan) => async () => {
    if (loading) return;
    setError(null);
    if (user?.email) {
      setLoading(plan);
      const res = await startCheckout(user.email, plan);
      if (!res.ok) {
        setError(res.error || 'Checkout failed.');
        setLoading(null);
      }
    } else {
      stashIntendedPlan(plan);
      login();
    }
  };

  return (
    <div className="dm-study-bg min-h-screen flex flex-col text-domain-text">
      {/* Header */}
      <header className="border-b border-domain-panel-border/60 bg-domain-dark/90 backdrop-blur-sm sticky top-0 z-20 dm-header-glow relative">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="text-domain-text-dim hover:text-eg4h-gold transition-colors cursor-pointer"
            aria-label={isAuthenticated ? 'Back to dashboard' : 'Back to home'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src="/dmd-logo.png" alt="DMD" className="w-10 h-10" />
          <h1 className="font-cinzel text-xl text-eg4h-gold font-semibold">DM's Domain</h1>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        {/* Hero */}
        <section className="relative py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-eg4h-gold to-eg4h-gold-light shadow-[0_0_30px_rgba(255,215,0,0.4)] mb-6"
            >
              <Crown className="w-8 h-8 text-eg4h-black" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-cinzel-decorative text-3xl md:text-5xl text-gold-gradient mb-5 leading-tight"
            >
              Choose your tier
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="font-crimson text-lg md:text-xl text-domain-text-dim italic"
            >
              No ads. No data-mining. Cancel anytime.
            </motion.p>
          </div>
        </section>

        {/* Plans */}
        <section className="pb-20 md:pb-28">
          <div className="max-w-7xl mx-auto px-6">
            {error && (
              <div className="max-w-2xl mx-auto mb-6 px-4 py-3 bg-red-900/20 border border-red-500/40 rounded-lg">
                <p className="font-crimson text-sm text-red-300">
                  <span className="font-semibold">Checkout error:</span> {error}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Free */}
              <div className="dm-panel-raised rounded-xl border p-6 flex flex-col">
                <div className="font-cinzel text-domain-parchment-dark md:text-eg4h-gold-dark uppercase tracking-widest text-xs mb-2">Free</div>
                <div className="font-cinzel-decorative text-3xl text-domain-text mb-1">$0</div>
                <div className="font-crimson italic text-domain-text-dim text-sm mb-5">Try before you commit.</div>
                <ul className="space-y-2 font-crimson text-sm text-domain-text mb-6 flex-1">
                  <li>• Demo mode — explore the full interface</li>
                  <li>• 1 saved campaign</li>
                  <li>• Browse SRD reference</li>
                  <li className="text-domain-text-dim">— No AI features</li>
                </ul>
                <GoldButton onClick={enterDemo} variant="ghost" className="px-5 py-2.5">
                  Try the Demo
                </GoldButton>
              </div>

              {/* Adventurer */}
              <div className="dm-panel-raised rounded-xl border p-6 flex flex-col">
                <div className="font-cinzel text-domain-parchment-dark md:text-eg4h-gold-dark uppercase tracking-widest text-xs mb-2">Adventurer</div>
                <div className="font-cinzel-decorative text-3xl text-domain-text mb-1">
                  $5.99<span className="text-base text-domain-text-dim">/mo</span>
                </div>
                <div className="font-crimson italic text-domain-text-dim text-sm mb-5">For the DM building their first world.</div>
                <ul className="space-y-2 font-crimson text-sm text-domain-text mb-6 flex-1">
                  <li>✦ 3 active campaigns</li>
                  <li>✦ 5 archived campaigns</li>
                  <li>✦ Session journal &amp; notes</li>
                  <li>✦ Initiative &amp; combat tracker</li>
                  <li>✦ NPC tracking (manual)</li>
                  <li>✦ Party management &amp; invite links</li>
                  <li>✦ Player portal</li>
                  <li>✦ SRD Quick Reference</li>
                </ul>
                <GoldButton onClick={pickPlan('adventurer')} disabled={!!loading} variant="ghost" className="px-5 py-2.5">
                  {loading === 'adventurer' ? <><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-2" />Redirecting…</> : 'Start Adventuring'}
                </GoldButton>
              </div>

              {/* Dungeon Master — featured */}
              <div className="relative rounded-xl border-2 border-eg4h-gold p-6 flex flex-col bg-gradient-to-b from-domain-panel-raised to-domain-panel shadow-[0_8px_40px_rgba(255,215,0,0.15)]">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-eg4h-gold text-eg4h-black font-cinzel text-[10px] uppercase tracking-widest rounded-full whitespace-nowrap">
                  Most Popular
                </div>
                <div className="font-cinzel text-domain-parchment-dark md:text-eg4h-gold uppercase tracking-widest text-xs mb-2">Dungeon Master</div>
                <div className="font-cinzel-decorative text-3xl text-gold-gradient mb-1">
                  $9.99<span className="text-base text-domain-text-dim">/mo</span>
                </div>
                <div className="font-crimson italic text-domain-text-dim text-sm mb-5">Full DM tools, AI-assisted.</div>
                <ul className="space-y-2 font-crimson text-sm text-domain-text mb-6 flex-1">
                  <li>✦ 6 active campaigns</li>
                  <li>✦ Unlimited archived campaigns</li>
                  <li>✦ Everything in Adventurer</li>
                  <li>✦ AI Improv Assist</li>
                  <li>✦ AI NPC generation</li>
                  <li>✦ AI session summaries</li>
                  <li>✦ Homebrew uploads</li>
                  <li>✦ Campaign image gallery</li>
                </ul>
                <GoldButton onClick={pickPlan('dm')} disabled={!!loading} className="px-5 py-2.5">
                  {loading === 'dm' ? <><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-2" />Redirecting…</> : 'Start Dungeon Master'}
                </GoldButton>
              </div>

              {/* Bundle */}
              <div className="dm-panel-raised rounded-xl border p-6 flex flex-col">
                <div className="font-cinzel text-domain-parchment-dark md:text-eg4h-gold-dark uppercase tracking-widest text-xs mb-2">Bundle</div>
                <div className="font-cinzel-decorative text-3xl text-domain-text mb-1">
                  $14.99<span className="text-base text-domain-text-dim">/mo</span>
                </div>
                <div className="font-crimson italic text-domain-text-dim text-sm mb-5">DM's Domain + Character Evolver Pro.</div>
                <ul className="space-y-2 font-crimson text-sm text-domain-text mb-6 flex-1">
                  <li>✦ Everything in Dungeon Master</li>
                  <li>✦ Character Evolver Pro (unlimited characters, AI portraits)</li>
                  <li>✦ Seamless party-to-campaign sync</li>
                  <li>✦ Priority support</li>
                  <li>✦ Early access to new features</li>
                </ul>
                <GoldButton onClick={pickPlan('bundle')} disabled={!!loading} variant="ghost" className="px-5 py-2.5">
                  {loading === 'bundle' ? <><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-2" />Redirecting…</> : 'Get the Bundle'}
                </GoldButton>
              </div>
            </div>

            <p className="mt-10 text-center text-xs font-ui text-domain-text-dim/70">
              Bundle includes Character Evolver Pro + DM's Domain Dungeon Master.
              Subscriptions renew monthly. Cancel from your account at any time.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
