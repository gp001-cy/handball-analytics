import {
  AttackPhase,
  CourtZone,
  DefenceEventType,
  DisciplineType,
  GoalTargetCell,
  LocaleCode,
  NumericalSituation,
  PositionCode,
  ShotOutcome,
  TechnicalFaultType,
} from '../types/domain';

export interface TranslationDictionary {
  nav: {
    home: string;
    matches: string;
    teams: string;
    reports: string;
    liveMode: string;
    preMatch: string;
    designSystem: string;
    searchPlaceholder: string;
    offlineReady: string;
    synced: string;
    collaborators: string;
  };
  common: {
    prepare: string;
    goLive: string;
    matchHub: string;
    undo: string;
    redo: string;
    auditHistory: string;
    resetFilters: string;
    noData: string;
    lowSample: string;
    confirm: string;
    cancel: string;
    save: string;
    edit: string;
    delete: string;
    close: string;
    exportPdf: string;
    exportCsv: string;
    exportJson: string;
    importCsv: string;
    ourTeam: string;
    opponent: string;
    all: string;
    half1: string;
    half2: string;
    fullMatch: string;
    phoneView: string;
    tabletView: string;
    autoView: string;
  };
  live: {
    shotFlowHint1: string;
    shotFlowHint2: string;
    shotFlowHint3: string;
    goal: string;
    saved: string;
    miss: string;
    post: string;
    block: string;
    fastBreakToggle: string;
    secondWaveToggle: string;
    sevenVsSixToggle: string;
    positional: string;
    assist: string;
    technicalFault: string;
    steal: string;
    twoMin: string;
    timeout: string;
    moreActions: string;
    substitutions: string;
    lineChangePresets: string;
    onCourt: string;
    bench: string;
    opposingGk: string;
    activeSuspensions: string;
    liveInsights: string;
    eventFeed: string;
    momentum: string;
    editEventTime: string;
    tapOutThenIn: string;
    shotLoggedToast: string;
    eventLoggedToast: string;
  };
  positions: Record<PositionCode, string>;
  zones: Record<CourtZone, string>;
  outcomes: Record<ShotOutcome, string>;
  phases: Record<AttackPhase, string>;
  situations: Record<NumericalSituation, string>;
  faults: Record<TechnicalFaultType, string>;
  defence: Record<DefenceEventType, string>;
  discipline: Record<DisciplineType, string>;
  goalCells: Record<GoalTargetCell, string>;
}

