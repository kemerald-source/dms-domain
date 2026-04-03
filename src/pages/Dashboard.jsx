import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Calendar, Users, Scroll, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/api/AuthContext';
import { supabase } from '@/lib/supabase';

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      login(() => navigate('/dashboard'));
    }
  }, [authLoading, isAuthenticated]);

  // Fetch campaigns and parties
  useEffect(() => {
    if (!user?.email || !supabase) return;

    async function fetchData() {
      setLoading(true);

      // Fetch campaigns for this DM
      const { data: campaignData, error: campaignErr } = await supabase
        .from('campaigns')
        .select('*')
        .eq('dm_email', user.email)
        .order('updated_at', { ascending: false });

      if (campaignErr) console.error('Error fetching campaigns:', campaignErr);

      // Fetch parties this user DMs
      const { data: partyData, error: partyErr } = await supabase
        .from('parties')
        .select('*')
        .eq('dm_email', user.email);

      if (partyErr) console.error('Error fetching parties:', partyErr);

      // For each campaign with a party_id, get the party name
      const partyMap = {};
      (partyData || []).forEach(p => { partyMap[p.id] = p; });

      // Get session counts per campaign
      const campaignIds = (campaignData || []).map(c => c.id);
      let sessionCounts = {};
      let lastPlayedDates = {};

      if (campaignIds.length > 0) {
        const { data: sessions } = await supabase
          .from('session_notes')
          .select('campaign_id, created_at')
          .in('campaign_id', campaignIds);

        (sessions || []).forEach(s => {
          sessionCounts[s.campaign_id] = (sessionCounts[s.campaign_id] || 0) + 1;
          const date = new Date(s.created_at);
          if (!lastPlayedDates[s.campaign_id] || date > lastPlayedDates[s.campaign_id]) {
            lastPlayedDates[s.campaign_id] = date;
          }
        });
      }

      const enriched = (campaignData || []).map(c => ({
        ...c,
        partyName: c.party_id && partyMap[c.party_id] ? partyMap[c.party_id].name : null,
        sessionCount: sessionCounts[c.id] || 0,
        lastPlayed: lastPlayedDates[c.id] || null,
      }));

      setCampaigns(enriched);
      setParties(partyData || []);
      setLoading(false);
    }

    fetchData();
  }, [user?.email]);

  const handleCreate = async () => {
    if (!newName.trim() || !supabase || !user?.email) return;
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
      <div className="min-h-screen bg-domain-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-eg4h-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-domain-bg">
      {/* Header */}
      <header className="border-b border-domain-warm/50 bg-domain-dark/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/dmd-logo.png" alt="DMD" className="w-10 h-10" />
            <h1 className="font-cinzel text-xl text-eg4h-gold font-semibold">DM's Domain</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-domain-text-dim text-sm font-ui hidden sm:block">
              {user?.name || user?.email}
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
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-cinzel text-2xl md:text-3xl text-domain-text">Your Campaigns</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 font-cinzel text-sm font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg shadow-[0_2px_10px_rgba(255,215,0,0.3)] hover:shadow-[0_2px_15px_rgba(255,215,0,0.5)] transition-all hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>

        {/* Create Campaign Modal */}
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              className="bg-domain-dark border border-domain-warm rounded-xl p-6 w-full max-w-md"
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
                  className="w-full px-4 py-2.5 bg-domain-bg border border-domain-warm rounded-lg text-domain-text placeholder-domain-text-dim/50 focus:border-eg4h-gold-dark focus:outline-none font-crimson"
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
                  className="w-full px-4 py-2.5 bg-domain-bg border border-domain-warm rounded-lg text-domain-text placeholder-domain-text-dim/50 focus:border-eg4h-gold-dark focus:outline-none font-crimson resize-none"
                />
              </label>

              <label className="block mb-6">
                <span className="text-domain-text-dim text-sm font-ui mb-1 block">Link Party (from Character Evolver)</span>
                <select
                  value={selectedParty}
                  onChange={e => setSelectedParty(e.target.value)}
                  className="w-full px-4 py-2.5 bg-domain-bg border border-domain-warm rounded-lg text-domain-text focus:border-eg4h-gold-dark focus:outline-none font-crimson"
                >
                  <option value="">No party linked</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
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
                className="bg-domain-dark/60 border border-domain-warm/40 rounded-xl p-5 hover:border-eg4h-gold-dark/40 transition-colors cursor-pointer group"
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
                    {campaign.description && (
                      <p className="font-crimson text-domain-text-dim mt-1 text-sm line-clamp-2">
                        {campaign.description}
                      </p>
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
                      {campaign.lastPlayed && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {campaign.lastPlayed.toLocaleDateString()}
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
    </div>
  );
}
