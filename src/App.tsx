import { AnimatePresence } from 'motion/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { AgeGateScreen } from './components/AgeGateScreen';
import { AmbientBackground } from './components/AmbientBackground';
import { ChallengeScreen } from './components/ChallengeScreen';
import { CoupleNamesScreen } from './components/CoupleNamesScreen';
import { CustomCursor } from './components/CustomCursor';
import { EndScreen } from './components/EndScreen';
import { FullscreenToggle } from './components/FullscreenToggle';
import { HomeScreen } from './components/HomeScreen';
import { MissingEnvScreen } from './components/MissingEnvScreen';
import { ResumeNightModal } from './components/ResumeNightModal';
import { SettingsModal } from './components/SettingsModal';
import { SoundToggle } from './components/SoundToggle';
import { isEnvConfigured, missingRequiredEnvVars } from './config/env';
import { subscribeChallenges } from './services/challengesService';
import { subscribeSavedSongs, subscribeSongCategories } from './services/songsService';

const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((mod) => ({ default: mod.AdminPanel }))
);
import {
  type CategoryId,
  type Challenge,
  type CoupleNames,
  type SavedNightProgress,
  type SavedSong,
  type SongCategory,
} from './types';
import {
  clearNightProgress,
  hasPromptedCoupleNames,
  isCandleModeEnabled,
  loadCoupleNames,
  loadNightProgress,
  markPromptedCoupleNames,
  saveCoupleNames,
  setCandleModeEnabled,
  subscribeCandleMode,
} from './utils/preferences';
import {
  initAudioOnFirstTap,
  isSfxEnabled,
  setSfxCandleMode,
  setSfxEnabled,
  subscribeSfxEnabled,
} from './utils/sound';

type ScreenState = 'age-gate' | 'names' | 'home' | 'challenge' | 'end' | 'admin';

const AGE_STORAGE_KEY = 'sahra_age_verified_v1';