export const TRANSLATIONS: Record<LocaleCode, TranslationDictionary> = {
  en: {
    nav: {
      home: 'Home',
      matches: 'Matches',
      teams: 'Teams',
      reports: 'Reports',
      liveMode: 'Live Match',
      preMatch: 'Pre-Match',
      designSystem: 'Design System',
      searchPlaceholder: 'Search players, #number, teams, matches…',
      offlineReady: 'Offline DB Ready',
      synced: '2 Devices Synced',
      collaborators: '2 Analysts Live',
    },
    common: {
      prepare: 'Prepare',
      goLive: 'Go Live',
      matchHub: 'Match Stats',
      undo: 'Undo',
      redo: 'Redo',
      auditHistory: 'Audit Log',
      resetFilters: 'Reset Filters',
      noData: '—',
      lowSample: 'low sample',
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      close: 'Close',
      exportPdf: 'Export PDF Report',
      exportCsv: 'Export CSV Events',
      exportJson: 'Export JSON',
      importCsv: 'Import Roster CSV',
      ourTeam: 'Our Team',
      opponent: 'Opponent',
      all: 'All',
      half1: '1st Half',
      half2: '2nd Half',
      fullMatch: 'Full Match',
      phoneView: 'Phone (390dp)',
      tabletView: 'Tablet (Landscape)',
      autoView: 'Responsive',
    },
    live: {
      shotFlowHint1: '1. Tap court origin',
      shotFlowHint2: '2. Tap goal target',
      shotFlowHint3: '3. Tap outcome',
      goal: 'Goal',
      saved: 'Saved',
      miss: 'Miss',
      post: 'Post',
      block: 'Block',
      fastBreakToggle: 'Fast Break',
      secondWaveToggle: '2nd Wave',
      sevenVsSixToggle: '7v6 Empty Net',
      positional: 'Positional',
      assist: 'Assist',
      technicalFault: 'Tech Fault',
      steal: 'Steal',
      twoMin: '2 Min',
      timeout: 'Timeout',
      moreActions: 'More',
      substitutions: 'Substitutions & 7v6',
      lineChangePresets: 'Line Presets',
      onCourt: 'On Court (7)',
      bench: 'Bench',
      opposingGk: 'vs GK',
      activeSuspensions: 'Active 2′',
      liveInsights: 'Live Tactical Insights',
      eventFeed: 'Event Log & Audit',
      momentum: 'Goal Differential & Momentum',
      editEventTime: 'Adjust clock / details',
      tapOutThenIn: 'Tap on-court player OUT, then bench player IN',
      shotLoggedToast: 'Shot logged',
      eventLoggedToast: 'Event logged',
    },
    positions: {
      GK: 'GK',
      LW: 'LW',
      LB: 'LB',
      CB: 'CB',
      RB: 'RB',
      RW: 'RW',
      PV: 'PV',
    },
    zones: {
      LW: 'Left Wing',
      RW: 'Right Wing',
      LB_9M: 'Left Back 9m',
      CB_9M: 'Centre Back 9m',
      RB_9M: 'Right Back 9m',
      '6M_LEFT': '6m Left',
      '6M_CENTRE': '6m Centre',
      '6M_RIGHT': '6m Right',
      '7M': '7m Penalty',
      BREAKTHROUGH: 'Breakthrough',
      FAST_BREAK: 'Fast Break',
      EMPTY_NET_OWN_HALF: 'Empty Net (Full Court)',
    },
    outcomes: {
      goal: 'Goal',
      saved: 'Saved',
      missed_wide: 'Wide',
      missed_high: 'High',
      post: 'Post',
      crossbar: 'Crossbar',
      blocked: 'Blocked',
    },
    phases: {
      positional: 'Positional 6v6',
      fast_break: 'Fast Break',
      second_wave: '2nd Wave',
      empty_goal_7v6: '7v6 Empty Goal',
    },
    situations: {
      equal: 'Equal (6v6)',
      power_play: 'Power Play (+1)',
      short_handed: 'Short-Handed (-1)',
      empty_goal: 'Empty Goal (7v6)',
    },
    faults: {
      bad_pass: 'Bad Pass',
      catching_error: 'Catching Error',
      steps: 'Steps',
      double_dribble: 'Double Dribble',
      offensive_foul: 'Offensive Foul',
      line_violation: '6m Line Violation',
      passive_play: 'Passive Play',
    },
    defence: {
      steal: 'Steal',
      interception: 'Interception',
      block: 'Shot Block',
      forced_fault: 'Forced Turnover',
      '7m_conceded': '7m Conceded',
      foul: 'Defensive Foul',
    },
    discipline: {
      yellow: 'Yellow Card',
      '2min': '2-Min Suspension',
      red: 'Red Card',
      blue: 'Blue Card',
    },
    goalCells: {
      TL: 'High Left',
      TC: 'High Centre',
      TR: 'High Right',
      ML: 'Mid Left',
      MC: 'Mid Centre',
      MR: 'Mid Right',
      BL: 'Low Left',
      BC: 'Low Centre',
      BR: 'Low Right',
      POST_L: 'Left Post',
      POST_R: 'Right Post',
      CROSSBAR: 'Crossbar',
      WIDE_L: 'Wide Left',
      WIDE_R: 'Wide Right',
      HIGH: 'Over Crossbar',
    },
  },
  sl: {
    nav: {
      home: 'Domov',
      matches: 'Tekme',
      teams: 'Ekipe',
      reports: 'Poročila',
      liveMode: 'Tekma v živo',
      preMatch: 'Priprava',
      designSystem: 'Oblikovni sistem',
      searchPlaceholder: 'Išči igralce, #številko, ekipe, tekme…',
      offlineReady: 'Lokalna baza aktivna',
      synced: '2 napravi povezani',
      collaborators: '2 analitika v živo',
    },
    common: {
      prepare: 'Priprava',
      goLive: 'V živo',
      matchHub: 'Statistika',
      undo: 'Razveljavi',
      redo: 'Uveljavi',
      auditHistory: 'Zgodovina sprememb',
      resetFilters: 'Ponastavi filtre',
      noData: '—',
      lowSample: 'majhen vzorec',
      confirm: 'Potrdi',
      cancel: 'Prekliči',
      save: 'Shrani',
      edit: 'Uredi',
      delete: 'Izbriši',
      close: 'Zapri',
      exportPdf: 'Izvozi PDF poročilo',
      exportCsv: 'Izvozi CSV dogodke',
      exportJson: 'Izvozi JSON',
      importCsv: 'Uvozi CSV postavo',
      ourTeam: 'Naša ekipa',
      opponent: 'Nasprotnik',
      all: 'Vse',
      half1: '1. polčas',
      half2: '2. polčas',
      fullMatch: 'Cela tekma',
      phoneView: 'Telefon (390dp)',
      tabletView: 'Tablica (ležeče)',
      autoView: 'Samodejno',
    },
    live: {
      shotFlowHint1: '1. Tapni mesto meta',
      shotFlowHint2: '2. Tapni cilj v golu',
      shotFlowHint3: '3. Tapni izid meta',
      goal: 'Gol',
      saved: 'Obramba',
      miss: 'Zgrešeno',
      post: 'Vratnica',
      block: 'Blok',
      fastBreakToggle: 'Protinapad',
      secondWaveToggle: '2. val',
      sevenVsSixToggle: '7 na 6 (prazen gol)',
      positional: 'Postavljen napad',
      assist: 'Podaja',
      technicalFault: 'Teh. napaka',
      steal: 'Ukradena',
      twoMin: '2 min',
      timeout: 'Minuta odmora',
      moreActions: 'Več',
      substitutions: 'Menjave in 7 na 6',
      lineChangePresets: 'Hitre menjave',
      onCourt: 'Na igrišču (7)',
      bench: 'Klop',
      opposingGk: 'proti VR',
      activeSuspensions: 'Aktivne 2′',
      liveInsights: 'Taktični vpogledi v živo',
      eventFeed: 'Dnevnik dogodkov',
      momentum: 'Gibanje rezultata',
      editEventTime: 'Popravi čas / podrobnosti',
      tapOutThenIn: 'Tapni igralca z igrišča (VEN), nato s klopi (NOT)',
      shotLoggedToast: 'Met zabeležen',
      eventLoggedToast: 'Dogodek zabeležen',
    },
    positions: {
      GK: 'VR',
      LW: 'LK',
      LB: 'LZ',
      CB: 'SZ',
      RB: 'DZ',
      RW: 'DK',
      PV: 'KR',
    },
    zones: {
      LW: 'Levo krilo',
      RW: 'Desno krilo',
      LB_9M: 'Levi zunanji 9m',
      CB_9M: 'Srednji zunanji 9m',
      RB_9M: 'Desni zunanji 9m',
      '6M_LEFT': '6m levo',
      '6M_CENTRE': '6m sredina',
      '6M_RIGHT': '6m desno',
      '7M': '7m kazenski strel',
      BREAKTHROUGH: 'Prodor',
      FAST_BREAK: 'Protinapad',
      EMPTY_NET_OWN_HALF: 'Prazen gol (čez celo)',
    },
    outcomes: {
      goal: 'Gol',
      saved: 'Obramba',
      missed_wide: 'Mimo gola',
      missed_high: 'Preko gola',
      post: 'Vratnica',
      crossbar: 'Prečka',
      blocked: 'Blokiran met',
    },
    phases: {
      positional: 'Postavljen 6 na 6',
      fast_break: 'Protinapad',
      second_wave: 'Drugi val',
      empty_goal_7v6: '7 na 6 prazen gol',
    },
    situations: {
      equal: 'Enakovredno (6:6)',
      power_play: 'Igralec več (+1)',
      short_handed: 'Igralec manj (-1)',
      empty_goal: 'Prazen gol (7:6)',
    },
    faults: {
      bad_pass: 'Slaba podaja',
      catching_error: 'Napaka pri lovljenju',
      steps: 'Koraki',
      double_dribble: 'Dvojno vodenje',
      offensive_foul: 'Prekršek v napadu',
      line_violation: 'Prestop 6m',
      passive_play: 'Pasivna igra',
    },
    defence: {
      steal: 'Ukradena žoga',
      interception: 'Presečena podaja',
      block: 'Blok v obrambi',
      forced_fault: 'Izsiljena napaka',
      '7m_conceded': 'Povzročena 7m',
      foul: 'Prekršek v obrambi',
    },
    discipline: {
      yellow: 'Rumeni karton',
      '2min': 'Izključitev 2 min',
      red: 'Rdeči karton',
      blue: 'Modri karton',
    },
    goalCells: {
      TL: 'Zgoraj levo',
      TC: 'Zgoraj sredina',
      TR: 'Zgoraj desno',
      ML: 'Sredina levo',
      MC: 'Sredina center',
      MR: 'Sredina desno',
      BL: 'Spodaj levo',
      BC: 'Spodaj sredina',
      BR: 'Spodaj desno',
      POST_L: 'Leva vratnica',
      POST_R: 'Desna vratnica',
      CROSSBAR: 'Prečka',
      WIDE_L: 'Mimo levo',
      WIDE_R: 'Mimo desno',
      HIGH: 'Preko prečke',
    },
  },
};

