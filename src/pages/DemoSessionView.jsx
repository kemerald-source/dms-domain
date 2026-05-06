import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Users, Scroll, Sparkles, Globe, ChevronRight,
  Lock, Plus, Swords, Eye, Dices,
  ImageIcon, FileText, UserPlus, Crown, Check, Pencil,
} from 'lucide-react';
import { useAuth } from '@/api/AuthContext';
import Lightbox from '@/components/Lightbox';

const TABS = [
  { key: 'left', label: 'NPCs & Journal', icon: BookOpen },
  { key: 'center', label: 'Plot & Lore', icon: Scroll },
  { key: 'right', label: 'Party & Initiative', icon: Users },
];

const inputClass = "w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm";

const uid = () => Math.random().toString(36).slice(2, 10);

const EMPTY_CAMPAIGN = { name: '', tagline: '' };
const EMPTY_INITIATIVE = { round: 1, active: null, combatants: [] };

// ─── Reusable bits ──────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, children }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-cinzel text-sm text-domain-text flex items-center gap-2">
        <Icon className="w-4 h-4" /> {title}
      </h3>
      <div className="flex items-center gap-2">{children}</div>
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

function DmTierBadge({ onClick, label = 'Available on DM Tier' }) {
  return (
    <button
      onClick={onClick}
      title="Available on Dungeon Master tier — click for pricing"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-eg4h-gold/10 border border-eg4h-gold/40 text-eg4h-gold font-ui text-[10px] uppercase tracking-wider hover:bg-eg4h-gold/20 transition-colors cursor-pointer"
    >
      <Crown className="w-2.5 h-2.5" /> {label}
    </button>
  );
}

function AddButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
    >
      <Plus className="w-3 h-3" /> {children}
    </button>
  );
}

function FormActions({ onSave, onCancel, saveLabel = 'Add', saveDisabled = false }) {
  return (
    <div className="flex items-center justify-end gap-2 mt-3">
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-1 text-xs font-ui text-domain-text-dim border border-domain-panel-border/40 rounded hover:text-domain-text cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled}
        className="flex items-center gap-1 px-3 py-1 text-xs font-cinzel text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded shadow-[0_2px_8px_rgba(255,215,0,0.3)] hover:shadow-[0_2px_12px_rgba(255,215,0,0.5)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        <Check className="w-3 h-3" /> {saveLabel}
      </button>
    </div>
  );
}

function EmptyHint({ children }) {
  return (
    <p className="text-[11px] font-crimson italic text-domain-text-dim/70 px-1 py-2">
      {children}
    </p>
  );
}

