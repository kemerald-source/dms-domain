import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Plus, Trash2, Swords, BookOpen, Users,
  Scroll, Sparkles, Globe, ChevronUp, ChevronDown, Shield,
  Heart, Eye, X, GripVertical, Pencil, Save, Lock, EyeOff, Dices,
  ChevronRight, BookMarked, MapPin, Clock,
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

// ─── Quick NPC generator data ───────────────────────────────
const NPC_FIRST = ['Aldric','Brenna','Cedric','Delara','Eamon','Fiona','Gareth','Helena','Idris','Jasira','Kael','Lyria','Magnus','Nara','Orin','Petra','Quinn','Rowan','Sable','Theron','Ursa','Vesper','Wren','Xara','Yoren','Zella','Dorian','Elara','Fenwick','Greta','Haldan','Isolde','Jorik','Kessa','Lothar','Miriel','Niles','Olwen','Phelan','Rhiannon','Stellan','Tova','Ulfric','Vara','Wynne'];
const NPC_LAST = ['Ashford','Blackthorn','Copperfield','Duskwalker','Emberstone','Foxglove','Greymane','Holloway','Ironforge','Jasperwind','Knightley','Larkwood','Moonvale','Nighthollow','Oakhart','Pinecrest','Quillbrook','Ravenscar','Stormhaven','Thornwall','Underhill','Vexley','Whitmore','Yarrow','Zephyrs'];
const NPC_ROLES = { shopkeeper: 'Shopkeeper', merchant: 'Merchant', guard: 'Town Guard', noble: 'Noble', bartender: 'Bartender', innkeeper: 'Innkeeper', blacksmith: 'Blacksmith', priest: 'Priest', beggar: 'Beggar', farmer: 'Farmer', sailor: 'Sailor', scholar: 'Scholar', thief: 'Thief', bard: 'Traveling Bard', witch: 'Hedge Witch', hunter: 'Hunter', courier: 'Courier', healer: 'Healer', mayor: 'Town Elder', captain: 'Guard Captain', wizard: 'Wizard', alchemist: 'Alchemist', spy: 'Spy', assassin: 'Assassin' };
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
  return 'Commoner';
}

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
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [savingEditNote, setSavingEditNote] = useState(false);

  // NPC edit form state
  const [showNpcForm, setShowNpcForm] = useState(false);
  const [editingNpc, setEditingNpc] = useState(null);
  const [npcForm, setNpcForm] = useState({ name: '', role: '', personality: '', quirks: '', voice_notes: '', motivation: '', location: '' });
  const [savingNpc, setSavingNpc] = useState(false);

  // Center panel state
  const [threads, setThreads] = useState([]);
  const [lore, setLore] = useState([]);
  const [improvInput, setImprovInput] = useState('');

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

  // Right panel state
  const [partyMembers, setPartyMembers] = useState([]);
  const [dmNotes, setDmNotes] = useState({});
  const [openNoteId, setOpenNoteId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingDmNote, setSavingDmNote] = useState(false);
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
      setSessionNotes(noteRes.data || []);

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
            (!m.email || m.email.toLowerCase() !== dmEmail)
          );
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

            // Fetch DM secret notes for these characters
            const { data: notes } = await supabase
              .from('dm_character_notes')
              .select('*')
              .eq('campaign_id', campaignId)
              .eq('dm_email', user.email)
              .in('character_id', charIds);

            if (notes?.length) {
              const noteMap = {};
              notes.forEach(n => { noteMap[n.character_id] = n; });
              setDmNotes(noteMap);
            }
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
    setShowNpcForm(true);
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

  // ─── Quick NPC generator ────────────────────────────────────
  const generateNpc = async () => {
    if (!supabase) return;
    setGeneratingNpc(true);

    const name = `${pickRandom(NPC_FIRST)} ${pickRandom(NPC_LAST)}`;
    const role = npcPrompt.trim() ? detectRole(npcPrompt) : pickRandom(Object.values(NPC_ROLES));
    const personality = pickRandom(NPC_PERSONALITIES);
    const quirk = pickRandom(NPC_QUIRKS);
    const motivation = pickRandom(NPC_MOTIVATIONS);
    const voice = pickRandom(NPC_VOICES);

    const currentSession = sessionNotes.length > 0
      ? Math.max(...sessionNotes.map(n => n.session_number))
      : 1;

    const payload = {
      campaign_id: campaignId,
      name,
      role,
      status: 'alive',
      personality,
      quirks: quirk,
      voice_notes: voice,
      motivation,
      first_session: currentSession,
    };

    const { data, error } = await supabase
      .from('npcs')
      .insert(payload)
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

  // ─── Story thread CRUD ──────────────────────────────────────
  const openNewThread = () => {
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
          <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
            {sessionNotes.map(note => (
              <Card key={note.id} className="!p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-cinzel text-domain-text">Session {note.session_number}</p>
                  <div className="flex items-center gap-2">
                    {note.created_at && (
                      <span className="text-[10px] font-ui text-domain-text-dim/50 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    )}
                    <button onClick={() => startEditNote(note)} className="text-domain-text-dim/40 hover:text-domain-amber cursor-pointer">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {editingNoteId === note.id ? (
                  <div className="mt-1">
                    <textarea
                      value={editNoteText}
                      onChange={e => setEditNoteText(e.target.value)}
                      rows={4}
                      className="w-full px-2 py-1.5 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded text-xs text-domain-text focus:border-eg4h-gold-dark focus:outline-none font-crimson resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => saveEditNote(note.id)} disabled={savingEditNote} className="px-3 py-1 text-[10px] font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 cursor-pointer">
                        {savingEditNote ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => { setEditingNoteId(null); setEditNoteText(''); }} className="px-3 py-1 text-[10px] font-ui text-domain-text-dim hover:text-domain-text cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-crimson text-domain-text-dim mt-0.5 line-clamp-3">{note.raw_notes}</p>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* AI Session Summary placeholder */}
        <div className="mt-3 p-2 bg-domain-panel/40 border border-domain-panel-border/20 rounded-lg">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-domain-text-dim/40" />
            <span className="text-[10px] font-ui text-domain-text-dim/40">AI session summary coming soon</span>
          </div>
        </div>
      </div>

      {/* NPCs */}
      <div>
        <SectionHeader icon={Users} title="NPCs">
          <button
            onClick={() => setShowNpcGen(v => !v)}
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
                <p className="text-xs font-cinzel text-domain-text mb-2">Quick NPC Generator</p>
                <input
                  type="text"
                  value={npcPrompt}
                  onChange={e => setNpcPrompt(e.target.value)}
                  placeholder="a nervous shopkeeper who owes money to the thieves' guild"
                  className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm"
                  autoFocus
                />
                <p className="text-[10px] font-ui text-domain-text-dim/40 mt-1 mb-2">Describe the NPC you need, or leave blank for a random one</p>
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
          {showNpcForm && editingNpc && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Card className="mb-3 !bg-domain-panel-raised">
                <p className="text-xs font-cinzel text-domain-text mb-2">Edit NPC</p>
                <div className="space-y-2">
                  <input type="text" placeholder="Name" value={npcForm.name} onChange={e => setNpcForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm" autoFocus />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Role" value={npcForm.role} onChange={e => setNpcForm(p => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm" />
                    <input type="text" placeholder="Location" value={npcForm.location} onChange={e => setNpcForm(p => ({ ...p, location: e.target.value }))} className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm" />
                  </div>
                  <textarea placeholder="Personality" value={npcForm.personality} onChange={e => setNpcForm(p => ({ ...p, personality: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm resize-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Quirks" value={npcForm.quirks} onChange={e => setNpcForm(p => ({ ...p, quirks: e.target.value }))} className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm" />
                    <input type="text" placeholder="Voice notes" value={npcForm.voice_notes} onChange={e => setNpcForm(p => ({ ...p, voice_notes: e.target.value }))} className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm" />
                  </div>
                  <input type="text" placeholder="Motivation / Goal" value={npcForm.motivation} onChange={e => setNpcForm(p => ({ ...p, motivation: e.target.value }))} className="w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm" />
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveNpcEdit} disabled={!npcForm.name.trim() || savingNpc} className="px-4 py-1.5 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_2px_8px_rgba(255,215,0,0.3)] transition-all cursor-pointer">
                      {savingNpc ? 'Saving...' : 'Update'}
                    </button>
                    <button onClick={() => { setShowNpcForm(false); setEditingNpc(null); }} className="px-3 py-1.5 text-xs font-ui text-domain-text-dim hover:text-domain-text cursor-pointer">Cancel</button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
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
                {npc.first_session && <p className="text-[10px] font-ui text-domain-text-dim/40 mt-0.5">First appeared: Session {npc.first_session}</p>}
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

  const inputClass = "w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text placeholder-domain-text-dim/40 focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm";
  const selectClass = "w-full px-3 py-2 bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/40 rounded-lg text-domain-text focus:border-eg4h-gold-dark focus:outline-none font-crimson text-sm";
  const goldBtnClass = "px-4 py-1.5 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_2px_8px_rgba(255,215,0,0.3)] transition-all cursor-pointer";
  const ghostBtnClass = "px-3 py-1.5 text-xs font-ui text-domain-text-dim hover:text-domain-text cursor-pointer";

  const CenterPanel = (
    <div className="flex flex-col gap-5 h-full">
      {/* Story Threads */}
      <div>
        <SectionHeader icon={Scroll} title="Story Threads">
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
      <div>
        <SectionHeader icon={Sparkles} title="AI Improv Assist" />
        <div className="flex gap-2">
          <input
            type="text"
            value={improvInput}
            onChange={e => setImprovInput(e.target.value)}
            placeholder="Ask for an improv suggestion..."
            className={inputClass}
          />
          <button className="px-3 py-2 text-xs font-ui text-domain-amber border border-domain-warm/40 rounded-lg hover:border-eg4h-gold-dark/60 transition-colors cursor-pointer opacity-50" disabled>
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] font-ui text-domain-text-dim/40 mt-1">AI assist coming soon</p>
      </div>

      {/* World Lore */}
      <div>
        <SectionHeader icon={Globe} title="World Lore">
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
                  <span className="text-[10px] font-ui text-domain-text-dim/40 ml-auto">{entries.length}</span>
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
        {partyMembers.length === 0 ? (
          <p className="text-xs font-crimson text-domain-text-dim/50 italic">
            {campaign?.party_id ? 'No members in this party yet.' : 'No party linked to this campaign.'}
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
                            className="w-full px-2 py-1.5 bg-[rgba(15,12,8,0.60)] border border-domain-amber/20 rounded text-xs text-domain-text placeholder-domain-text-dim/40 focus:border-domain-amber/50 focus:outline-none font-crimson resize-none"
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
