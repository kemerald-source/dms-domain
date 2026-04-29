import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Users, Scroll, Image as ImageIcon, Shield, Heart, Eye, ScrollText, X, MapPin, Crown, Flag } from 'lucide-react';
import { useAuth } from '@/api/AuthContext';
import { supabase } from '@/lib/supabase';
import InitialAvatar from '@/components/InitialAvatar';

// ─── Lightweight character parser for player view ─────────────
// Returns name/race/class/level always; AC/HP/PP only if statsVisible.
// Mirrors the relevant slice of SessionView's parseCharStats.
function parsePlayerCharStats(cd, statsVisible) {
  if (!cd) return { name: 'Unknown', charClass: '', level: '', race: '', portrait: null };

  const name = cd.name || cd.characterName || 'Unknown';
  const charClass = cd.class || cd.className || '';
  const level = cd.level || '';
  const race = cd.race || '';
  const portrait = cd.portrait || cd.portraitUrl || cd.imageUrl || null;

  if (!statsVisible) return { name, charClass, level, race, portrait };

  const overrides = cd.combatOverrides || {};
  const scores = cd.abilityScores || cd.abilities || cd.baseScores || {};
  const wisMod = scores.wis ? Math.floor((scores.wis - 10) / 2) : null;

  const ac = overrides.ac ?? cd.ac ?? cd.armorClass ?? null;
  const maxHp = overrides.hp ?? cd.maxHp ?? null;
  const hp = cd.currentHp ?? maxHp;
  const pp = wisMod != null ? 10 + wisMod : null;

  return { name, charClass, level, race, portrait, ac, hp, maxHp, pp };
}

