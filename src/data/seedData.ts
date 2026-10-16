import {
  Competition,
  Match,
  MatchEvent,
  Player,
  Season,
  Team,
} from '../types/domain';

export const SEED_SEASONS: Season[] = [
  {
    id: 'season-2026-27',
    name: '2026/27',
    startDate: '2026-09-01',
    endDate: '2027-06-15',
    isCurrent: true,
  },
];

export const SEED_COMPETITIONS: Competition[] = [
  {
    id: 'comp-nlb-liga',
    seasonId: 'season-2026-27',
    name: 'Liga NLB (1. SRL)',
    shortName: 'Liga NLB',
    type: 'league',
    defaultHalfDurationSec: 1800,
    defaultHalves: 2,
    ihfTimeoutRules: {
      maxTotalPerTeam: 3,
      maxPerHalfPerTeam: 2,
      maxInLast5Min: 1,
    },
  },
  {
    id: 'comp-supercup',
    seasonId: 'season-2026-27',
    name: 'Slovenian Supercup & Winter Tournament',
    shortName: 'Supercup',
    type: 'tournament',
    defaultHalfDurationSec: 1800,
    defaultHalves: 2,
    ihfTimeoutRules: {
      maxTotalPerTeam: 3,
      maxPerHalfPerTeam: 2,
      maxInLast5Min: 1,
    },
  },
];

export const SEED_TEAMS: Team[] = [
  {
    id: 'team-celje',
    name: 'RK Celje Pivovarna Laško',
    shortCode: 'CEL',
    isOwnTeam: true,
    primaryColorHex: '#0ea5e9', // High-contrast Broadcast Cyan-Blue
    secondaryColorHex: '#facc15',
    shapeMarker: 'circle',
    homeVenue: 'Dvorana Zlatorog, Celje',
    city: 'Celje',
    defaultDefensiveSystem: '6-0',
    scoutingNotes:
      'High-tempo transition team. Aggressive 6-0 with #18 and #33 in central block; switches to 5-1 with #11 as front disruptor when protecting a lead.',
    defensiveNotes: 'Central 3s step out to 8.5m on LB/RB cross movements.',
    fastBreakTendencyNote: 'First- and second-wave push on every save and missed shot.',
  },
  {
    id: 'team-velenje',
    name: 'RK Gorenje Velenje',
    shortCode: 'VEL',
    isOwnTeam: false,
    primaryColorHex: '#f97316', // High-contrast Okabe-Ito Orange
    secondaryColorHex: '#1e293b',
    shapeMarker: 'diamond',
    homeVenue: 'Rdeča dvorana, Velenje',
    city: 'Velenje',
    defaultDefensiveSystem: '6-0',
    scoutingNotes:
      'Heavy reliance on left-back #7 (Tilen Sokolič) shooting high-right from 9m after pivot screen, plus fast-break conversion through #14 on the left wing. Uses 7v6 empty net when trailing by 2+ goals in the 2nd half.',
    defensiveNotes:
      'Compact 6-0 with mobile half-defenders (#23 and #7). Vulnerable to quick slip passes to PV behind the left #2 defender.',
    fastBreakTendencyNote:
      'Runs 1st-wave through LW #14 (78% conversion). Slows down in 2nd wave if CB #9 is not on court.',
  },
];