// ─── Two-button signup modal ────────────────────────────────────
function SignupModal({ message, onClose, onSeePlans, onLogIn }) {
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
              onClick={onSeePlans}
              className="w-full px-6 py-2.5 font-cinzel text-sm font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg shadow-[0_2px_12px_rgba(255,215,0,0.3)] hover:shadow-[0_4px_20px_rgba(255,215,0,0.5)] transition-all cursor-pointer"
            >
              See Plans
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
  const [lightbox, setLightbox] = useState(null);

  // Blank campaign template — local state only, no DB calls.
  const [campaign, setCampaign] = useState(EMPTY_CAMPAIGN);
  const [editingCampaign, setEditingCampaign] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [threads, setThreads] = useState([]);
  const [lore, setLore] = useState([]);
  const [dmNotes, setDmNotes] = useState([]);
  const [initiative, setInitiative] = useState(EMPTY_INITIATIVE);

  const [expandedSession, setExpandedSession] = useState(null);
  const [expandedNpc, setExpandedNpc] = useState(null);
  const [expandedThread, setExpandedThread] = useState(null);
  const [expandedLore, setExpandedLore] = useState(null);
  const [expandedDmNote, setExpandedDmNote] = useState(null);

  // One in-flight create form at a time. { section, fields }
  const [draft, setDraft] = useState(null);
  const [improvInput, setImprovInput] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const promptSignup = (message) => setSignupPrompt(message);
  const closePrompt = () => setSignupPrompt(null);

  // Pricing lives as a section on the landing page; Landing.jsx scrolls
  // to #pricing on mount when the hash is present.
  const goToPricing = () => navigate('/#pricing');

  const handleStartFree = () => login();
  const handleSeePlans = () => { closePrompt(); goToPricing(); };
  const handleLogIn = () => { closePrompt(); login(); };

  // ─── Draft helpers ───────────────────────────────────────────
  const startDraft = (section, fields) => setDraft({ section, fields });
  const updateDraft = (key, value) =>
    setDraft(prev => (prev ? { ...prev, fields: { ...prev.fields, [key]: value } } : prev));
  const cancelDraft = () => setDraft(null);
  const isDrafting = (section) => draft?.section === section;

  // ─── Section commit handlers ─────────────────────────────────
  const commitSession = () => {
    const f = draft.fields;
    if (!f.title.trim()) return;
    const id = uid();
    setSessions(prev => [
      { id, number: f.number || prev.length + 1, title: f.title, date: f.date || 'Today', summary: f.summary },
      ...prev,
    ]);
    setExpandedSession(id);
    setDraft(null);
  };

  const commitNpc = () => {
    const f = draft.fields;
    if (!f.name.trim()) return;
    const id = uid();
    setNpcs(prev => [...prev, { id, ...f }]);
    setExpandedNpc(id);
    setDraft(null);
  };

  const commitThread = () => {
    const f = draft.fields;
    if (!f.title.trim()) return;
    const id = uid();
    setThreads(prev => [...prev, { id, ...f }]);
    setExpandedThread(id);
    setDraft(null);
  };

  const commitLore = () => {
    const f = draft.fields;
    if (!f.name.trim()) return;
    const id = uid();
    setLore(prev => [...prev, { id, ...f }]);
    setExpandedLore(id);
    setDraft(null);
  };

  const commitDmNote = () => {
    const f = draft.fields;
    if (!f.characterName.trim() && !f.note.trim()) return;
    const id = uid();
    setDmNotes(prev => [...prev, { id, ...f }]);
    setExpandedDmNote(id);
    setDraft(null);
  };

  const commitCombatant = () => {
    const f = draft.fields;
    if (!f.name.trim()) return;
    const id = uid();
    const maxHp = Math.max(1, Number(f.maxHp) || 1);
    setInitiative(prev => ({
      ...prev,
      active: prev.active ?? id,
      combatants: [
        ...prev.combatants,
        { id, name: f.name, initiative: Number(f.initiative) || 10, hp: maxHp, maxHp, isParty: !!f.isParty },
      ],
    }));
    setDraft(null);
  };

  const advanceTurn = () => {
    setInitiative(prev => {
      if (prev.combatants.length === 0) return prev;
      const sorted = [...prev.combatants].sort((a, b) => b.initiative - a.initiative);
      const idx = sorted.findIndex(c => c.id === prev.active);
      const nextIdx = idx === -1 ? 0 : (idx + 1) % sorted.length;
      const wrapped = idx !== -1 && nextIdx === 0;
      return { ...prev, active: sorted[nextIdx].id, round: wrapped ? prev.round + 1 : prev.round };
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // LEFT — Session Journal + NPCs
  // ═══════════════════════════════════════════════════════════════
  const LeftPanel = (
    <div className="flex flex-col gap-5 h-full">
      <div>
        <SectionHeader icon={BookOpen} title="Session Journal">
          <AddButton
            onClick={() =>
              startDraft('session', { number: sessions.length + 1, title: '', date: '', summary: '' })
            }
          >
            New Session
          </AddButton>
        </SectionHeader>
        {isDrafting('session') && (
          <Card className="mb-2">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="number"
                min="1"
                value={draft.fields.number}
                onChange={(e) => updateDraft('number', Number(e.target.value))}
                placeholder="#"
                className={inputClass}
              />
              <input
                type="text"
                value={draft.fields.title}
                onChange={(e) => updateDraft('title', e.target.value)}
                placeholder="Session title"
                className={`${inputClass} col-span-2`}
              />
            </div>
            <input
              type="text"
              value={draft.fields.date}
              onChange={(e) => updateDraft('date', e.target.value)}
              placeholder="Date (e.g. Today, 2 days ago)"
              className={`${inputClass} mb-2`}
            />
            <textarea
              value={draft.fields.summary}
              onChange={(e) => updateDraft('summary', e.target.value)}
              placeholder="What happened this session?"
              rows={4}
              className={inputClass}
            />
            <FormActions onSave={commitSession} onCancel={cancelDraft} saveDisabled={!draft.fields.title.trim()} />
          </Card>
        )}
        <div className="space-y-2">
          {sessions.length === 0 && !isDrafting('session') && (
            <EmptyHint>No sessions yet. Click "New Session" to log your first.</EmptyHint>
          )}
          {sessions.map(s => {
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
                {open && s.summary && (
                  <p className="mt-3 text-xs font-crimson text-domain-text leading-relaxed whitespace-pre-wrap">{s.summary}</p>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader icon={Users} title="NPCs">
          <DmTierBadge onClick={goToPricing} label="AI · DM Tier" />
          <AddButton
            onClick={() =>
              startDraft('npc', {
                name: '', role: '', status: 'alive',
                personality: '', motivation: '', quirks: '', voiceNotes: '',
              })
            }
          >
            Quick NPC
          </AddButton>
        </SectionHeader>
        {isDrafting('npc') && (
          <Card className="mb-2">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                value={draft.fields.name}
                onChange={(e) => updateDraft('name', e.target.value)}
                placeholder="Name"
                className={inputClass}
              />
              <input
                type="text"
                value={draft.fields.role}
                onChange={(e) => updateDraft('role', e.target.value)}
                placeholder="Role / archetype"
                className={inputClass}
              />
            </div>
            <select
              value={draft.fields.status}
              onChange={(e) => updateDraft('status', e.target.value)}
              className={`${inputClass} mb-2`}
            >
              <option value="alive">alive</option>
              <option value="unknown">unknown</option>
              <option value="dead">dead</option>
            </select>
            <input
              type="text"
              value={draft.fields.personality}
              onChange={(e) => updateDraft('personality', e.target.value)}
              placeholder="Personality"
              className={`${inputClass} mb-2`}
            />
            <input
              type="text"
              value={draft.fields.motivation}
              onChange={(e) => updateDraft('motivation', e.target.value)}
              placeholder="Wants / motivation"
              className={`${inputClass} mb-2`}
            />
            <input
              type="text"
              value={draft.fields.quirks}
              onChange={(e) => updateDraft('quirks', e.target.value)}
              placeholder="Quirks"
              className={`${inputClass} mb-2`}
            />
            <input
              type="text"
              value={draft.fields.voiceNotes}
              onChange={(e) => updateDraft('voiceNotes', e.target.value)}
              placeholder="Voice notes (cadence, accent, signature lines)"
              className={inputClass}
            />
            <FormActions onSave={commitNpc} onCancel={cancelDraft} saveDisabled={!draft.fields.name.trim()} />
          </Card>
        )}
        <div className="space-y-2">
          {npcs.length === 0 && !isDrafting('npc') && (
            <EmptyHint>No NPCs yet. Add one with "Quick NPC".</EmptyHint>
          )}
          {npcs.map(n => {
            const open = expandedNpc === n.id;
            return (
              <Card key={n.id} onClick={() => setExpandedNpc(open ? null : n.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-cinzel text-sm text-domain-text truncate">{n.name}</p>
                    {n.role && <p className="text-[11px] font-ui text-domain-text-dim/70 truncate">{n.role}</p>}
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
                    {n.personality && <p><span className="text-eg4h-gold-dark">Personality:</span> {n.personality}</p>}
                    {n.motivation && <p><span className="text-eg4h-gold-dark">Wants:</span> {n.motivation}</p>}
                    {n.quirks && <p><span className="text-eg4h-gold-dark">Quirks:</span> {n.quirks}</p>}
                    {n.voiceNotes && (
                      <p className="italic text-domain-text-dim/80">
                        <span className="text-eg4h-gold-dark not-italic">Voice:</span> {n.voiceNotes}
                      </p>
                    )}
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
  // CENTER — Threads, AI, Lore, Homebrew, Gallery
  // ═══════════════════════════════════════════════════════════════
  const CenterPanel = (
    <div className="flex flex-col gap-5 h-full min-h-0">
      <div>
        <SectionHeader icon={Scroll} title="Story Threads">
          <AddButton
            onClick={() =>
              startDraft('thread', { title: '', type: 'quest', urgency: 'medium', description: '' })
            }
          >
            New Thread
          </AddButton>
        </SectionHeader>
        {isDrafting('thread') && (
          <Card className="mb-2">
            <input
              type="text"
              value={draft.fields.title}
              onChange={(e) => updateDraft('title', e.target.value)}
              placeholder="Thread title"
              className={`${inputClass} mb-2`}
            />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={draft.fields.type}
                onChange={(e) => updateDraft('type', e.target.value)}
                className={inputClass}
              >
                <option value="quest">quest</option>
                <option value="mystery">mystery</option>
                <option value="hook">hook</option>
                <option value="personal">personal</option>
                <option value="loose-end">loose-end</option>
              </select>
              <select
                value={draft.fields.urgency}
                onChange={(e) => updateDraft('urgency', e.target.value)}
                className={inputClass}
              >
                <option value="high">high urgency</option>
                <option value="medium">medium urgency</option>
                <option value="low">low urgency</option>
              </select>
            </div>
            <textarea
              value={draft.fields.description}
              onChange={(e) => updateDraft('description', e.target.value)}
              placeholder="What's the hook, the stakes, where it leads…"
              rows={3}
              className={inputClass}
            />
            <FormActions onSave={commitThread} onCancel={cancelDraft} saveDisabled={!draft.fields.title.trim()} />
          </Card>
        )}
        <div className="space-y-2">
          {threads.length === 0 && !isDrafting('thread') && (
            <EmptyHint>No threads yet. Track plot hooks, mysteries, and quests as they emerge.</EmptyHint>
          )}
          {threads.map(t => {
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
                {open && t.description && (
                  <p className="mt-3 text-xs font-crimson text-domain-text leading-relaxed whitespace-pre-wrap">{t.description}</p>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* AI Improv Assist — visible but gated */}
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
            className="px-3 py-2 text-xs font-ui text-eg4h-gold border border-eg4h-gold/40 rounded-lg hover:bg-eg4h-gold/10 transition-colors cursor-pointer"
            title="Available on DM Tier — click for pricing"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] font-ui text-domain-text-dim/60 mt-1">Describe what happened — get 3 ways to run with it</p>
        <Card className="!p-3 mt-2 border-dashed border-eg4h-gold/20">
          <div className="flex items-start gap-2 text-domain-text-dim">
            <Crown className="w-3.5 h-3.5 shrink-0 mt-0.5 text-eg4h-gold" />
            <p className="text-xs font-crimson italic">
              Campaign-aware AI knows your NPCs, threads, and session notes — and improvises in your voice.{' '}
              <button onClick={goToPricing} className="underline text-eg4h-gold hover:text-eg4h-gold-light cursor-pointer">
                Available on DM Tier
              </button>.
            </p>
          </div>
        </Card>
      </div>

      <div>
        <SectionHeader icon={Globe} title="World Lore">
          <AddButton
            onClick={() =>
              startDraft('lore', { name: '', type: 'history', description: '' })
            }
          >
            New Entry
          </AddButton>
        </SectionHeader>
        {isDrafting('lore') && (
          <Card className="mb-2">
            <input
              type="text"
              value={draft.fields.name}
              onChange={(e) => updateDraft('name', e.target.value)}
              placeholder="Entry name (location, faction, deity…)"
              className={`${inputClass} mb-2`}
            />
            <select
              value={draft.fields.type}
              onChange={(e) => updateDraft('type', e.target.value)}
              className={`${inputClass} mb-2`}
            >
              <option value="history">history</option>
              <option value="location">location</option>
              <option value="faction">faction</option>
              <option value="religion">religion</option>
              <option value="culture">culture</option>
              <option value="other">other</option>
            </select>
            <textarea
              value={draft.fields.description}
              onChange={(e) => updateDraft('description', e.target.value)}
              placeholder="Description"
              rows={3}
              className={inputClass}
            />
            <FormActions onSave={commitLore} onCancel={cancelDraft} saveDisabled={!draft.fields.name.trim()} />
          </Card>
        )}
        <div className="space-y-2">
          {lore.length === 0 && !isDrafting('lore') && (
            <EmptyHint>No lore yet. Build out your world piece by piece.</EmptyHint>
          )}
          {lore.map(l => {
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
                {open && l.description && (
                  <p className="mt-3 text-xs font-crimson text-domain-text leading-relaxed whitespace-pre-wrap">{l.description}</p>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader icon={FileText} title="Homebrew">
          <AddButton
            onClick={() => promptSignup('Upload homebrew PDFs — custom monsters, classes, items, and house rules. Sign up to keep them in your campaign.')}
          >
            Upload
          </AddButton>
        </SectionHeader>
        <Card className="!p-3 border-dashed">
          <p className="text-xs font-crimson italic text-domain-text-dim leading-relaxed">
            Drop in homebrew PDFs and the system parses monsters, classes, items, and house rules into searchable cards.
          </p>
        </Card>
      </div>

      <div>
        <SectionHeader icon={ImageIcon} title="Gallery">
          <button
            onClick={() => promptSignup('Upload maps, handouts, portraits, and props to share with your party. Sign up to attach images.')}
            className="p-1 text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
            title="Upload an image"
          >
            <Plus className="w-3 h-3" />
          </button>
        </SectionHeader>
        <Card className="!p-3 border-dashed">
          <p className="text-xs font-crimson italic text-domain-text-dim leading-relaxed">
            Maps, handouts, portraits, props — kept per-campaign and shareable with players.
          </p>
        </Card>
      </div>
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
            onClick={() => promptSignup('Link a party from Character Evolver or invite players directly. Sign up to connect characters.')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3 h-3" /> Link Party
          </button>
        </SectionHeader>
        <Card className="!p-3 border-dashed">
          <p className="text-xs font-crimson italic text-domain-text-dim leading-relaxed">
            Pull characters from Character Evolver or invite players directly. AC, HP, and passive perception stay in sync.
          </p>
        </Card>
      </div>

      <div>
        <SectionHeader icon={Swords} title="Initiative Tracker">
          <AddButton
            onClick={() =>
              startDraft('combatant', { name: '', initiative: 10, maxHp: 10, isParty: false })
            }
          >
            Combatant
          </AddButton>
        </SectionHeader>
        {isDrafting('combatant') && (
          <Card className="mb-2">
            <input
              type="text"
              value={draft.fields.name}
              onChange={(e) => updateDraft('name', e.target.value)}
              placeholder="Combatant name"
              className={`${inputClass} mb-2`}
            />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="number"
                value={draft.fields.initiative}
                onChange={(e) => updateDraft('initiative', Number(e.target.value))}
                placeholder="Init"
                className={inputClass}
              />
              <input
                type="number"
                min="1"
                value={draft.fields.maxHp}
                onChange={(e) => updateDraft('maxHp', Number(e.target.value))}
                placeholder="Max HP"
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-ui text-domain-text-dim cursor-pointer">
              <input
                type="checkbox"
                checked={draft.fields.isParty}
                onChange={(e) => updateDraft('isParty', e.target.checked)}
                className="accent-eg4h-gold"
              />
              Party member
            </label>
            <FormActions onSave={commitCombatant} onCancel={cancelDraft} saveDisabled={!draft.fields.name.trim()} />
          </Card>
        )}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-domain-panel/50 border border-domain-panel-border/30 rounded-lg">
              <Dices className="w-4 h-4 text-domain-amber" />
              <span className="font-cinzel text-sm text-domain-text">Round {initiative.round}</span>
            </div>
            <button
              onClick={advanceTurn}
              disabled={initiative.combatants.length === 0}
              className="text-[11px] font-ui text-domain-amber border border-domain-panel-border/50 rounded px-2 py-1 hover:border-eg4h-gold-dark/60 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next Turn
            </button>
          </div>
          {initiative.combatants.length === 0 ? (
            <EmptyHint>Add combatants to start tracking initiative.</EmptyHint>
          ) : (
            <div className="space-y-1">
              {[...initiative.combatants]
                .sort((a, b) => b.initiative - a.initiative)
                .map(c => {
                  const isActive = c.id === initiative.active;
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
          )}
        </Card>
      </div>

      <div>
        <SectionHeader icon={Eye} title="DM Secret Notes">
          <AddButton
            onClick={() => startDraft('dmNote', { characterName: '', note: '' })}
          >
            New Note
          </AddButton>
        </SectionHeader>
        {isDrafting('dmNote') && (
          <Card className="mb-2">
            <input
              type="text"
              value={draft.fields.characterName}
              onChange={(e) => updateDraft('characterName', e.target.value)}
              placeholder="Character or topic"
              className={`${inputClass} mb-2`}
            />
            <textarea
              value={draft.fields.note}
              onChange={(e) => updateDraft('note', e.target.value)}
              placeholder="Secret you're holding for later…"
              rows={3}
              className={inputClass}
            />
            <FormActions
              onSave={commitDmNote}
              onCancel={cancelDraft}
              saveDisabled={!draft.fields.characterName.trim() && !draft.fields.note.trim()}
            />
          </Card>
        )}
        <div className="space-y-2">
          {dmNotes.length === 0 && !isDrafting('dmNote') && (
            <EmptyHint>Hidden plot beats, true identities, twists you haven't dropped yet.</EmptyHint>
          )}
          {dmNotes.map(n => {
            const open = expandedDmNote === n.id;
            return (
              <Card key={n.id} onClick={() => setExpandedDmNote(open ? null : n.id)}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-cinzel text-sm text-domain-text">{n.characterName || 'Untitled'}</p>
                  <ChevronRight className={`w-4 h-4 text-domain-text-dim shrink-0 mt-0.5 transition-transform ${open ? 'rotate-90' : ''}`} />
                </div>
                {open && n.note && (
                  <p className="mt-2 text-xs font-crimson italic text-domain-text leading-relaxed whitespace-pre-wrap">{n.note}</p>
                )}
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
            You're exploring a demo of <span className="text-eg4h-gold font-semibold">DM's Domain</span>. Log in to save your campaign.
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
            {editingCampaign ? (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  autoFocus
                  value={campaign.name}
                  onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
                  onBlur={() => setEditingCampaign(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') setEditingCampaign(false);
                  }}
                  placeholder="Untitled Campaign"
                  className="bg-transparent border-b border-eg4h-gold-dark/60 font-cinzel text-lg text-eg4h-gold focus:outline-none focus:border-eg4h-gold w-full"
                />
                <input
                  type="text"
                  value={campaign.tagline}
                  onChange={(e) => setCampaign(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Tagline (optional)"
                  className="bg-transparent border-b border-domain-panel-border/40 font-crimson text-xs text-domain-text-dim focus:outline-none focus:border-eg4h-gold-dark/60 w-full"
                />
              </div>
            ) : (
              <button
                onClick={() => setEditingCampaign(true)}
                className="text-left w-full group cursor-text"
                title="Click to edit"
              >
                <div className="flex items-center gap-2">
                  <h1 className="font-cinzel text-lg text-eg4h-gold truncate">
                    {campaign.name || 'Untitled Campaign'}
                  </h1>
                  <Pencil className="w-3 h-3 text-domain-text-dim/40 group-hover:text-eg4h-gold transition-colors shrink-0" />
                </div>
                <p className="font-crimson text-xs text-domain-text-dim truncate">
                  {campaign.tagline || 'Click the title to name your campaign'}
                </p>
              </button>
            )}
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
          onSeePlans={handleSeePlans}
          onLogIn={handleLogIn}
        />
      )}
    </div>
  );
}
