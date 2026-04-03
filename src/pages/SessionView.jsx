import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Plus, Trash2, Swords, BookOpen, Users,
  Scroll, Sparkles, Globe, ChevronUp, ChevronDown, Shield,
  Heart, Eye, X, GripVertical,
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

// ─── Status badge colors ────────────────────────────────────────
const STATUS_COLORS = {
  alive: 'text-green-400',
  dead: 'text-red-400',
  missing: 'text-yellow-400',
  unknown: 'text-gray-400',
  open: 'text-blue-400',
  resolved: 'text-green-400',
  forgotten: 'text-gray-400',
  escalated: 'text-red-400',
};

const URGENCY_COLORS = {
  low: 'border-gray-700/50',
  medium: 'border-yellow-800/50',
  high: 'border-orange-800/50',
  critical: 'border-red-800/50',
};

// ─── Extract stats from CE character_data ───────────────────
function parseCharStats(cd) {
  if (!cd) return { name: 'Unknown', charClass: '', level: '', ac: '—', hp: '—', maxHp: '', pp: null };

  const name = cd.name || cd.characterName || 'Unknown';
  const charClass = cd.class || cd.className || '';
  const level = cd.level || '';

  // Ability scores — CE uses abilityScores (with racial bonuses applied)
  const scores = cd.abilityScores || cd.abilities || cd.baseScores || {};
  const dexMod = scores.dex ? Math.floor((scores.dex - 10) / 2) : 0;
  const conMod = scores.con ? Math.floor((scores.con - 10) / 2) : 0;
  const wisMod = scores.wis ? Math.floor((scores.wis - 10) / 2) : 0;

  // HP — CE stores currentHp (nullable) and derives max from class hit die + con
  const hitDice = { barbarian: 12, fighter: 10, paladin: 10, ranger: 10, bard: 8, cleric: 8, druid: 8, monk: 8, rogue: 8, warlock: 8, sorcerer: 6, wizard: 6 };
  const die = hitDice[charClass.toLowerCase()] || 8;
  const baseMaxHp = die + conMod; // level 1: max die + CON mod
  const lvl = parseInt(level) || 1;
  // Levels beyond 1: average roll + CON mod per level
  const maxHp = cd.maxHp ?? (baseMaxHp + (lvl > 1 ? (lvl - 1) * (Math.floor(die / 2) + 1 + conMod) : 0));
  const hp = cd.currentHp ?? maxHp;

  // AC — check for explicit value, then estimate from equipment/class
  let ac = cd.ac ?? cd.armorClass ?? null;
  if (ac == null) {
    // Base 10 + DEX for unarmored; if wearing heavy armor (chain mail for fighters), DEX doesn't apply
    // Simple heuristic: check equipped items for known armors
    ac = 10 + dexMod; // default unarmored
    if (cd.equippedItems && cd.equipmentSelections !== undefined) {
      // Fighter with chain mail = AC 16 (no DEX)
      const cls = charClass.toLowerCase();
      if (['fighter', 'paladin'].includes(cls)) ac = Math.max(ac, 16);
      else if (['cleric', 'ranger'].includes(cls)) ac = Math.max(ac, 14 + Math.min(dexMod, 2));
      else if (cls === 'barbarian') ac = 10 + dexMod + conMod;
      else if (cls === 'monk') ac = 10 + dexMod + wisMod;
    }
  }

  const pp = scores.wis ? 10 + wisMod : null;

  return { name, charClass, level, ac, hp, maxHp, pp, dexMod, scores };
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function SessionView() {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('left');

  // Left panel state
  const [npcs, setNpcs] = useState([]);
  const [sessionNotes, setSessionNotes] = useState([]);
  const [liveNote, setLiveNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Center panel state
  const [threads, setThreads] = useState([]);
  const [lore, setLore] = useState([]);
  const [improvInput, setImprovInput] = useState('');

  // Right panel state
  const [partyMembers, setPartyMembers] = useState([]);
  const [combatants, setCombatants] = useState([]);
  const [combatRound, setCombatRound] = useState(0);
  const [newCombatant, setNewCombatant] = useState({ name: '', init: '', hp: '' });
  const [showAddCombatant, setShowAddCombatant] = useState(false);

  // ─── Auth guard ─────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/');
  }, [authLoading, isAuthenticated]);

  // ─── Fetch all session data ─────────────────────────────────
  useEffect(() => {
    if (!user?.email || !supabase || !campaignId) return;

    async function load() {
      setLoading(true);

      // Fetch campaign
      const { data: camp } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('dm_email', user.email)
        .single();

      if (!camp) {
        navigate('/dashboard');
        return;
      }
      setCampaign(camp);

      // Parallel fetches
      const [npcRes, threadRes, loreRes, noteRes] = await Promise.all([
        supabase.from('npcs').select('*').eq('campaign_id', campaignId).order('updated_at', { ascending: false }),
        supabase.from('story_threads').select('*').eq('campaign_id', campaignId).order('urgency', { ascending: false }),
        supabase.from('world_lore').select('*').eq('campaign_id', campaignId).order('name'),
        supabase.from('session_notes').select('*').eq('campaign_id', campaignId).order('session_number', { ascending: false }),
      ]);

      setNpcs(npcRes.data || []);
      setThreads(threadRes.data || []);
      setLore(loreRes.data || []);
      setSessionNotes(noteRes.data || []);

      // Party members with character data — exclude DM entries
      if (camp.party_id) {
        const { data: members } = await supabase
          .from('party_members')
          .select('*')
          .eq('party_id', camp.party_id);

        if (members?.length) {
          const players = members.filter(m => m.role !== 'dm' && m.character_id);
          const charIds = players.map(m => m.character_id);

          if (charIds.length > 0) {
            const { data: chars } = await supabase
              .from('characters')
              .select('id, character_data')
              .in('id', charIds);

            const charMap = {};
            (chars || []).forEach(c => { charMap[c.id] = c.character_data; });

            setPartyMembers(players.map(m => ({
              ...m,
              character: charMap[m.character_id] || null,
            })));
          }
        }
      }

      setLoading(false);
    }

    load();
  }, [user?.email, campaignId]);

  // ─── Save a live session note ───────────────────────────────
  const saveNote = async () => {
    if (!liveNote.trim() || !supabase) return;
    setSavingNote(true);

    const nextNumber = sessionNotes.length > 0
      ? Math.max(...sessionNotes.map(n => n.session_number)) + 1
      : 1;

    const { data, error } = await supabase
      .from('session_notes')
      .insert({
        campaign_id: campaignId,
        session_number: nextNumber,
        title: `Session ${nextNumber}`,
        raw_notes: liveNote.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setSessionNotes(prev => [data, ...prev]);
      setLiveNote('');
    }
    setSavingNote(false);
  };

  // ─── Initiative helpers ─────────────────────────────────────
  const addCombatant = () => {
    if (!newCombatant.name.trim()) return;
    setCombatants(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newCombatant.name.trim(),
        init: parseInt(newCombatant.init) || 0,
        hp: parseInt(newCombatant.hp) || 0,
        maxHp: parseInt(newCombatant.hp) || 0,
        active: true,
      },
    ].sort((a, b) => b.init - a.init));
    setNewCombatant({ name: '', init: '', hp: '' });
    setShowAddCombatant(false);
  };

  const removeCombatant = (id) => {
    setCombatants(prev => prev.filter(c => c.id !== id));
  };

  const adjustHp = (id, delta) => {
    setCombatants(prev => prev.map(c =>
      c.id === id ? { ...c, hp: Math.max(0, c.hp + delta) } : c
    ));
  };

  const nextRound = () => setCombatRound(r => r + 1);

  const addPartyToInitiative = () => {
    const partyCombatants = partyMembers
      .filter(m => m.character)
      .map(m => {
        const stats = parseCharStats(m.character);
        const roll = Math.floor(Math.random() * 20) + 1 + (stats.dexMod || 0);
        return {
          id: crypto.randomUUID(),
          name: stats.name,
          init: roll,
          hp: typeof stats.hp === 'number' ? stats.hp : 0,
          maxHp: typeof stats.maxHp === 'number' ? stats.maxHp : 0,
          active: true,
          isParty: true,
        };
      });
    setCombatants(prev => [...prev, ...partyCombatants].sort((a, b) => b.init - a.init));
  };

  // ─── Loading / auth states ──────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="dm-study-bg min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-eg4h-gold animate-spin relative z-10" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // LEFT PANEL — NPCs & Session Journal
  // ═══════════════════════════════════════════════════════════════
  const LeftPanel = (
    <div className="flex flex-col gap-5 h-full">
      {/* Live Session Notes */}
      <div>
        <SectionHeader icon={BookOpen} title="Session Journal" />
        <textarea
          value={liveNote}
          onChange={e => setLiveNote(e.target.value)}
          placeholder="Live session notes... jot down what happens as you play."
          rows={5}
          className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm resize-none"
        />
        <button
          onClick={saveNote}
          disabled={!liveNote.trim() || savingNote}
          className="mt-2 px-4 py-1.5 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_2px_8px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
        >
          {savingNote ? 'Saving...' : 'Save Note'}
        </button>

        {sessionNotes.length > 0 && (
          <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
            {sessionNotes.slice(0, 5).map(note => (
              <Card key={note.id} className="!p-2">
                <p className="text-xs font-cinzel text-domain-text">{note.title}</p>
                <p className="text-xs font-crimson text-domain-text-dim mt-0.5 line-clamp-2">{note.raw_notes}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* NPCs */}
      <div>
        <SectionHeader icon={Users} title="NPCs">
          <button className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer">
            <Sparkles className="w-3 h-3" /> Quick NPC
          </button>
        </SectionHeader>

        {npcs.length === 0 ? (
          <p className="text-xs font-crimson text-domain-text-dim/50 italic">No NPCs yet. Use Quick NPC to generate one.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {npcs.map(npc => (
              <Card key={npc.id}>
                <div className="flex items-center justify-between">
                  <span className="font-cinzel text-sm text-domain-text">{npc.name}</span>
                  <span className={`text-xs font-ui ${STATUS_COLORS[npc.status] || 'text-gray-400'}`}>
                    {npc.status}
                  </span>
                </div>
                {npc.role && <p className="text-xs font-crimson text-domain-parchment-dark mt-0.5">{npc.role}</p>}
                {npc.location && <p className="text-xs font-crimson text-domain-text-dim mt-0.5">{npc.location}</p>}
                {npc.personality && <p className="text-xs font-crimson text-domain-text-dim/70 mt-1 italic line-clamp-2">{npc.personality}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // CENTER PANEL — Plot & Story Threads
  // ═══════════════════════════════════════════════════════════════
  const CenterPanel = (
    <div className="flex flex-col gap-5 h-full">
      {/* Story Threads */}
      <div>
        <SectionHeader icon={Scroll} title="Story Threads" />
        {threads.length === 0 ? (
          <p className="text-xs font-crimson text-domain-text-dim/50 italic">No story threads yet.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {threads.map(thread => (
              <Card key={thread.id} className={`border-l-2 ${URGENCY_COLORS[thread.urgency] || ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-cinzel text-sm text-domain-text">{thread.title}</span>
                  <span className={`text-xs font-ui ${STATUS_COLORS[thread.status] || 'text-gray-400'}`}>
                    {thread.status}
                  </span>
                </div>
                {thread.thread_type && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-ui bg-domain-warm/30 text-domain-parchment-dark rounded">
                    {thread.thread_type}
                  </span>
                )}
                {thread.description && (
                  <p className="text-xs font-crimson text-domain-text-dim mt-1 line-clamp-3">{thread.description}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI Improv Assist */}
      <div>
        <SectionHeader icon={Sparkles} title="AI Improv Assist" />
        <div className="flex gap-2">
          <input
            type="text"
            value={improvInput}
            onChange={e => setImprovInput(e.target.value)}
            placeholder="Ask for an improv suggestion..."
            className="flex-1 px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm"
          />
          <button className="px-3 py-2 text-xs font-ui text-domain-amber border border-domain-warm/40 rounded-lg hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer opacity-50" disabled>
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] font-ui text-domain-text-dim/40 mt-1">AI assist coming soon</p>
      </div>

      {/* World Lore Quick Reference */}
      <div>
        <SectionHeader icon={Globe} title="World Lore" />
        {lore.length === 0 ? (
          <p className="text-xs font-crimson text-domain-text-dim/50 italic">No lore entries yet.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {lore.map(entry => (
              <Card key={entry.id} className="!p-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[10px] font-ui bg-domain-warm/30 text-domain-parchment-dark rounded">{entry.type}</span>
                  <span className="font-cinzel text-xs text-domain-text">{entry.name}</span>
                </div>
                {entry.description && (
                  <p className="text-xs font-crimson text-domain-text-dim mt-1 line-clamp-2">{entry.description}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RIGHT PANEL — Party & Initiative
  // ═══════════════════════════════════════════════════════════════
  const RightPanel = (
    <div className="flex flex-col gap-5 h-full">
      {/* Party Members */}
      <div>
        <SectionHeader icon={Users} title="Party" />
        {partyMembers.length === 0 ? (
          <p className="text-xs font-crimson text-domain-text-dim/50 italic">
            {campaign?.party_id ? 'No members in this party yet.' : 'No party linked to this campaign.'}
          </p>
        ) : (
          <div className="space-y-2">
            {partyMembers.map(m => {
              const stats = parseCharStats(m.character);
              return (
                <Card key={m.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-cinzel text-sm text-domain-text">{stats.name}</span>
                    {stats.charClass && (
                      <span className="text-xs font-ui text-domain-parchment-dark">
                        {stats.charClass}{stats.level ? ` ${stats.level}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs font-ui text-domain-text-dim">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> AC {stats.ac}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {stats.hp}{stats.maxHp ? `/${stats.maxHp}` : ''}</span>
                    {stats.pp != null && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> PP {stats.pp}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Party Stats at a Glance */}
        {partyMembers.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(() => {
              const allStats = partyMembers.map(m => parseCharStats(m.character)).filter(s => s.name !== 'Unknown');
              const avgAC = allStats.length
                ? Math.round(allStats.reduce((s, st) => s + (typeof st.ac === 'number' ? st.ac : 0), 0) / allStats.length)
                : '—';
              const totalHP = allStats.reduce((s, st) => s + (typeof st.hp === 'number' ? st.hp : 0), 0);
              const hasHealer = allStats.some(st =>
                ['cleric', 'druid', 'paladin', 'bard'].includes((st.charClass || '').toLowerCase())
              );
              return (
                <>
                  <div className="bg-domain-panel border border-domain-panel-border/30 rounded p-2 text-center">
                    <p className="text-[10px] font-ui text-domain-text-dim">Avg AC</p>
                    <p className="text-lg font-cinzel text-domain-text">{avgAC}</p>
                  </div>
                  <div className="bg-domain-panel border border-domain-panel-border/30 rounded p-2 text-center">
                    <p className="text-[10px] font-ui text-domain-text-dim">Total HP</p>
                    <p className="text-lg font-cinzel text-domain-text">{totalHP}</p>
                  </div>
                  <div className="bg-domain-panel border border-domain-panel-border/30 rounded p-2 text-center">
                    <p className="text-[10px] font-ui text-domain-text-dim">Healer</p>
                    <p className={`text-lg font-cinzel ${hasHealer ? 'text-green-400' : 'text-red-400'}`}>
                      {hasHealer ? '✓' : '✗'}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Initiative Tracker */}
      <div>
        <SectionHeader icon={Swords} title="Initiative">
          <div className="flex items-center gap-2">
            {combatRound > 0 && (
              <span className="text-xs font-ui text-domain-text-dim">Round {combatRound}</span>
            )}
            <button
              onClick={() => setShowAddCombatant(true)}
              className="p-1 text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </SectionHeader>

        {/* Add combatant form */}
        {showAddCombatant && (
          <Card className="mb-2 !bg-domain-panel-raised">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                placeholder="Name"
                value={newCombatant.name}
                onChange={e => setNewCombatant(p => ({ ...p, name: e.target.value }))}
                className="px-2 py-1 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/30 rounded text-xs text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson"
                autoFocus
              />
              <input
                type="number"
                placeholder="Init"
                value={newCombatant.init}
                onChange={e => setNewCombatant(p => ({ ...p, init: e.target.value }))}
                className="px-2 py-1 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/30 rounded text-xs text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson"
              />
              <input
                type="number"
                placeholder="HP"
                value={newCombatant.hp}
                onChange={e => setNewCombatant(p => ({ ...p, hp: e.target.value }))}
                className="px-2 py-1 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/30 rounded text-xs text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addCombatant}
                disabled={!newCombatant.name.trim()}
                className="px-3 py-1 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Add
              </button>
              {partyMembers.length > 0 && combatants.filter(c => c.isParty).length === 0 && (
                <button
                  onClick={addPartyToInitiative}
                  className="px-3 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 cursor-pointer"
                >
                  + Party (auto-roll)
                </button>
              )}
              <button
                onClick={() => setShowAddCombatant(false)}
                className="px-3 py-1 text-xs font-ui text-domain-text-dim hover:text-domain-text cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </Card>
        )}

        {combatants.length === 0 ? (
          <p className="text-xs font-crimson text-domain-text-dim/50 italic">
            No combatants. Click + to start an encounter.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              {combatants.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                    i === (combatRound > 0 ? (combatRound - 1) % combatants.length : -1)
                      ? 'bg-eg4h-gold/10 border border-eg4h-gold-dark/40'
                      : 'bg-domain-panel/60 border border-domain-panel-border/20'
                  } ${c.hp === 0 && c.maxHp > 0 ? 'opacity-40' : ''}`}
                >
                  <span className="font-ui text-domain-text w-6 text-center">{c.init}</span>
                  <span className={`font-cinzel flex-1 ${c.isParty ? 'text-eg4h-gold' : 'text-domain-text'}`}>
                    {c.name}
                  </span>
                  {c.maxHp > 0 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => adjustHp(c.id, -1)} className="text-red-400 hover:text-red-300 cursor-pointer">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <span className={`font-ui w-12 text-center ${
                        c.hp <= c.maxHp * 0.25 ? 'text-red-400' :
                        c.hp <= c.maxHp * 0.5 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {c.hp}/{c.maxHp}
                      </span>
                      <button onClick={() => adjustHp(c.id, 1)} className="text-green-400 hover:text-green-300 cursor-pointer">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <button onClick={() => removeCombatant(c.id)} className="text-domain-text-dim/40 hover:text-red-400 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={nextRound}
                className="flex-1 px-3 py-1.5 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded hover:shadow-[0_2px_8px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
              >
                {combatRound === 0 ? 'Start Combat' : 'Next Round'}
              </button>
              {combatRound > 0 && (
                <button
                  onClick={() => { setCombatants([]); setCombatRound(0); }}
                  className="px-3 py-1.5 text-xs font-ui text-domain-text-dim border border-domain-panel-border/40 rounded hover:text-red-400 hover:border-red-800/50 cursor-pointer"
                >
                  End
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="dm-study-bg min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-domain-panel-border/60 bg-domain-dark/90 backdrop-blur-sm sticky top-0 z-20 dm-header-glow relative">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-domain-text-dim hover:text-eg4h-gold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src="/dmd-logo.png" alt="DMD" className="w-8 h-8" />
          <div className="flex-1 min-w-0">
            <h1 className="font-cinzel text-lg text-eg4h-gold truncate">{campaign?.name}</h1>
            {campaign?.description && (
              <p className="font-crimson text-xs text-domain-text-dim truncate">{campaign.description}</p>
            )}
          </div>
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
        <div className="hidden lg:grid lg:grid-cols-3 gap-0 h-[calc(100vh-64px)]">
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
    </div>
  );
}
