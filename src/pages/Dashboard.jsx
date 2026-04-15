import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Calendar, Users, Scroll, LogOut, Loader2, Swords, Pencil, Check, X, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '@/api/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTier, FREE_LIMITS } from '@/lib/tier';
import UpgradeModal from '@/components/UpgradeModal';
import { startCheckout, readIntendedPlan, clearIntendedPlan } from '@/lib/checkout';

function relativeTime(date) {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingDescId, setEditingDescId] = useState(null);
  const [editDescText, setEditDescText] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const { tier, isDM, isPaid, campaignLimit } = useTier(user?.email);
  const tierLabel = tier === 'dungeon_master' ? 'Dungeon Master' : tier === 'adventurer' ? 'Adventurer' : 'Free';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      login(() => navigate('/dashboard'));
    }
  }, [authLoading, isAuthenticated]);

  // Clear tier cache after Stripe checkout so tier refreshes immediately
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success' && user?.email) {
      sessionStorage.removeItem(`dmd-tier-${user.email.toLowerCase()}`);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [user?.email]);

  // If the user picked a plan on the landing page before signing in, resume
  // the checkout flow now that we have their email. One-shot — consume the
  // stashed plan whether checkout succeeds or errors so we don't loop.
  useEffect(() => {
    if (!user?.email) return;
    const plan = readIntendedPlan();
    if (!plan) return;
    clearIntendedPlan();
    startCheckout(user.email, plan);
  }, [user?.email]);

  // Fetch campaigns and parties
  useEffect(() => {
    if (!user?.email || !supabase) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);

      // Fetch campaigns for this DM
      const { data: campaignData, error: campaignErr } = await supabase
        .from('campaigns')
        .select('*')
        .eq('dm_email', user.email)
        .order('updated_at', { ascending: false });

      if (campaignErr) console.error('Error fetching campaigns:', campaignErr);

      // Fetch parties this user DMs — match on email OR on linked campaign party_ids
      // (handles CE parties where dm_email may differ from OAuth login email)
      const campaignPartyIds = (campaignData || [])
        .map(c => c.party_id)
        .filter(Boolean);

      const { data: partyByEmail, error: partyErr } = await supabase
        .from('parties')
        .select('*')
        .eq('dm_email', user.email);

      if (partyErr) console.error('Error fetching parties:', partyErr);

      let partyData = partyByEmail || [];

      // Also fetch parties linked to the user's campaigns (cross-app email mismatch)
      if (campaignPartyIds.length > 0) {
        const knownIds = new Set(partyData.map(p => p.id));
        const missing = campaignPartyIds.filter(id => !knownIds.has(id));
        if (missing.length > 0) {
          const { data: linkedParties } = await supabase
            .from('parties')
            .select('*')
            .in('id', missing);
          if (linkedParties) partyData = [...partyData, ...linkedParties];
        }
      }

      // For each campaign with a party_id, get the party name
      const partyMap = {};
      (partyData || []).forEach(p => { partyMap[p.id] = p; });

      // Get session counts, NPC counts, and thread counts per campaign
      const campaignIds = (campaignData || []).map(c => c.id);
      let sessionCounts = {};
      let lastPlayedDates = {};
      let npcCounts = {};
      let threadCounts = {};

      if (campaignIds.length > 0) {
        const [sessionsRes, npcsRes, threadsRes] = await Promise.all([
          supabase.from('session_notes').select('campaign_id, created_at').in('campaign_id', campaignIds),
          supabase.from('npcs').select('campaign_id').in('campaign_id', campaignIds),
          supabase.from('story_threads').select('campaign_id').in('campaign_id', campaignIds),
        ]);

        (sessionsRes.data || []).forEach(s => {
          sessionCounts[s.campaign_id] = (sessionCounts[s.campaign_id] || 0) + 1;
          const date = new Date(s.created_at);
          if (!lastPlayedDates[s.campaign_id] || date > lastPlayedDates[s.campaign_id]) {
            lastPlayedDates[s.campaign_id] = date;
          }
        });

        (npcsRes.data || []).forEach(n => {
          npcCounts[n.campaign_id] = (npcCounts[n.campaign_id] || 0) + 1;
        });

        (threadsRes.data || []).forEach(t => {
          threadCounts[t.campaign_id] = (threadCounts[t.campaign_id] || 0) + 1;
        });
      }

      const enriched = (campaignData || []).map(c => ({
        ...c,
        partyName: c.party_id && partyMap[c.party_id] ? partyMap[c.party_id].name : null,
        sessionCount: sessionCounts[c.id] || 0,
        lastPlayed: lastPlayedDates[c.id] || null,
        npcCount: npcCounts[c.id] || 0,
        threadCount: threadCounts[c.id] || 0,
      }));

      setCampaigns(enriched);
      setParties(partyData || []);
      setLoading(false);
    }

    fetchData();
  }, [user?.email]);

  const handleCreate = async () => {
    if (!newName.trim() || !supabase || !user?.email || creating) return;
    setCreating(true);

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        dm_email: user.email,
        name: newName.trim(),
        description: newDesc.trim() || null,
        party_id: selectedParty || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      setCreating(false);
      return;
    }

    // Add to list with enriched data
    const party = parties.find(p => p.id === selectedParty);
    setCampaigns(prev => [{
      ...data,
      partyName: party?.name || null,
      sessionCount: 0,
      lastPlayed: null,
    }, ...prev]);

    setNewName('');
    setNewDesc('');
    setSelectedParty('');
    setShowCreate(false);
    setCreating(false);
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="dm-study-bg min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-eg4h-gold animate-spin relative z-10" />
      </div>
    );
  }

  return (
    <div className="dm-study-bg min-h-screen">
      {/* Header */}
      <header className="border-b border-domain-panel-border/60 bg-domain-dark/90 backdrop-blur-sm sticky top-0 z-20 dm-header-glow relative">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/dmd-logo.png" alt="DMD" className="w-10 h-10" />
            <h1 className="font-cinzel text-xl text-eg4h-gold font-semibold">DM's Domain</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-domain-text-dim text-sm font-ui hidden sm:block">
              {user?.name || user?.email}
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-ui rounded-full ${isPaid ? 'bg-eg4h-gold/20 text-eg4h-gold border border-eg4h-gold-dark/40' : 'bg-gray-800/50 text-gray-400 border border-gray-700/40'}`}>
              {tierLabel}
            </span>
            {user?.avatar && (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-eg4h-gold-dark/50" />
            )}
            <button
              onClick={logout}
              className="text-domain-text-dim hover:text-eg4h-gold transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-10 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-cinzel text-2xl md:text-3xl text-domain-text">Your Campaigns</h2>
          <button
            onClick={() => {
              if (campaigns.length >= campaignLimit) {
                const reasons = {
                  free: 'Free tier allows 1 campaign. Upgrade to Adventurer for 3 or Dungeon Master for 6.',
                  adventurer: 'Adventurer tier allows 3 active campaigns. Upgrade to Dungeon Master for 6.',
                  dungeon_master: 'Dungeon Master tier allows 6 active campaigns. Archive one to create another.',
                };
                setUpgradeReason(reasons[tier] || reasons.free);
                setShowUpgrade(true);
              } else {
                setShowCreate(true);
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 font-cinzel text-sm font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg shadow-[0_2px_10px_rgba(255,215,0,0.3)] hover:shadow-[0_2px_15px_rgba(255,215,0,0.5)] transition-all hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>

        {/* Upsell prompt for free and Adventurer users */}
        {!isDM && !loading && campaigns.length > 0 && (
          <div className="mb-6 px-4 py-3 bg-domain-panel border border-eg4h-gold-dark/20 rounded-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Sparkles className="w-4 h-4 text-eg4h-gold/70 shrink-0" />
              <p className="text-sm font-crimson text-domain-text-dim">
                {tier === 'adventurer'
                  ? <>Unlock AI tools, more campaigns, and Homebrew/Gallery with <span className="text-eg4h-gold">Dungeon Master</span>.</>
                  : <>Unlock AI-powered tools, more campaigns, and more with <span className="text-eg4h-gold">a paid tier</span>.</>}
              </p>
            </div>
            <button
              onClick={() => { setUpgradeReason(''); setShowUpgrade(true); }}
              className="shrink-0 px-4 py-1.5 font-cinzel text-xs font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg hover:shadow-[0_2px_10px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
            >
              Upgrade
            </button>
          </div>
        )}

        {/* Create Campaign Modal */}
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              className="dm-panel-raised border rounded-xl p-6 w-full max-w-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-cinzel text-xl text-eg4h-gold mb-6">New Campaign</h3>

              <label className="block mb-4">
                <span className="text-domain-text-dim text-sm font-ui mb-1 block">Campaign Name</span>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="The Lost Mines of Phandelver"
                  className="w-full px-4 py-2.5 bg-domain-dark border border-domain-panel-border/50 rounded-lg text-domain-text placeholder-domain-text-dim/50 focus:border-eg4h-gold-dark focus:outline-none font-crimson"
                  autoFocus
                />
              </label>

              <label className="block mb-4">
                <span className="text-domain-text-dim text-sm font-ui mb-1 block">Description (optional)</span>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="A brief overview of the campaign..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-domain-dark border border-domain-panel-border/50 rounded-lg text-domain-text placeholder-domain-text-dim/50 focus:border-eg4h-gold-dark focus:outline-none font-crimson resize-none"
                />
              </label>

              <label className="block mb-6">
                <span className="text-domain-text-dim text-sm font-ui mb-1 block">Link Party (from Character Evolver)</span>
                {parties.length > 0 ? (
                  <select
                    value={selectedParty}
                    onChange={e => setSelectedParty(e.target.value)}
                    className="w-full px-4 py-2.5 bg-domain-dark border border-domain-panel-border/50 rounded-lg text-domain-text focus:border-eg4h-gold-dark focus:outline-none font-crimson"
                  >
                    <option value="">No party linked</option>
                    {parties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-4 py-2.5 bg-domain-dark border border-domain-panel-border/50 rounded-lg">
                    <p className="text-domain-text-dim/60 font-crimson text-sm">No parties found yet</p>
                  </div>
                )}
                <span className="text-domain-text-dim/50 text-xs font-ui mt-1.5 block">You can link a party later from your campaign settings</span>
              </label>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-2 text-domain-text-dim hover:text-domain-text transition-colors font-ui text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="px-5 py-2 font-cinzel text-sm font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_2px_10px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Campaign List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-eg4h-gold animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Scroll className="w-16 h-16 text-domain-text-dim/30 mx-auto mb-6" />
            <p className="font-crimson text-xl text-domain-text-dim mb-2">No campaigns yet</p>
            <p className="font-crimson text-domain-text-dim/60">
              Create your first campaign to start tracking your world.
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign, i) => (
              <motion.div
                key={campaign.id}
                className="dm-panel border rounded-xl p-5 hover:border-eg4h-gold-dark/40 transition-colors cursor-pointer group"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/campaign/${campaign.id}/session`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-cinzel text-lg text-domain-text group-hover:text-eg4h-gold transition-colors truncate">
                      {campaign.name}
                    </h3>
                    {editingDescId === campaign.id ? (
                      <div className="mt-1" onClick={e => e.stopPropagation()}>
                        <textarea
                          value={editDescText}
                          onChange={e => setEditDescText(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-1.5 bg-domain-dark border border-domain-panel-border/50 rounded text-sm text-domain-text placeholder-domain-text-dim/50 focus:border-eg4h-gold-dark focus:outline-none font-crimson resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setSavingDesc(true);
                              const { error } = await supabase.from('campaigns').update({ description: editDescText.trim() || null }).eq('id', campaign.id);
                              if (!error) setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, description: editDescText.trim() || null } : c));
                              setEditingDescId(null);
                              setSavingDesc(false);
                            }}
                            disabled={savingDesc}
                            className="p-1 text-green-400 hover:text-green-300 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingDescId(null); }} className="p-1 text-domain-text-dim hover:text-domain-text cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1 mt-1">
                        <p className="font-crimson text-domain-text-dim text-sm line-clamp-2 flex-1">
                          {campaign.description || <span className="italic text-domain-text-dim/60">No description</span>}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingDescId(campaign.id); setEditDescText(campaign.description || ''); }}
                          className="text-domain-text-dim/30 hover:text-domain-amber cursor-pointer shrink-0 mt-0.5"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-ui text-domain-text-dim">
                      {campaign.partyName && (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {campaign.partyName}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Scroll className="w-3.5 h-3.5" />
                        {campaign.sessionCount} session{campaign.sessionCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {campaign.npcCount} NPC{campaign.npcCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Swords className="w-3.5 h-3.5" />
                        {campaign.threadCount} thread{campaign.threadCount !== 1 ? 's' : ''}
                      </span>
                      {campaign.lastPlayed && (
                        <span className="flex items-center gap-1.5" title={campaign.lastPlayed.toLocaleDateString()}>
                          <Calendar className="w-3.5 h-3.5" />
                          {relativeTime(campaign.lastPlayed)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`ml-4 px-2.5 py-1 text-xs font-ui rounded-full ${
                    campaign.status === 'active'
                      ? 'bg-green-900/30 text-green-400 border border-green-800/50'
                      : campaign.status === 'paused'
                      ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50'
                      : 'bg-gray-900/30 text-gray-400 border border-gray-800/50'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          reason={upgradeReason}
        />
      )}
    </div>
  );
}
