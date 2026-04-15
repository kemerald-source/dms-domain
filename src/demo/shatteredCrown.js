// Hand-authored demo campaign. Hardcoded, read-only — no DB access.
// Powers /demo so visitors see a populated session view.

export const SHATTERED_CROWN = {
  campaign: {
    name: 'The Shattered Crown',
    tagline: 'Session 6 · The realm bleeds while nobles feast.',
    description:
      'A year after the old king was killed and his crown shattered into seven fragments, the realm of Thorne is a powder keg. Noble houses, cults, and forgotten factions all hunt the shards — and anyone who holds one.',
  },

  party: [
    {
      id: 'p1',
      name: 'Kael Stormforge',
      race: 'Half-Elf',
      class: 'Paladin',
      subclass: 'Oath of the Crown',
      level: 5,
      ac: 19,
      hp: 44,
      maxHp: 44,
      passivePerception: 12,
      bonds: 'Sworn to restore the line of kings. Carries his father\'s broken sword.',
      topScores: 'STR 17, CHA 16, CON 15',
    },
    {
      id: 'p2',
      name: 'Lyra Nightshade',
      race: 'Human',
      class: 'Rogue',
      subclass: 'Arcane Trickster',
      level: 5,
      ac: 15,
      hp: 32,
      maxHp: 32,
      passivePerception: 16,
      bonds: 'Left the Shadow Markets to find her missing parents.',
      topScores: 'DEX 18, INT 15, CHA 13',
    },
    {
      id: 'p3',
      name: 'Brom Ironhide',
      race: 'Dwarf',
      class: 'Cleric',
      subclass: 'Forge Domain',
      level: 5,
      ac: 19,
      hp: 38,
      maxHp: 38,
      passivePerception: 13,
      bonds: 'Believes Moradin sent him to reforge the crown, not restore it.',
      topScores: 'WIS 17, STR 15, CON 14',
    },
    {
      id: 'p4',
      name: 'Sable',
      race: 'Tabaxi',
      class: 'Ranger',
      subclass: 'Gloom Stalker',
      level: 5,
      ac: 16,
      hp: 40,
      maxHp: 40,
      passivePerception: 17,
      bonds: 'Her tribe vanished the night the crown shattered. She wants to know why.',
      topScores: 'DEX 18, WIS 16, CON 14',
    },
  ],

  npcs: [
    {
      id: 'n1',
      name: 'Archduchess Morrigan of House Vale',
      role: 'Noble Claimant',
      status: 'alive',
      personality: 'Poised, patient, endlessly courteous — and has buried three rivals in the last six months.',
      motivation: 'To unite the fragments under her banner and crown herself queen.',
      quirks: 'Always wears a crown fragment pendant. Never raises her voice.',
      voiceNotes: 'Low, measured. Long pauses. Smiles before she threatens you.',
    },
    {
      id: 'n2',
      name: 'Edrin the Blind',
      role: 'Hermit-Sage',
      status: 'alive',
      personality: 'Cryptic, tired, and very, very old. Speaks in half-answers.',
      motivation: 'To see the crown reforged before he dies — but on his terms.',
      quirks: 'Knows where three fragments are. Will tell only those who pay his price.',
      voiceNotes: 'Rasping whisper. Quotes dead languages the party doesn\'t recognize.',
    },
    {
      id: 'n3',
      name: 'Captain Garrick Thorn',
      role: 'Royalist Commander',
      status: 'alive',
      personality: 'Grim, loyal, running out of men. The last honest soldier in the capital.',
      motivation: 'To find the true heir and die defending them.',
      quirks: 'Keeps the old king\'s signet ring on a chain under his breastplate.',
      voiceNotes: 'Clipped, military. Rare dry humor. Never lies — even when it costs him.',
    },
    {
      id: 'n4',
      name: 'The Whisper',
      role: 'Information Broker',
      status: 'alive',
      personality: 'Faceless, gendered only by rumor, operates through a dozen proxies.',
      motivation: 'Unknown. Pays well for crown-fragment intel.',
      quirks: 'Every meeting happens through a different intermediary. Nobody has ever seen them.',
      voiceNotes: '(Never speaks directly. Messages delivered by child couriers and sealed letters.)',
    },
    {
      id: 'n5',
      name: 'Old Nell',
      role: 'Innkeeper, the Gilded Gryphon',
      status: 'alive',
      personality: 'Warm, loud, lets rooms to anyone who can pay and nobody who cheats her.',
      motivation: 'To keep the inn open through the wars like she did through the last three.',
      quirks: 'Remembers every face that\'s ever drunk her ale. Feeds stray cats.',
      voiceNotes: 'Booming laugh. Calls everyone "love." Swears when she thinks the party can\'t hear.',
    },
    {
      id: 'n6',
      name: 'Korvash the Broken',
      role: 'Ex-Paladin, Fragment-Touched',
      status: 'unknown',
      personality: 'Gaunt, hollow-eyed, speaks as if the fragment is listening.',
      motivation: 'To understand what the fragment did to him — before it finishes.',
      quirks: 'Silver veins spread beneath his skin from the night he touched a shard.',
      voiceNotes: 'Soft, slow. Sometimes answers questions the party didn\'t ask out loud.',
    },
  ],

  threads: [
    {
      id: 't1',
      title: 'The Second Fragment',
      type: 'quest',
      urgency: 'high',
      status: 'active',
      description: 'Lyra spotted a crown fragment in the private vault of House Vale during the masquerade. Morrigan knows they saw it.',
    },
    {
      id: 't2',
      title: 'Who Killed the King?',
      type: 'mystery',
      urgency: 'high',
      status: 'active',
      description: 'Three eyewitnesses. Three contradictory stories. Captain Garrick says someone is buying the truth down to silence.',
    },
    {
      id: 't3',
      title: 'The Hollow Prince',
      type: 'hook',
      urgency: 'medium',
      status: 'active',
      description: 'Whispers in the capital of a child claimant with the royal birthmark. Half the city thinks he\'s a con. The other half is looking for him.',
    },
    {
      id: 't4',
      title: 'Sable\'s Vanished Tribe',
      type: 'personal',
      urgency: 'medium',
      status: 'active',
      description: 'Every tabaxi in her tribe disappeared the night the crown shattered. Sable has found one trail — it leads north, into the Bonewood.',
    },
    {
      id: 't5',
      title: "Edrin's Price",
      type: 'loose-end',
      urgency: 'low',
      status: 'active',
      description: 'The blind sage will tell the party where three fragments lie — but he wants something first. He won\'t say what until they agree.',
    },
  ],

  sessions: [
    {
      id: 's3',
      number: 6,
      title: 'The Masquerade',
      date: '2 days ago',
      summary:
        'The party attended House Vale\'s winter masquerade posing as minor envoys. Lyra slipped past two wards and into the vault; she saw the fragment on a velvet stand and barely escaped a silent alarm. Kael nearly came to blows with the captain of the house guard. Brom argued theology with a royalist priest who slipped him a folded note. Morrigan kissed Sable\'s hand at the farewell and told her she had "such interesting people in your tribe."',
    },
    {
      id: 's2',
      number: 5,
      title: 'The Burning Library',
      date: '9 days ago',
      summary:
        'The party went to the Ashwood Library chasing the original crown-making ritual. They arrived to find it already burning. Korvash was inside — crawling, half-delirious — and begged them to take a page he\'d torn from a book. They pulled him out. He\'s been at the Gilded Gryphon ever since, mumbling in his sleep.',
    },
    {
      id: 's1',
      number: 4,
      title: 'Rumors in the Gilded Gryphon',
      date: '16 days ago',
      summary:
        'Old Nell fed them, watered them, and pointed them at three useful rumors in exchange for chasing off a drunk who\'d been stiffing her. First mention of the Hollow Prince. First hint that The Whisper was already hunting the party.',
    },
  ],

  lore: [
    {
      id: 'l1',
      name: 'The Shattering',
      type: 'history',
      description: 'The night the king died, the Crown of Thorne broke into seven fragments and scattered. Nobody has admitted to being in the room. The story changes depending on who tells it.',
    },
    {
      id: 'l2',
      name: 'The City of Thorne',
      type: 'location',
      description: 'The capital. A walled river-city of seven districts. Each district quietly flies a different banner these days.',
    },
    {
      id: 'l3',
      name: 'House Vale',
      type: 'faction',
      description: 'An old, wealthy, patient noble house. They have lost every open political fight in the last century — and won every quiet one.',
    },
    {
      id: 'l4',
      name: 'The Fragmented',
      type: 'culture',
      description: 'People changed by prolonged proximity to a crown fragment. Silver-veined, quiet, sometimes prophetic, always in some kind of pain.',
    },
    {
      id: 'l5',
      name: 'The Silent Church',
      type: 'religion',
      description: 'A forbidden faith that teaches the old gods are dead and the shattering was a mercy. They wear no symbol, use no prayer — and are everywhere.',
    },
  ],

  homebrew: [
    {
      id: 'h1',
      name: 'Crown Fragment',
      type: 'magic item',
      notes: 'Legendary (requires attunement). Grants +1 to saves and a pool of reality-editing charges — but the fragment feeds on the bearer and rewrites them slowly into something regal and wrong.',
    },
    {
      id: 'h2',
      name: 'The Fragmented (template)',
      type: 'creature template',
      notes: 'Applied to humanoids who have carried a fragment too long. Gain resistance to psychic damage, truesight 30ft, and a compulsion the DM chooses.',
    },
  ],

  gallery: [
    { id: 'g1', caption: 'Map of Thorne and the Seven Districts', tag: 'map' },
    { id: 'g2', caption: 'The Shattered Crown — royal emblem', tag: 'handout' },
    { id: 'g3', caption: 'Archduchess Morrigan — portrait', tag: 'portrait' },
    { id: 'g4', caption: 'The Gilded Gryphon — interior', tag: 'location' },
  ],

  dmNotes: [
    {
      id: 'd1',
      characterName: 'Kael Stormforge',
      note: 'Kael\'s father was the king\'s assassin. Kael does not know. The old signet ring Captain Garrick carries was his father\'s bribe.',
    },
    {
      id: 'd2',
      characterName: 'Lyra Nightshade',
      note: 'The Whisper is her mother. Lyra doesn\'t know. The Whisper knows exactly where Lyra\'s father is — and is using the party to pressure him out of hiding.',
    },
  ],

  initiative: {
    round: 3,
    active: 'c2',
    combatants: [
      { id: 'c1', name: 'Kael Stormforge', initiative: 18, hp: 41, maxHp: 44, isParty: true },
      { id: 'c2', name: 'Vale House Guard (Captain)', initiative: 16, hp: 28, maxHp: 45, isParty: false },
      { id: 'c3', name: 'Lyra Nightshade', initiative: 15, hp: 32, maxHp: 32, isParty: true },
      { id: 'c4', name: 'Vale House Guard', initiative: 12, hp: 0, maxHp: 22, isParty: false },
      { id: 'c5', name: 'Brom Ironhide', initiative: 9, hp: 38, maxHp: 38, isParty: true },
      { id: 'c6', name: 'Sable', initiative: 20, hp: 40, maxHp: 40, isParty: true },
    ],
  },
};
