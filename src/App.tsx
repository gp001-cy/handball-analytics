import React, { useEffect, useState } from 'react';
import { PlayerVisualPortrait } from './components/design-system/HandballIcons';
import { TeamShapeIcon } from './components/design-system/Primitives';
import { PlayerInspectorDrawer } from './components/modals/PlayerInspectorDrawer';
import { TRANSLATIONS } from './i18n/translations';
import { HomeDashboardScreen } from './screens/HomeDashboardScreen';
import { LiveMatchScreen } from './screens/LiveMatchScreen';
import { MatchStatsScreen } from './screens/MatchStatsScreen';
import { PreMatchPrepScreen } from './screens/PreMatchPrepScreen';
import { ReportsExportScreen } from './screens/ReportsExportScreen';
import { StartScreen } from './screens/StartScreen';
import { TeamsDirectoryScreen } from './screens/TeamsDirectoryScreen';
import { ActiveTab, AppStoreProvider, useAppStore } from './store/useAppStore';

const AppShellContent: React.FC = () => {
  const {
    locale,
    setLocale,
    theme,
    setTheme,
    viewportSim,
    setViewportSim,
    activeTab,
    setActiveTab,
    teams,
    players,
    matches,
    setActiveMatchId,
    setInspectedPlayerId,
    toast,
    dismissToast,
    undoLastAction,
    canUndo,
  } = useAppStore();

  const t = TRANSLATIONS[locale];
  const [searchQuery, setSearchQuery] = useState('');
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isPhoneLayout =
    viewportSim === 'phone' || (viewportSim === 'auto' && windowWidth < 860);

  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
    if (!q) return null;
    const matchedPlayers = players
      .filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          String(p.defaultJerseyNumber) === q ||
          p.primaryPosition.toLowerCase() === q
      )
      .slice(0, 6);
    const matchedTeams = teams.filter(
      (tm) =>
        tm.name.toLowerCase().includes(q) ||
        tm.shortCode.toLowerCase().includes(q)
    );
    const matchedMatches = matches.filter((m) =>
      m.roundLabel.toLowerCase().includes(q)
    );
    return { matchedPlayers, matchedTeams, matchedMatches };
  }, [searchQuery, players, teams, matches]);

  const NAV_ITEMS: Array<{ id: ActiveTab; label: string; shortLabel: string }> = [
    {
      id: 'start',
      label: locale === 'sl' ? 'Začetek' : 'Start',
      shortLabel: locale === 'sl' ? 'Začetek' : 'Start',
    },
    {
      id: 'live',
      label: t.nav.liveMode,
      shortLabel: locale === 'sl' ? 'V živo' : 'Live',
    },
    {
      id: 'stats',
      label: t.common.matchHub,
      shortLabel: locale === 'sl' ? 'Statistika' : 'Stats',
    },
    {
      id: 'prematch',
      label: t.nav.preMatch,
      shortLabel: locale === 'sl' ? 'Priprava' : 'Scout',
    },
    {
      id: 'teams',
      label: t.nav.teams,
      shortLabel: locale === 'sl' ? 'Ekipe' : 'Teams',
    },
    {
      id: 'reports',
      label: t.nav.reports,
      shortLabel: locale === 'sl' ? 'Izvoz' : 'Export',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Top Global Utility Bar */}
      <header
        className="no-print"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: isPhoneLayout ? '8px 10px' : '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
          zIndex: 40,
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('start')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 800,
              fontSize: '14px',
            }}
          >
            <span
              className="tabular-nums"
              style={{
                padding: '3px 7px',
                borderRadius: '5px',
                background: 'var(--sem-goal)',
                color: '#080c14',
                fontWeight: 800,
                fontSize: '11.5px',
              }}
            >
              40×20
            </span>
            <span>Handball</span>
          </button>

          {!isPhoneLayout && (
            <nav style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {NAV_ITEMS.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      minHeight: '36px',
                      padding: '0 11px',
                      borderRadius: 'var(--radius-sm)',
                      background: active
                        ? 'var(--accent-primary-subtle)'
                        : 'transparent',
                      border: active
                        ? '1px solid var(--accent-primary)'
                        : '1px solid transparent',
                      color: active
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                      fontWeight: active ? 800 : 600,
                      fontSize: '12px',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          {/* Global Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isPhoneLayout ? 'Search # / player…' : t.nav.searchPlaceholder}
              style={{
                width: isPhoneLayout ? '135px' : '220px',
                minHeight: '34px',
                padding: '0 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                fontSize: '11.5px',
              }}
            />

            {searchResults && (
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  right: 0,
                  width: '280px',
                  maxWidth: '92vw',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
                  padding: '8px',
                  zIndex: 90,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {searchResults.matchedPlayers.map((p) => {
                  const tm = teams.find((x) => x.id === p.teamId) ?? teams[0];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setInspectedPlayerId(p.id);
                        setSearchQuery('');
                      }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textAlign: 'left',
                      }}
                    >
                      <PlayerVisualPortrait
                        player={p}
                        jerseyNumber={p.defaultJerseyNumber}
                        team={tm}
                        size={34}
                      />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 800 }}>
                          {p.firstName} {p.lastName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {tm.shortCode} · {p.primaryPosition} ({p.handedness})
                        </div>
                      </div>
                    </button>
                  );
                })}

                {searchResults.matchedTeams.map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => {
                      setActiveTab('teams');
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    <TeamShapeIcon
                      shape={tm.shapeMarker}
                      color={tm.primaryColorHex}
                      size={12}
                    />
                    <span>Team: {tm.name}</span>
                  </button>
                ))}

                {searchResults.matchedMatches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setActiveMatchId(m.id);
                      setActiveTab('stats');
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    Match: {m.roundLabel}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isPhoneLayout && (
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-elevated)',
                padding: '2px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {(
                [
                  { id: 'auto', label: t.common.autoView },
                  { id: 'phone', label: t.common.phoneView },
                  { id: 'tablet', label: t.common.tabletView },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewportSim(mode.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '3px',
                    background:
                      viewportSim === mode.id
                        ? 'var(--bg-interactive)'
                        : 'transparent',
                    fontSize: '11px',
                    fontWeight: viewportSim === mode.id ? 700 : 500,
                    color:
                      viewportSim === mode.id
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}



          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'sl' : 'en')}
            style={{
              minHeight: '34px',
              padding: '0 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            {locale.toUpperCase()}
          </button>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              minHeight: '34px',
              padding: '0 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        className={
          isPhoneLayout ? 'viewport-frame-phone' : 'viewport-frame-tablet'
        }
        style={{ flex: 1, width: '100%', paddingBottom: '72px' }}
      >
        {activeTab === 'start' && (
          <StartScreen isPhoneLayout={isPhoneLayout} />
        )}
        {activeTab === 'home' && (
          <HomeDashboardScreen isPhoneLayout={isPhoneLayout} />
        )}
        {activeTab === 'live' && (
          <LiveMatchScreen isPhoneLayout={isPhoneLayout} />
        )}
        {activeTab === 'stats' && (
          <MatchStatsScreen isPhoneLayout={isPhoneLayout} />
        )}
        {activeTab === 'prematch' && (
          <PreMatchPrepScreen isPhoneLayout={isPhoneLayout} />
        )}
        {activeTab === 'teams' && (
          <TeamsDirectoryScreen isPhoneLayout={isPhoneLayout} />
        )}
        {activeTab === 'reports' && (
          <ReportsExportScreen isPhoneLayout={isPhoneLayout} />
        )}
      </main>

      {/* Toast Bar */}
      {toast && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            bottom: '64px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 70,
            background: 'var(--bg-surface)',
            border: '2px solid var(--sem-goal)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: 'max-content',
            maxWidth: '94vw',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--sem-goal)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {toast.message}
          </span>
          {toast.canUndo && canUndo && (
            <button
              type="button"
              onClick={undoLastAction}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--sem-goal)',
                color: '#080c14',
                fontWeight: 800,
                fontSize: '11.5px',
                flexShrink: 0,
              }}
            >
              ↶ {t.common.undo}
            </button>
          )}
          <button
            type="button"
            onClick={dismissToast}
            style={{
              color: 'var(--text-muted)',
              fontSize: '12px',
              padding: '2px 4px',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <footer
        className="no-print"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-strong)',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          width: '100%',
          maxWidth: isPhoneLayout ? '430px' : '100%',
          margin: '0 auto',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              style={{
                minHeight: '52px',
                padding: '4px 2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderTop: active
                  ? '3px solid var(--sem-goal)'
                  : '3px solid transparent',
                color: active ? 'var(--sem-goal)' : 'var(--text-secondary)',
                fontWeight: active ? 800 : 600,
                fontSize: isPhoneLayout ? '11px' : '12px',
              }}
            >
              <span>{isPhoneLayout ? item.shortLabel : item.label}</span>
            </button>
          );
        })}
      </footer>

      <PlayerInspectorDrawer />
    </div>
  );
};

export const App: React.FC = () => (
  <AppStoreProvider>
    <AppShellContent />
  </AppStoreProvider>
);
export default App;