export const SEED_PLAYERS: Player[] = [
  // ==========================================
  // OUR TEAM: RK Celje Pivovarna Laško (team-celje)
  // ==========================================
  {
    id: 'cel-p1',
    teamId: 'team-celje',
    firstName: 'Gal',
    lastName: 'Gabršček',
    monogram: 'GG',
    defaultJerseyNumber: 1,
    primaryPosition: 'GK',
    secondaryPositions: [],
    handedness: 'R',
    defensiveRole: 'gk',
    birthDate: '2001-04-18',
    licenceNumber: 'RZS-10481',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Strong vs 9m outside shots and low corners; fast outlet pass for 1st wave.',
  },
  {
    id: 'cel-p16',
    teamId: 'team-celje',
    firstName: 'Jan',
    lastName: 'Češek',
    monogram: 'JČ',
    defaultJerseyNumber: 16,
    primaryPosition: 'GK',
    secondaryPositions: [],
    handedness: 'R',
    defensiveRole: 'gk',
    birthDate: '2003-11-02',
    licenceNumber: 'RZS-11902',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: '7m specialist goalkeeper (38% career save rate on penalties).',
  },
  {
    id: 'cel-p6',
    teamId: 'team-celje',
    firstName: 'Tadej',
    lastName: 'Mazej',
    monogram: 'TM',
    defaultJerseyNumber: 6,
    primaryPosition: 'LW',
    secondaryPositions: [],
    handedness: 'R',
    defensiveRole: 'wing_1',
    birthDate: '1998-07-25',
    licenceNumber: 'RZS-08914',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Primary counter-attack sprinter; high-left wrist shot from narrow angles.',
  },
  {
    id: 'cel-p11',
    teamId: 'team-celje',
    firstName: 'Luka',
    lastName: 'Perić',
    monogram: 'LP',
    defaultJerseyNumber: 11,
    primaryPosition: 'RW',
    secondaryPositions: [],
    handedness: 'L',
    defensiveRole: 'front_5_1',
    birthDate: '2002-03-14',
    licenceNumber: 'RZS-10930',
    nationality: 'SVN',
    availabilityStatus: 'available',
    isSevenMeterTaker: true,
    scoutingNotes: 'First-choice 7m taker. Can defend as 5-1 point.',
  },
  {
    id: 'cel-p9',
    teamId: 'team-celje',
    firstName: 'Mitja',
    lastName: 'Janc',
    monogram: 'MJ',
    defaultJerseyNumber: 9,
    primaryPosition: 'CB',
    secondaryPositions: ['RB'],
    handedness: 'R',
    defensiveRole: 'half_2',
    birthDate: '2003-04-05',
    licenceNumber: 'RZS-11204',
    nationality: 'SVN',
    availabilityStatus: 'available',
    isSevenMeterTaker: true,
    scoutingNotes: 'Playmaker, deadly 1v1 breakthrough and 2nd-wave decision maker.',
  },
  {
    id: 'cel-p24',
    teamId: 'team-celje',
    firstName: 'Uroš',
    lastName: 'Milićević',
    monogram: 'UM',
    defaultJerseyNumber: 24,
    primaryPosition: 'LB',
    secondaryPositions: ['CB'],
    handedness: 'R',
    defensiveRole: 'centre_3',
    birthDate: '1999-09-19',
    licenceNumber: 'RZS-09412',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Heavy 9m jump shooter; anchors central 6-0 block.',
  },
  {
    id: 'cel-p19',
    teamId: 'team-celje',
    firstName: 'Žiga',
    lastName: 'Mlakar',
    monogram: 'ŽM',
    defaultJerseyNumber: 19,
    primaryPosition: 'RB',
    secondaryPositions: [],
    handedness: 'L',
    defensiveRole: 'half_2',
    birthDate: '1995-05-16',
    licenceNumber: 'RZS-07105',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Left-handed right back; strong cross-court diagonal shots to BL/ML.',
  },
  {
    id: 'cel-p18',
    teamId: 'team-celje',
    firstName: 'Stefan',
    lastName: 'Žabić',
    monogram: 'SŽ',
    defaultJerseyNumber: 18,
    primaryPosition: 'PV',
    secondaryPositions: [],
    handedness: 'R',
    defensiveRole: 'centre_3',
    birthDate: '1999-02-17',
    licenceNumber: 'RZS-09188',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Two-way pivot and defensive captain in the central 6-0.',
  },
  {
    id: 'cel-p33',
    teamId: 'team-celje',
    firstName: 'Matic',
    lastName: 'Sušnik',
    monogram: 'MS',
    defaultJerseyNumber: 33,
    primaryPosition: 'PV',
    secondaryPositions: ['LB'],
    handedness: 'R',
    defensiveRole: 'specialist',
    birthDate: '1997-08-11',
    licenceNumber: 'RZS-08201',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Defensive #3 specialist; swaps with #9 MJ on attack/defence transitions.',
  },
  {
    id: 'cel-p15',
    teamId: 'team-celje',
    firstName: 'Nik',
    lastName: 'Ćirović',
    monogram: 'NĆ',
    defaultJerseyNumber: 15,
    primaryPosition: 'LB',
    secondaryPositions: ['LW'],
    handedness: 'R',
    defensiveRole: 'half_2',
    birthDate: '2002-06-21',
    licenceNumber: 'RZS-11044',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Explosive rotation backcourt option.',
  },
  {
    id: 'cel-p44',
    teamId: 'team-celje',
    firstName: 'Vukašin',
    lastName: 'Antonijević',
    monogram: 'VA',
    defaultJerseyNumber: 44,
    primaryPosition: 'CB',
    secondaryPositions: ['LB'],
    handedness: 'R',
    defensiveRole: 'half_2',
    birthDate: '2004-03-10',
    licenceNumber: 'RZS-12400',
    nationality: 'SRB',
    availabilityStatus: 'doubtful',
    availabilityNote: 'Mild ankle sprain — cleared for 15 min load',
    scoutingNotes: 'Creative pass-first centre back.',
  },

  // ==========================================
  // OPPONENT TEAM: RK Gorenje Velenje (team-velenje)
  // ==========================================
  {
    id: 'vel-p12',
    teamId: 'team-velenje',
    firstName: 'Matevž',
    lastName: 'Skok',
    monogram: 'MS',
    defaultJerseyNumber: 12,
    primaryPosition: 'GK',
    secondaryPositions: [],
    handedness: 'R',
    defensiveRole: 'gk',
    birthDate: '1986-09-02',
    licenceNumber: 'RZS-03112',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes:
      'Veteran goalkeeper. Reads high shots well (64% save high), but drops early on 6m breakthroughs — shoot low-left (BL) and low-centre (BC).',
  },
  {
    id: 'vel-p32',
    teamId: 'team-velenje',
    firstName: 'Emir',
    lastName: 'Taletović',
    monogram: 'ET',
    defaultJerseyNumber: 32,
    primaryPosition: 'GK',
    secondaryPositions: [],
    handedness: 'R',
    defensiveRole: 'gk',
    birthDate: '2000-05-14',
    licenceNumber: 'RZS-10105',
    nationality: 'BIH',
    availabilityStatus: 'available',
    scoutingNotes: 'Aggressive stepping out to 4m on wing shots.',
  },
  {
    id: 'vel-p7',
    teamId: 'team-velenje',
    firstName: 'Tilen',
    lastName: 'Sokolič',
    monogram: 'TS',
    defaultJerseyNumber: 7,
    primaryPosition: 'LB',
    secondaryPositions: ['CB'],
    handedness: 'R',
    defensiveRole: 'half_2',
    birthDate: '1996-09-05',
    licenceNumber: 'RZS-07840',
    nationality: 'SVN',
    availabilityStatus: 'available',
    isSevenMeterTaker: true,
    scoutingNotes:
      'Primary threat from LB 9m and 7m line. Places 75% of 9m jump shots to High-Right (TR). On 7m penalties, favours Low-Left (BL) on first two attempts.',
  },
  {
    id: 'vel-p14',
    teamId: 'team-velenje',
    firstName: 'Matic',
    lastName: 'Verdinek',
    monogram: 'MV',
    defaultJerseyNumber: 14,
    primaryPosition: 'LW',
    secondaryPositions: [],
    handedness: 'R',
    defensiveRole: 'wing_1',
    birthDate: '1994-04-13',
    licenceNumber: 'RZS-06511',
    nationality: 'SVN',
    availabilityStatus: 'available',
    isSevenMeterTaker: true,
    scoutingNotes:
      'Elite fast-break finisher. In positional LW attacks, shoots far post (TR/MR).',
  },
  {
    id: 'vel-p9',
    teamId: 'team-velenje',
    firstName: 'Domen',
    lastName: 'Tajnik',
    monogram: 'DT',
    defaultJerseyNumber: 9,
    primaryPosition: 'CB',
    secondaryPositions: [],
    handedness: 'R',
    defensiveRole: 'half_2',
    birthDate: '2000-10-31',
    licenceNumber: 'RZS-09892',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Tempo controller; looks for bounce-pass assists to PV #20 in 7v6.',
  },
  {
    id: 'vel-p23',
    teamId: 'team-velenje',
    firstName: 'Ibrahim',
    lastName: 'Haseljić',
    monogram: 'IH',
    defaultJerseyNumber: 23,
    primaryPosition: 'RB',
    secondaryPositions: ['RW'],
    handedness: 'L',
    defensiveRole: 'half_2',
    birthDate: '1998-01-14',
    licenceNumber: 'RZS-08771',
    nationality: 'BIH',
    availabilityStatus: 'available',
    scoutingNotes: 'Left-handed shooter; attacks between #1 and #2 defenders on the right.',
  },
  {
    id: 'vel-p17',
    teamId: 'team-velenje',
    firstName: 'Urban',
    lastName: 'Pipp',
    monogram: 'UP',
    defaultJerseyNumber: 17,
    primaryPosition: 'RW',
    secondaryPositions: [],
    handedness: 'L',
    defensiveRole: 'wing_1',
    birthDate: '1998-03-04',
    licenceNumber: 'RZS-08802',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Strong near-post high (TR) shots from right wing.',
  },
  {
    id: 'vel-p20',
    teamId: 'team-velenje',
    firstName: 'Jernej',
    lastName: 'Drobež',
    monogram: 'JD',
    defaultJerseyNumber: 20,
    primaryPosition: 'PV',
    secondaryPositions: [],
    handedness: 'R',
    defensiveRole: 'centre_3',
    birthDate: '2000-01-06',
    licenceNumber: 'RZS-09750',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Physical pivot; seals the inside shoulder of our central defenders.',
  },
  {
    id: 'vel-p55',
    teamId: 'team-velenje',
    firstName: 'Branko',
    lastName: 'Predović',
    monogram: 'BP',
    defaultJerseyNumber: 55,
    primaryPosition: 'PV',
    secondaryPositions: ['LB'],
    handedness: 'R',
    defensiveRole: 'centre_3',
    birthDate: '1997-07-19',
    licenceNumber: 'RZS-08319',
    nationality: 'SVN',
    availabilityStatus: 'available',
    scoutingNotes: 'Second pivot in 7v6 formations; prone to 2-min suspensions.',
  },
];