export default function PlayerView() {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [dmName, setDmName] = useState('');
  const [isDmPreview, setIsDmPreview] = useState(false);
  const [dmBannerDismissed, setDmBannerDismissed] = useState(false);
  const [myCharacterData, setMyCharacterData] = useState(null);
  const [partyMembers, setPartyMembers] = useState([]);
  const [sessionRecaps, setSessionRecaps] = useState([]);
  const [sharedImages, setSharedImages] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  // Gallery report modal — populated with the image record being reported
  const [reportingImage, setReportingImage] = useState(null);

  // Auth guard — redirect to login if not signed in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) login();
  }, [authLoading, isAuthenticated, login]);

  useEffect(() => {
    if (!user?.email || !supabase || !campaignId) return;

    async function load() {
      setLoading(true);
      setAccessError(null);

      const userEmailLower = user.email.toLowerCase();

      // 1. Fetch the campaign first — we need it for both the DM ownership
      //    check and the player_stats_visible flag.
      const { data: camp, error: campErr } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campErr || !camp) {
        setAccessError("This campaign doesn't exist or you don't have access to it.");
        setLoading(false);
        return;
      }

      // 2. Fetch all player members for this campaign in one shot
      //    (used for both the access gate AND the party list)
      const { data: allMembers, error: memberErr } = await supabase
        .from('campaign_members')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('role', 'player');

      if (memberErr) {
        console.error('Membership check failed:', memberErr);
        setAccessError("Couldn't verify your access. Try refreshing the page.");
        setLoading(false);
        return;
      }

      // 3. Access gate: DM owner OR a player member
      const isDmOwner = (camp.dm_email || '').toLowerCase() === userEmailLower;
      const myMembership = (allMembers || []).find(
        m => (m.user_email || '').toLowerCase() === userEmailLower
      );

      if (!isDmOwner && !myMembership) {
        setAccessError("You don't have access to this campaign. Ask your DM for an invite link.");
        setLoading(false);
        return;
      }

      setIsDmPreview(isDmOwner);
      setCampaign(camp);

      // Best-effort DM display name from email local part
      // (we don't have a users/profiles table)
      const dmEmail = camp.dm_email || '';
      setDmName(dmEmail ? dmEmail.split('@')[0] : 'Your DM');

      // 4. Build the party member list
      //    Sources: (a) CE party_members linked via campaigns.party_id
      //             (b) campaign_members (invite-joined players)
      //             (c) manual_characters (DM-added stand-ins)
      const charIdsToFetch = new Set();
      const memberRecords = []; // { key, character_id, isMe }
      const myCharId = myMembership?.character_id ?? null;

      if (camp.party_id) {
        const { data: ceMembers } = await supabase
          .from('party_members')
          .select('*')
          .eq('party_id', camp.party_id);

        const dmEmailLower = (camp.dm_email || '').toLowerCase();
        (ceMembers || []).forEach(m => {
          if (m.role === 'dm' || !m.character_id) return;
          const memberEmail = (m.user_email || m.email || '').toLowerCase();
          if (memberEmail && memberEmail === dmEmailLower) return;
          if (charIdsToFetch.has(m.character_id)) return;
          charIdsToFetch.add(m.character_id);
          memberRecords.push({
            key: `ce-${m.id}`,
            character_id: m.character_id,
            isMe: myCharId != null && m.character_id === myCharId,
          });
        });
      }

      // Invite-joined members
      (allMembers || []).forEach(m => {
        if (!m.character_id || charIdsToFetch.has(m.character_id)) return;
        charIdsToFetch.add(m.character_id);
        memberRecords.push({
          key: `inv-${m.id}`,
          character_id: m.character_id,
          isMe: myCharId != null && m.character_id === myCharId,
        });
      });

      // Fetch all character_data in one query
      const charMap = {};
      if (charIdsToFetch.size > 0) {
        const { data: charRows } = await supabase
          .from('characters')
          .select('id, character_data')
          .in('id', [...charIdsToFetch]);
        (charRows || []).forEach(c => {
          const cd = typeof c.character_data === 'string'
            ? JSON.parse(c.character_data)
            : c.character_data;
          charMap[c.id] = cd;
        });
      }

      // Stash my own character_data for the header (player only — DM has no character)
      if (myCharId && charMap[myCharId]) {
        setMyCharacterData(charMap[myCharId]);
      } else {
        setMyCharacterData(null);
      }

      // Manual characters (DM-added)
      const { data: manualData } = await supabase
        .from('manual_characters')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at');

      const cePartyList = memberRecords
        .map(m => ({
          kind: 'character',
          key: m.key,
          isMe: m.isMe,
          character: charMap[m.character_id] || null,
        }))
        .filter(m => m.character);

      const manualPartyList = (manualData || []).map(mc => ({
        kind: 'manual',
        key: `man-${mc.id}`,
        isMe: false,
        character: {
          name: mc.name,
          class: mc.class,
          level: mc.level,
          race: mc.race,
          ac: mc.ac,
          currentHp: mc.hp,
          maxHp: mc.max_hp,
        },
        manualPp: mc.pp,
      }));

      // "Me" first, then everyone else
      const sortedParty = [...cePartyList, ...manualPartyList].sort((a, b) => {
        if (a.isMe && !b.isMe) return -1;
        if (b.isMe && !a.isMe) return 1;
        return 0;
      });
      setPartyMembers(sortedParty);

      // 5. Session recaps — only player_visible
      const { data: notesData } = await supabase
        .from('session_notes')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('player_visible', true)
        .order('session_number', { ascending: true });
      setSessionRecaps(notesData || []);

      // 6. Shared gallery images
      const { data: imagesData } = await supabase
        .from('campaign_images')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('shared_with_players', true)
        .order('created_at', { ascending: false });
      setSharedImages(imagesData || []);

      // 7. NPCs the players have met (player_visible defaults to true server-side)
      const { data: npcData } = await supabase
        .from('npcs')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('player_visible', true)
        .order('name', { ascending: true });
      setNpcs(npcData || []);

      setLoading(false);
    }

    load();
  }, [user?.email, campaignId]);

  // ─── Render: loading ────────────────────────────────────────
  if (authLoading || (loading && !accessError)) {
    return (
      <div className="dm-study-bg min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-eg4h-gold animate-spin relative z-10" />
      </div>
    );
  }

  // ─── Render: access error ──────────────────────────────────
  if (accessError) {
    return (
      <div className="dm-study-bg min-h-screen flex items-center justify-center px-4">
        <div className="dm-panel-raised border rounded-xl p-8 max-w-md text-center relative z-10">
          <ScrollText className="w-12 h-12 text-domain-text-dim/40 mx-auto mb-4" />
          <h2 className="font-cinzel text-lg text-domain-text mb-2">Access Restricted</h2>
          <p className="font-crimson text-domain-text-dim mb-5">{accessError}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-xs font-cinzel font-semibold text-eg4h-black bg-gradient-to-r from-eg4h-gold to-eg4h-gold-light rounded-lg hover:shadow-[0_2px_10px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const myStats = parsePlayerCharStats(myCharacterData, true);
  const statsVisible = !!campaign.player_stats_visible;

  return (
    <div className="dm-study-bg min-h-screen">
      {/* Header */}
      <header className="border-b border-domain-panel-border/60 bg-domain-dark/90 backdrop-blur-sm sticky top-0 z-20 dm-header-glow relative">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/dmd-logo.png" alt="DMD" className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-cinzel text-lg sm:text-xl text-eg4h-gold font-semibold truncate">
                {campaign.name}
              </h1>
              <p className="text-[10px] font-ui text-domain-text-dim uppercase tracking-widest">
                Player View
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-xs font-ui text-domain-text-dim">
              DM: <span className="text-domain-text">{dmName}</span>
            </p>
            {myStats.name !== 'Unknown' && (
              <p className="text-xs font-ui text-domain-text-dim">
                Playing as: <span className="text-eg4h-gold">{myStats.name}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative z-10 space-y-10">
        {/* DM Preview banner */}
        {isDmPreview && !dmBannerDismissed && (
          <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-lg border border-eg4h-gold-dark/40 bg-eg4h-gold/10 -mt-2">
            <div className="flex items-start gap-2 min-w-0">
              <Crown className="w-4 h-4 text-eg4h-gold shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-cinzel text-eg4h-gold">DM Preview</p>
                <p className="text-xs font-crimson text-domain-text-dim">
                  This is exactly what your players see. Use the eye toggles in the session view to control what's shared.
                </p>
              </div>
            </div>
            <button
              onClick={() => setDmBannerDismissed(true)}
              className="text-domain-text-dim hover:text-eg4h-gold transition-colors shrink-0 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mobile-only DM/Playing as */}
        <div className="sm:hidden text-xs font-ui text-domain-text-dim space-y-0.5 -mt-2">
          <p>DM: <span className="text-domain-text">{dmName}</span></p>
          {myStats.name !== 'Unknown' && (
            <p>Playing as: <span className="text-eg4h-gold">{myStats.name}</span></p>
          )}
        </div>

        {/* Campaign description */}
        {campaign.description && (
          <p className="font-crimson text-domain-text-dim italic text-sm leading-relaxed">
            {campaign.description}
          </p>
        )}

        {/* Your Party */}
        <section>
          <h2 className="font-cinzel text-lg text-domain-text mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Your Party
          </h2>
          {partyMembers.length === 0 ? (
            <p className="text-sm font-crimson text-domain-text-dim/60 italic">
              No party members yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {partyMembers.map(m => {
                const stats = parsePlayerCharStats(m.character, statsVisible);
                return (
                  <div
                    key={m.key}
                    className={`dm-panel border rounded-lg p-3 ${m.isMe ? 'border-eg4h-gold-dark/50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {stats.portrait ? (
                        <img
                          src={stats.portrait}
                          alt={stats.name}
                          className="w-12 h-12 rounded-lg object-cover border border-domain-panel-border/40 shrink-0"
                        />
                      ) : (
                        <InitialAvatar name={stats.name} size={48} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-cinzel text-sm text-domain-text truncate">
                            {stats.name}
                          </p>
                          {m.isMe && (
                            <span className="text-[9px] font-ui text-eg4h-gold/80 uppercase tracking-wider shrink-0">
                              you
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-ui text-domain-text-dim truncate">
                          {[stats.race, stats.charClass].filter(Boolean).join(' ')}
                          {stats.level ? ` ${stats.level}` : ''}
                        </p>
                        {statsVisible && (
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[10px] font-ui text-domain-text-dim">
                            {stats.ac != null && (
                              <span className="flex items-center gap-0.5">
                                <Shield className="w-2.5 h-2.5" /> {stats.ac}
                              </span>
                            )}
                            {stats.hp != null && (
                              <span className="flex items-center gap-0.5">
                                <Heart className="w-2.5 h-2.5" />
                                {stats.hp}{stats.maxHp ? `/${stats.maxHp}` : ''}
                              </span>
                            )}
                            {(m.manualPp ?? stats.pp) != null && (
                              <span className="flex items-center gap-0.5">
                                <Eye className="w-2.5 h-2.5" /> {m.manualPp ?? stats.pp}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Session Recaps */}
        <section>
          <h2 className="font-cinzel text-lg text-domain-text mb-3 flex items-center gap-2">
            <Scroll className="w-4 h-4" /> Adventure Log
          </h2>
          {sessionRecaps.length === 0 ? (
            <p className="text-sm font-crimson text-domain-text-dim/60 italic">
              No session recaps shared yet. Your DM will post them after sessions.
            </p>
          ) : (
            <div className="space-y-3">
              {sessionRecaps.map(note => {
                let summary = null;
                if (note.ai_summary) {
                  try {
                    summary = typeof note.ai_summary === 'string'
                      ? JSON.parse(note.ai_summary)
                      : note.ai_summary;
                  } catch { /* ignore */ }
                }
                return (
                  <article key={note.id} className="dm-panel border rounded-lg p-4">
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <h3 className="font-cinzel text-sm text-eg4h-gold">
                        {note.title || `Session ${note.session_number}`}
                      </h3>
                      {note.created_at && (
                        <span className="text-[10px] font-ui text-domain-text-dim/60 shrink-0">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {summary?.narrative_summary ? (
                      <p className="text-sm font-crimson text-domain-text-dim italic whitespace-pre-wrap leading-relaxed">
                        {summary.narrative_summary}
                      </p>
                    ) : note.raw_notes ? (
                      <p className="text-sm font-crimson text-domain-text-dim whitespace-pre-wrap leading-relaxed">
                        {note.raw_notes}
                      </p>
                    ) : (
                      <p className="text-xs font-crimson text-domain-text-dim/40 italic">
                        No content yet.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Shared Images */}
        <section>
          <h2 className="font-cinzel text-lg text-domain-text mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> From Your DM
          </h2>
          {sharedImages.length === 0 ? (
            <p className="text-sm font-crimson text-domain-text-dim/60 italic">
              Your DM hasn't shared any images yet. They'll appear here during sessions.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {sharedImages.map(img => (
                <div key={img.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ url: img.image_url, caption: img.caption })}
                    className="block w-full cursor-pointer text-left"
                  >
                    <img
                      src={img.image_url}
                      alt={img.caption || 'Campaign image'}
                      className="w-full aspect-square object-cover rounded-lg border border-domain-panel-border/40 group-hover:border-domain-amber/40 transition-colors"
                    />
                    {img.caption && (
                      <p className="text-[10px] font-crimson text-domain-text-dim/70 truncate mt-1">
                        {img.caption}
                      </p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportingImage(img)}
                    className="absolute top-1 right-1 w-6 h-6 bg-domain-dark/80 border border-domain-panel-border/50 rounded flex items-center justify-center text-domain-text-dim/70 hover:text-domain-amber opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                    title="Report this image"
                    aria-label="Report this image"
                  >
                    <Flag className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* People You've Met (NPCs) */}
        <section>
          <h2 className="font-cinzel text-lg text-domain-text mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> People You've Met
          </h2>
          {npcs.length === 0 ? (
            <p className="text-sm font-crimson text-domain-text-dim/60 italic">
              You haven't met anyone notable yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {npcs.map(npc => (
                <div key={npc.id} className="dm-panel border rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    {npc.image_url ? (
                      <img
                        src={npc.image_url}
                        alt={npc.name}
                        onClick={() => setPreviewImage({ url: npc.image_url, caption: npc.name })}
                        className="w-11 h-11 rounded-lg object-cover border border-domain-panel-border/40 shrink-0 cursor-pointer"
                      />
                    ) : (
                      <InitialAvatar name={npc.name} size={44} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-cinzel text-sm text-domain-text">{npc.name}</p>
                      {npc.role && (
                        <p className="text-xs font-crimson text-domain-parchment-dark">
                          {npc.role}
                        </p>
                      )}
                      {npc.location && (
                        <p className="text-[11px] font-crimson text-domain-text-dim/70 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 shrink-0" /> {npc.location}
                        </p>
                      )}
                      {npc.personality && (
                        <p className="text-[11px] font-crimson text-domain-text-dim/60 italic mt-1 line-clamp-3">
                          {npc.personality}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-domain-text-dim hover:text-eg4h-gold cursor-pointer"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <img
              src={previewImage.url}
              alt={previewImage.caption || ''}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {previewImage.caption && (
              <p className="text-sm font-crimson text-domain-text-dim text-center mt-3">
                {previewImage.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Gallery report modal */}
      {reportingImage && (
        <PlayerGalleryReportModal
          image={reportingImage}
          campaign={campaign}
          reporterEmail={user?.email || null}
          onClose={() => setReportingImage(null)}
        />
      )}
    </div>
  );
}

// ─── Gallery report modal (players report inappropriate uploads) ──
const PLAYER_GALLERY_REPORT_REASONS = [
  { id: 'inappropriate_artwork', label: 'Inappropriate artwork' },
  { id: 'hate_speech', label: 'Hate speech / hate symbols' },
  { id: 'spam', label: 'Spam / off-topic' },
  { id: 'copyright', label: 'Copyright violation' },
  { id: 'other', label: 'Other' },
];

function PlayerGalleryReportModal({ image, campaign, reporterEmail, onClose }) {
  const [reason, setReason] = useState('inappropriate_artwork');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const contextUrl = typeof window !== 'undefined' ? window.location.href : null;
      const res = await fetch('/.netlify/functions/submit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'campaign_gallery',
          reportedItemId: image?.id ? String(image.id) : '',
          campaignId: campaign?.id ? String(campaign.id) : '',
          reporterEmail,
          reason,
          details: details.trim() || null,
          contextUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error || `Failed (${res.status})`);
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch (err) {
      console.error('[gallery report] submit threw:', err);
      setErrorMsg('Network error — please try again.');
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-gallery-report-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-xl border border-domain-panel-border/40 dm-panel-raised"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-domain-panel-border/30">
          <h2 id="player-gallery-report-title" className="font-cinzel text-base text-domain-text flex items-center gap-2">
            <Flag className="w-4 h-4 text-eg4h-gold" />
            Report this image
          </h2>
          <button
            onClick={onClose}
            className="text-domain-text-dim/70 hover:text-domain-text transition-colors p-1 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="px-6 py-6">
            <p className="text-sm font-crimson text-domain-text/90 leading-relaxed">
              Thanks for the report. Our team will review it shortly.
            </p>
            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-cinzel text-eg4h-gold border border-eg4h-gold-dark/60 hover:bg-eg4h-gold/10 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-cinzel text-domain-text-dim uppercase tracking-wider mb-2">
                Reason
              </label>
              <div className="space-y-1.5">
                {PLAYER_GALLERY_REPORT_REASONS.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="player-gallery-report-reason"
                      value={r.id}
                      checked={reason === r.id}
                      onChange={() => setReason(r.id)}
                      className="accent-eg4h-gold cursor-pointer"
                    />
                    <span className="text-sm font-crimson text-domain-text/90">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="player-gallery-report-details" className="block text-xs font-cinzel text-domain-text-dim uppercase tracking-wider mb-2">
                Details (optional)
              </label>
              <textarea
                id="player-gallery-report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="Anything else our team should know?"
                className="w-full px-3 py-2 rounded-lg bg-[rgba(15,12,8,0.50)] border border-domain-panel-border/30 text-sm font-crimson text-domain-text placeholder-domain-text-dim/60 focus:border-eg4h-gold-dark focus:outline-none resize-none"
              />
              <div className="text-[10px] font-ui text-domain-text-dim/60 text-right mt-1">
                {details.length}/1000
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-crimson text-red-400">{errorMsg}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-cinzel text-domain-text-dim hover:text-domain-text transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-cinzel transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-eg4h-gold border border-eg4h-gold-dark/60 hover:bg-eg4h-gold/10 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