/**
 * Core Principle 6 & 7:
 * - Always show sample size with percentage ("5/7 · 71%" or in SL "5/7 · 71 %")
 * - Never mix empty cells and 0,0 %. Zero attempts returns "—" (noData), 0/3 returns "0/3 · 0%".
 * - Low samples (attempts > 0 && attempts < 4) are flagged so the UI visually de-emphasises them.
 */
export function formatSampleRate(
  successes: number,
  attempts: number,
  locale: LocaleCode,
  decimals = 0
): {
  hasData: boolean;
  isLowSample: boolean;
  fractionText: string;
  percentText: string;
  combinedText: string;
} {
  if (attempts <= 0) {
    return {
      hasData: false,
      isLowSample: false,
      fractionText: '—',
      percentText: '—',
      combinedText: '—',
    };
  }
  const pct = (successes / attempts) * 100;
  const formattedNumber =
    decimals > 0
      ? pct.toFixed(decimals).replace('.', locale === 'sl' ? ',' : '.')
      : Math.round(pct).toString();
  const percentText = locale === 'sl' ? `${formattedNumber} %` : `${formattedNumber}%`;
  const fractionText = `${successes}/${attempts}`;
  return {
    hasData: true,
    isLowSample: attempts < 4,
    fractionText,
    percentText,
    combinedText: `${fractionText} · ${percentText}`,
  };
}

export function formatDecimal(value: number | null | undefined, locale: LocaleCode, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  const str = value.toFixed(decimals);
  return locale === 'sl' ? str.replace('.', ',') : str;
}

export function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
