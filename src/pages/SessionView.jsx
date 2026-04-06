import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Plus, Trash2, Swords, BookOpen, Users,
  Scroll, Sparkles, Globe, ChevronUp, ChevronDown, Shield,
  Heart, Eye, X, GripVertical, Pencil, Save, Lock, EyeOff, Dices,
  ChevronRight, BookMarked, MapPin, Clock, Mail, MailOpen, Check, Zap, RotateCcw, Layers, Link2,
} from 'lucide-react';
import { useAuth } from '@/api/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTier, FREE_LIMITS } from '@/lib/tier';
import UpgradeModal from '@/components/UpgradeModal';

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

// ─── Quick NPC generator data ───────────────────────────────
const NPC_FIRST = ['Aldric','Brenna','Cedric','Delara','Eamon','Fiona','Gareth','Helena','Idris','Jasira','Kael','Lyria','Magnus','Nara','Orin','Petra','Quinn','Rowan','Sable','Theron','Ursa','Vesper','Wren','Xara','Yoren','Zella','Dorian','Elara','Fenwick','Greta','Haldan','Isolde','Jorik','Kessa','Lothar','Miriel','Niles','Olwen','Phelan','Rhiannon','Stellan','Tova','Ulfric','Vara','Wynne'];
const NPC_LAST = ['Ashford','Blackthorn','Copperfield','Duskwalker','Emberstone','Foxglove','Greymane','Holloway','Ironforge','Jasperwind','Knightley','Larkwood','Moonvale','Nighthollow','Oakhart','Pinecrest','Quillbrook','Ravenscar','Stormhaven','Thornwall','Underhill','Vexley','Whitmore','Yarrow','Zephyrs'];
const NPC_ROLES = { shopkeeper: 'Shopkeeper', merchant: 'Merchant', guard: 'Town Guard', noble: 'Noble', bartender: 'Bartender', innkeeper: 'Innkeeper', blacksmith: 'Blacksmith', priest: 'Priest', beggar: 'Beggar', farmer: 'Farmer', sailor: 'Sailor', scholar: 'Scholar', thief: 'Thief', bard: 'Traveling Bard', witch: 'Hedge Witch', hunter: 'Hunter', courier: 'Courier', healer: 'Healer', mayor: 'Town Elder', captain: 'Guard Captain', wizard: 'Wizard', alchemist: 'Alchemist', spy: 'Spy', assassin: 'Assassin', monk: 'Monk', paladin: 'Paladin', ranger: 'Ranger', druid: 'Druid', cleric: 'Cleric', warlock: 'Warlock', sorcerer: 'Sorcerer', knight: 'Knight', squire: 'Squire', herbalist: 'Herbalist', librarian: 'Librarian', smuggler: 'Smuggler', pirate: 'Pirate', cook: 'Cook', miner: 'Miner', fisher: 'Fisher', hermit: 'Hermit' };
const NPC_PERSONALITIES = ['Warm and welcoming, always offering tea','Suspicious of strangers, speaks in clipped sentences','Overly cheerful, deflects serious topics with jokes','Melancholic and wistful, often lost in thought','Brash and confident, talks over others','Quiet and observant, notices everything','Nervous and fidgety, avoids eye contact','Sarcastic and dry, hides kindness behind wit','Fiercely loyal, protective of their community','Greedy and calculating, always angling for profit','Devoutly religious, quotes scripture constantly','Haunted by past mistakes, seeks redemption','Ambitious and ruthless, always scheming','Kind but naive, trusts too easily','Gruff exterior hiding a heart of gold'];
const NPC_QUIRKS = ['Constantly polishes the same spot on the counter','Collects unusual buttons and shows them to anyone who will look','Hums an eerie tune under their breath','Always carries a worn letter they never open','Speaks to an invisible companion','Has a distinctive laugh that fills the room','Taps their fingers in a rhythmic pattern when thinking','Squints at people as if trying to remember them','Offers unsolicited advice about everything','Always eating something, crumbs everywhere','Refers to themselves in the third person','Ends every sentence with a proverb or saying','Has a pet rat/toad/raven on their shoulder','Sketches people they meet in a small journal','Limps slightly but refuses to explain why'];
const NPC_MOTIVATIONS = ['Protecting a dark family secret','Paying off a massive debt to a dangerous creditor','Searching for a missing loved one','Trying to leave town before something bad happens','Building enough wealth to retire somewhere warm','Atoning for a crime no one knows about','Gathering information for a mysterious patron','Keeping the peace at any cost','Hoarding supplies for an anticipated disaster','Winning the affection of someone out of their league','Hiding from someone or something from their past','Seeking revenge for a wrong done long ago','Collecting rare ingredients for a special purpose','Proving themselves worthy to their family','Uncovering the truth behind local disappearances'];
const NPC_VOICES = ['Low and gravelly, pauses often','High-pitched and rapid, barely stops for breath','Thick regional accent, uses local slang','Formal and precise, never uses contractions','Whispers conspiratorially, even about mundane things','Booming and theatrical, gestures wildly','Soft and melodic, almost singing','Stutters when nervous, which is often','Speaks very slowly and deliberately','Raspy, as if recovering from illness','Clipped military cadence','Warm and motherly/fatherly tone','Monotone and flat, hard to read','Excitable, pitch rises when interested','Speaks through clenched teeth, barely moving lips'];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function detectRole(desc) {
  const lower = desc.toLowerCase();
  for (const [keyword, role] of Object.entries(NPC_ROLES)) {
    if (lower.includes(keyword)) return role;
  }
  return null;
}

function parseNpcInput(input) {
  if (!input || !input.trim()) return {};
  const text = input.trim();
  const result = {};

  // Try to extract "Name, Role" or "Name - Role" pattern at the start
  const nameRoleMatch = text.match(/^([A-Z][a-zA-Z'']+(?:\s+[A-Z][a-zA-Z'']+)*)\s*[,\-–—]\s*(.+)/);
  if (nameRoleMatch) {
    result.name = nameRoleMatch[1].trim();
    const rest = nameRoleMatch[2].trim();
    // Check if the rest starts with a role keyword
    const detectedRole = detectRole(rest);
    if (detectedRole) {
      result.role = detectedRole;
      // Anything after the role keyword might be more description
      const roleIdx = rest.toLowerCase().indexOf(Object.keys(NPC_ROLES).find(k => rest.toLowerCase().includes(k)) || '');
      const roleWord = Object.keys(NPC_ROLES).find(k => rest.toLowerCase().includes(k)) || '';
      const afterRole = rest.slice(roleIdx + roleWord.length).replace(/^[\s,\-–—]+/, '').trim();
      if (afterRole) result.personality = afterRole;
    } else {
      // The rest is a description, not a known role — use it as role text
      result.role = rest.split(/[,.]/)[0].trim();
      const afterFirstClause = rest.slice(result.role.length).replace(/^[\s,]+/, '').trim();
      if (afterFirstClause) result.personality = afterFirstClause;
    }
    return result;
  }

  // Try to extract just a capitalized name at the start (2+ capitalized words)
  const nameOnlyMatch = text.match(/^([A-Z][a-zA-Z'']+(?:\s+[A-Z][a-zA-Z'']+)+)\s+(.+)/);
  if (nameOnlyMatch) {
    const possibleName = nameOnlyMatch[1];
    const rest = nameOnlyMatch[2];
    // Only treat as name if it's 2-3 words and followed by lowercase description
    if (possibleName.split(/\s+/).length <= 3 && /^[a-z]/.test(rest)) {
      result.name = possibleName;
      result.role = detectRole(rest);
      // Extract goal: pattern
      const goalMatch = rest.match(/goal:\s*(.+?)(?:\.|$)/i);
      if (goalMatch) result.motivation = goalMatch[1].trim();
      // Whatever remains is personality/description
      const descPart = rest.replace(/goal:\s*.+?(?:\.|$)/i, '').trim();
      if (descPart && !result.role) result.role = descPart.split(/[,.]/)[0].trim();
      else if (descPart && descPart !== result.role) result.personality = descPart;
      return result;
    }
  }

  // No name detected — treat the whole input as a description
  result.role = detectRole(text);
  // Extract goal: pattern
  const goalMatch = text.match(/goal:\s*(.+?)(?:\.|$)/i);
  if (goalMatch) result.motivation = goalMatch[1].trim();
  // Use the input (minus goal) as personality
  const descPart = text.replace(/goal:\s*.+?(?:\.|$)/i, '').trim();
  if (descPart) result.personality = descPart;

  return result;
}