interface SessionConfig {
  categoryId: CategoryId;
  deck: Challenge[];
  initialIndex: number;
  initialCompleted: number;
  initialSkipped: number;
  initialElapsedSeconds: number;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenState>(() => {
    try {
      const ageOk = localStorage.getItem(AGE_STORAGE_KEY) === 'true';
      if (!ageOk) return 'age-gate';
      return hasPromptedCoupleNames() ? 'home' : 'names';
    } catch {
      return 'age-gate';
    }
  });

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [songCategories, setSongCategories] = useState<SongCategory[]>([]);
  const [savedSongs, setSavedSongs] = useState<SavedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [coupleNames, setCoupleNames] = useState<CoupleNames>(() => loadCoupleNames());
  const [candleMode, setCandleMode] = useState<boolean>(() => isCandleModeEnabled());
  const [sfxEnabled, setSfxEnabledState] = useState<boolean>(() => isSfxEnabled());

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingResume, setPendingResume] = useState<SavedNightProgress | null>(null);

  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    categoryId: 'dal3',
    deck: [],
    initialIndex: 0,
    initialCompleted: 0,
    initialSkipped: 0,
    initialElapsedSeconds: 0,
  });
  const [sessionKey, setSessionKey] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    completed: 0,
    skipped: 0,
    totalSeconds: 0,
  });

  useEffect(() => {
    initAudioOnFirstTap();
  }, []);

  useEffect(() => {
    setSfxCandleMode(candleMode);
  }, [candleMode]);

  useEffect(() => {
    const unsubCandle = subscribeCandleMode(setCandleMode);
    const unsubSfx = subscribeSfxEnabled(setSfxEnabledState);
    return () => {
      unsubCandle();
      unsubSfx();
    };
  }, []);

  useEffect(() => {
    if (!isEnvConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeChallenges(
      (items) => {
        setChallenges(items);
        setLoading(false);
        setDbError(null);
      },
      (errMessage) => {
        setDbError(errMessage);
        setLoading(false);
      }
    );

    const unsubCategories = subscribeSongCategories(setSongCategories);
    const unsubSongs = subscribeSavedSongs(setSavedSongs);

    return () => {
      unsubscribe();
      unsubCategories();
      unsubSongs();
    };
  }, []);

  const handleConfirmAge = () => {
    try {
      localStorage.setItem(AGE_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    setScreen(hasPromptedCoupleNames() ? 'home' : 'names');
  };

  const handleSaveNames = (names: CoupleNames) => {
    saveCoupleNames(names);
    setCoupleNames(names);
    markPromptedCoupleNames();
  };

  const launchChallengeSession = (config: SessionConfig) => {
    setSessionConfig(config);
    setSessionKey((k) => k + 1);
    setScreen('challenge');
  };

  const buildDeckForCategory = (categoryId: CategoryId): Challenge[] => {
    return challenges
      .filter((c) => c.category === categoryId && c.active)
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.createdAt - b.createdAt;
      });
  };

  const beginFreshNight = (categoryId: CategoryId) => {
    clearNightProgress(categoryId);
    const deck = buildDeckForCategory(categoryId);

    launchChallengeSession({
      categoryId,
      deck,
      initialIndex: 0,
      initialCompleted: 0,
      initialSkipped: 0,
      initialElapsedSeconds: 0,
    });
  };

  const handleSelectCategory = (categoryId: CategoryId) => {
    const saved = loadNightProgress(categoryId);
    if (saved) {
      const map = new Map(challenges.map((c) => [c.id, c]));
      const resolved = saved.deckIds
        .map((id) => map.get(id))
        .filter((c): c is Challenge => Boolean(c && c.active));

      if (resolved.length > 0 && saved.currentIndex < resolved.length) {
        setPendingResume(saved);
        return;
      }
      clearNightProgress(categoryId);
    }

    beginFreshNight(categoryId);
  };

  const handleResumeSavedNight = () => {
    if (!pendingResume) return;
    const saved = pendingResume;
    setPendingResume(null);

    const map = new Map(challenges.map((c) => [c.id, c]));
    const resolvedDeck = saved.deckIds
      .map((id) => map.get(id))
      .filter((c): c is Challenge => Boolean(c && c.active));

    if (resolvedDeck.length === 0) {
      beginFreshNight(saved.categoryId);
      return;
    }

    launchChallengeSession({
      categoryId: saved.categoryId,
      deck: resolvedDeck,
      initialIndex: Math.min(saved.currentIndex, resolvedDeck.length - 1),
      initialCompleted: saved.completedCount || 0,
      initialSkipped: saved.skippedCount || 0,
      initialElapsedSeconds: saved.elapsedSeconds || 0,
    });
  };

  const handleRestartFromModal = () => {
    if (!pendingResume) return;
    const cat = pendingResume.categoryId;
    setPendingResume(null);
    beginFreshNight(cat);
  };

  const handleCompleteSession = (stats: {
    completed: number;
    skipped: number;
    totalSeconds: number;
  }) => {
    setSessionStats(stats);
    setScreen('end');
  };

  if (!isEnvConfigured) {
    return (
      <div
        dir="rtl"
        className={`${
          candleMode ? 'candle-mode ' : ''
        }relative min-h-[100dvh] w-full overflow-x-hidden`}
      >
        <AmbientBackground candleMode={candleMode} />
        <MissingEnvScreen missingVars={missingRequiredEnvVars} />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className={`${
        candleMode ? 'candle-mode ' : ''
      }relative min-h-[100dvh] w-full overflow-x-hidden`}
    >
      <AmbientBackground candleMode={candleMode} />
      <CustomCursor />

      {screen !== 'admin' && (
        <>
          <SoundToggle />
          <FullscreenToggle className="fixed top-3 left-16 z-40" />
        </>
      )}

      <AnimatePresence mode="wait">
        {screen === 'age-gate' && (
          <AgeGateScreen key="age-gate" onConfirm={handleConfirmAge} />
        )}

        {screen === 'names' && (
          <CoupleNamesScreen
            key="names"
            initialNames={coupleNames}
            onSave={(next) => {
              handleSaveNames(next);
              setScreen('home');
            }}
            onSkip={() => {
              markPromptedCoupleNames();
              setScreen('home');
            }}
          />
        )}

        {screen === 'home' && (
          <HomeScreen
            key="home"
            challenges={challenges}
            loading={loading}
            error={dbError}
            candleMode={candleMode}
            onToggleCandleMode={() => setCandleModeEnabled(!candleMode)}
            onOpenSettings={() => setSettingsOpen(true)}
            onSelectCategory={handleSelectCategory}
            onOpenAdmin={() => setScreen('admin')}
          />
        )}

        {screen === 'challenge' && (
          <ChallengeScreen
            key={`challenge-${sessionKey}`}
            categoryId={sessionConfig.categoryId}
            initialDeck={sessionConfig.deck}
            allChallenges={challenges}
            savedSongs={savedSongs}
            names={coupleNames}
            candleMode={candleMode}
            initialIndex={sessionConfig.initialIndex}
            initialCompleted={sessionConfig.initialCompleted}
            initialSkipped={sessionConfig.initialSkipped}
            initialElapsedSeconds={sessionConfig.initialElapsedSeconds}
            onCompleteSession={handleCompleteSession}
            onExitHome={() => setScreen('home')}
          />
        )}

        {screen === 'end' && (
          <EndScreen
            key={`end-${sessionKey}`}
            categoryId={sessionConfig.categoryId}
            names={coupleNames}
            stats={sessionStats}
            candleMode={candleMode}
            onReplay={() => beginFreshNight(sessionConfig.categoryId)}
            onGoHome={() => setScreen('home')}
          />
        )}

        {screen === 'admin' && (
          <Suspense
            key="admin-suspense"
            fallback={
              <div className="relative z-10 min-h-[100dvh] flex items-center justify-center p-6 text-center">
                <div className="rounded-2xl border border-[#B98A9E]/25 bg-[#1B0A22]/90 px-6 py-5 shadow-xl">
                  <p className="font-calligraphy text-2xl text-[#F4E8D8]">
                    جارٍ تحميل لوحة الإدارة...
                  </p>
                </div>
              </div>
            }
          >
            <AdminPanel
              key="admin"
              challenges={challenges}
              songCategories={songCategories}
              savedSongs={savedSongs}
              loading={loading}
              onExit={() => setScreen('home')}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Modals */}
      <SettingsModal
        open={settingsOpen}
        names={coupleNames}
        candleMode={candleMode}
        sfxEnabled={sfxEnabled}
        onClose={() => setSettingsOpen(false)}
        onSaveNames={handleSaveNames}
        onToggleCandleMode={() => setCandleModeEnabled(!candleMode)}
        onToggleSfx={() => setSfxEnabled(!sfxEnabled)}
      />

      <ResumeNightModal
        progress={pendingResume}
        onResume={handleResumeSavedNight}
        onRestart={handleRestartFromModal}
        onClose={() => setPendingResume(null)}
      />
    </div>
  );
}
