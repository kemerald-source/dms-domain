import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/api/AuthContext';

// Replace src with the real screenshot path when assets are dropped in /public.
function Screenshot({ src, alt, caption, labels = [] }) {
  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <div className="relative aspect-video rounded-xl border border-domain-panel-border bg-domain-panel-raised overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-domain-text-dim">
            <div className="text-6xl mb-3 opacity-40">▤</div>
            <div className="font-ui text-sm uppercase tracking-widest opacity-60">Screenshot Placeholder</div>
            <div className="font-ui text-xs mt-2 opacity-40">{alt}</div>
          </div>
        )}
      </div>
      {labels.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {labels.map((l, i) => (
            <div key={i} className="dm-panel rounded-lg border p-4">
              <div className="font-cinzel text-eg4h-gold text-sm uppercase tracking-wider mb-1">{l.title}</div>
              <div className="font-crimson text-domain-text text-sm leading-relaxed">{l.body}</div>
            </div>
          ))}
        </div>
      )}
      {caption && (
        <p className="mt-4 text-center font-crimson italic text-domain-text-dim">{caption}</p>
      )}
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="text-center mb-12 max-w-3xl mx-auto px-6">
      {eyebrow && (
        <div className="font-cinzel text-eg4h-gold-dark uppercase tracking-[0.3em] text-sm mb-4">{eyebrow}</div>
      )}
      <h2 className="font-cinzel-decorative text-3xl md:text-5xl font-bold text-gold-gradient mb-4 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="font-crimson text-lg md:text-xl text-domain-text italic">{subtitle}</p>
      )}
    </div>
  );
}

function GoldButton({ children, onClick, variant = 'primary', className = '' }) {
  const base = 'group relative px-8 py-3 font-cinzel font-semibold rounded-lg transition-all duration-300 hover:scale-105 cursor-pointer';
  const styles = variant === 'primary'
    ? 'text-eg4h-black bg-gradient-to-r from-eg4h-gold via-eg4h-gold-light to-eg4h-gold shadow-[0_4px_20px_rgba(255,215,0,0.4)] hover:shadow-[0_4px_30px_rgba(255,215,0,0.6)]'
    : 'text-eg4h-gold border-2 border-eg4h-gold-dark bg-transparent hover:bg-eg4h-gold/10';
  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>{children}</button>
  );
}