function buildDefaultLineups() {
  return [
    // Celje starters (7)
    { playerId: 'cel-p1', teamId: 'team-celje', jerseyNumber: 1, isStarter: true, startingSlot: 'GK' as const, isActiveInSquad: true },
    { playerId: 'cel-p6', teamId: 'team-celje', jerseyNumber: 6, isStarter: true, startingSlot: 'LW' as const, isActiveInSquad: true },
    { playerId: 'cel-p24', teamId: 'team-celje', jerseyNumber: 24, isStarter: true, startingSlot: 'LB' as const, isActiveInSquad: true },
    { playerId: 'cel-p9', teamId: 'team-celje', jerseyNumber: 9, isStarter: true, startingSlot: 'CB' as const, isCaptain: true, isActiveInSquad: true },
    { playerId: 'cel-p19', teamId: 'team-celje', jerseyNumber: 19, isStarter: true, startingSlot: 'RB' as const, isActiveInSquad: true },
    { playerId: 'cel-p11', teamId: 'team-celje', jerseyNumber: 11, isStarter: true, startingSlot: 'RW' as const, isActiveInSquad: true },
    { playerId: 'cel-p18', teamId: 'team-celje', jerseyNumber: 18, isStarter: true, startingSlot: 'PV' as const, isActiveInSquad: true },
    // Celje bench
    { playerId: 'cel-p16', teamId: 'team-celje', jerseyNumber: 16, isStarter: false, isActiveInSquad: true },
    { playerId: 'cel-p33', teamId: 'team-celje', jerseyNumber: 33, isStarter: false, isActiveInSquad: true },
    { playerId: 'cel-p15', teamId: 'team-celje', jerseyNumber: 15, isStarter: false, isActiveInSquad: true },
    { playerId: 'cel-p44', teamId: 'team-celje', jerseyNumber: 44, isStarter: false, isActiveInSquad: true },

    // Velenje starters (7)
    { playerId: 'vel-p12', teamId: 'team-velenje', jerseyNumber: 12, isStarter: true, startingSlot: 'GK' as const, isActiveInSquad: true },
    { playerId: 'vel-p14', teamId: 'team-velenje', jerseyNumber: 14, isStarter: true, startingSlot: 'LW' as const, isActiveInSquad: true },
    { playerId: 'vel-p7', teamId: 'team-velenje', jerseyNumber: 7, isStarter: true, startingSlot: 'LB' as const, isCaptain: true, isActiveInSquad: true },
    { playerId: 'vel-p9', teamId: 'team-velenje', jerseyNumber: 9, isStarter: true, startingSlot: 'CB' as const, isActiveInSquad: true },
    { playerId: 'vel-p23', teamId: 'team-velenje', jerseyNumber: 23, isStarter: true, startingSlot: 'RB' as const, isActiveInSquad: true },
    { playerId: 'vel-p17', teamId: 'team-velenje', jerseyNumber: 17, isStarter: true, startingSlot: 'RW' as const, isActiveInSquad: true },
    { playerId: 'vel-p20', teamId: 'team-velenje', jerseyNumber: 20, isStarter: true, startingSlot: 'PV' as const, isActiveInSquad: true },
    // Velenje bench
    { playerId: 'vel-p32', teamId: 'team-velenje', jerseyNumber: 32, isStarter: false, isActiveInSquad: true },
    { playerId: 'vel-p55', teamId: 'team-velenje', jerseyNumber: 55, isStarter: false, isActiveInSquad: true },
  ];
}

