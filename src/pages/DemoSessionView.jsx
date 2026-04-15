import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Users, Scroll, Sparkles, Globe, ChevronRight,
  BookMarked, Lock, Plus, Swords, Eye, Dices,
  ImageIcon, FileText, UserPlus, Crown,
} from 'lucide-react';
import { useAuth } from '@/api/AuthContext';
import { supabase } from '@/lib/supabase';
import { SHATTERED_CROWN as demo } from '@/demo/shatteredCrown';
import Lightbox from '@/components/Lightbox';

const TABS = [
  { key: 'left', label: 'NPCs & Journal', icon: BookOpen },
  { key: 'center', label: 'Plot & Lore', icon: Scroll },
  { key: 'right', label: 'Party & Initiative', icon: Users },
];

// ─── Reusable bits ──────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, children }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-cinzel text-sm text-domain-text flex items-center gap-2">
        <Icon className="w-4 h-4" /> {title}
      </h3>
      {children}
    </div>
  );
}

function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`dm-panel-raised border rounded-lg p-3 ${onClick ? 'cursor-pointer hover:border-eg4h-gold-dark/60 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function DmTierBadge({ onClick, label = 'DM Tier' }) {
  return (
    <button
      onClick={onClick}
      title="This feature requires a DM tier subscription — click for pricing"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-eg4h-gold/10 border border-eg4h-gold/40 text-eg4h-gold font-ui text-[10px] uppercase tracking-wider hover:bg-eg4h-gold/20 transition-colors cursor-pointer"
    >
      <Crown className="w-2.5 h-2.5" /> {label}
    </button>
  );
}

// ─── Two-button signup modal ────────────────────────────────────
function SignupModal({ message, onClose, onStartFree, onLogIn }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="dm-panel-raised border border-domain-panel-border/60 rounded-xl p-6 max-w-sm w-full text-center"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          <Lock className="w-8 h-8 text-eg4h-gold mx-auto mb-3" />
          <p className="font-cinzel text-base text-domain-text mb-2">Save Your Campaign</p>
          <p className="font-crimson text-sm text-domain-text-dim mb-5">{message}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={onStartFree}
              className="w-full px-6 py-2.5 font-cinzel text-sm font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg shadow-[0_2px_12px_rgba(255,215,0,0.3)] hover:shadow-[0_4px_20px_rgba(255,215,0,0.5)] transition-all cursor-pointer"
            >
              Start Free
            </button>
            <button
              onClick={onLogIn}
              className="w-full px-6 py-2.5 font-cinzel text-sm font-semibold text-eg4h-gold border-2 border-eg4h-gold-dark/60 rounded-lg hover:bg-eg4h-gold/10 transition-all cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1 font-ui text-xs text-domain-text-dim hover:text-domain-text cursor-pointer"
            >
              Keep exploring
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═════════════════════════════════════════════════════════════════
export default function DemoSessionView() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [activeTab, setActiveTab] = useState('left');
  const [signupPrompt, setSignupPrompt] = useState(null);
  const [expandedNpc, setExpandedNpc] = useState(null);
  const [expandedThread, setExpandedThread] = useState(null);
  const [expandedSession, setExpandedSession] = useState(demo.sessions[0]?.id || null);
  const [expandedLore, setExpandedLore] = useState(null);
  const [expandedDmNote, setExpandedDmNote] = useState(null);
  const [improvInput, setImprovInput] = useState('');
  const [lightbox, setLightbox] = useState(null);

  // SRD (free content, fetched live)
  const [srdRef, setSrdRef] = useState({});
  const [expandedSrdCats, setExpandedSrdCats] = useState({});

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('srd_reference')
      .select('*')
      .order('category')
      .order('name')
      .then(({ data }) => {
        const grouped = {};
        (data || []).forEach(entry => {
          const cat = entry.category || 'Other';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(entry);
        });
        setSrdRef(grouped);
      });
  }, []);

  const promptSignup = (message) => setSignupPrompt(message);
  const closePrompt = () => setSignupPrompt(null);

  // Scroll to pricing on the landing page.
  const goToPricing = () => navigate('/#pricing');

  // Banner "Start Free" still launches the signup widget.
  const handleStartFree = () => login();
  // Modal "Start Free" is a soft conversion — show plans instead of jumping
  // straight into OAuth, because the user hasn't picked a tier yet.
  const handleModalStartFree = () => { closePrompt(); goToPricing(); };
  const handleLogIn = () => login();

  const inputClass = "w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm";

  // ═══════════════════════════════════════════════════════════════
  // LEFT — Session Journal + NPCs
  // ═══════════════════════════════════════════════════════════════
  const LeftPanel = (
    <div className="flex flex-col gap-5 h-full">
      <div>
        <SectionHeader icon={BookOpen} title="Session Journal">
          <button
            onClick={() => promptSignup('Create session notes to track your campaign story as it unfolds.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> New Session
          </button>
        </SectionHeader>
        <div className="space-y-2">
          {demo.sessions.map(s => {
            const open = expandedSession === s.id;
            return (
              <Card key={s.id} onClick={() => setExpandedSession(open ? null : s.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-cinzel text-sm text-eg4h-gold">Session {s.number} · {s.title}</p>
                    <p className="text-[11px] font-ui text-domain-text-dim/60">{s.date}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-domain-text-dim shrink-0 mt-0.5 transition-transform ${open ? 'rotate-90' : ''}`} />
                </div>
                {open && (
                  <p className="mt-3 text-xs font-crimson text-domain-text leading-relaxed">{s.summary}</p>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader icon={Users} title="NPCs">
          <div className="flex items-center gap-2">
            <DmTierBadge onClick={goToPricing} label="AI" />
            <button
              onClick={() => promptSignup('Create and track NPCs with personality, quirks, motivation, and voice notes.')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Quick NPC
            </button>
          </div>
        </SectionHeader>
        <div className="space-y-2">
          {demo.npcs.map(n => {
            const open = expandedNpc === n.id;
            return (
              <Card key={n.id} onClick={() => setExpandedNpc(open ? null : n.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-cinzel text-sm text-domain-text truncate">{n.name}</p>
                    <p className="text-[11px] font-ui text-domain-text-dim/70 truncate">{n.role}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-ui uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      n.status === 'alive' ? 'text-emerald-300/80 border-emerald-900/50' :
                      n.status === 'dead' ? 'text-red-300/70 border-red-900/50' :
                      'text-domain-text-dim border-domain-panel-border/40'
                    }`}>{n.status}</span>
                    <ChevronRight className={`w-4 h-4 text-domain-text-dim transition-transform ${open ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                {open && (
                  <div className="mt-3 space-y-2 text-xs font-crimson text-domain-text leading-relaxed">
                    <p><span className="text-eg4h-gold-dark">Personality:</span> {n.personality}</p>
                    <p><span className="text-eg4h-gold-dark">Wants:</span> {n.motivation}</p>
                    <p><span className="text-eg4h-gold-dark">Quirks:</span> {n.quirks}</p>
                    <p className="italic text-domain-text-dim/80"><span className="text-eg4h-gold-dark not-italic">Voice:</span> {n.voiceNotes}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // CENTER — Threads, AI, Lore, Homebrew, Gallery, SRD
  // ═══════════════════════════════════════════════════════════════
  const CenterPanel = (
    <div className="flex flex-col gap-5 h-full min-h-0">
      <div>
        <SectionHeader icon={Scroll} title="Story Threads">
          <button
            onClick={() => promptSignup('Track plot hooks, consequences, quests, and mysteries across your sessions.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> New Thread
          </button>
        </SectionHeader>
        <div className="space-y-2">
          {demo.threads.map(t => {
            const open = expandedThread === t.id;
            const urgencyStyle =
              t.urgency === 'high' ? 'text-red-300/90 border-red-900/50' :
              t.urgency === 'medium' ? 'text-amber-300/90 border-amber-900/50' :
              'text-domain-text-dim border-domain-panel-border/40';
            return (
              <Card key={t.id} onClick={() => setExpandedThread(open ? null : t.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-cinzel text-sm text-domain-text">{t.title}</p>
                    <p className="text-[11px] font-ui text-domain-text-dim/70">{t.type}</p>
                  </div>
                  <span className={`text-[10px] font-ui uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${urgencyStyle}`}>
                    {t.urgency}
                  </span>
                </div>
                {open && <p className="mt-3 text-xs font-crimson text-domain-text leading-relaxed">{t.description}</p>}
              </Card>
            );
          })}
        </div>
      </div>

      {/* AI Improv Assist — interactive but gated */}
      <div>
        <SectionHeader icon={Sparkles} title="AI Improv Assist">
          <DmTierBadge onClick={goToPricing} />
        </SectionHeader>
        <div className="flex gap-2">
          <input
            type="text"
            value={improvInput}
            onChange={(e) => setImprovInput(e.target.value)}
            placeholder="The rogue just pickpocketed the king..."
            className={inputClass}
          />
          <button
            onClick={goToPricing}
            className="px-3 py-2 text-xs font-ui text-eg4h-gold border border-eg4h-gold/40 rounded-lg hover:bg-eg4h-gold/10 transition-colors cursor-pointer relative"
            title="DM Tier feature — see pricing"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] font-ui text-domain-text-dim/60 mt-1">Describe what happened — get 3 ways to run with it</p>
        <Card className="!p-3 mt-2 border-dashed border-eg4h-gold/20">
          <div className="flex items-start gap-2 text-domain-text-dim">
            <Crown className="w-3.5 h-3.5 shrink-0 mt-0.5 text-eg4h-gold" />
            <p className="text-xs font-crimson italic">
              Campaign-aware AI knows The Shattered Crown, every NPC, every thread, every session note. <button onClick={goToPricing} className="underline text-eg4h-gold hover:text-eg4h-gold-light cursor-pointer">Upgrade to DM Tier</button> to unlock it.
            </p>
          </div>
        </Card>
      </div>

      <div>
        <SectionHeader icon={Globe} title="World Lore">
          <button
            onClick={() => promptSignup('Build your world with locations, factions, deities, and history.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> New Entry
          </button>
        </SectionHeader>
        <div className="space-y-2">
          {demo.lore.map(l => {
            const open = expandedLore === l.id;
            return (
              <Card key={l.id} onClick={() => setExpandedLore(open ? null : l.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-cinzel text-sm text-domain-text">{l.name}</p>
                    <p className="text-[11px] font-ui text-domain-text-dim/70">{l.type}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-domain-text-dim transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} />
                </div>
                {open && <p className="mt-3 text-xs font-crimson text-domain-text leading-relaxed">{l.description}</p>}
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader icon={FileText} title="Homebrew">
          <button
            onClick={() => promptSignup('Upload homebrew PDFs — custom monsters, classes, items, and house rules.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Upload
          </button>
        </SectionHeader>
        <div className="space-y-2">
          {demo.homebrew.map(h => (
            <Card key={h.id}>
              <p className="font-cinzel text-sm text-domain-text">{h.name}</p>
              <p className="text-[11px] font-ui text-domain-text-dim/70 mb-1">{h.type}</p>
              <p className="text-xs font-crimson text-domain-text leading-relaxed">{h.notes}</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader icon={ImageIcon} title="Gallery">
          <button
            onClick={() => promptSignup('Upload maps, handouts, portraits, and props to share with your party.')}
            className="p-1 text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
        </SectionHeader>
        <div className="grid grid-cols-2 gap-2">
          {demo.gallery.map(g => (
            <button
              key={g.id}
              onClick={() => g.src && setLightbox({ src: g.src, alt: g.caption })}
              className="dm-panel-raised border rounded-lg overflow-hidden group text-left cursor-zoom-in hover:border-eg4h-gold-dark/60 transition-colors"
            >
              <div className="aspect-video bg-domain-panel/50 relative overflow-hidden">
                {g.src ? (
                  <>
                    <img
                      src={g.src}
                      alt={g.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-domain-bg/80 backdrop-blur-sm border border-domain-panel-border text-domain-text-dim font-ui text-[9px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      Enlarge
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-domain-text-dim/50" />
                  </div>
                )}
              </div>
              <div className="p-2 text-center">
                <p className="text-[11px] font-crimson text-domain-text leading-tight">{g.caption}</p>
                <p className="text-[9px] font-ui text-domain-text-dim/60 uppercase tracking-wider mt-1">{g.tag}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {Object.keys(srdRef).length > 0 && (
        <div>
          <SectionHeader icon={BookMarked} title="Quick Reference" />
          <div className="space-y-1">
            {Object.entries(srdRef).map(([category, entries]) => (
              <div key={category}>
                <button
                  onClick={() => setExpandedSrdCats(prev => ({ ...prev, [category]: !prev[category] }))}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-cinzel text-domain-text hover:text-eg4h-gold bg-domain-panel/40 border border-domain-panel-border/20 rounded transition-colors cursor-pointer"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform ${expandedSrdCats[category] ? 'rotate-90' : ''}`} />
                  {category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  <span className="text-[10px] font-ui text-domain-text-dim/60 ml-auto">{entries.length}</span>
                </button>
                {expandedSrdCats[category] && (
                  <div className="ml-2 border-l border-domain-panel-border/20 pl-2 py-1 space-y-1.5">
                    {entries.map(entry => (
                      <div key={entry.id}>
                        <p className="text-xs font-cinzel text-domain-text">{entry.name}</p>
                        <p className="text-[11px] font-crimson text-domain-text-dim/70 leading-snug">{entry.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RIGHT — Party, Initiative, DM Notes
  // ═══════════════════════════════════════════════════════════════
  const RightPanel = (
    <div className="flex flex-col gap-5 h-full">
      <div>
        <SectionHeader icon={Users} title="Party">
          <button
            onClick={() => promptSignup('Link a party from Character Evolver or invite players directly.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3 h-3" /> Link Party
          </button>
        </SectionHeader>
        <div className="space-y-2">
          {demo.party.map(p => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-cinzel text-sm text-eg4h-gold truncate">{p.name}</p>
                  <p className="text-[11px] font-ui text-domain-text-dim/80">{p.race} {p.subclass} {p.class} · Lv {p.level}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="text-center bg-domain-panel/50 border border-domain-panel-border/30 rounded px-1 py-1">
                  <p className="text-[9px] font-ui text-domain-text-dim uppercase tracking-wider">AC</p>
                  <p className="font-cinzel text-sm text-domain-text">{p.ac}</p>
                </div>
                <div className="text-center bg-domain-panel/50 border border-domain-panel-border/30 rounded px-1 py-1">
                  <p className="text-[9px] font-ui text-domain-text-dim uppercase tracking-wider">HP</p>
                  <p className="font-cinzel text-sm text-domain-text">{p.hp}/{p.maxHp}</p>
                </div>
                <div className="text-center bg-domain-panel/50 border border-domain-panel-border/30 rounded px-1 py-1">
                  <p className="text-[9px] font-ui text-domain-text-dim uppercase tracking-wider">Pas Per</p>
                  <p className="font-cinzel text-sm text-domain-text">{p.passivePerception}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] font-ui text-domain-text-dim/80">{p.topScores}</p>
              <p className="mt-1 text-[11px] font-crimson italic text-domain-text-dim">"{p.bonds}"</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader icon={Swords} title="Initiative Tracker" />
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-domain-panel/50 border border-domain-panel-border/30 rounded-lg">
              <Dices className="w-4 h-4 text-domain-amber" />
              <span className="font-cinzel text-sm text-domain-text">Round {demo.initiative.round}</span>
            </div>
            <button
              onClick={() => promptSignup('Track HP, advance rounds, and manage turn order during combat.')}
              className="text-[11px] font-ui text-domain-amber border border-domain-panel-border/50 rounded px-2 py-1 hover:border-eg4h-gold-dark/60 cursor-pointer"
            >
              Next Turn
            </button>
          </div>
          <div className="space-y-1">
            {demo.initiative.combatants
              .sort((a, b) => b.initiative - a.initiative)
              .map(c => {
                const isActive = c.id === demo.initiative.active;
                const dead = c.hp === 0;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs ${
                      isActive ? 'bg-eg4h-gold/10 border border-eg4h-gold/40' : 'border border-domain-panel-border/30'
                    } ${dead ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-cinzel text-domain-text w-6 text-center shrink-0">{c.initiative}</span>
                      <span className={`font-crimson truncate ${c.isParty ? 'text-eg4h-gold' : 'text-domain-text'}`}>
                        {c.name}
                      </span>
                    </div>
                    <span className={`font-ui text-[11px] shrink-0 ${dead ? 'text-red-400/80' : 'text-domain-text-dim'}`}>
                      {dead ? 'Down' : `${c.hp}/${c.maxHp}`}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      <div>
        <SectionHeader icon={Eye} title="DM Secret Notes" />
        <div className="space-y-2">
          {demo.dmNotes.map(n => {
            const open = expandedDmNote === n.id;
            return (
              <Card key={n.id} onClick={() => setExpandedDmNote(open ? null : n.id)}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-cinzel text-sm text-domain-text">{n.characterName}</p>
                  <ChevronRight className={`w-4 h-4 text-domain-text-dim shrink-0 mt-0.5 transition-transform ${open ? 'rotate-90' : ''}`} />
                </div>
                {open && <p className="mt-2 text-xs font-crimson italic text-domain-text leading-relaxed">{n.note}</p>}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="dm-study-bg min-h-screen flex flex-col">
      {/* Demo banner */}
      <div className="bg-gradient-to-r from-eg4h-gold/10 via-eg4h-gold/15 to-eg4h-gold/10 border-b border-eg4h-gold-dark/30 relative z-30">
        <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <p className="font-crimson text-sm text-domain-text">
            You're exploring a demo of <span className="text-eg4h-gold font-semibold">DM's Domain</span>. Sign up to save your own campaign.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPricing}
              className="px-3 py-1.5 font-cinzel text-xs text-eg4h-gold border border-eg4h-gold/40 rounded hover:bg-eg4h-gold/10 transition-all cursor-pointer"
            >
              See Plans
            </button>
            <button
              onClick={handleStartFree}
              className="px-4 py-1.5 font-cinzel text-xs font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded shadow-[0_2px_8px_rgba(255,215,0,0.3)] hover:shadow-[0_2px_12px_rgba(255,215,0,0.5)] transition-all cursor-pointer"
            >
              Start Free
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-domain-panel-border/60 bg-domain-dark/90 backdrop-blur-sm sticky top-0 z-20 dm-header-glow relative">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-domain-text-dim hover:text-eg4h-gold transition-colors cursor-pointer"
          >
            <img src="/dmd-logo.png" alt="DMD" className="w-8 h-8" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-cinzel text-lg text-eg4h-gold truncate">{demo.campaign.name}</h1>
            <p className="font-crimson text-xs text-domain-text-dim truncate">{demo.campaign.tagline}</p>
          </div>
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-ui rounded-full bg-domain-warm/20 text-domain-amber border border-domain-warm/30">
            Demo
          </span>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="lg:hidden border-b border-domain-panel-border/40 bg-domain-panel/80 relative z-10">
        <div className="flex">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-ui transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'text-eg4h-gold border-b-2 border-eg4h-gold'
                    : 'text-domain-text-dim hover:text-domain-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Three-column desktop / tabbed mobile */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full relative z-10">
        <div className="hidden lg:grid lg:grid-cols-3 gap-0 h-[calc(100vh-110px)]">
          <div className="border-r border-domain-panel-border/30 p-4 overflow-y-auto">{LeftPanel}</div>
          <div className="border-r border-domain-panel-border/30 p-4 overflow-y-auto">{CenterPanel}</div>
          <div className="p-4 overflow-y-auto">{RightPanel}</div>
        </div>
        <div className="lg:hidden p-4 overflow-y-auto">
          {activeTab === 'left' && LeftPanel}
          {activeTab === 'center' && CenterPanel}
          {activeTab === 'right' && RightPanel}
        </div>
      </div>

      <Lightbox src={lightbox?.src} alt={lightbox?.alt} onClose={() => setLightbox(null)} />

      {signupPrompt && (
        <SignupModal
          message={signupPrompt}
          onClose={closePrompt}
          onStartFree={handleModalStartFree}
          onLogIn={handleLogIn}
        />
      )}
    </div>
  );
}