export default function Landing() {
  const { isAuthenticated, loading, login } = useAuth();
  const navigate = useNavigate();
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Strip OAuth response fragments left behind by the implicit-grant redirect.
  useEffect(() => {
    const hash = window.location.hash || '';
    if (/^#(?:access_token|id_token|refresh_token|error|error_description)=/.test(hash)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // After OAuth, send authed users straight to the dashboard.
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  // Sticky CTA appears once the user scrolls past the hero (~viewport height).
  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > window.innerHeight * 0.85);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const enterDemo = () => navigate('/demo');
  const goPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleLogin = () => login();

  return (
    <div className="relative min-h-screen bg-domain-bg text-domain-text overflow-x-hidden">
      {/* ─── Sticky CTA bar ─── */}
      <motion.div
        initial={false}
        animate={{ y: showStickyBar ? 0 : -80, opacity: showStickyBar ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 bg-domain-bg/95 backdrop-blur-md border-b border-domain-panel-border"
        style={{ pointerEvents: showStickyBar ? 'auto' : 'none' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/dmd-logo.png" alt="" className="w-8 h-8" />
            <span className="font-cinzel-decorative text-eg4h-gold text-lg hidden sm:inline">DM's Domain</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogin}
              className="font-cinzel text-sm text-domain-text hover:text-eg4h-gold transition-colors px-3 py-2"
            >
              Log in
            </button>
            <GoldButton onClick={enterDemo} className="!px-5 !py-2 text-sm">
              Try the Demo
            </GoldButton>
          </div>
        </div>
      </motion.div>

      {/* ─── 1. HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: 'url(/bg-dmdlanding.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-domain-bg/60 via-transparent to-domain-bg" />

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
          <motion.img
            src="/dmd-logo.png"
            alt="DM's Domain"
            className="w-40 h-40 md:w-56 md:h-56 mb-8 drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          <motion.h1
            className="font-cinzel-decorative text-4xl md:text-6xl lg:text-7xl font-bold text-gold-gradient mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Your world. Your story. Never forgotten.
          </motion.h1>

          <motion.p
            className="font-crimson text-lg md:text-2xl text-domain-text mb-10 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            The Dungeon Master companion that remembers every NPC, every plot thread, and every campfire conversation — so you can stop flipping notebooks and start running the table.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <GoldButton onClick={enterDemo}>Enter Your Domain</GoldButton>
            <GoldButton onClick={handleLogin} variant="ghost">Log in</GoldButton>
          </motion.div>

          <motion.p
            className="mt-16 text-sm text-domain-text-dim font-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            An <span className="text-eg4h-gold-dark font-semibold">Evil Genius 4 Hire</span> production
          </motion.p>
        </div>
      </section>

      {/* ─── 2. THE PROBLEM ─── */}
      <section className="relative py-24 md:py-32 bg-domain-dark border-y border-domain-panel-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="font-cinzel text-eg4h-gold-dark uppercase tracking-[0.3em] text-sm mb-6">The Problem</div>
          <h2 className="font-cinzel-decorative text-3xl md:text-5xl text-gold-gradient mb-8 leading-tight">
            You spent three hours building Marella the innkeeper. Now you can't remember if the players ever met her.
          </h2>
          <div className="font-crimson text-lg md:text-xl text-domain-text leading-relaxed space-y-5">
            <p>Notebooks fill up. Google Docs sprawl. Sticky notes vanish. Mid-session, a player asks about the priest from two months ago and you're flipping through screens trying to remember if his name was Edric or Aldric.</p>
            <p>Improvising on the fly is half the joy of running a game. Forgetting what you established last week is none of it.</p>
            <p className="font-cinzel text-eg4h-gold text-xl md:text-2xl italic pt-4">DM's Domain remembers — so you don't have to.</p>
          </div>
        </div>
      </section>

      {/* ─── 3. THE SESSION VIEW ─── */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="At the Table"
            title="The Session View"
            subtitle="Every tool you need, one screen, no tab-switching."
          />
          <Screenshot
            src="/LP-DM%20View.png"
            alt="Session view trifold layout"
            labels={[
              { title: 'Trifold Layout', body: 'NPCs, threads, and notes side-by-side. See the whole table at a glance.' },
              { title: 'SRD Reference', body: 'Rules and spells one click away. No more digging through PDFs.' },
              { title: 'Live Initiative', body: 'Track turn order without breaking immersion.' },
            ]}
          />
        </div>
      </section>

      {/* ─── 4. AI IMPROV ASSIST ─── */}
      <section className="relative py-24 md:py-32 bg-domain-dark border-y border-domain-panel-border">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Your Co-DM"
            title="AI Improv Assist"
            subtitle="When the party does something you didn't plan for — and they always do."
          />
          <Screenshot
            src="/LP-%20AI%20summary.png"
            alt="AI Improv Assist panel showing three suggestion cards"
            labels={[
              { title: 'Escalate', body: 'Lean into chaos. Real consequences, raised stakes.' },
              { title: 'Redirect', body: 'A graceful pivot. An NPC steps in, a detail emerges.' },
              { title: 'Deepen', body: 'Tie the moment to backstory or a thread the players forgot.' },
            ]}
          />
          <p className="mt-8 text-center max-w-2xl mx-auto font-crimson italic text-domain-text-dim">
            Context-aware. The AI knows your party, your NPCs, your lore — every suggestion fits your campaign.
          </p>
        </div>
      </section>

      {/* ─── 5. NPC GENERATION ─── */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Cast of Thousands"
            title="NPC Generation"
            subtitle="Need a tavern keeper, a city guard, a mysterious stranger? In seconds."
          />
          <Screenshot
            src="/LP-Quick%20NPC%20Generator.png"
            alt="NPC generator with a generated character card"
            labels={[
              { title: 'Quick or Detailed', body: 'A name and quirk for the throwaway. A full sheet for the recurring face.' },
              { title: 'Voice Notes', body: 'How they speak. What they want. What they hide.' },
              { title: 'Save to Campaign', body: 'Built once, remembered forever. Never lose Marella again.' },
            ]}
          />
        </div>
      </section>

      {/* ─── 6. YOUR PARTY ─── */}
      <section className="relative py-24 md:py-32 bg-domain-dark border-y border-domain-panel-border">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Know Your Heroes"
            title="Your Party"
            subtitle="Every character sheet, bond, and backstory at your fingertips."
          />
          <Screenshot
            src="/LP-Party%20Initiative.png"
            alt="Party panel showing character cards"
            labels={[
              { title: 'Character Sheets', body: 'Imported from Character Evolver or added manually.' },
              { title: 'Bonds & Backstory', body: 'Surface what each player wrote. Reward what they care about.' },
              { title: 'DM-Only Notes', body: 'Track secrets the players don\'t know — yet.' },
            ]}
          />
        </div>
      </section>

      {/* ─── 7. INVITE & CONNECT ─── */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="The Table"
            title="Invite & Connect"
            subtitle="Send a link. Players join from Character Evolver. Done."
          />
          <Screenshot
            src="/LP-Campaigns%20List.png"
            alt="Campaign invite link UI"
            labels={[
              { title: 'One-Link Invites', body: 'Share a URL. Players accept with one click.' },
              { title: 'Character Evolver Sync', body: 'Their sheets flow straight into your campaign.' },
              { title: 'Roles & Permissions', body: 'DM sees everything. Players see what they should.' },
            ]}
          />
        </div>
      </section>

      {/* ─── 8. PLAYER PORTAL ─── */}
      <section className="relative py-24 md:py-32 bg-domain-dark border-y border-domain-panel-border">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="For The Players"
            title="Player Portal"
            subtitle="Their character. Their journal. Their view of the world you built."
          />
          <Screenshot
            src="/LP-Character%20corner.png"
            alt="Player portal showing character and shared assets"
            labels={[
              { title: 'Personal View', body: 'Their sheet, their notes, the handouts you shared.' },
              { title: 'Shared Gallery', body: 'Maps and portraits the party has discovered.' },
              { title: 'Session Recaps', body: 'Catch up between games. Never miss what happened.' },
            ]}
          />
        </div>
      </section>

      {/* ─── 9. HOMEBREW & WORLD LORE ─── */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Your World, Codified"
            title="Homebrew & World Lore"
            subtitle="The places, the powers, the gods you invented — written down, organized, searchable."
          />
          <Screenshot
            src="/LP-Gallery%20example.png"
            alt="World lore and homebrew panels"
            labels={[
              { title: 'Locations & Factions', body: 'Cities, kingdoms, cults — everything that shapes the world.' },
              { title: 'Custom Content', body: 'Your monsters, your magic items, your house rules.' },
              { title: 'AI-Aware', body: 'The Improv Assist pulls from this. Your world informs every suggestion.' },
            ]}
          />
        </div>
      </section>

      {/* ─── 10. PRICING ─── */}
      <section id="pricing" className="relative py-24 md:py-32 bg-domain-dark border-y border-domain-panel-border">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeading
            eyebrow="Pricing"
            title="Run your table for less than a session of pizza."
            subtitle="No ads. No data-mining. Just tools that work."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {/* Free */}
            <div className="dm-panel-raised rounded-xl border p-8 flex flex-col">
              <div className="font-cinzel text-eg4h-gold-dark uppercase tracking-widest text-sm mb-2">Free</div>
              <div className="font-cinzel-decorative text-4xl text-domain-text mb-1">$0</div>
              <div className="font-crimson italic text-domain-text-dim mb-6">Try before you commit.</div>
              <ul className="space-y-3 font-crimson text-domain-text mb-8 flex-1">
                <li>• Demo mode — explore the full interface</li>
                <li>• Browse SRD reference</li>
                <li>• See every feature in action</li>
                <li className="text-domain-text-dim">— No saved campaigns</li>
                <li className="text-domain-text-dim">— No AI features</li>
              </ul>
              <GoldButton onClick={enterDemo} variant="ghost">Try the Demo</GoldButton>
            </div>

            {/* DM Tier */}
            <div className="relative rounded-xl border-2 border-eg4h-gold p-8 flex flex-col bg-gradient-to-b from-domain-panel-raised to-domain-panel shadow-[0_8px_40px_rgba(255,215,0,0.15)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-eg4h-gold text-eg4h-black font-cinzel text-xs uppercase tracking-widest rounded-full">
                Most Popular
              </div>
              <div className="font-cinzel text-eg4h-gold uppercase tracking-widest text-sm mb-2">Dungeon Master</div>
              <div className="font-cinzel-decorative text-4xl text-gold-gradient mb-1">$5.99<span className="text-lg text-domain-text-dim">/mo</span></div>
              <div className="font-crimson italic text-domain-text-dim mb-6">Everything you need to run a campaign.</div>
              <ul className="space-y-3 font-crimson text-domain-text mb-8 flex-1">
                <li>✦ Unlimited campaigns</li>
                <li>✦ Full session view + trifold</li>
                <li>✦ AI Improv Assist</li>
                <li>✦ AI NPC generation</li>
                <li>✦ Session summaries</li>
                <li>✦ Player invites & portal</li>
                <li>✦ Homebrew & world lore</li>
              </ul>
              <GoldButton onClick={handleLogin}>Start Dungeon Master</GoldButton>
            </div>

            {/* Bundle */}
            <div className="dm-panel-raised rounded-xl border p-8 flex flex-col">
              <div className="font-cinzel text-eg4h-gold-dark uppercase tracking-widest text-sm mb-2">Bundle</div>
              <div className="font-cinzel-decorative text-4xl text-domain-text mb-1">$9.99<span className="text-lg text-domain-text-dim">/mo</span></div>
              <div className="font-crimson italic text-domain-text-dim mb-6">DM's Domain + Character Evolver.</div>
              <ul className="space-y-3 font-crimson text-domain-text mb-8 flex-1">
                <li>✦ Everything in Dungeon Master</li>
                <li>✦ Character Evolver Pro</li>
                <li>✦ Seamless party-to-campaign sync</li>
                <li>✦ Priority support</li>
                <li>✦ Early access to new features</li>
              </ul>
              <GoldButton onClick={handleLogin} variant="ghost">Get the Bundle</GoldButton>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 11. FINAL CTA ─── */}
      <section className="relative py-24 md:py-40 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: 'url(/bg-dmdlanding.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-domain-bg via-transparent to-domain-bg" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.h2
            className="font-cinzel-decorative text-4xl md:text-6xl text-gold-gradient mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Your world is waiting.
          </motion.h2>
          <p className="font-crimson text-lg md:text-2xl text-domain-text italic mb-10">
            Every NPC remembered. Every thread tracked. Every story preserved.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GoldButton onClick={enterDemo}>Enter Your Domain</GoldButton>
            <GoldButton onClick={handleLogin} variant="ghost">Log in</GoldButton>
          </div>
          <p className="mt-16 text-sm text-domain-text-dim font-ui">
            An <span className="text-eg4h-gold-dark font-semibold">Evil Genius 4 Hire</span> production
          </p>
        </div>
      </section>
    </div>
  );
}