export const SEED_MATCHES: Match[] = [
  // =========================================================
  // MATCH 2 (CURRENT / LIVE OR PRE-MATCH READY): Round 8 Derby
  // =========================================================
  {
    id: 'match-derby-r8',
    seasonId: 'season-2026-27',
    competitionId: 'comp-nlb-liga',
    roundLabel: 'Round 8 · Savinjsko-Šaleški Derby',
    homeTeamId: 'team-celje',
    awayTeamId: 'team-velenje',
    ourTeamId: 'team-celje',
    opponentTeamId: 'team-velenje',
    venue: 'Dvorana Zlatorog, Celje',
    scheduledAt: '2026-10-16T19:00:00+02:00',
    status: 'live_h1',
    format: {
      label: '2×30 min',
      halves: 2,
      halfDurationSec: 1800,
      maxTimeoutsPerTeam: 3,
    },
    officials: {
      referee1: 'Bojan Lah (SVN)',
      referee2: 'David Sok (SVN)',
      delegate: 'Janko Požežnik',
    },
    lineups: buildDefaultLineups(),
    lineChangePresets: [
      {
        id: 'preset-att-def',
        teamId: 'team-celje',
        name: 'Attack → Defence (#9 OUT / #33 IN)',
        description: 'Swap playmaker #9 Janc for defensive specialist #33 Sušnik',
        swaps: [{ outPlayerId: 'cel-p9', inPlayerId: 'cel-p33', slot: 'CB' }],
      },
      {
        id: 'preset-def-att',
        teamId: 'team-celje',
        name: 'Defence → Attack (#33 OUT / #9 IN)',
        description: 'Restore #9 Janc at Centre Back',
        swaps: [{ outPlayerId: 'cel-p33', inPlayerId: 'cel-p9', slot: 'CB' }],
      },
      {
        id: 'preset-7m-gk',
        teamId: 'team-celje',
        name: '7m Penalty GK (#1 OUT / #16 IN)',
        description: 'Bring in 7m specialist #16 Češek',
        swaps: [{ outPlayerId: 'cel-p1', inPlayerId: 'cel-p16', slot: 'GK' }],
      },
    ],
    preMatchPlan: {
      matchId: 'match-derby-r8',
      lineupConfirmed: true,
      confirmedAt: '2026-10-16T17:45:00+02:00',
      expectedOpponentSystem: '6-0',
      keyMatchupNotes:
        'Step up aggressively on Velenje #7 (Sokolič) at 9.5m — force him left into our central block (#24 + #18). On attack, isolate Velenje GK #12 Skok with low placement (BL/BC) on 6m breakthroughs.',
      sections: [
        {
          id: 'attack',
          title: 'Positional Attack ("Yugoslav Cross" + PV Slip)',
          bulletPoints: [
            'Trigger CB #9 → LB #24 cross to pull Velenje right-half #23 out to 9m.',
            'Target low corners (BL / BR) against GK #12 Skok — he holds high hands on 9m shots.',
            'Against 5-1, use RW #11 back-cut behind the wing defender.',
          ],
          annotations: [
            {
              id: 'ann-a1',
              type: 'player_marker',
              label: 'CB #9',
              points: [{ x: 10.0, y: 11.5 }],
              color: '#0ea5e9',
            },
            {
              id: 'ann-a2',
              type: 'player_marker',
              label: 'LB #24',
              points: [{ x: 4.8, y: 10.6 }],
              color: '#0ea5e9',
            },
            {
              id: 'ann-a3',
              type: 'player_marker',
              label: 'PV #18',
              points: [{ x: 12.2, y: 6.2 }],
              color: '#0ea5e9',
            },
            {
              id: 'ann-a4',
              type: 'run',
              label: 'Cross',
              points: [
                { x: 10.0, y: 11.5 },
                { x: 6.4, y: 9.2 },
              ],
              color: '#38bdf8',
            },
            {
              id: 'ann-a5',
              type: 'pass',
              label: 'Slip Pass',
              points: [
                { x: 6.4, y: 9.2 },
                { x: 12.2, y: 6.2 },
              ],
              color: '#10b981',
            },
          ],
        },
        {
          id: 'defence',
          title: '6-0 Block vs #7 Sokolič & 7v6 Counter',
          bulletPoints: [
            'Right #3 defender (#18 Žabić) steps to 8.5m when #7 Sokolič receives on the move.',
            'Take away High-Right (TR) with high left-arm block; GK #1 covers Low-Left (BL).',
            'If Velenje enters 7v6 Empty Goal, look for immediate GK #1 or #9 long-range empty-net shot.',
          ],
          annotations: [
            {
              id: 'ann-d1',
              type: 'player_marker',
              label: 'OPP #7',
              points: [{ x: 5.2, y: 10.8 }],
              color: '#f97316',
            },
            {
              id: 'ann-d2',
              type: 'player_marker',
              label: 'DEF #18',
              points: [{ x: 7.4, y: 6.6 }],
              color: '#0ea5e9',
            },
            {
              id: 'ann-d3',
              type: 'run',
              label: 'Step 8.5m',
              points: [
                { x: 7.4, y: 6.6 },
                { x: 5.8, y: 8.6 },
              ],
              color: '#facc15',
            },
          ],
        },
        {
          id: 'goalkeeper',
          title: 'Goalkeeper Matchup Protocol',
          bulletPoints: [
            'Opp #7 (Sokolič, LB): 75% High-Right (TR) from 9m; Low-Left (BL) on 7m penalties.',
            'Opp #14 (Verdinek, LW): Favours far-post High-Right (TR) and Mid-Right (MR) on fast breaks.',
            'Opp #23 (Haseljić, RB L-hand): Shoots cross-body Low-Left (BL) through the #2/#3 gap.',
          ],
          annotations: [],
        },
        {
          id: 'set_pieces',
          title: 'Last-Minute & Power-Play Calls',
          bulletPoints: [
            '6v5 Power Play: "Espagne 2" — double overload on left wing for #6 Mazej.',
            'Final 15s Timeout Call: "Zlatorog 7v6" — #18 & #33 dual screens at 6m.',
          ],
          annotations: [],
        },
      ],
    },
    videoSync: {
      videoTitle: 'NLB_R08_Celje_vs_Velenje_TacticalFeed.mp4',
      videoUrl: 'https://video.rk-celje.si/matches/2026-27/r08-velenje',
      h1KickoffOffsetSec: 142,
      h2KickoffOffsetSec: 2680,
    },
  },

  // =========================================================
  // MATCH 1 (FINISHED): Supercup Clash (Full 60-Min Completed Match)
  // =========================================================
  {
    id: 'match-supercup-final',
    seasonId: 'season-2026-27',
    competitionId: 'comp-supercup',
    roundLabel: 'Supercup Final · Neutral Venue',
    homeTeamId: 'team-velenje',
    awayTeamId: 'team-celje',
    ourTeamId: 'team-celje',
    opponentTeamId: 'team-velenje',
    venue: 'Rdeča dvorana, Velenje',
    scheduledAt: '2026-09-06T20:00:00+02:00',
    status: 'finished',
    format: {
      label: '2×30 min',
      halves: 2,
      halfDurationSec: 1800,
      maxTimeoutsPerTeam: 3,
    },
    officials: {
      referee1: 'Ozren Backović (SVN)',
      referee2: 'Mirko Palačković (SVN)',
    },
    lineups: buildDefaultLineups(),
    lineChangePresets: [],
    preMatchPlan: {
      matchId: 'match-supercup-final',
      lineupConfirmed: true,
      confirmedAt: '2026-09-06T18:30:00+02:00',
      expectedOpponentSystem: '6-0',
      keyMatchupNotes: 'Season opener Supercup final. Control transition pace.',
      sections: [],
    },
    videoSync: {
      videoTitle: 'Supercup_2026_Velenje_vs_Celje_Full.mp4',
      videoUrl: 'https://video.rk-celje.si/matches/2026-27/supercup-final',
      h1KickoffOffsetSec: 95,
      h2KickoffOffsetSec: 2510,
    },
  },
];

/**
 * Generates deterministic, realistic handball match events for both matches so
 * every table, shot map, 3x3 goal grid, GK matchup, momentum chart, and live insight is rich.
 */