// ─── Extract stats from CE character_data ───────────────────
function parseCharStats(cd) {
  if (!cd) return { name: 'Unknown', charClass: '', level: '', ac: '—', hp: '—', maxHp: '', pp: null };

  const name = cd.name || cd.characterName || 'Unknown';
  const charClass = cd.class || cd.className || '';
  const level = cd.level || '';
  const overrides = cd.combatOverrides || {};

  // Ability scores — CE uses abilityScores (with racial bonuses applied)
  const scores = cd.abilityScores || cd.abilities || cd.baseScores || {};
  const dexMod = scores.dex ? Math.floor((scores.dex - 10) / 2) : 0;
  const conMod = scores.con ? Math.floor((scores.con - 10) / 2) : 0;
  const wisMod = scores.wis ? Math.floor((scores.wis - 10) / 2) : 0;

  // HP — check combatOverrides.hp first, then CE's currentHp, then calculate
  const hitDice = { barbarian: 12, fighter: 10, paladin: 10, ranger: 10, bard: 8, cleric: 8, druid: 8, monk: 8, rogue: 8, warlock: 8, sorcerer: 6, wizard: 6 };
  const die = hitDice[(charClass || '').toLowerCase()] || 8;
  const lvl = parseInt(level) || 1;
  const baseMaxHp = die + conMod;
  const calcMaxHp = baseMaxHp + (lvl > 1 ? (lvl - 1) * (Math.floor(die / 2) + 1 + conMod) : 0);
  const maxHp = overrides.hp ?? cd.maxHp ?? calcMaxHp;
  const hp = cd.currentHp ?? maxHp;

  // AC — check combatOverrides.ac, then cd.ac, then estimate from class/equipment
  let ac = overrides.ac ?? cd.ac ?? cd.armorClass ?? null;
  if (ac == null) {
    const cls = (charClass || '').toLowerCase();
    ac = 10 + dexMod;
    if (cls === 'barbarian') ac = 10 + dexMod + conMod;
    else if (cls === 'monk') ac = 10 + dexMod + wisMod;
    else if (['fighter', 'paladin'].includes(cls)) ac = Math.max(ac, 16);
    else if (['cleric', 'ranger'].includes(cls)) ac = Math.max(ac, 14 + Math.min(dexMod, 2));
  }

  // Passive perception — 10 + WIS mod (+ proficiency if proficient in Perception)
  let pp = scores.wis ? 10 + wisMod : null;
  if (pp != null && cd.skillProfs) {
    const percProf = cd.skillProfs['Perception'] || 0;
    if (percProf > 0) {
      const profBonus = Math.floor((lvl - 1) / 4) + 2;
      pp += profBonus * percProf; // 1 = proficiency, 2 = expertise
    }
  }

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
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('dmd-active-tab') || 'left');
  const { tier, isDM } = useTier(user?.email);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  // Left panel state
  const [npcs, setNpcs] = useState([]);
  const [sessionNotes, setSessionNotes] = useState([]);
  const [activeSessionNum, setActiveSessionNum] = useState(null);
  const [liveNote, setLiveNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [savingEditNote, setSavingEditNote] = useState(false);
  const [creatingSess, setCreatingSess] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // NPC edit form state
  const [showNpcForm, setShowNpcForm] = useState(false);
  const [editingNpc, setEditingNpc] = useState(null);
  const [npcForm, setNpcForm] = useState({ name: '', role: '', personality: '', quirks: '', voice_notes: '', motivation: '', location: '' });
  const [savingNpc, setSavingNpc] = useState(false);

  // Center panel state
  const [threads, setThreads] = useState([]);
  const [lore, setLore] = useState([]);
  const [improvInput, setImprovInput] = useState('');
  const [improvSuggestions, setImprovSuggestions] = useState([]);
  const [improvLoading, setImprovLoading] = useState(false);
  const [improvError, setImprovError] = useState(null);
  const [improvCount, setImprovCount] = useState(0);
  const [improvToast, setImprovToast] = useState(null);
  const [selectedImprov, setSelectedImprov] = useState(null);

  // Session summary state
  const [sessionSummary, setSessionSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Story thread form state
  const [showThreadForm, setShowThreadForm] = useState(false);
  const [editingThread, setEditingThread] = useState(null);
  const [threadForm, setThreadForm] = useState({ title: '', description: '', thread_type: 'hook', urgency: 'medium' });
  const [savingThread, setSavingThread] = useState(false);

  // World lore form state
  const [showLoreForm, setShowLoreForm] = useState(false);
  const [editingLore, setEditingLore] = useState(null);
  const [loreForm, setLoreForm] = useState({ name: '', type: 'location', description: '', notes: '' });
  const [savingLore, setSavingLore] = useState(false);

  // SRD Quick Reference state
  const [srdRef, setSrdRef] = useState({});
  const [expandedSrdCats, setExpandedSrdCats] = useState({});

  // Quick NPC state
  const [showNpcGen, setShowNpcGen] = useState(false);
  const [npcPrompt, setNpcPrompt] = useState('');
  const [generatingNpc, setGeneratingNpc] = useState(false);
  const [npcAiMode, setNpcAiMode] = useState(null); // null = unset, set on form open
  // NPC embellish state
  const [embellishMode, setEmbellishMode] = useState(false);
  const [embellishing, setEmbellishing] = useState(false);
  const [aiEmbellishedFields, setAiEmbellishedFields] = useState([]);

  // Right panel state
  const [partyMembers, setPartyMembers] = useState([]);
  const [dmNotes, setDmNotes] = useState({});
  const [openNoteId, setOpenNoteId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingDmNote, setSavingDmNote] = useState(false);
  // DM messaging state
  const [openMsgId, setOpenMsgId] = useState(null);
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [dmMessages, setDmMessages] = useState({});

  // Party linking state
  const [availableParties, setAvailableParties] = useState([]);
  const [showPartyLink, setShowPartyLink] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [linkingParty, setLinkingParty] = useState(false);

  const [combatants, setCombatants] = useState([]);
  const [combatRound, setCombatRound] = useState(0);
  const [newCombatant, setNewCombatant] = useState({ name: '', init: '', hp: '' });
  const [showAddCombatant, setShowAddCombatant] = useState(false);
  const [hpInputs, setHpInputs] = useState({});
  const [expandedNoteId, setExpandedNoteId] = useState(null);

  // ─── Tier gate helper ────────────────────────────────────────
  const requireDM = (reason) => {
    if (isDM) return true;
    setUpgradeReason(reason);
    setShowUpgrade(true);
    return false;
  };

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
      const [npcRes, threadRes, loreRes, noteRes, srdRes] = await Promise.all([
        supabase.from('npcs').select('*').eq('campaign_id', campaignId).order('updated_at', { ascending: false }),
        supabase.from('story_threads').select('*').eq('campaign_id', campaignId).order('urgency', { ascending: false }),
        supabase.from('world_lore').select('*').eq('campaign_id', campaignId).order('name'),
        supabase.from('session_notes').select('*').eq('campaign_id', campaignId).order('session_number', { ascending: false }),
        supabase.from('srd_reference').select('*').order('category').order('name'),
      ]);

      setNpcs(npcRes.data || []);
      setThreads(threadRes.data || []);
      setLore(loreRes.data || []);
      const notes = noteRes.data || [];
      setSessionNotes(notes);

      // Select the most recent session by default
      if (notes.length > 0) {
        setActiveSessionNum(notes[0].session_number);
      }

      // Group SRD entries by category
      const grouped = {};
      (srdRes.data || []).forEach(entry => {
        const cat = entry.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(entry);
      });
      setSrdRef(grouped);

      // Party members with character data — exclude DM entries and DM email
      if (camp.party_id) {
        const { data: members } = await supabase
          .from('party_members')
          .select('*')
          .eq('party_id', camp.party_id);

        if (members?.length) {
          const dmEmail = (camp.dm_email || user.email || '').toLowerCase();
          const players = members.filter(m =>
            m.role !== 'dm' &&
            m.character_id &&
            (!(m.user_email || m.email) || (m.user_email || m.email || '').toLowerCase() !== dmEmail)
          );
          const charIds = players.map(m => m.character_id);

          if (charIds.length > 0) {
            const { data: chars, error: charErr } = await supabase
              .from('characters')
              .select('id, character_data')
              .in('id', charIds);

            if (charErr) console.error('Error fetching character data:', charErr);

            const charMap = {};
            (chars || []).forEach(c => {
              const cd = typeof c.character_data === 'string' ? JSON.parse(c.character_data) : c.character_data;
              charMap[c.id] = cd;
            });

            setPartyMembers(players.map(m => ({
              ...m,
              character: charMap[m.character_id] || null,
            })));

            // Fetch DM secret notes and messages for these characters
            const [notesRes, msgsRes] = await Promise.all([
              supabase.from('dm_character_notes').select('*').eq('campaign_id', campaignId).eq('dm_email', user.email).in('character_id', charIds),
              supabase.from('dm_messages').select('*').eq('campaign_id', campaignId).eq('from_email', user.email).order('created_at', { ascending: false }),
            ]);

            if (notesRes.data?.length) {
              const noteMap = {};
              notesRes.data.forEach(n => { noteMap[n.character_id] = n; });
              setDmNotes(noteMap);
            }

            if (msgsRes.data?.length) {
              const msgMap = {};
              msgsRes.data.forEach(msg => {
                if (!msgMap[msg.to_character_id]) msgMap[msg.to_character_id] = [];
                msgMap[msg.to_character_id].push(msg);
              });
              setDmMessages(msgMap);
            }
          }
        }
      }

      setLoading(false);
    }

    load();
  }, [user?.email, campaignId]);

  // ─── Link a party to this campaign ──────────────────────────
  const fetchAvailableParties = async () => {
    if (!user?.email || !supabase) return;
    const { data } = await supabase
      .from('parties')
      .select('*')
      .eq('dm_email', user.email);
    setAvailableParties(data || []);
  };

  const handleLinkParty = async () => {
    if (!selectedPartyId || !supabase || linkingParty) return;
    setLinkingParty(true);

    const { error } = await supabase
      .from('campaigns')
      .update({ party_id: selectedPartyId })
      .eq('id', campaignId);

    if (!error) {
      // Re-fetch campaign + party data
      setCampaign(prev => ({ ...prev, party_id: selectedPartyId }));
      setShowPartyLink(false);
      setSelectedPartyId('');

      // Fetch party members
      const { data: members } = await supabase
        .from('party_members')
        .select('*')
        .eq('party_id', selectedPartyId);

      if (members?.length) {
        const dmEmail = (campaign?.dm_email || user.email || '').toLowerCase();
        const players = members.filter(m =>
          m.role !== 'dm' &&
          m.character_id &&
          (!(m.user_email || m.email) || (m.user_email || m.email || '').toLowerCase() !== dmEmail)
        );
        const charIds = players.map(m => m.character_id);

        if (charIds.length > 0) {
          const { data: chars } = await supabase
            .from('characters')
            .select('id, character_data')
            .in('id', charIds);

          const charMap = {};
          (chars || []).forEach(c => {
            const cd = typeof c.character_data === 'string' ? JSON.parse(c.character_data) : c.character_data;
            charMap[c.id] = cd;
          });

          setPartyMembers(players.map(m => ({
            ...m,
            character: charMap[m.character_id] || null,
          })));
        }
      }
    }
    setLinkingParty(false);
  };

  // ─── Start a new session ─────────────────────────────────────
  const startNewSession = async () => {
    if (!supabase) return;
    setCreatingSess(true);

    const nextNumber = sessionNotes.length > 0
      ? Math.max(...sessionNotes.map(n => n.session_number)) + 1
      : 1;

    const { data, error } = await supabase
      .from('session_notes')
      .insert({
        campaign_id: campaignId,
        session_number: nextNumber,
        title: `Session ${nextNumber}`,
        raw_notes: '',
      })
      .select()
      .single();

    if (!error && data) {
      setSessionNotes(prev => [data, ...prev]);
      setActiveSessionNum(data.session_number);
      setLiveNote('');
    }
    setCreatingSess(false);
  };

  // ─── Save notes to the active session ──────────────────────
  const saveNote = async () => {
    if (!liveNote.trim() || !supabase) return;
    setSavingNote(true);

    const activeNote = sessionNotes.find(n => n.session_number === activeSessionNum);

    if (activeNote) {
      // Append to existing session note
      const updated = activeNote.raw_notes
        ? `${activeNote.raw_notes}\n\n${liveNote.trim()}`
        : liveNote.trim();

      const { data, error } = await supabase
        .from('session_notes')
        .update({ raw_notes: updated })
        .eq('id', activeNote.id)
        .select()
        .single();

      if (!error && data) {
        setSessionNotes(prev => prev.map(n => n.id === data.id ? data : n));
        setLiveNote('');
      }
    } else {
      // No session exists yet — create one
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
        setActiveSessionNum(data.session_number);
        setLiveNote('');
      }
    }
    setSavingNote(false);
  };

  // ─── Edit a saved session note ─────────────────────────────
  const startEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditNoteText(note.raw_notes);
  };

  const saveEditNote = async (noteId) => {
    if (!editNoteText.trim() || !supabase) return;
    setSavingEditNote(true);
    const { data, error } = await supabase
      .from('session_notes')
      .update({ raw_notes: editNoteText.trim() })
      .eq('id', noteId)
      .select()
      .single();
    if (!error && data) {
      setSessionNotes(prev => prev.map(n => n.id === data.id ? data : n));
    }
    setEditingNoteId(null);
    setEditNoteText('');
    setSavingEditNote(false);
  };

  // ─── NPC edit ──────────────────────────────────────────────
  const openEditNpc = (npc) => {
    setEditingNpc(npc);
    setNpcForm({
      name: npc.name || '',
      role: npc.role || '',
      personality: npc.personality || '',
      quirks: npc.quirks || '',
      voice_notes: npc.voice_notes || '',
      motivation: npc.motivation || '',
      location: npc.location || '',
    });
    setAiEmbellishedFields([]);
    setShowNpcForm(true);
  };

  const embellishNpc = async () => {
    if (!npcForm.name.trim()) return;
    setEmbellishing(true);
    try {
      const res = await fetch('/.netlify/functions/ai-npc-embellish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          userEmail: user?.email,
          npcInput: {
            name: npcForm.name.trim(),
            role: npcForm.role.trim(),
            personality: npcForm.personality.trim(),
            quirks: npcForm.quirks.trim(),
            voice_notes: npcForm.voice_notes.trim(),
            motivation: npcForm.motivation.trim(),
            location: npcForm.location.trim(),
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.npc) {
        setNpcForm(prev => ({
          name: data.npc.name || prev.name,
          role: data.npc.role || prev.role,
          personality: data.npc.personality || prev.personality,
          quirks: data.npc.quirks || prev.quirks,
          voice_notes: data.npc.voice_notes || prev.voice_notes,
          motivation: data.npc.motivation || prev.motivation,
          location: data.npc.location || prev.location,
        }));
        setAiEmbellishedFields(data.aiFields || []);
      }
    } catch (err) {
      console.error('NPC embellish error:', err);
    }
    setEmbellishing(false);
  };

  const saveNpcEdit = async () => {
    if (!npcForm.name.trim() || !supabase || !editingNpc) return;
    setSavingNpc(true);
    const { data, error } = await supabase
      .from('npcs')
      .update({
        name: npcForm.name.trim(),
        role: npcForm.role.trim() || null,
        personality: npcForm.personality.trim() || null,
        quirks: npcForm.quirks.trim() || null,
        voice_notes: npcForm.voice_notes.trim() || null,
        motivation: npcForm.motivation.trim() || null,
        location: npcForm.location.trim() || null,
      })
      .eq('id', editingNpc.id)
      .select()
      .single();
    if (!error && data) {
      setNpcs(prev => prev.map(n => n.id === data.id ? data : n));
    }
    setShowNpcForm(false);
    setEditingNpc(null);
    setSavingNpc(false);
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
        notes: '',
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
      c.id === id ? { ...c, hp: c.hp + delta } : c
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
          notes: '',
        };
      });
    setCombatants(prev => [...prev, ...partyCombatants].sort((a, b) => b.init - a.init));
  };

  // ─── Quick NPC generator (AI-powered with template fallback) ─
  const generateNpc = async () => {
    if (!supabase) return;

    // Free tier: enforce NPC limit
    if (!isDM && npcs.length >= FREE_LIMITS.npcs) {
      setShowNpcGen(false);
      requireDM(`Free tier allows ${FREE_LIMITS.npcs} NPCs per campaign. Upgrade for unlimited NPCs.`);
      return;
    }

    setGeneratingNpc(true);

    const currentSession = sessionNotes.length > 0
      ? Math.max(...sessionNotes.map(n => n.session_number))
      : 1;

    let npcData = null;

    // AI generation when toggle is on and user has paid tier
    if (npcAiMode && isDM) try {
      const res = await fetch('/.netlify/functions/ai-npc-embellish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          userEmail: user?.email,
          npcInput: {
            name: '',
            role: npcPrompt.trim() || 'a random NPC the party might encounter',
          },
        }),
      });

      if (res.ok) {
        const { npc } = await res.json();
        if (npc?.name) npcData = npc;
      }
    } catch (err) {
      console.warn('AI NPC generation failed, using template fallback:', err.message);
    }

    // Template fallback — parse user input, fill gaps with random
    if (!npcData) {
      const parsed = parseNpcInput(npcPrompt);
      npcData = {
        name: parsed.name || `${pickRandom(NPC_FIRST)} ${pickRandom(NPC_LAST)}`,
        role: parsed.role || pickRandom(Object.values(NPC_ROLES)),
        personality: parsed.personality || pickRandom(NPC_PERSONALITIES),
        quirks: pickRandom(NPC_QUIRKS),
        motivation: parsed.motivation || pickRandom(NPC_MOTIVATIONS),
        voice_notes: pickRandom(NPC_VOICES),
      };
    }

    const { data, error } = await supabase
      .from('npcs')
      .insert({
        campaign_id: campaignId,
        name: npcData.name,
        role: npcData.role || null,
        status: 'alive',
        personality: npcData.personality || null,
        quirks: npcData.quirks || null,
        voice_notes: npcData.voice_notes || null,
        motivation: npcData.motivation || null,
        first_session: currentSession,
      })
      .select()
      .single();

    if (error) {
      console.error('NPC insert failed:', error.message, error.details, error.hint);
    }

    if (!error && data) {
      setNpcs(prev => [data, ...prev]);
    }

    setNpcPrompt('');
    setShowNpcGen(false);
    setGeneratingNpc(false);
  };

  // ─── DM secret notes ──────────────────────────────────────────
  const toggleDmNote = (characterId) => {
    if (openNoteId === characterId) {
      setOpenNoteId(null);
      setNoteText('');
    } else {
      setOpenNoteId(characterId);
      setNoteText(dmNotes[characterId]?.notes || '');
    }
  };

  const saveDmNote = async (characterId) => {
    if (!supabase || !user?.email) return;
    setSavingDmNote(true);

    const existing = dmNotes[characterId];
    if (existing) {
      const { data, error } = await supabase
        .from('dm_character_notes')
        .update({ notes: noteText.trim() })
        .eq('id', existing.id)
        .select()
        .single();
      if (!error && data) {
        setDmNotes(prev => ({ ...prev, [characterId]: data }));
      }
    } else {
      const { data, error } = await supabase
        .from('dm_character_notes')
        .insert({
          campaign_id: campaignId,
          character_id: characterId,
          dm_email: user.email,
          notes: noteText.trim(),
        })
        .select()
        .single();
      if (!error && data) {
        setDmNotes(prev => ({ ...prev, [characterId]: data }));
      }
    }

    setSavingDmNote(false);
  };

  const deleteDmNote = async (characterId) => {
    if (!supabase) return;
    const existing = dmNotes[characterId];
    if (!existing) return;
    const { error } = await supabase.from('dm_character_notes').delete().eq('id', existing.id);
    if (!error) {
      setDmNotes(prev => {
        const next = { ...prev };
        delete next[characterId];
        return next;
      });
      setOpenNoteId(null);
      setNoteText('');
    }
  };

  // ─── DM secret messaging ────────────────────────────────────
  const toggleMsg = (characterId) => {
    if (!requireDM('Secret messaging is a Dungeon Master tier feature. Upgrade to send private notes to players.')) return;
    if (openMsgId === characterId) {
      setOpenMsgId(null);
      setMsgText('');
    } else {
      setOpenMsgId(characterId);
      setMsgText('');
    }
  };

  const sendMessage = async (characterId, toEmail) => {
    if (!msgText.trim() || !supabase || !user?.email) return;
    setSendingMsg(true);

    const payload = {
      campaign_id: campaignId,
      from_email: user.email,
      to_email: toEmail || user.email,
      message: msgText.trim(),
      to_character_id: characterId,
    };

    console.log('[DM Message] Inserting:', payload);

    const { data, error } = await supabase
      .from('dm_messages')
      .insert(payload)
      .select()
      .single();

    console.log('[DM Message] Result:', { data, error });

    if (error) {
      console.error('Message send failed:', error.message, error.details, error.hint, error.code);
    }

    if (!error && data) {
      setDmMessages(prev => ({
        ...prev,
        [characterId]: [data, ...(prev[characterId] || [])],
      }));
      setMsgText('');
    }
    setSendingMsg(false);
  };

  const toggleMsgRead = async (msg) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('dm_messages')
      .update({ is_read: !msg.is_read })
      .eq('id', msg.id)
      .select()
      .single();
    if (!error && data) {
      setDmMessages(prev => ({
        ...prev,
        [msg.to_character_id]: (prev[msg.to_character_id] || []).map(m => m.id === data.id ? data : m),
      }));
    }
  };

  // ─── Story thread CRUD ──────────────────────────────────────
  const openNewThread = () => {
    if (!isDM && threads.length >= FREE_LIMITS.threads) {
      requireDM(`Free tier allows ${FREE_LIMITS.threads} story threads per campaign. Upgrade for unlimited threads.`);
      return;
    }
    setEditingThread(null);
    setThreadForm({ title: '', description: '', thread_type: 'hook', urgency: 'medium' });
    setShowThreadForm(true);
  };

  const openEditThread = (thread) => {
    setEditingThread(thread);
    setThreadForm({
      title: thread.title,
      description: thread.description || '',
      thread_type: thread.thread_type || 'hook',
      urgency: thread.urgency || 'medium',
    });
    setShowThreadForm(true);
  };

  const saveThread = async () => {
    if (!threadForm.title.trim() || !supabase) return;
    setSavingThread(true);

    const payload = {
      campaign_id: campaignId,
      title: threadForm.title.trim(),
      description: threadForm.description.trim() || null,
      thread_type: threadForm.thread_type,
      urgency: threadForm.urgency,
      status: 'open',
    };

    if (editingThread) {
      const { data, error } = await supabase
        .from('story_threads')
        .update({ title: payload.title, description: payload.description, thread_type: payload.thread_type, urgency: payload.urgency })
        .eq('id', editingThread.id)
        .select()
        .single();
      if (!error && data) {
        setThreads(prev => prev.map(t => t.id === data.id ? data : t));
      }
    } else {
      const { data, error } = await supabase
        .from('story_threads')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        setThreads(prev => [data, ...prev]);
      }
    }

    setShowThreadForm(false);
    setEditingThread(null);
    setSavingThread(false);
  };

  const deleteThread = async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from('story_threads').delete().eq('id', id);
    if (!error) setThreads(prev => prev.filter(t => t.id !== id));
  };

  // ─── World lore CRUD ──────────────────────────────────────────
  const openNewLore = () => {
    if (!isDM && lore.length >= FREE_LIMITS.lore) {
      requireDM(`Free tier allows ${FREE_LIMITS.lore} lore entries per campaign. Upgrade for unlimited world lore.`);
      return;
    }
    setEditingLore(null);
    setLoreForm({ name: '', type: 'location', description: '', notes: '' });
    setShowLoreForm(true);
  };

  const openEditLore = (entry) => {
    setEditingLore(entry);
    setLoreForm({
      name: entry.name,
      type: entry.type || 'location',
      description: entry.description || '',
      notes: entry.notes || '',
    });
    setShowLoreForm(true);
  };

  const saveLore = async () => {
    if (!loreForm.name.trim() || !supabase) return;
    setSavingLore(true);

    const payload = {
      campaign_id: campaignId,
      name: loreForm.name.trim(),
      type: loreForm.type,
      description: loreForm.description.trim() || null,
      notes: loreForm.notes.trim() || null,
    };

    if (editingLore) {
      const { data, error } = await supabase
        .from('world_lore')
        .update({ name: payload.name, type: payload.type, description: payload.description, notes: payload.notes })
        .eq('id', editingLore.id)
        .select()
        .single();
      if (!error && data) {
        setLore(prev => prev.map(l => l.id === data.id ? data : l));
      }
    } else {
      const { data, error } = await supabase
        .from('world_lore')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        setLore(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      }
    }

    setShowLoreForm(false);
    setEditingLore(null);
    setSavingLore(false);
  };

  const deleteLore = async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from('world_lore').delete().eq('id', id);
    if (!error) setLore(prev => prev.filter(l => l.id !== id));
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
  // Derived session helpers
  const latestSessionNum = sessionNotes.length > 0 ? Math.max(...sessionNotes.map(n => n.session_number)) : 0;
  const isLatestSession = activeSessionNum === latestSessionNum;
  const activeNote = sessionNotes.find(n => n.session_number === activeSessionNum);

  // Parse ai_summary for active note
  const activeSummary = (() => {
    if (!activeNote?.ai_summary) return null;
    try {
      return typeof activeNote.ai_summary === 'string' ? JSON.parse(activeNote.ai_summary) : activeNote.ai_summary;
    } catch { return null; }
  })();

  // Summary rendering helper
  const renderSummary = (summary) => {
    if (!summary) return null;
    return (
      <div className="mt-2 space-y-2">
        {summary.key_events?.length > 0 && (
          <div>
            <p className="text-[10px] font-cinzel text-domain-text mb-1">Key Events</p>
            <ul className="space-y-0.5">
              {summary.key_events.map((e, i) => (
                <li key={i} className="text-xs font-crimson text-domain-text-dim flex items-start gap-1.5">
                  <span className="text-domain-amber/60 shrink-0">-</span> {e}
                </li>
              ))}
            </ul>
          </div>
        )}
        {summary.npcs_encountered?.length > 0 && (
          <div>
            <p className="text-[10px] font-cinzel text-domain-text mb-1">NPCs Encountered</p>
            {summary.npcs_encountered.map((n, i) => (
              <p key={i} className="text-xs font-crimson text-domain-text-dim">
                <span className="text-domain-text">{n.name}</span> — {n.details}
              </p>
            ))}
          </div>
        )}
        {summary.unresolved_threads?.length > 0 && (
          <div>
            <p className="text-[10px] font-cinzel text-domain-text mb-1">Unresolved Threads</p>
            <ul className="space-y-0.5">
              {summary.unresolved_threads.map((t, i) => (
                <li key={i} className="text-xs font-crimson text-domain-text-dim flex items-start gap-1.5">
                  <span className="text-domain-amber/60 shrink-0">?</span> {t}
                </li>
              ))}
            </ul>
          </div>
        )}
        {summary.narrative_summary && (
          <div>
            <p className="text-[10px] font-cinzel text-domain-text mb-1">Summary</p>
            <p className="text-xs font-crimson text-domain-text-dim italic">{summary.narrative_summary}</p>
          </div>
        )}
      </div>
    );
  };

  const LeftPanel = (
    <div className="flex flex-col gap-5 h-full">
      {/* Session Journal */}
      <div>
        <SectionHeader icon={BookOpen} title="Session Journal" />

        {/* Session selector */}
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {[...sessionNotes].sort((a, b) => a.session_number - b.session_number).map(note => (
            <button
              key={note.id}
              onClick={() => { setActiveSessionNum(note.session_number); setEditingNoteId(null); setSessionSummary(null); }}
              className={`px-2.5 py-1 text-xs font-cinzel rounded cursor-pointer transition-colors ${
                activeSessionNum === note.session_number
                  ? 'bg-eg4h-gold/20 text-eg4h-gold border border-eg4h-gold-dark/40'
                  : 'text-domain-text-dim border border-domain-panel-border/30 hover:border-eg4h-gold-dark/40 hover:text-domain-text'
              }`}
            >
              {note.session_number}
            </button>
          ))}
          <button
            onClick={startNewSession}
            disabled={creatingSess}
            className="px-2.5 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/30 rounded hover:border-eg4h-gold-dark/40 cursor-pointer disabled:opacity-40 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> New
          </button>
        </div>

        {/* Active session content */}
        {activeNote ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-cinzel text-domain-text">Session {activeNote.session_number}</p>
              {activeNote.created_at && (
                <span className="text-[10px] font-ui text-domain-text-dim/50 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(activeNote.created_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Saved notes display */}
            {activeNote.raw_notes && (
              <div className="mb-2">
                {editingNoteId === activeNote.id ? (
                  <div>
                    <textarea
                      value={editNoteText}
                      onChange={e => setEditNoteText(e.target.value)}
                      rows={6}
                      className="w-full px-2 py-1.5 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded text-xs text-domain-text focus:border-eg4h-gold-dark focus:outline-none font-crimson resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => saveEditNote(activeNote.id)} disabled={savingEditNote} className="px-3 py-1 text-[10px] font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 cursor-pointer">
                        {savingEditNote ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => { setEditingNoteId(null); setEditNoteText(''); }} className="px-3 py-1 text-[10px] font-ui text-domain-text-dim hover:text-domain-text cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <Card className="!p-2">
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-crimson text-domain-text-dim whitespace-pre-wrap flex-1">{activeNote.raw_notes}</p>
                      <button onClick={() => startEditNote(activeNote)} className="text-domain-text-dim/40 hover:text-domain-amber cursor-pointer shrink-0 ml-2">
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Collapsible AI Summary inside the card */}
                    {(sessionSummary || activeSummary) && (
                      <div className="mt-2 pt-2 border-t border-domain-panel-border/20">
                        <button
                          onClick={() => setSummaryExpanded(v => !v)}
                          className="flex items-center gap-1.5 text-[11px] font-cinzel text-domain-amber/80 hover:text-domain-amber cursor-pointer w-full"
                        >
                          <ChevronRight className={`w-3 h-3 transition-transform ${summaryExpanded ? 'rotate-90' : ''}`} />
                          <Sparkles className="w-3 h-3" />
                          AI Summary
                        </button>
                        {summaryExpanded && renderSummary(sessionSummary || activeSummary)}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}

            {/* Live note-taking for current session */}
            {isLatestSession && editingNoteId !== activeNote.id && (
              <div>
                <textarea
                  value={liveNote}
                  onChange={e => setLiveNote(e.target.value)}
                  placeholder={activeNote.raw_notes ? 'Add more notes to this session...' : 'Live session notes... jot down what happens as you play.'}
                  rows={4}
                  className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm resize-none"
                />
                <button
                  onClick={saveNote}
                  disabled={!liveNote.trim() || savingNote}
                  className="mt-2 px-4 py-1.5 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_2px_8px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
                >
                  {savingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            )}

            {/* Generate Summary button */}
            {activeNote.raw_notes && (
              <div className="mt-3">
                <button
                  onClick={async () => {
                    if (summaryLoading) return;
                    if (!requireDM('AI session summaries are a Dungeon Master tier feature. Upgrade for AI-powered session recaps.')) return;
                    setSummaryLoading(true);
                    setSessionSummary(null);
                    try {
                      const res = await fetch('/.netlify/functions/ai-assist', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          type: 'summary',
                          prompt: `Summarize Session ${activeNote.session_number}.`,
                          context: {
                            campaignName: campaign?.name,
                            campaignDescription: campaign?.description,
                            sessionNotes: `Session ${activeNote.session_number}: ${activeNote.raw_notes}`,
                          },
                        }),
                      });
                      if (res.ok) {
                        const { result, raw } = await res.json();
                        const summary = result || { narrative_summary: raw || 'Could not generate summary.' };
                        setSessionSummary(summary);
                        setSummaryExpanded(true);

                        // Persist to this session note
                        await supabase
                          .from('session_notes')
                          .update({ ai_summary: JSON.stringify(summary) })
                          .eq('id', activeNote.id);

                        // Update local state so it persists on tab switch
                        setSessionNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, ai_summary: JSON.stringify(summary) } : n));
                      }
                    } catch (err) {
                      console.error('Summary generation error:', err);
                      setSessionSummary({ narrative_summary: 'AI summary unavailable — try again later.' });
                      setSummaryExpanded(true);
                    }
                    setSummaryLoading(false);
                  }}
                  disabled={summaryLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-ui text-domain-amber border border-domain-panel-border/40 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {summaryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {summaryLoading ? 'Generating...' : activeSummary ? 'Regenerate Summary' : 'Generate Summary'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs font-crimson text-domain-text-dim/50 italic mb-3">No sessions yet.</p>
            <button
              onClick={startNewSession}
              disabled={creatingSess}
              className="px-4 py-2 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 hover:shadow-[0_2px_8px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
            >
              Start Session 1
            </button>
          </div>
        )}
      </div>

      {/* NPCs */}
      <div>
        <SectionHeader icon={Users} title={`NPCs${!isDM ? ` (${npcs.length}/${FREE_LIMITS.npcs})` : ''}`}>
          <button
            onClick={() => { setShowNpcGen(v => !v); if (npcAiMode === null) setNpcAiMode(isDM); }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer"
          >
            <Dices className="w-3 h-3" /> Quick NPC
          </button>
        </SectionHeader>

        {/* Quick NPC generator form */}
        <AnimatePresence>
          {showNpcGen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Card className="mb-3 !bg-domain-panel-raised">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-cinzel text-domain-text">Quick NPC Generator</p>
                  <button
                    onClick={() => {
                      if (!npcAiMode && !isDM) {
                        requireDM('AI-enhanced NPC generation is a Dungeon Master tier feature.');
                        return;
                      }
                      setNpcAiMode(v => !v);
                    }}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="text-[10px] font-ui text-domain-text-dim">AI Enhanced</span>
                    <div className={`w-7 h-4 rounded-full relative transition-colors ${npcAiMode ? 'bg-eg4h-gold/60' : 'bg-domain-panel-border/40'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${npcAiMode ? 'left-3.5 bg-eg4h-gold' : 'left-0.5 bg-domain-text-dim/60'}`} />
                    </div>
                  </button>
                </div>
                <input
                  type="text"
                  value={npcPrompt}
                  onChange={e => setNpcPrompt(e.target.value)}
                  placeholder="a nervous shopkeeper who owes money to the thieves' guild"
                  className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm"
                  autoFocus
                />
                <p className="text-[10px] font-ui mt-1 mb-2" style={{ color: npcAiMode ? 'rgba(212,160,23,0.6)' : 'rgba(255,255,255,0.25)' }}>
                  {npcAiMode ? 'AI will embellish your description' : 'Exact details only — no AI embellishment'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={generateNpc}
                    disabled={generatingNpc}
                    className="px-4 py-1.5 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_2px_8px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
                  >
                    {generatingNpc ? 'Generating...' : 'Generate'}
                  </button>
                  <button onClick={() => { setShowNpcGen(false); setNpcPrompt(''); }} className="px-3 py-1.5 text-xs font-ui text-domain-text-dim hover:text-domain-text cursor-pointer">
                    Cancel
                  </button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NPC edit form */}
        <AnimatePresence>
          {showNpcForm && editingNpc && (() => {
            const npcFieldClass = "w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm";
            const aiFieldClass = "w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-purple-700/40 rounded-lg text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm";
            const fieldCls = (key) => aiEmbellishedFields.includes(key) ? aiFieldClass : npcFieldClass;
            const AiBadge = ({ field }) => aiEmbellishedFields.includes(field) ? <span className="text-[9px] font-ui text-purple-400/70 ml-1">AI</span> : embellishMode ? <Sparkles className="w-2.5 h-2.5 text-domain-amber/30 inline ml-1" /> : null;
            return (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Card className="mb-3 !bg-domain-panel-raised">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-cinzel text-domain-text">Edit NPC</p>
                  <button
                    onClick={() => {
                      if (!embellishMode && !isDM) {
                        requireDM('AI Embellish is a Dungeon Master tier feature.');
                        return;
                      }
                      setEmbellishMode(v => !v);
                      if (embellishMode) setAiEmbellishedFields([]);
                    }}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="text-[10px] font-ui text-domain-text-dim">AI Embellish</span>
                    <div className={`w-7 h-4 rounded-full relative transition-colors ${embellishMode ? 'bg-purple-600/60' : 'bg-domain-panel-border/40'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${embellishMode ? 'left-3.5 bg-purple-400' : 'left-0.5 bg-domain-text-dim/60'}`} />
                    </div>
                  </button>
                </div>
                <div className="space-y-2">
                  <input type="text" placeholder="Name" value={npcForm.name} onChange={e => { setNpcForm(p => ({ ...p, name: e.target.value })); }} className={npcFieldClass} autoFocus />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input type="text" placeholder="Role" value={npcForm.role} onChange={e => { setNpcForm(p => ({ ...p, role: e.target.value })); setAiEmbellishedFields(f => f.filter(k => k !== 'role')); }} className={fieldCls('role')} />
                      <span className="absolute right-2 top-2.5"><AiBadge field="role" /></span>
                    </div>
                    <div className="relative">
                      <input type="text" placeholder="Location" value={npcForm.location} onChange={e => { setNpcForm(p => ({ ...p, location: e.target.value })); setAiEmbellishedFields(f => f.filter(k => k !== 'location')); }} className={fieldCls('location')} />
                      <span className="absolute right-2 top-2.5"><AiBadge field="location" /></span>
                    </div>
                  </div>
                  <div className="relative">
                    <textarea placeholder="Personality" value={npcForm.personality} onChange={e => { setNpcForm(p => ({ ...p, personality: e.target.value })); setAiEmbellishedFields(f => f.filter(k => k !== 'personality')); }} rows={2} className={`${fieldCls('personality')} resize-none`} />
                    <span className="absolute right-2 top-2.5"><AiBadge field="personality" /></span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input type="text" placeholder="Quirks" value={npcForm.quirks} onChange={e => { setNpcForm(p => ({ ...p, quirks: e.target.value })); setAiEmbellishedFields(f => f.filter(k => k !== 'quirks')); }} className={fieldCls('quirks')} />
                      <span className="absolute right-2 top-2.5"><AiBadge field="quirks" /></span>
                    </div>
                    <div className="relative">
                      <input type="text" placeholder="Voice notes" value={npcForm.voice_notes} onChange={e => { setNpcForm(p => ({ ...p, voice_notes: e.target.value })); setAiEmbellishedFields(f => f.filter(k => k !== 'voice_notes')); }} className={fieldCls('voice_notes')} />
                      <span className="absolute right-2 top-2.5"><AiBadge field="voice_notes" /></span>
                    </div>
                  </div>
                  <div className="relative">
                    <input type="text" placeholder="Motivation / Goal" value={npcForm.motivation} onChange={e => { setNpcForm(p => ({ ...p, motivation: e.target.value })); setAiEmbellishedFields(f => f.filter(k => k !== 'motivation')); }} className={fieldCls('motivation')} />
                    <span className="absolute right-2 top-2.5"><AiBadge field="motivation" /></span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {embellishMode && (
                      <button
                        onClick={embellishNpc}
                        disabled={!npcForm.name.trim() || embellishing}
                        className="px-3 py-1.5 text-xs font-ui text-purple-300 border border-purple-700/40 rounded hover:border-purple-500/60 hover:bg-purple-900/20 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {embellishing ? <><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Embellishing...</> : <><Sparkles className="w-3 h-3 inline mr-1" />Embellish</>}
                      </button>
                    )}
                    <button onClick={saveNpcEdit} disabled={!npcForm.name.trim() || savingNpc || embellishing} className="px-4 py-1.5 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_2px_8px_rgba(255,215,0,0.3)] transition-all cursor-pointer">
                      {savingNpc ? 'Saving...' : 'Update'}
                    </button>
                    <button onClick={() => { setShowNpcForm(false); setEditingNpc(null); setAiEmbellishedFields([]); }} className="px-3 py-1.5 text-xs font-ui text-domain-text-dim hover:text-domain-text cursor-pointer">Cancel</button>
                  </div>
                  {aiEmbellishedFields.length > 0 && (
                    <p className="text-[10px] font-ui text-purple-400/60 mt-1">Fields marked <span className="text-purple-400">AI</span> were embellished — edit any field to make it yours</p>
                  )}
                </div>
              </Card>
            </motion.div>
            );
          })()}
        </AnimatePresence>

        {npcs.length === 0 && !showNpcGen ? (
          <p className="text-xs font-crimson text-domain-text-dim/50 italic">No NPCs yet. Use Quick NPC to generate one.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {npcs.map(npc => (
              <Card key={npc.id}>
                <div className="flex items-center justify-between">
                  <span className="font-cinzel text-sm text-domain-text">{npc.name}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={npc.status || 'alive'}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        setNpcs(prev => prev.map(n => n.id === npc.id ? { ...n, status: newStatus } : n));
                        if (supabase) {
                          const { error } = await supabase.from('npcs').update({ status: newStatus }).eq('id', npc.id);
                          if (error) console.error('NPC status update failed:', error.message);
                        }
                      }}
                      className={`text-xs font-ui bg-transparent border-none outline-none cursor-pointer ${STATUS_COLORS[npc.status] || 'text-gray-400'}`}
                    >
                      <option value="alive" className="bg-domain-dark text-green-400">alive</option>
                      <option value="dead" className="bg-domain-dark text-red-400">dead</option>
                      <option value="missing" className="bg-domain-dark text-yellow-400">missing</option>
                      <option value="unknown" className="bg-domain-dark text-gray-400">unknown</option>
                    </select>
                    <button onClick={() => openEditNpc(npc)} className="text-domain-text-dim/40 hover:text-domain-amber cursor-pointer">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!supabase) return;
                        const { error } = await supabase.from('npcs').delete().eq('id', npc.id);
                        if (!error) setNpcs(prev => prev.filter(n => n.id !== npc.id));
                      }}
                      className="text-domain-text-dim/40 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {npc.role && <p className="text-xs font-crimson text-domain-parchment-dark mt-0.5">{npc.role}</p>}
                {npc.location && (
                  <p className="text-xs font-crimson text-domain-text-dim mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" /> {npc.location}
                  </p>
                )}
                {npc.motivation && <p className="text-xs font-crimson text-domain-text-dim mt-0.5">Goal: {npc.motivation}</p>}
                {npc.first_session && <p className="text-[10px] font-ui text-domain-text-dim/60 mt-0.5">First appeared: Session {npc.first_session}</p>}
                {npc.personality && <p className="text-xs font-crimson text-domain-text-dim/70 mt-1 italic line-clamp-2">{npc.personality}</p>}
                {npc.quirks && <p className="text-xs font-crimson text-domain-text-dim/60 mt-0.5">Quirk: {npc.quirks}</p>}
                {npc.voice_notes && <p className="text-xs font-crimson text-domain-text-dim/60 mt-0.5">Voice: {npc.voice_notes}</p>}
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

  const inputClass = "w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm";
  const selectClass = "w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm";
  const goldBtnClass = "px-4 py-1.5 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_2px_8px_rgba(255,215,0,0.3)] transition-all cursor-pointer";
  const ghostBtnClass = "px-3 py-1.5 text-xs font-ui text-domain-text-dim hover:text-domain-text cursor-pointer";

  const CenterPanel = (
    <div className="flex flex-col gap-5 h-full min-h-0">
      {/* Story Threads */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <SectionHeader icon={Scroll} title={`Story Threads${!isDM ? ` (${threads.length}/${FREE_LIMITS.threads})` : ''}`}>
          <button onClick={openNewThread} className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer">
            <Plus className="w-3 h-3" /> New Thread
          </button>
        </SectionHeader>

        {/* Thread form */}
        <AnimatePresence>
          {showThreadForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Card className="mb-3 !bg-domain-panel-raised">
                <p className="text-xs font-cinzel text-domain-text mb-2">{editingThread ? 'Edit Thread' : 'New Story Thread'}</p>
                <div className="space-y-2">
                  <input type="text" placeholder="Title" value={threadForm.title} onChange={e => setThreadForm(p => ({ ...p, title: e.target.value }))} className={inputClass} autoFocus />
                  <textarea placeholder="Description" value={threadForm.description} onChange={e => setThreadForm(p => ({ ...p, description: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={threadForm.thread_type} onChange={e => setThreadForm(p => ({ ...p, thread_type: e.target.value }))} className={selectClass}>
                      <option value="hook">Hook</option>
                      <option value="consequence">Consequence</option>
                      <option value="promise">Promise</option>
                      <option value="quest">Quest</option>
                      <option value="mystery">Mystery</option>
                      <option value="custom">Custom</option>
                    </select>
                    <select value={threadForm.urgency} onChange={e => setThreadForm(p => ({ ...p, urgency: e.target.value }))} className={selectClass}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveThread} disabled={!threadForm.title.trim() || savingThread} className={goldBtnClass}>
                      {savingThread ? 'Saving...' : editingThread ? 'Update' : 'Create'}
                    </button>
                    <button onClick={() => { setShowThreadForm(false); setEditingThread(null); }} className={ghostBtnClass}>Cancel</button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {threads.length === 0 && !showThreadForm ? (
          <p className="text-xs font-crimson text-domain-text-dim/50 italic">No story threads yet. Add one to start tracking your plot.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {threads.map(thread => (
              <Card key={thread.id} className={`border-l-2 ${URGENCY_COLORS[thread.urgency] || ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-cinzel text-sm text-domain-text">{thread.title}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-ui ${STATUS_COLORS[thread.status] || 'text-gray-400'}`}>
                      {thread.status}
                    </span>
                    <button onClick={() => openEditThread(thread)} className="text-domain-text-dim/40 hover:text-domain-amber cursor-pointer">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteThread(thread.id)} className="text-domain-text-dim/40 hover:text-red-400 cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {thread.thread_type && (
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-ui bg-domain-warm/30 text-domain-parchment-dark rounded">
                      {thread.thread_type}
                    </span>
                  )}
                  <span className={`inline-block px-1.5 py-0.5 text-[10px] font-ui rounded ${
                    thread.urgency === 'critical' ? 'bg-red-900/40 text-red-300' :
                    thread.urgency === 'high' ? 'bg-orange-900/40 text-orange-300' :
                    thread.urgency === 'medium' ? 'bg-yellow-900/40 text-yellow-300' :
                    'bg-gray-800/40 text-gray-400'
                  }`}>
                    {thread.urgency}
                  </span>
                </div>
                {thread.description && (
                  <p className="text-xs font-crimson text-domain-text-dim mt-1 line-clamp-3">{thread.description}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI Improv Assist */}
      <div className="shrink-0">
        <SectionHeader icon={Sparkles} title="AI Improv Assist">
          {isDM && improvCount > 0 && (
            <span className="text-[10px] font-ui text-domain-text-dim/60">{10 - improvCount}/10 remaining</span>
          )}
        </SectionHeader>
        <div className="flex gap-2">
          <input
            type="text"
            value={improvInput}
            onChange={e => setImprovInput(e.target.value)}
            placeholder={[
              'The rogue just pickpocketed the king...',
              'They went into the forest I haven\'t mapped...',
              'The bard is trying to seduce the dragon...',
              'A player asked about a backstory NPC I forgot...',
              'The party split up and went opposite directions...',
            ][Math.floor(Date.now() / 30000) % 5]}
            className={inputClass}
            disabled={improvLoading}
            onKeyDown={async (e) => {
              if (e.key !== 'Enter' || !improvInput.trim() || improvLoading) return;
              if (!requireDM('AI Improv Assist is a Dungeon Master tier feature. Upgrade for AI-powered suggestions at the table.')) return;
              if (improvCount >= 10) { setImprovError('You\'ve used all 10 AI assists for this session. Start a new session to reset.'); return; }
              setImprovLoading(true);
              setImprovSuggestions([]);
              setImprovError(null);
              setSelectedImprov(null);
              try {
                const res = await fetch('/.netlify/functions/ai-improv', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ campaignId, userInput: improvInput.trim(), userEmail: user?.email }),
                });
                const data = await res.json();
                if (res.ok && data.suggestions) {
                  setImprovSuggestions(data.suggestions);
                  setImprovCount(prev => prev + 1);
                } else {
                  setImprovError(data.error || 'Something went wrong. Try again.');
                }
              } catch (err) {
                console.error('Improv assist error:', err);
                setImprovError("Couldn't reach the AI. Try again in a moment.");
              }
              setImprovLoading(false);
            }}
          />
          <button
            onClick={async () => {
              if (!improvInput.trim() || improvLoading) return;
              if (!requireDM('AI Improv Assist is a Dungeon Master tier feature. Upgrade for AI-powered suggestions at the table.')) return;
              if (improvCount >= 10) { setImprovError('You\'ve used all 10 AI assists for this session. Start a new session to reset.'); return; }
              setImprovLoading(true);
              setImprovSuggestions([]);
              setImprovError(null);
              setSelectedImprov(null);
              try {
                const res = await fetch('/.netlify/functions/ai-improv', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ campaignId, userInput: improvInput.trim(), userEmail: user?.email }),
                });
                const data = await res.json();
                if (res.ok && data.suggestions) {
                  setImprovSuggestions(data.suggestions);
                  setImprovCount(prev => prev + 1);
                } else {
                  setImprovError(data.error || 'Something went wrong. Try again.');
                }
              } catch (err) {
                console.error('Improv assist error:', err);
                setImprovError("Couldn't reach the AI. Try again in a moment.");
              }
              setImprovLoading(false);
            }}
            disabled={!improvInput.trim() || improvLoading || improvCount >= 10}
            className="px-3 py-2 text-xs font-ui text-domain-amber border border-domain-warm/40 rounded-lg hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer disabled:opacity-40"
          >
            {improvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] font-ui text-domain-text-dim/60 mt-1">Describe what happened — get 3 ways to run with it</p>

        {/* Loading skeleton */}
        {improvLoading && (
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="p-3 bg-domain-panel/40 border border-domain-panel-border/20 rounded-lg animate-pulse">
                <div className="h-3 bg-domain-panel-border/30 rounded w-24 mb-2" />
                <div className="h-2.5 bg-domain-panel-border/20 rounded w-full mb-1.5" />
                <div className="h-2.5 bg-domain-panel-border/20 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {improvError && !improvLoading && (
          <div className="mt-3 p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
            <p className="text-xs font-crimson text-red-400">{improvError}</p>
          </div>
        )}

        {/* Suggestion cards */}
        {!improvLoading && improvSuggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            {improvSuggestions.map((s, i) => {
              const isSelected = selectedImprov === i;
              const isHidden = selectedImprov !== null && !isSelected;
              const ApproachIcon = s.approach === 'escalate' ? Zap : s.approach === 'redirect' ? RotateCcw : Layers;
              const approachColor = s.approach === 'escalate' ? 'text-red-400' : s.approach === 'redirect' ? 'text-blue-400' : 'text-purple-400';
              const borderColor = isSelected ? 'border-eg4h-gold-dark/60' : s.approach === 'escalate' ? 'border-red-800/30' : s.approach === 'redirect' ? 'border-blue-800/30' : 'border-purple-800/30';
              return (
                <div
                  key={i}
                  className={`p-3 bg-domain-panel/50 border ${borderColor} rounded-lg transition-all duration-300 ${isHidden ? 'opacity-0 max-h-0 overflow-hidden py-0 my-0 border-0 p-0' : 'opacity-100 max-h-96'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {isSelected && <Check className="w-3 h-3 text-eg4h-gold" />}
                      <ApproachIcon className={`w-3 h-3 ${approachColor}`} />
                      <span className={`text-xs font-cinzel font-semibold ${isSelected ? 'text-eg4h-gold' : approachColor}`}>{s.label || s.approach}</span>
                    </div>
                    {!isSelected ? (
                      <button
                        onClick={async () => {
                          // Save to session notes
                          const noteText = `[AI Improv] ${s.text}\n[DM situation: ${improvInput}]`;
                          const activeNote = sessionNotes.find(n => n.session_number === activeSessionNum);
                          if (activeNote && supabase) {
                            const updated = activeNote.raw_notes ? `${activeNote.raw_notes}\n\n${noteText}` : noteText;
                            const { data, error } = await supabase.from('session_notes').update({ raw_notes: updated }).eq('id', activeNote.id).select().single();
                            if (!error && data) setSessionNotes(prev => prev.map(n => n.id === data.id ? data : n));
                          } else if (supabase) {
                            const nextNum = sessionNotes.length > 0 ? Math.max(...sessionNotes.map(n => n.session_number)) + 1 : 1;
                            const { data, error } = await supabase.from('session_notes').insert({ campaign_id: campaignId, session_number: nextNum, title: `Session ${nextNum}`, raw_notes: noteText }).select().single();
                            if (!error && data) { setSessionNotes(prev => [data, ...prev]); setActiveSessionNum(data.session_number); }
                          }
                          setSelectedImprov(i);
                          setImprovToast('Added to session notes');
                          setTimeout(() => setImprovToast(null), 2500);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-ui text-domain-amber border border-domain-warm/30 rounded hover:border-eg4h-gold-dark/50 hover:bg-eg4h-gold/5 transition-colors cursor-pointer"
                      >
                        <BookMarked className="w-2.5 h-2.5" /> Use this
                      </button>
                    ) : (
                      <button
                        onClick={() => { setSelectedImprov(null); setImprovSuggestions([]); setImprovInput(''); }}
                        className="text-domain-text-dim/40 hover:text-domain-text-dim cursor-pointer transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-crimson text-domain-text-dim leading-relaxed">{s.text}</p>
                  {s.connection && (
                    <p className="text-[10px] font-ui text-domain-text-dim/50 mt-1.5 italic">{s.connection}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Toast */}
        <AnimatePresence>
          {improvToast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 border border-green-700/30 rounded-lg"
            >
              <Check className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-ui text-green-400">{improvToast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* World Lore */}
      <div className="shrink-0">
        <SectionHeader icon={Globe} title={`World Lore${!isDM ? ` (${lore.length}/${FREE_LIMITS.lore})` : ''}`}>
          <button onClick={openNewLore} className="flex items-center gap-1 px-2 py-1 text-xs font-ui text-domain-amber border border-domain-panel-border/50 rounded hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer">
            <Plus className="w-3 h-3" /> New Entry
          </button>
        </SectionHeader>

        {/* Lore form */}
        <AnimatePresence>
          {showLoreForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Card className="mb-3 !bg-domain-panel-raised">
                <p className="text-xs font-cinzel text-domain-text mb-2">{editingLore ? 'Edit Lore Entry' : 'New Lore Entry'}</p>
                <div className="space-y-2">
                  <input type="text" placeholder="Name" value={loreForm.name} onChange={e => setLoreForm(p => ({ ...p, name: e.target.value }))} className={inputClass} autoFocus />
                  <select value={loreForm.type} onChange={e => setLoreForm(p => ({ ...p, type: e.target.value }))} className={selectClass}>
                    <option value="location">Location</option>
                    <option value="faction">Faction</option>
                    <option value="deity">Deity</option>
                    <option value="history">History</option>
                    <option value="culture">Culture</option>
                    <option value="geography">Geography</option>
                    <option value="law">Law</option>
                    <option value="legend">Legend</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea placeholder="Description" value={loreForm.description} onChange={e => setLoreForm(p => ({ ...p, description: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
                  <textarea placeholder="Notes (optional)" value={loreForm.notes} onChange={e => setLoreForm(p => ({ ...p, notes: e.target.value }))} rows={2} className={`${inputClass} resize-none`} />
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveLore} disabled={!loreForm.name.trim() || savingLore} className={goldBtnClass}>
                      {savingLore ? 'Saving...' : editingLore ? 'Update' : 'Create'}
                    </button>
                    <button onClick={() => { setShowLoreForm(false); setEditingLore(null); }} className={ghostBtnClass}>Cancel</button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {lore.length === 0 && !showLoreForm ? (
          <p className="text-xs font-crimson text-domain-text-dim/50 italic">No lore entries yet. Start building your world.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {lore.map(entry => (
              <Card key={entry.id} className="!p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 text-[10px] font-ui bg-domain-warm/30 text-domain-parchment-dark rounded shrink-0">{entry.type}</span>
                    <span className="font-cinzel text-xs text-domain-text truncate">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button onClick={() => openEditLore(entry)} className="text-domain-text-dim/40 hover:text-domain-amber cursor-pointer">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteLore(entry.id)} className="text-domain-text-dim/40 hover:text-red-400 cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {entry.description && (
                  <p className="text-xs font-crimson text-domain-text-dim mt-1 line-clamp-2">{entry.description}</p>
                )}
                {entry.notes && (
                  <p className="text-xs font-crimson text-domain-text-dim/60 mt-0.5 italic line-clamp-1">{entry.notes}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SRD Quick Reference */}
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
  // RIGHT PANEL — Party & Initiative
  // ═══════════════════════════════════════════════════════════════
  const RightPanel = (
    <div className="flex flex-col gap-5 h-full">
      {/* Party Members */}
      <div>
        <SectionHeader icon={Users} title="Party" />
        {partyMembers.length === 0 && !campaign?.party_id ? (
          <div className="dm-panel-raised border rounded-lg p-4">
            <p className="text-xs font-crimson text-domain-text-dim/60 italic mb-3">
              No party linked to this campaign.
            </p>
            {showPartyLink ? (
              <div className="space-y-2">
                <select
                  value={selectedPartyId}
                  onChange={e => setSelectedPartyId(e.target.value)}
                  className="w-full px-3 py-2 bg-domain-dark border border-domain-panel-border/50 rounded-lg text-sm text-domain-text focus:border-eg4h-gold-dark focus:outline-none font-crimson"
                >
                  <option value="">Select a party...</option>
                  {availableParties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {availableParties.length === 0 && (
                  <p className="text-[10px] font-ui text-domain-text-dim/50">No parties found in Character Evolver.</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleLinkParty}
                    disabled={!selectedPartyId || linkingParty}
                    className="px-3 py-1.5 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {linkingParty ? 'Linking...' : 'Link'}
                  </button>
                  <button
                    onClick={() => { setShowPartyLink(false); setSelectedPartyId(''); }}
                    className="px-3 py-1.5 text-xs font-ui text-domain-text-dim hover:text-domain-text transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { fetchAvailableParties(); setShowPartyLink(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg hover:shadow-[0_2px_10px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" /> Link a Party
              </button>
            )}
          </div>
        ) : partyMembers.length === 0 ? (
          <p className="text-xs font-crimson text-domain-text-dim/50 italic">
            No members in this party yet.
          </p>
        ) : (
          <div className="space-y-2">
            {partyMembers.map(m => {
              const stats = parseCharStats(m.character);
              const hasNotes = !!dmNotes[m.character_id]?.notes;
              const isOpen = openNoteId === m.character_id;
              return (
                <Card key={m.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-cinzel text-sm text-domain-text">{stats.name}</span>
                      {hasNotes && !isOpen && <Lock className="w-3 h-3 text-domain-amber/60" />}
                    </div>
                    <div className="flex items-center gap-2">
                      {stats.charClass && (
                        <span className="text-xs font-ui text-domain-parchment-dark">
                          {stats.charClass}{stats.level ? ` ${stats.level}` : ''}
                        </span>
                      )}
                      <button
                        onClick={() => toggleMsg(m.character_id)}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${openMsgId === m.character_id ? 'text-domain-amber' : 'text-domain-text-dim/40 hover:text-domain-amber'}`}
                        title="Send Secret Note"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleDmNote(m.character_id)}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${isOpen ? 'text-domain-amber' : 'text-domain-text-dim/40 hover:text-domain-amber'}`}
                        title="DM Notes"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    </div>
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

                  {/* DM Secret Notes area */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="mt-2 pt-2 border-t border-domain-panel-border/30">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Lock className="w-3 h-3 text-domain-amber/80" />
                            <span className="text-[10px] font-ui text-domain-amber/80">DM Eyes Only</span>
                          </div>
                          <textarea
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Secret notes about this character..."
                            rows={3}
                            className="w-full px-2 py-1.5 bg-[rgba(15,12,8,0.60)] border border-domain-amber/20 rounded text-xs text-domain-text placeholder-domain-text-dim/60 focus:border-domain-amber/50 focus:outline-none font-crimson resize-none"
                          />
                          <div className="flex gap-2 mt-1.5">
                            <button
                              onClick={() => saveDmNote(m.character_id)}
                              disabled={savingDmNote}
                              className="px-3 py-1 text-[10px] font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {savingDmNote ? 'Saving...' : 'Save'}
                            </button>
                            {hasNotes && (
                              <button
                                onClick={() => deleteDmNote(m.character_id)}
                                className="px-3 py-1 text-[10px] font-ui text-red-400/70 hover:text-red-400 cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* DM Secret Messaging */}
                  <AnimatePresence>
                    {openMsgId === m.character_id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="mt-2 pt-2 border-t border-domain-panel-border/30">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Mail className="w-3 h-3 text-blue-400/80" />
                            <span className="text-[10px] font-ui text-blue-400/80">Secret note to {stats.name}</span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={msgText}
                              onChange={e => setMsgText(e.target.value)}
                              placeholder={`Send a secret message to ${stats.name}...`}
                              className="flex-1 px-2 py-1.5 bg-[rgba(15,12,8,0.60)] border border-blue-400/20 rounded text-xs text-domain-text placeholder-domain-text-dim/60 focus:border-blue-400/50 focus:outline-none font-crimson"
                              onKeyDown={e => { if (e.key === 'Enter' && msgText.trim()) sendMessage(m.character_id, m.email); }}
                            />
                            <button
                              onClick={() => sendMessage(m.character_id, m.email)}
                              disabled={!msgText.trim() || sendingMsg}
                              className="px-3 py-1 text-[10px] font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Send
                            </button>
                          </div>
                          {(dmMessages[m.character_id] || []).length > 0 && (
                            <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                              {(dmMessages[m.character_id] || []).slice(0, 10).map(msg => (
                                <div key={msg.id} className="flex items-start gap-2 px-2 py-1 bg-domain-panel/40 rounded text-[11px]">
                                  <button onClick={() => toggleMsgRead(msg)} className="shrink-0 mt-0.5 cursor-pointer" title={msg.is_read ? 'Mark unread' : 'Mark read'}>
                                    {msg.is_read
                                      ? <MailOpen className="w-3 h-3 text-domain-text-dim/30" />
                                      : <Mail className="w-3 h-3 text-blue-400/70" />
                                    }
                                  </button>
                                  <p className={`font-crimson flex-1 ${msg.is_read ? 'text-domain-text-dim/50' : 'text-domain-text-dim'}`}>{msg.message}</p>
                                  <span className="text-[9px] font-ui text-domain-text-dim/30 shrink-0">{new Date(msg.created_at).toLocaleDateString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                className="px-2 py-1 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/30 rounded text-xs text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson"
                autoFocus
              />
              <input
                type="number"
                placeholder="Init"
                value={newCombatant.init}
                onChange={e => setNewCombatant(p => ({ ...p, init: e.target.value }))}
                className="px-2 py-1 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/30 rounded text-xs text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson"
              />
              <input
                type="number"
                placeholder="HP"
                value={newCombatant.hp}
                onChange={e => setNewCombatant(p => ({ ...p, hp: e.target.value }))}
                className="px-2 py-1 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/30 rounded text-xs text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none font-crimson"
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
                <div key={c.id}>
                  <div
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-t text-xs ${
                      expandedNoteId === c.id ? 'rounded-b-none' : 'rounded-b'
                    } ${
                      i === (combatRound > 0 ? (combatRound - 1) % combatants.length : -1)
                        ? 'bg-eg4h-gold/10 border border-eg4h-gold-dark/40'
                        : 'bg-domain-panel/60 border border-domain-panel-border/20'
                    } ${c.hp === 0 && c.maxHp > 0 ? 'opacity-40' : ''}`}
                  >
                    <span className="font-ui text-domain-text w-6 text-center">{c.init}</span>
                    <button
                      onClick={() => setExpandedNoteId(prev => prev === c.id ? null : c.id)}
                      className={`font-cinzel flex-1 min-w-0 truncate text-left cursor-pointer ${c.isParty ? 'text-eg4h-gold' : 'text-domain-text'}`}
                      title={c.notes ? c.notes.slice(0, 80) : 'Click to add notes'}
                    >
                      {c.name}
                      {c.notes && expandedNoteId !== c.id && (
                        <span className="font-crimson text-[10px] text-domain-text-dim/50 ml-1.5 font-normal">— {c.notes.length > 40 ? c.notes.slice(0, 40) + '…' : c.notes}</span>
                      )}
                    </button>
                    {!c.notes && (
                      <button
                        onClick={() => setExpandedNoteId(prev => prev === c.id ? null : c.id)}
                        className={`shrink-0 cursor-pointer transition-colors ${expandedNoteId === c.id ? 'text-domain-amber' : 'text-domain-text-dim/30 hover:text-domain-text-dim/60'}`}
                        title="Add notes"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    )}
                    {c.notes && expandedNoteId !== c.id && (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-domain-amber/50" title="Has notes" />
                    )}
                    {c.maxHp > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`font-ui text-xs w-auto text-center whitespace-nowrap ${
                          c.hp <= 0 ? 'text-red-500' :
                          c.hp <= c.maxHp * 0.25 ? 'text-red-400' :
                          c.hp <= c.maxHp * 0.5 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {c.hp}/{c.maxHp}
                        </span>
                        <input
                          type="number"
                          value={hpInputs[c.id] || ''}
                          onChange={e => setHpInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                          onKeyDown={e => {
                            const val = parseInt(hpInputs[c.id]) || 0;
                            if (e.key === 'Enter' && val !== 0) {
                              adjustHp(c.id, -Math.abs(val));
                              setHpInputs(prev => ({ ...prev, [c.id]: '' }));
                            }
                          }}
                          placeholder="#"
                          className="w-10 px-1 py-0.5 text-xs text-center bg-domain-dark border border-domain-panel-border/60 rounded text-domain-text font-ui focus:border-eg4h-gold-dark focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => { const val = parseInt(hpInputs[c.id]) || 0; if (val) { adjustHp(c.id, -Math.abs(val)); setHpInputs(prev => ({ ...prev, [c.id]: '' })); } }}
                          className="px-1 py-0.5 text-[10px] font-ui text-red-400 hover:text-red-300 border border-red-900/30 rounded cursor-pointer"
                          title="Damage"
                        >
                          DMG
                        </button>
                        <button
                          onClick={() => { const val = parseInt(hpInputs[c.id]) || 0; if (val) { adjustHp(c.id, Math.abs(val)); setHpInputs(prev => ({ ...prev, [c.id]: '' })); } }}
                          className="px-1 py-0.5 text-[10px] font-ui text-green-400 hover:text-green-300 border border-green-900/30 rounded cursor-pointer"
                          title="Heal"
                        >
                          HEAL
                        </button>
                      </div>
                    )}
                    <button onClick={() => removeCombatant(c.id)} className="shrink-0 text-domain-text-dim/40 hover:text-red-400 cursor-pointer ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {expandedNoteId === c.id && (
                    <div className="bg-domain-panel/40 border border-t-0 border-domain-panel-border/20 rounded-b px-2 py-1.5">
                      <textarea
                        value={c.notes || ''}
                        onChange={e => setCombatants(prev => prev.map(cb => cb.id === c.id ? { ...cb, notes: e.target.value } : cb))}
                        placeholder="Conditions, effects, reminders..."
                        rows={1}
                        className="w-full px-2 py-1 bg-[rgba(15,12,8,0.40)] border border-domain-panel-border/30 rounded text-xs text-domain-text placeholder-domain-text-dim/50 focus:border-eg4h-gold-dark focus:outline-none font-crimson resize-none"
                        autoFocus
                        onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                      />
                    </div>
                  )}
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
          <span className={`shrink-0 px-2 py-0.5 text-[10px] font-ui rounded-full ${isDM ? 'bg-eg4h-gold/20 text-eg4h-gold border border-eg4h-gold-dark/40' : 'bg-gray-800/50 text-gray-400 border border-gray-700/40'}`}>
            {isDM ? 'DM' : 'Free'}
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
                onClick={() => { setActiveTab(tab.key); localStorage.setItem('dmd-active-tab', tab.key); }}
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

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          reason={upgradeReason}
        />
      )}
    </div>
  );
}
