import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Users, Scroll, Sparkles, Globe, ChevronRight, ChevronDown,
  BookMarked, Lock, Plus, Swords, Shield, Heart, Eye, Dices,
  ImageIcon, FileText, MapPin, UserPlus, Layers,
} from 'lucide-react';
import { useAuth } from '@/api/AuthContext';
import { supabase } from '@/lib/supabase';

// ─── Tab selector for mobile ────────────────────────────────────
const TABS = [
  { key: 'left', label: 'NPCs & Journal', icon: BookOpen },
  { key: 'center', label: 'Plot & Lore', icon: Scroll },
  { key: 'right', label: 'Party & Initiative', icon: Users },
];

// ─── Reusable section header ────────────────────────────────────
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

// ─── Card wrapper ───────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`dm-panel-raised border rounded-lg p-3 ${className}`}>
      {children}
    </div>
  );
}

// ─── Login prompt modal ─────────────────────────────────────────
function LoginPrompt({ message, onClose, onLogin }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="dm-panel-raised border border-domain-panel-border/60 rounded-xl p-6 max-w-sm mx-4 text-center"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          <Lock className="w-8 h-8 text-eg4h-gold mx-auto mb-3" />
          <p className="font-cinzel text-base text-domain-text mb-2">Log in to Continue</p>
          <p className="font-crimson text-sm text-domain-text-dim mb-5">{message}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onLogin}
              className="px-6 py-2 font-cinzel text-sm font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg shadow-[0_2px_12px_rgba(255,215,0,0.3)] hover:shadow-[0_4px_20px_rgba(255,215,0,0.5)] transition-all cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 font-ui text-sm text-domain-text-dim hover:text-domain-text cursor-pointer"
            >
              Keep Exploring
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═════════════════════════════════════════════════════════════════
// DEMO SESSION VIEW
// ═════════════════════════════════════════════════════════════════
export default function DemoSessionView() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [activeTab, setActiveTab] = useState('left');
  const [loginPrompt, setLoginPrompt] = useState(null);

  // SRD data (real — it's free SRD content)
  const [srdRef, setSrdRef] = useState({});
  const [expandedSrdCats, setExpandedSrdCats] = useState({});

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // Fetch SRD entries
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

  const handleLogin = () => {
    login();
  };

  const promptLogin = (message) => {
    setLoginPrompt(message);
  };

  // ─── Shared style classes ──────────────────────────────────────
  const inputClass = "w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm";

  // ═══════════════════════════════════════════════════════════════
  // LEFT PANEL — NPCs & Session Journal (empty states)
  // ═══════════════════════════════════════════════════════════════
  const LeftPanel = (
    <div className="flex flex-col gap-5 h-full">
      {/* Session Journal */}
      <div>
        <SectionHeader icon={BookOpen} title="Session Journal" />
        <div className="flex items-center gap-1 mb-3">
          <button
            onClick={() => promptLogin('Create session notes to track your campaign story as it unfolds.')}
            className="px-2.5 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/30 rounded hover:border-eg4h-gold-dark/40 cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> New Session
          </button>
        </div>
        <Card className="!p-4">
          <p className="text-xs font-crimson text-domain-text-dim/50 italic text-center">
            Your adventure awaits. Session notes track every twist, reveal, and memorable moment — ready for recall when you need them.
          </p>
        </Card>
      </div>

      {/* NPCs */}
      <div>
        <SectionHeader icon={Users} title="NPCs">
          <button
            onClick={() => promptLogin('Create and track NPCs with personality, quirks, motivation, and voice notes.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Quick NPC
          </button>
        </SectionHeader>
        <Card className="!p-4">
          <p className="text-xs font-crimson text-domain-text-dim/50 italic text-center">
            Generate NPCs on the fly — name, role, personality, quirks, and motivation in one click. AI-enhanced embellishment available with DM tier.
          </p>
        </Card>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // CENTER PANEL — Plot, AI, Lore, Homebrew, Gallery, SRD
  // ═══════════════════════════════════════════════════════════════
  const CenterPanel = (
    <div className="flex flex-col gap-5 h-full min-h-0">
      {/* Story Threads */}
      <div>
        <SectionHeader icon={Scroll} title="Story Threads">
          <button
            onClick={() => promptLogin('Track plot hooks, consequences, quests, and mysteries across your sessions.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> New Thread
          </button>
        </SectionHeader>
        <Card className="!p-4">
          <p className="text-xs font-crimson text-domain-text-dim/50 italic text-center">
            Never lose a plot thread again. Track hooks, consequences, quests, and mysteries with urgency and status.
          </p>
        </Card>
      </div>

      {/* AI Improv Assist — locked */}
      <div>
        <SectionHeader icon={Sparkles} title="AI Improv Assist" />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="The rogue just pickpocketed the king..."
            className={inputClass}
            readOnly
            onFocus={() => promptLogin('AI Improv Assist is a Dungeon Master tier feature. Get 3 campaign-aware suggestions for any situation.')}
          />
          <button
            onClick={() => promptLogin('AI Improv Assist is a Dungeon Master tier feature. Get 3 campaign-aware suggestions for any situation.')}
            className="px-3 py-2 text-xs font-ui text-domain-amber/40 border border-domain-warm/20 rounded-lg cursor-pointer relative"
          >
            <Sparkles className="w-4 h-4" />
            <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-eg4h-gold" />
          </button>
        </div>
        <p className="text-[10px] font-ui text-domain-text-dim/60 mt-1">Describe what happened — get 3 ways to run with it</p>
        <Card className="!p-3 mt-2 border-dashed border-domain-panel-border/30">
          <div className="flex items-center gap-2 text-domain-text-dim/40">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <p className="text-xs font-crimson italic">
              Log in and upgrade to DM tier to unlock AI-powered suggestions that know your campaign's NPCs, lore, and story threads.
            </p>
          </div>
        </Card>
      </div>

      {/* World Lore */}
      <div>
        <SectionHeader icon={Globe} title="World Lore">
          <button
            onClick={() => promptLogin('Build your world with locations, factions, deities, and history.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> New Entry
          </button>
        </SectionHeader>
        <Card className="!p-4">
          <p className="text-xs font-crimson text-domain-text-dim/50 italic text-center">
            Locations, factions, deities, history, cultures — build a living world and the AI will use it to enhance your sessions.
          </p>
        </Card>
      </div>

      {/* Homebrew */}
      <div>
        <SectionHeader icon={FileText} title="Homebrew">
          <button
            onClick={() => promptLogin('Upload homebrew PDFs — custom monsters, classes, items, and house rules.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Upload
          </button>
        </SectionHeader>
        <Card className="!p-4">
          <p className="text-xs font-crimson text-domain-text-dim/50 italic text-center">
            Upload custom monsters, classes, items, spells, and house rules as PDFs. The AI reads them too.
          </p>
        </Card>
      </div>

      {/* Gallery */}
      <div>
        <SectionHeader icon={ImageIcon} title="Gallery">
          <button
            onClick={() => promptLogin('Upload maps, handouts, portraits, and props to share with your party.')}
            className="p-1 text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-3 h-3" />
          </button>
        </SectionHeader>
        <Card className="!p-4">
          <p className="text-xs font-crimson text-domain-text-dim/50 italic text-center">
            Upload maps, handouts, portraits, and props. Tag and share images with your players during sessions.
          </p>
        </Card>
      </div>

      {/* SRD Quick Reference — fully browsable */}
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
  // RIGHT PANEL — Party & Initiative (empty states)
  // ═══════════════════════════════════════════════════════════════
  const RightPanel = (
    <div className="flex flex-col gap-5 h-full">
      {/* Party Members */}
      <div>
        <SectionHeader icon={Users} title="Party">
          <button
            onClick={() => promptLogin('Link a party from Character Evolver or invite players directly.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3 h-3" /> Link Party
          </button>
        </SectionHeader>
        <Card className="!p-4">
          <p className="text-xs font-crimson text-domain-text-dim/50 italic text-center">
            Link a party from Character Evolver or invite players with a shareable code. See AC, HP, Passive Perception, and send secret messages mid-session.
          </p>
        </Card>
      </div>

      {/* Initiative / Combat Tracker */}
      <div>
        <SectionHeader icon={Swords} title="Initiative Tracker" />
        <Card className="!p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-domain-panel/50 border border-domain-panel-border/20 rounded-lg">
                <Dices className="w-4 h-4 text-domain-amber/50" />
                <span className="font-cinzel text-sm text-domain-text-dim/40">Round —</span>
              </div>
            </div>
            <p className="text-xs font-crimson text-domain-text-dim/50 italic text-center">
              Roll for initiative. Add party members and monsters, track HP, and advance rounds. One click to start combat.
            </p>
          </div>
        </Card>
      </div>

      {/* DM Notes placeholder */}
      <div>
        <SectionHeader icon={Eye} title="DM Secret Notes" />
        <Card className="!p-4">
          <p className="text-xs font-crimson text-domain-text-dim/50 italic text-center">
            Keep private notes on each character — secrets, plot hooks, and things only you know. Send secret messages to individual players during sessions.
          </p>
        </Card>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="dm-study-bg min-h-screen flex flex-col">
      {/* Demo banner */}
      <div className="bg-gradient-to-r from-eg4h-gold/10 via-eg4h-gold/15 to-eg4h-gold/10 border-b border-eg4h-gold-dark/30 relative z-30">
        <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <p className="font-crimson text-sm text-domain-text">
            You're exploring <span className="text-eg4h-gold font-semibold">DM's Domain</span>. Log in to save your campaign and unlock all features.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogin}
              className="px-4 py-1.5 font-cinzel text-xs font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded shadow-[0_2px_8px_rgba(255,215,0,0.3)] hover:shadow-[0_2px_12px_rgba(255,215,0,0.5)] transition-all cursor-pointer"
            >
              Log In
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
            <h1 className="font-cinzel text-lg text-eg4h-gold truncate">Demo Campaign</h1>
            <p className="font-crimson text-xs text-domain-text-dim truncate">Explore the full DM's Domain experience</p>
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
        {/* Desktop: three columns */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-0 h-[calc(100vh-110px)]">
          <div className="border-r border-domain-panel-border/30 p-4 overflow-y-auto">{LeftPanel}</div>
          <div className="border-r border-domain-panel-border/30 p-4 overflow-y-auto">{CenterPanel}</div>
          <div className="p-4 overflow-y-auto">{RightPanel}</div>
        </div>

        {/* Mobile: active tab */}
        <div className="lg:hidden p-4 overflow-y-auto">
          {activeTab === 'left' && LeftPanel}
          {activeTab === 'center' && CenterPanel}
          {activeTab === 'right' && RightPanel}
        </div>
      </div>

      {/* Login prompt modal */}
      {loginPrompt && (
        <LoginPrompt
          message={loginPrompt}
          onClose={() => setLoginPrompt(null)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}