function buildMatchEventsForDerby(): MatchEvent[] {
  const mId = 'match-derby-r8';
  const baseMs = Date.parse('2026-10-16T19:00:00+02:00');
  const events: MatchEvent[] = [];
  let seq = 1;

  const push = (partial: Omit<MatchEvent, 'id' | 'matchId' | 'createdAtMs'>) => {
    events.push({
      ...partial,
      id: `${mId}-ev-${seq++}`,
      matchId: mId,
      createdAtMs: baseMs + partial.matchClockSec * 1000,
    });
  };

  // --- FIRST HALF & SECOND HALF UP TO 48:20 (clock = 2900s) ---
  // Score at 48:20 will be Celje 26 : 24 Velenje, with realistic patterns:
  // Pattern 1: Velenje #7 (Sokolič, LB) is 5/6 from 9m, with 4 of 5 goals High-Right (TR)!
  // Pattern 2: Our GK #1 (Gabršček) is 1/6 vs Wing shots (LW #14 & RW #17) — triggers GK insight!
  // Pattern 3: Recent technical faults cluster in last 8 minutes — triggers turnover insight!
  // Pattern 4: Active 2-minute suspension on Velenje #55 at 47:15 (remaining 55s at 48:20).

  const scriptedShots: Array<{
    sec: number;
    half: 1 | 2;
    teamId: string;
    playerId: string;
    oppGkId: string;
    assistId?: string;
    zone: MatchEvent['shotOrigin'] extends undefined ? never : NonNullable<MatchEvent['shotOrigin']>['zone'];
    x: number;
    y: number;
    cell: NonNullable<MatchEvent['goalTarget']>['cell'];
    nx: number;
    ny: number;
    outcome: 'goal' | 'saved' | 'missed_wide' | 'missed_high' | 'post' | 'blocked';
    phase: MatchEvent['attackPhase'];
    sit: MatchEvent['situation'];
  }> = [
    // H1 (00:00 - 30:00)
    { sec: 42, half: 1, teamId: 'team-celje', playerId: 'cel-p24', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: 'LB_9M', x: 5.1, y: 10.2, cell: 'BL', nx: 0.14, ny: 0.84, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 88, half: 1, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p1', assistId: 'vel-p9', zone: 'LB_9M', x: 4.8, y: 10.5, cell: 'TR', nx: 0.85, ny: 0.16, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 135, half: 1, teamId: 'team-celje', playerId: 'cel-p9', oppGkId: 'vel-p12', zone: 'BREAKTHROUGH', x: 9.6, y: 6.3, cell: 'BC', nx: 0.52, ny: 0.88, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 179, half: 1, teamId: 'team-velenje', playerId: 'vel-p14', oppGkId: 'cel-p1', zone: 'LW', x: 2.2, y: 3.4, cell: 'TR', nx: 0.88, ny: 0.18, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 225, half: 1, teamId: 'team-celje', playerId: 'cel-p19', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: 'RB_9M', x: 15.2, y: 10.1, cell: 'TL', nx: 0.18, ny: 0.19, outcome: 'saved', phase: 'positional', sit: 'equal' },
    { sec: 241, half: 1, teamId: 'team-velenje', playerId: 'vel-p14', oppGkId: 'cel-p1', assistId: 'vel-p12', zone: 'FAST_BREAK', x: 9.8, y: 6.2, cell: 'MR', nx: 0.84, ny: 0.48, outcome: 'goal', phase: 'fast_break', sit: 'equal' },
    { sec: 295, half: 1, teamId: 'team-celje', playerId: 'cel-p18', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: '6M_CENTRE', x: 10.2, y: 5.9, cell: 'BL', nx: 0.16, ny: 0.85, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 350, half: 1, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p1', assistId: 'vel-p9', zone: 'LB_9M', x: 5.4, y: 10.8, cell: 'TR', nx: 0.82, ny: 0.14, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 410, half: 1, teamId: 'team-celje', playerId: 'cel-p6', oppGkId: 'vel-p12', assistId: 'cel-p24', zone: 'LW', x: 2.1, y: 3.1, cell: 'BR', nx: 0.84, ny: 0.82, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 465, half: 1, teamId: 'team-velenje', playerId: 'vel-p23', oppGkId: 'cel-p1', zone: 'RB_9M', x: 14.8, y: 10.3, cell: 'BL', nx: 0.15, ny: 0.81, outcome: 'saved', phase: 'positional', sit: 'equal' },
    { sec: 482, half: 1, teamId: 'team-celje', playerId: 'cel-p6', oppGkId: 'vel-p12', assistId: 'cel-p1', zone: 'FAST_BREAK', x: 9.4, y: 6.1, cell: 'BL', nx: 0.18, ny: 0.86, outcome: 'goal', phase: 'fast_break', sit: 'equal' },
    { sec: 540, half: 1, teamId: 'team-velenje', playerId: 'vel-p20', oppGkId: 'cel-p1', assistId: 'vel-p9', zone: '6M_CENTRE', x: 9.9, y: 6.1, cell: 'TL', nx: 0.19, ny: 0.21, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 615, half: 1, teamId: 'team-celje', playerId: 'cel-p11', oppGkId: 'vel-p12', zone: '7M', x: 10.0, y: 7.0, cell: 'TL', nx: 0.14, ny: 0.15, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 670, half: 1, teamId: 'team-velenje', playerId: 'vel-p17', oppGkId: 'cel-p1', assistId: 'vel-p23', zone: 'RW', x: 17.8, y: 3.2, cell: 'TR', nx: 0.86, ny: 0.22, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 730, half: 1, teamId: 'team-celje', playerId: 'cel-p24', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: 'LB_9M', x: 4.9, y: 10.4, cell: 'BR', nx: 0.83, ny: 0.84, outcome: 'goal', phase: 'positional', sit: 'power_play' },
    { sec: 790, half: 1, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p1', zone: 'LB_9M', x: 5.5, y: 11.0, cell: 'TR', nx: 0.87, ny: 0.17, outcome: 'goal', phase: 'positional', sit: 'short_handed' },
    { sec: 855, half: 1, teamId: 'team-celje', playerId: 'cel-p19', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: 'RB_9M', x: 15.1, y: 9.8, cell: 'BL', nx: 0.17, ny: 0.83, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 920, half: 1, teamId: 'team-velenje', playerId: 'vel-p9', oppGkId: 'cel-p1', zone: 'CB_9M', x: 10.1, y: 10.6, cell: 'MC', nx: 0.51, ny: 0.49, outcome: 'saved', phase: 'positional', sit: 'equal' },
    { sec: 975, half: 1, teamId: 'team-celje', playerId: 'cel-p11', oppGkId: 'vel-p12', assistId: 'cel-p19', zone: 'RW', x: 17.7, y: 3.5, cell: 'BL', nx: 0.16, ny: 0.79, outcome: 'goal', phase: 'second_wave', sit: 'equal' },
    { sec: 1040, half: 1, teamId: 'team-velenje', playerId: 'vel-p14', oppGkId: 'cel-p1', zone: 'LW', x: 2.3, y: 3.6, cell: 'MR', nx: 0.82, ny: 0.52, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 1110, half: 1, teamId: 'team-celje', playerId: 'cel-p9', oppGkId: 'vel-p12', zone: 'CB_9M', x: 9.8, y: 10.1, cell: 'POST_L', nx: 0.0, ny: 0.45, outcome: 'post', phase: 'positional', sit: 'equal' },
    { sec: 1165, half: 1, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p16', zone: '7M', x: 10.0, y: 7.0, cell: 'BL', nx: 0.15, ny: 0.86, outcome: 'saved', phase: 'positional', sit: 'equal' },
    { sec: 1220, half: 1, teamId: 'team-celje', playerId: 'cel-p18', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: '6M_CENTRE', x: 10.4, y: 6.1, cell: 'BC', nx: 0.49, ny: 0.87, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 1290, half: 1, teamId: 'team-velenje', playerId: 'vel-p23', oppGkId: 'cel-p1', assistId: 'vel-p9', zone: '6M_RIGHT', x: 13.8, y: 6.4, cell: 'BL', nx: 0.18, ny: 0.82, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 1350, half: 1, teamId: 'team-celje', playerId: 'cel-p24', oppGkId: 'vel-p12', zone: 'LB_9M', x: 5.3, y: 10.7, cell: 'TR', nx: 0.81, ny: 0.21, outcome: 'saved', phase: 'positional', sit: 'equal' },
    { sec: 1410, half: 1, teamId: 'team-velenje', playerId: 'vel-p17', oppGkId: 'cel-p1', zone: 'RW', x: 18.0, y: 3.1, cell: 'TL', nx: 0.17, ny: 0.19, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 1475, half: 1, teamId: 'team-celje', playerId: 'cel-p9', oppGkId: 'vel-p12', zone: 'BREAKTHROUGH', x: 9.2, y: 6.2, cell: 'BL', nx: 0.14, ny: 0.84, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 1540, half: 1, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p1', assistId: 'vel-p9', zone: 'LB_9M', x: 5.0, y: 10.3, cell: 'TR', nx: 0.86, ny: 0.15, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 1605, half: 1, teamId: 'team-celje', playerId: 'cel-p11', oppGkId: 'vel-p12', assistId: 'cel-p19', zone: 'RW', x: 17.6, y: 3.4, cell: 'BL', nx: 0.19, ny: 0.83, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 1665, half: 1, teamId: 'team-velenje', playerId: 'vel-p20', oppGkId: 'cel-p1', assistId: 'vel-p9', zone: '6M_CENTRE', x: 9.7, y: 6.0, cell: 'MR', nx: 0.81, ny: 0.51, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 1725, half: 1, teamId: 'team-celje', playerId: 'cel-p6', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: 'FAST_BREAK', x: 9.5, y: 6.0, cell: 'BR', nx: 0.84, ny: 0.85, outcome: 'goal', phase: 'fast_break', sit: 'equal' },
    { sec: 1785, half: 1, teamId: 'team-velenje', playerId: 'vel-p9', oppGkId: 'cel-p1', zone: 'CB_9M', x: 10.0, y: 10.9, cell: 'TC', nx: 0.5, ny: 0.2, outcome: 'blocked', phase: 'positional', sit: 'equal' },

    // H2 (30:00 - 48:20 => 1800s - 2900s)
    { sec: 1845, half: 2, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p1', assistId: 'vel-p9', zone: 'LB_9M', x: 5.2, y: 10.4, cell: 'BR', nx: 0.83, ny: 0.81, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 1900, half: 2, teamId: 'team-celje', playerId: 'cel-p24', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: 'LB_9M', x: 5.0, y: 10.1, cell: 'BL', nx: 0.15, ny: 0.85, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 1955, half: 2, teamId: 'team-velenje', playerId: 'vel-p14', oppGkId: 'cel-p1', zone: 'LW', x: 2.0, y: 3.3, cell: 'TR', nx: 0.85, ny: 0.19, outcome: 'saved', phase: 'positional', sit: 'equal' },
    { sec: 1972, half: 2, teamId: 'team-celje', playerId: 'cel-p11', oppGkId: 'vel-p12', assistId: 'cel-p1', zone: 'FAST_BREAK', x: 10.3, y: 6.1, cell: 'BL', nx: 0.18, ny: 0.82, outcome: 'goal', phase: 'fast_break', sit: 'equal' },
    { sec: 2030, half: 2, teamId: 'team-velenje', playerId: 'vel-p23', oppGkId: 'cel-p1', assistId: 'vel-p9', zone: 'RB_9M', x: 15.0, y: 10.2, cell: 'BL', nx: 0.16, ny: 0.84, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 2090, half: 2, teamId: 'team-celje', playerId: 'cel-p19', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: '6M_RIGHT', x: 13.4, y: 6.3, cell: 'BL', nx: 0.14, ny: 0.86, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 2150, half: 2, teamId: 'team-velenje', playerId: 'vel-p17', oppGkId: 'cel-p1', assistId: 'vel-p23', zone: 'RW', x: 17.9, y: 3.4, cell: 'TR', nx: 0.87, ny: 0.18, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 2210, half: 2, teamId: 'team-celje', playerId: 'cel-p18', oppGkId: 'vel-p12', assistId: 'cel-p24', zone: '6M_CENTRE', x: 10.1, y: 5.8, cell: 'BC', nx: 0.51, ny: 0.89, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 2275, half: 2, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p1', zone: 'LB_9M', x: 5.3, y: 10.6, cell: 'ML', nx: 0.18, ny: 0.48, outcome: 'saved', phase: 'positional', sit: 'equal' },
    { sec: 2330, half: 2, teamId: 'team-celje', playerId: 'cel-p11', oppGkId: 'vel-p12', zone: '7M', x: 10.0, y: 7.0, cell: 'BR', nx: 0.85, ny: 0.86, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 2400, half: 2, teamId: 'team-velenje', playerId: 'vel-p20', oppGkId: 'cel-p1', assistId: 'vel-p9', zone: '6M_CENTRE', x: 10.3, y: 6.0, cell: 'TL', nx: 0.19, ny: 0.18, outcome: 'goal', phase: 'empty_goal_7v6', sit: 'empty_goal' },
    { sec: 2450, half: 2, teamId: 'team-celje', playerId: 'cel-p1', oppGkId: 'vel-p12', zone: 'EMPTY_NET_OWN_HALF', x: 10.0, y: 15.8, cell: 'BC', nx: 0.5, ny: 0.82, outcome: 'goal', phase: 'empty_goal_7v6', sit: 'equal' },
    { sec: 2520, half: 2, teamId: 'team-velenje', playerId: 'vel-p14', oppGkId: 'cel-p1', assistId: 'vel-p7', zone: 'LW', x: 2.2, y: 3.3, cell: 'TR', nx: 0.86, ny: 0.17, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 2590, half: 2, teamId: 'team-celje', playerId: 'cel-p9', oppGkId: 'vel-p12', zone: 'BREAKTHROUGH', x: 9.5, y: 6.2, cell: 'BL', nx: 0.15, ny: 0.85, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 2660, half: 2, teamId: 'team-velenje', playerId: 'vel-p9', oppGkId: 'cel-p1', zone: 'CB_9M', x: 9.9, y: 10.4, cell: 'TR', nx: 0.84, ny: 0.21, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 2740, half: 2, teamId: 'team-celje', playerId: 'cel-p6', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: 'LW', x: 2.3, y: 3.5, cell: 'BL', nx: 0.16, ny: 0.81, outcome: 'goal', phase: 'positional', sit: 'equal' },
    { sec: 2810, half: 2, teamId: 'team-velenje', playerId: 'vel-p23', oppGkId: 'cel-p1', zone: 'RB_9M', x: 14.9, y: 10.5, cell: 'WIDE_L', nx: -0.1, ny: 0.4, outcome: 'missed_wide', phase: 'positional', sit: 'equal' },
    { sec: 2875, half: 2, teamId: 'team-celje', playerId: 'cel-p24', oppGkId: 'vel-p12', assistId: 'cel-p9', zone: 'LB_9M', x: 5.1, y: 10.0, cell: 'BL', nx: 0.14, ny: 0.86, outcome: 'goal', phase: 'positional', sit: 'power_play' },
  ];

  for (const s of scriptedShots) {
    const isBounce = (s.cell === 'BL' || s.cell === 'BR' || s.cell === 'BC') && s.sec % 2 === 1;
    push({
      half: s.half,
      matchClockSec: s.sec,
      authorAnalyst: 'Bench Tablet A',
      teamId: s.teamId,
      playerId: s.playerId,
      category: 'shot',
      subType: s.outcome,
      shotOrigin: { zone: s.zone, xMeters: s.x, yMeters: s.y },
      goalTarget: { cell: s.cell, normX: s.nx, normY: s.ny },
      isBounceShot: isBounce,
      attackPhase: s.phase,
      situation: s.sit,
      opposingGkId: s.oppGkId,
      assistingPlayerId: s.assistId,
    });

    if (s.assistId) {
      push({
        half: s.half,
        matchClockSec: s.sec,
        authorAnalyst: 'Bench Tablet A',
        teamId: s.teamId,
        playerId: s.assistId,
        category: 'attack_other',
        subType: 'assist',
        attackPhase: s.phase,
        situation: s.sit,
      });
    }
  }

  // Non-shot events: Technical faults, Steals, Blocks, 2-min suspensions, Timeouts, 7v6
  push({
    half: 1,
    matchClockSec: 712,
    authorAnalyst: 'Bench Tablet A',
    teamId: 'team-velenje',
    playerId: 'vel-p55',
    category: 'discipline',
    subType: '2min',
    attackPhase: 'positional',
    situation: 'equal',
    suspensionDurationSec: 120,
    notes: 'Shirt pull on PV #18 Žabić',
  });

  push({
    half: 1,
    matchClockSec: 1140,
    authorAnalyst: 'Bench Tablet A',
    teamId: 'team-celje',
    category: 'team_state',
    subType: 'timeout',
    attackPhase: 'positional',
    situation: 'equal',
    notes: '1st Team Timeout Celje (19:00)',
  });

  push({
    half: 1,
    matchClockSec: 1510,
    authorAnalyst: 'Bench Tablet A',
    teamId: 'team-velenje',
    category: 'team_state',
    subType: 'timeout',
    attackPhase: 'positional',
    situation: 'equal',
    notes: '1st Team Timeout Velenje (25:10)',
  });

  // Cluster of technical faults in last 8 minutes of H2 (between 40:20=2420s and 48:20=2900s)
  const recentFaults: Array<{
    sec: number;
    teamId: string;
    playerId: string;
    fault: 'bad_pass' | 'steps' | 'offensive_foul' | 'catching_error' | 'line_violation';
  }> = [
    { sec: 2475, teamId: 'team-celje', playerId: 'cel-p24', fault: 'bad_pass' },
    { sec: 2555, teamId: 'team-velenje', playerId: 'vel-p7', fault: 'offensive_foul' },
    { sec: 2620, teamId: 'team-celje', playerId: 'cel-p19', fault: 'steps' },
    { sec: 2705, teamId: 'team-celje', playerId: 'cel-p9', fault: 'bad_pass' },
    { sec: 2775, teamId: 'team-velenje', playerId: 'vel-p9', fault: 'catching_error' },
    { sec: 2845, teamId: 'team-celje', playerId: 'cel-p18', fault: 'line_violation' },
  ];

  for (const tf of recentFaults) {
    push({
      half: 2,
      matchClockSec: tf.sec,
      authorAnalyst: 'Bench Tablet A',
      teamId: tf.teamId,
      playerId: tf.playerId,
      category: 'technical_fault',
      subType: tf.fault,
      attackPhase: 'positional',
      situation: 'equal',
    });
  }

  // Defensive Steals & Blocks
  push({
    half: 1,
    matchClockSec: 1785,
    authorAnalyst: 'Bench Tablet A',
    teamId: 'team-celje',
    playerId: 'cel-p18',
    category: 'defence',
    subType: 'block',
    attackPhase: 'positional',
    situation: 'equal',
  });
  push({
    half: 2,
    matchClockSec: 2380,
    authorAnalyst: 'Bench Tablet A',
    teamId: 'team-celje',
    playerId: 'cel-p6',
    category: 'defence',
    subType: 'steal',
    attackPhase: 'positional',
    situation: 'equal',
  });
  push({
    half: 2,
    matchClockSec: 2690,
    authorAnalyst: 'Bench Tablet A',
    teamId: 'team-velenje',
    playerId: 'vel-p20',
    category: 'defence',
    subType: 'interception',
    attackPhase: 'positional',
    situation: 'equal',
  });

  // Active 2-minute suspension at 47:15 (2835s) -> at 48:20 (2900s), 55 seconds remain!
  push({
    half: 2,
    matchClockSec: 2835,
    authorAnalyst: 'Bench Tablet A',
    teamId: 'team-velenje',
    playerId: 'vel-p55',
    category: 'discipline',
    subType: '2min',
    attackPhase: 'positional',
    situation: 'equal',
    suspensionDurationSec: 120,
    notes: '2-min suspension for push on breakthrough',
  });

  return events.sort((a, b) => a.matchClockSec - b.matchClockSec);
}

function buildMatchEventsForSupercup(): MatchEvent[] {
  const mId = 'match-supercup-final';
  const baseMs = Date.parse('2026-09-06T20:00:00+02:00');
  const events: MatchEvent[] = [];
  let seq = 1;

  const push = (partial: Omit<MatchEvent, 'id' | 'matchId' | 'createdAtMs'>) => {
    events.push({
      ...partial,
      id: `${mId}-ev-${seq++}`,
      matchId: mId,
      createdAtMs: baseMs + partial.matchClockSec * 1000,
    });
  };

  // Full 60-minute match (Final score: Celje 31 - 29 Velenje)
  // Reinforces opponent scouting tendencies so Pre-Match Preparation has multi-match data!
  const shots: Array<{
    sec: number;
    half: 1 | 2;
    teamId: string;
    playerId: string;
    oppGkId: string;
    zone: NonNullable<MatchEvent['shotOrigin']>['zone'];
    x: number;
    y: number;
    cell: NonNullable<MatchEvent['goalTarget']>['cell'];
    nx: number;
    ny: number;
    outcome: 'goal' | 'saved' | 'missed_wide' | 'post';
    phase: MatchEvent['attackPhase'];
  }> = [
    { sec: 55, half: 1, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p1', zone: 'LB_9M', x: 5.0, y: 10.5, cell: 'TR', nx: 0.84, ny: 0.17, outcome: 'goal', phase: 'positional' },
    { sec: 110, half: 1, teamId: 'team-celje', playerId: 'cel-p9', oppGkId: 'vel-p12', zone: 'BREAKTHROUGH', x: 9.8, y: 6.3, cell: 'BL', nx: 0.16, ny: 0.84, outcome: 'goal', phase: 'positional' },
    { sec: 195, half: 1, teamId: 'team-velenje', playerId: 'vel-p14', oppGkId: 'cel-p1', zone: 'FAST_BREAK', x: 9.6, y: 6.0, cell: 'TR', nx: 0.86, ny: 0.19, outcome: 'goal', phase: 'fast_break' },
    { sec: 260, half: 1, teamId: 'team-celje', playerId: 'cel-p24', oppGkId: 'vel-p12', zone: 'LB_9M', x: 4.9, y: 10.3, cell: 'BL', nx: 0.15, ny: 0.82, outcome: 'goal', phase: 'positional' },
    { sec: 340, half: 1, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p1', zone: '7M', x: 10.0, y: 7.0, cell: 'BL', nx: 0.14, ny: 0.85, outcome: 'goal', phase: 'positional' },
    { sec: 430, half: 1, teamId: 'team-celje', playerId: 'cel-p19', oppGkId: 'vel-p12', zone: 'RB_9M', x: 15.1, y: 10.2, cell: 'BC', nx: 0.51, ny: 0.86, outcome: 'goal', phase: 'positional' },
    { sec: 520, half: 1, teamId: 'team-velenje', playerId: 'vel-p23', oppGkId: 'cel-p1', zone: 'RB_9M', x: 14.7, y: 10.4, cell: 'BL', nx: 0.17, ny: 0.83, outcome: 'goal', phase: 'positional' },
    { sec: 640, half: 1, teamId: 'team-celje', playerId: 'cel-p18', oppGkId: 'vel-p12', zone: '6M_CENTRE', x: 10.0, y: 5.9, cell: 'BL', nx: 0.18, ny: 0.84, outcome: 'goal', phase: 'positional' },
    { sec: 780, half: 1, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p1', zone: 'LB_9M', x: 5.3, y: 10.7, cell: 'TR', nx: 0.85, ny: 0.15, outcome: 'goal', phase: 'positional' },
    { sec: 910, half: 1, teamId: 'team-celje', playerId: 'cel-p6', oppGkId: 'vel-p12', zone: 'LW', x: 2.2, y: 3.3, cell: 'BR', nx: 0.83, ny: 0.84, outcome: 'goal', phase: 'positional' },
    { sec: 1120, half: 1, teamId: 'team-velenje', playerId: 'vel-p14', oppGkId: 'cel-p1', zone: 'LW', x: 2.1, y: 3.4, cell: 'MR', nx: 0.84, ny: 0.51, outcome: 'goal', phase: 'positional' },
    { sec: 1380, half: 1, teamId: 'team-celje', playerId: 'cel-p11', oppGkId: 'vel-p12', zone: '7M', x: 10.0, y: 7.0, cell: 'TL', nx: 0.16, ny: 0.18, outcome: 'goal', phase: 'positional' },
    { sec: 1620, half: 1, teamId: 'team-velenje', playerId: 'vel-p20', oppGkId: 'cel-p1', zone: '6M_CENTRE', x: 10.1, y: 6.1, cell: 'TL', nx: 0.18, ny: 0.21, outcome: 'saved', phase: 'positional' },
    { sec: 1750, half: 1, teamId: 'team-celje', playerId: 'cel-p9', oppGkId: 'vel-p12', zone: 'CB_9M', x: 9.9, y: 10.2, cell: 'BL', nx: 0.15, ny: 0.85, outcome: 'goal', phase: 'second_wave' },
    // H2
    { sec: 1920, half: 2, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p1', zone: 'LB_9M', x: 5.1, y: 10.6, cell: 'TR', nx: 0.87, ny: 0.16, outcome: 'goal', phase: 'positional' },
    { sec: 2140, half: 2, teamId: 'team-celje', playerId: 'cel-p24', oppGkId: 'vel-p12', zone: 'LB_9M', x: 5.2, y: 10.1, cell: 'BC', nx: 0.52, ny: 0.88, outcome: 'goal', phase: 'positional' },
    { sec: 2380, half: 2, teamId: 'team-velenje', playerId: 'vel-p17', oppGkId: 'cel-p1', zone: 'RW', x: 17.8, y: 3.3, cell: 'TR', nx: 0.85, ny: 0.2, outcome: 'goal', phase: 'positional' },
    { sec: 2610, half: 2, teamId: 'team-celje', playerId: 'cel-p6', oppGkId: 'vel-p12', zone: 'FAST_BREAK', x: 9.7, y: 6.1, cell: 'BL', nx: 0.17, ny: 0.86, outcome: 'goal', phase: 'fast_break' },
    { sec: 2890, half: 2, teamId: 'team-velenje', playerId: 'vel-p7', oppGkId: 'cel-p16', zone: '7M', x: 10.0, y: 7.0, cell: 'BL', nx: 0.16, ny: 0.84, outcome: 'goal', phase: 'positional' },
    { sec: 3150, half: 2, teamId: 'team-celje', playerId: 'cel-p18', oppGkId: 'vel-p12', zone: '6M_CENTRE', x: 10.2, y: 5.9, cell: 'BL', nx: 0.15, ny: 0.83, outcome: 'goal', phase: 'positional' },
    { sec: 3420, half: 2, teamId: 'team-velenje', playerId: 'vel-p9', oppGkId: 'cel-p1', zone: 'CB_9M', x: 10.0, y: 10.4, cell: 'TL', nx: 0.18, ny: 0.19, outcome: 'saved', phase: 'positional' },
    { sec: 3565, half: 2, teamId: 'team-celje', playerId: 'cel-p9', oppGkId: 'vel-p12', zone: 'BREAKTHROUGH', x: 9.6, y: 6.1, cell: 'BC', nx: 0.5, ny: 0.87, outcome: 'goal', phase: 'positional' },
  ];

  for (const s of shots) {
    push({
      half: s.half,
      matchClockSec: s.sec,
      authorAnalyst: 'Bench Tablet A',
      teamId: s.teamId,
      playerId: s.playerId,
      category: 'shot',
      subType: s.outcome,
      shotOrigin: { zone: s.zone, xMeters: s.x, yMeters: s.y },
      goalTarget: { cell: s.cell, normX: s.nx, normY: s.ny },
      attackPhase: s.phase,
      situation: 'equal',
      opposingGkId: s.oppGkId,
    });
  }

  return events;
}

export const SEED_EVENTS: Record<string, MatchEvent[]> = {
  'match-derby-r8': buildMatchEventsForDerby(),
  'match-supercup-final': buildMatchEventsForSupercup(),
};
