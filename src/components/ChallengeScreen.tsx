import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getCategoryMeta,
  getHeatMeta,
  normalizeHeat,
  type CategoryId,
  type Challenge,
  type CoupleNames,
  type SavedSong,
} from '../types';
import {
  isSongPlayingNow,
  loadSong,
  pauseSong,
  playSong,
  setChallengeBaseVolume,
  setSongVolume,
  stopAndReleaseSong,
  subscribeSongPlayer,
} from '../utils/audioPlayer';
import { resolveChallengePlaylist } from '../utils/playlist';
import {
  clearNightProgress,
  formatChallengeText,
  saveNightProgress,
} from '../utils/preferences';
import {
  isSfxEnabled,
  playCompletionChime,
  playCountdownTick,
  playSparkSound,
  playTapSound,
  playTensionPulse,
  playWhooshSound,
  setSfxEnabled,
  triggerSecondVibration,
} from '../utils/sound';
import { setTensionLevel } from '../utils/tensionState';
import { useWakeLock } from '../utils/wakeLock';
import { ChallengeStage } from './ChallengeStage';
import { ComfortSheet } from './ComfortSheet';
import { ShortcutsSheet } from './ShortcutsSheet';

interface ChallengeScreenProps {
  categoryId: CategoryId;
  initialDeck: Challenge[];
  allChallenges: Challenge[];
  savedSongs: SavedSong[];
  names: CoupleNames;
  candleMode?: boolean;
  initialIndex?: number;
  initialCompleted?: number;
  initialSkipped?: number;
  initialElapsedSeconds?: number;
  onCompleteSession: (stats: {
    completed: number;
    skipped: number;
    totalSeconds: number;
  }) => void;
  onExitHome: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

export function ChallengeScreen({
  categoryId,
  initialDeck,
  allChallenges,
  savedSongs,
  names,
  candleMode = false,
  initialIndex = 0,
  initialCompleted = 0,
  initialSkipped = 0,
  initialElapsedSeconds = 0,
  onCompleteSession,
  onExitHome,
}: ChallengeScreenProps) {
  const prefersReducedMotion = useReducedMotion();
  const category = getCategoryMeta(categoryId);
  const [deck, setDeck] = useState<Challenge[]>(initialDeck);
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(initialIndex, Math.max(0, initialDeck.length - 1))
  );
  const [completedCount, setCompletedCount] = useState(initialCompleted);
  const [skippedCount, setSkippedCount] = useState(initialSkipped);
  const [comfortOpen, setComfortOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [polaroidFlipKey, setPolaroidFlipKey] = useState(0);
  const [showKeyHints, setShowKeyHints] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  });

  const sessionStartMsRef = useRef<number>(Date.now());
  const currentChallenge = deck[currentIndex];

  const [trackIndex, setTrackIndex] = useState(0);
  const [categoryShuffleTick, setCategoryShuffleTick] = useState(0);

  const resolvedPlaylist = useMemo(() => {
    if (!currentChallenge) return [];
    void currentIndex;
    void categoryShuffleTick;
    return resolveChallengePlaylist(currentChallenge, savedSongs);
  }, [currentChallenge, savedSongs, currentIndex, categoryShuffleTick]);

  const totalDurationSeconds =
    typeof currentChallenge?.timerMinutes === 'number' &&
    currentChallenge.timerMinutes > 0
      ? Math.round(currentChallenge.timerMinutes * 60)
      : 0;

  const [hasStarted, setHasStarted] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(totalDurationSeconds);
  const [timerFinished, setTimerFinished] = useState(false);
  const [heartBurstKey, setHeartBurstKey] = useState(0);
  const [finishBurstKey, setFinishBurstKey] = useState(0);
  const [tensionSecond, setTensionSecond] = useState<number | null>(null);
  const [songIsPlaying, setSongIsPlaying] = useState(false);

  const endTimestampRef = useRef<number | null>(null);
  const pausedRemainingMsRef = useRef<number>(totalDurationSeconds * 1000);
  const notifiedChallengeIdRef = useRef<string | null>(null);
  const lastSoftTickSecRef = useRef<number | null>(null);
  const lastTensionSecRef = useRef<number | null>(null);
  const songPausedByFadeRef = useRef<boolean>(false);
  const finishClearTimerRef = useRef<number | null>(null);
  const lastEndedSeqRef = useRef<number>(0);
  const pendingCategoryLoopPlayRef = useRef<boolean>(false);
  const lastPreloadedUrlRef = useRef<string>('');

  const tensionMaxSecond =
    totalDurationSeconds >= 8
      ? 5
      : Math.max(1, Math.min(5, Math.floor(totalDurationSeconds * 0.65)));
  const fadeStartSec =
    totalDurationSeconds >= 8
      ? 6
      : Math.min(totalDurationSeconds, tensionMaxSecond + 1);
  const fadeEndSec =
    totalDurationSeconds >= 8
      ? 1
      : Math.max(0.35, fadeStartSec * 0.25);

  // Fade out keyboard shortcut chips after 6 seconds
  useEffect(() => {
    if (!showKeyHints) return;
    const t = window.setTimeout(() => {
      setShowKeyHints(false);
    }, 6000);
    return () => window.clearTimeout(t);
  }, [showKeyHints]);

  const hasTimer = totalDurationSeconds > 0;
  const isTimerRunning = Boolean(
    hasStarted && hasTimer && !isTimerPaused && !timerFinished && remainingSeconds > 0
  );
  useWakeLock(Boolean(currentChallenge && (isTimerRunning || songIsPlaying)));

  const playlistStateRef = useRef({
    playlist: resolvedPlaylist,
    trackIndex,
    audioCategoryId: currentChallenge?.audioCategoryId ?? '',
    hasTimer,
    timerFinished,
    remainingSeconds,
    fadeStartSec,
  });
  playlistStateRef.current = {
    playlist: resolvedPlaylist,
    trackIndex,
    audioCategoryId: currentChallenge?.audioCategoryId ?? '',
    hasTimer,
    timerFinished,
    remainingSeconds,
    fadeStartSec,
  };

  useEffect(() => {
    return subscribeSongPlayer((s) => {
      setSongIsPlaying(s.status === 'playing');

      if (s.endedSeq > lastEndedSeqRef.current) {
        lastEndedSeqRef.current = s.endedSeq;
        if (songPausedByFadeRef.current) return;

        const cur = playlistStateRef.current;
        if (cur.playlist.length === 0) return;

        if (cur.trackIndex + 1 < cur.playlist.length) {
          const nextIdx = cur.trackIndex + 1;
          setTrackIndex(nextIdx);
          void playSong(cur.playlist[nextIdx].url);
        } else if (
          cur.audioCategoryId &&
          cur.hasTimer &&
          !cur.timerFinished &&
          cur.remainingSeconds > cur.fadeStartSec + 2
        ) {
          pendingCategoryLoopPlayRef.current = true;
          setTrackIndex(0);
          setCategoryShuffleTick((t) => t + 1);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!pendingCategoryLoopPlayRef.current) return;
    pendingCategoryLoopPlayRef.current = false;
    const first = resolvedPlaylist[0];
    if (first && !songPausedByFadeRef.current) {
      void playSong(first.url);
    }
  }, [resolvedPlaylist]);

  useEffect(() => {
    if (deck.length === 0) return;
    const totalElapsed =
      initialElapsedSeconds +
      Math.floor((Date.now() - sessionStartMsRef.current) / 1000);
    saveNightProgress({
      categoryId,
      currentIndex,
      deckIds: deck.map((c) => c.id),
      completedCount,
      skippedCount,
      elapsedSeconds: totalElapsed,
      updatedAt: Date.now(),
    });
  }, [
    categoryId,
    currentIndex,
    deck,
    completedCount,
    skippedCount,
    initialElapsedSeconds,
  ]);

  useEffect(() => {
    if (finishClearTimerRef.current !== null) {
      window.clearTimeout(finishClearTimerRef.current);
      finishClearTimerRef.current = null;
    }

    setTensionSecond(null);
    setTensionLevel(0);
    setSongVolume(1);
    songPausedByFadeRef.current = false;

    if (!currentChallenge) {
      stopAndReleaseSong();
      return;
    }

    const secs =
      currentChallenge.timerMinutes && currentChallenge.timerMinutes > 0
        ? Math.round(currentChallenge.timerMinutes * 60)
        : 0;

    setHasStarted(false);
    setIsTimerPaused(false);
    setRemainingSeconds(secs);
    setTimerFinished(false);
    setHeartBurstKey(0);
    setFinishBurstKey(0);
    setTrackIndex(0);
    pendingCategoryLoopPlayRef.current = false;
    endTimestampRef.current = null;
    pausedRemainingMsRef.current = secs * 1000;
    notifiedChallengeIdRef.current = null;
    lastSoftTickSecRef.current = null;
    lastTensionSecRef.current = null;

    setChallengeBaseVolume(currentChallenge.audioVolume ?? 1);

    const firstTrack = resolvedPlaylist[0];
    if (firstTrack && /^https?:\/\//i.test(firstTrack.url)) {
      lastPreloadedUrlRef.current = `${currentChallenge.id}:${currentIndex}:${firstTrack.url}`;
      loadSong(firstTrack.url);
    } else {
      lastPreloadedUrlRef.current = '';
      stopAndReleaseSong();
    }
  }, [
    currentChallenge?.id,
    currentChallenge?.timerMinutes,
    currentChallenge?.audioVolume,
    currentIndex,
  ]);

  useEffect(() => {
    if (!currentChallenge || hasStarted || songIsPlaying) return;
    const firstTrack = resolvedPlaylist[trackIndex] ?? resolvedPlaylist[0];
    if (!firstTrack || !/^https?:\/\//i.test(firstTrack.url)) return;
    const key = `${currentChallenge.id}:${currentIndex}:${firstTrack.url}`;
    if (lastPreloadedUrlRef.current === key) return;
    lastPreloadedUrlRef.current = key;
    loadSong(firstTrack.url);
  }, [currentChallenge, currentIndex, resolvedPlaylist, trackIndex, hasStarted, songIsPlaying]);

  useEffect(() => {
    return () => {
      if (finishClearTimerRef.current !== null) {
        window.clearTimeout(finishClearTimerRef.current);
      }
      setTensionLevel(0);
      setSongVolume(1);
      stopAndReleaseSong();
    };
  }, []);

  useEffect(() => {
    if (!currentChallenge || !hasStarted || isTimerPaused || timerFinished) {
      return;
    }
    if (!hasTimer) return;

    if (endTimestampRef.current === null && pausedRemainingMsRef.current > 0) {
      endTimestampRef.current = Date.now() + pausedRemainingMsRef.current;
    }

    const syncFrame = () => {
      if (endTimestampRef.current === null) return;
      const remainingMs = Math.max(0, endTimestampRef.current - Date.now());
      pausedRemainingMsRef.current = remainingMs;
      const remExactSec = remainingMs / 1000;
      const nextSec = Math.ceil(remExactSec);

      setRemainingSeconds((prev) => (prev !== nextSec ? nextSec : prev));

      if (remExactSec <= fadeStartSec && remExactSec > fadeEndSec) {
        if (isSongPlayingNow() && !songPausedByFadeRef.current) {
          const span = Math.max(0.1, fadeStartSec - fadeEndSec);
          const vol = Math.max(0, Math.min(1, (remExactSec - fadeEndSec) / span));
          const writable = setSongVolume(vol);
          if (!writable) {
            pauseSong();
            songPausedByFadeRef.current = true;
          }
        }
      } else if (remExactSec <= fadeEndSec && remExactSec > 0) {
        if (!songPausedByFadeRef.current && isSongPlayingNow()) {
          setSongVolume(0);
          pauseSong();
          songPausedByFadeRef.current = true;
        }
      }

      if (nextSec <= 10 && nextSec > tensionMaxSecond && nextSec >= 7) {
        if (lastSoftTickSecRef.current !== nextSec) {
          lastSoftTickSecRef.current = nextSec;
          playCountdownTick();
        }
      }

      if (nextSec <= tensionMaxSecond && nextSec > 0) {
        setTensionSecond((prev) => (prev !== nextSec ? nextSec : prev));
        setTensionLevel(tensionMaxSecond - nextSec + 1);

        if (lastTensionSecRef.current !== nextSec) {
          lastTensionSecRef.current = nextSec;
          playTensionPulse(nextSec, tensionMaxSecond);
          triggerSecondVibration(nextSec);
        }
      } else if (nextSec > tensionMaxSecond) {
        setTensionSecond(null);
        setTensionLevel(0);
      }

      if (remainingMs <= 0 && notifiedChallengeIdRef.current !== currentChallenge.id) {
        notifiedChallengeIdRef.current = currentChallenge.id;
        endTimestampRef.current = null;
        pausedRemainingMsRef.current = 0;

        if (!songPausedByFadeRef.current && isSongPlayingNow()) {
          setSongVolume(0);
          pauseSong();
          songPausedByFadeRef.current = true;
        }

        setTensionSecond(0);
        setTensionLevel(5);
        playTensionPulse(0, tensionMaxSecond);
        triggerSecondVibration(0);
        playCompletionChime();
        playWhooshSound();

        setTimerFinished(true);
        setFinishBurstKey((k) => k + 1);

        finishClearTimerRef.current = window.setTimeout(() => {
          setTensionSecond(null);
          setTensionLevel(0);
        }, 850);
      }
    };

    syncFrame();
    let timerId: number;
    const scheduleNext = () => {
      const remMs = endTimestampRef.current !== null
        ? Math.max(0, endTimestampRef.current - Date.now())
        : 0;
      const delay = remMs <= (fadeStartSec + 1.5) * 1000 ? 80 : 220;
      timerId = window.setTimeout(() => {
        syncFrame();
        if (endTimestampRef.current !== null) {
          scheduleNext();
        }
      }, delay);
    };
    scheduleNext();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncFrame();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [
    currentChallenge,
    hasStarted,
    isTimerPaused,
    timerFinished,
    hasTimer,
    tensionMaxSecond,
    fadeStartSec,
    fadeEndSec,
  ]);

  const handleStart = useCallback(() => {
    if (!currentChallenge || hasStarted) return;
    setHasStarted(true);
    setIsTimerPaused(false);
    setHeartBurstKey((k) => k + 1);
    playSparkSound();

    if (totalDurationSeconds > 0) {
      pausedRemainingMsRef.current = totalDurationSeconds * 1000;
      endTimestampRef.current = Date.now() + pausedRemainingMsRef.current;
    }

    const track = resolvedPlaylist[trackIndex] ?? resolvedPlaylist[0];
    if (track && /^https?:\/\//i.test(track.url)) {
      songPausedByFadeRef.current = false;
      setChallengeBaseVolume(currentChallenge.audioVolume ?? 1);
      void playSong(track.url);
    }
  }, [currentChallenge, hasStarted, totalDurationSeconds, resolvedPlaylist, trackIndex]);

  const handleSelectTrack = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= resolvedPlaylist.length) return;
      const track = resolvedPlaylist[nextIndex];
      if (!track) return;
      const wasPlaying = isSongPlayingNow() || hasStarted;
      setTrackIndex(nextIndex);
      songPausedByFadeRef.current = false;
      setChallengeBaseVolume(currentChallenge?.audioVolume ?? 1);
      if (wasPlaying) {
        void playSong(track.url);
      } else {
        loadSong(track.url);
      }
    },
    [resolvedPlaylist, hasStarted, currentChallenge?.audioVolume]
  );

  const handleTogglePauseTimer = useCallback(() => {
    playTapSound();
    if (!isTimerPaused) {
      if (endTimestampRef.current !== null) {
        const snapMs = Math.max(0, endTimestampRef.current - Date.now());
        pausedRemainingMsRef.current = snapMs;
        setRemainingSeconds(Math.ceil(snapMs / 1000));
      }
      endTimestampRef.current = null;
      setIsTimerPaused(true);
      setTensionSecond(null);
      setTensionLevel(0);
      setSongVolume(1);
    } else {
      endTimestampRef.current = Date.now() + pausedRemainingMsRef.current;
      setIsTimerPaused(false);
    }
  }, [isTimerPaused]);

  const finishNight = useCallback(
    (finalCompleted: number, finalSkipped: number) => {
      setTensionLevel(0);
      setTensionSecond(null);
      setSongVolume(1);
      stopAndReleaseSong();
      clearNightProgress(categoryId);
      const totalSeconds =
        initialElapsedSeconds +
        Math.floor((Date.now() - sessionStartMsRef.current) / 1000);
      onCompleteSession({
        completed: finalCompleted,
        skipped: finalSkipped,
        totalSeconds,
      });
    },
    [categoryId, initialElapsedSeconds, onCompleteSession]
  );

  const advance = useCallback(
    (wasSkipped: boolean) => {
      setTensionLevel(0);
      setTensionSecond(null);
      setSongVolume(1);
      stopAndReleaseSong();
      playWhooshSound();

      const nextCompleted = wasSkipped ? completedCount : completedCount + 1;
      const nextSkipped = wasSkipped ? skippedCount + 1 : skippedCount;

      if (currentIndex + 1 >= deck.length) {
        finishNight(nextCompleted, nextSkipped);
        return;
      }

      setCompletedCount(nextCompleted);
      setSkippedCount(nextSkipped);
      setCurrentIndex((prev) => prev + 1);
    },
    [completedCount, currentIndex, deck.length, finishNight, skippedCount]
  );

  const goPreviousChallenge = useCallback(() => {
    if (currentIndex <= 0) return;
    setTensionLevel(0);
    setTensionSecond(null);
    setSongVolume(1);
    stopAndReleaseSong();
    playWhooshSound();
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, [currentIndex]);

  const handleExit = useCallback(() => {
    setTensionLevel(0);
    setTensionSecond(null);
    setSongVolume(1);
    stopAndReleaseSong();
    playWhooshSound();
    onExitHome();
  }, [onExitHome]);

  const lighterPool = useMemo(() => {
    if (!currentChallenge) return [];
    const currentRank = getHeatMeta(currentChallenge.heat).rank;
    const sameCatOthers = allChallenges.filter(
      (c) => c.active && c.id !== currentChallenge.id
    );
    const strictlyLighter = sameCatOthers.filter(
      (c) => getHeatMeta(normalizeHeat(c.heat)).rank < currentRank
    );
    return strictlyLighter.length > 0 ? strictlyLighter : sameCatOthers;
  }, [allChallenges, currentChallenge]);

  const handleSwapLighter = () => {
    if (!currentChallenge || lighterPool.length === 0) return;
    setTensionLevel(0);
    setTensionSecond(null);
    setSongVolume(1);
    stopAndReleaseSong();
    playWhooshSound();
    const pick = lighterPool[Math.floor(Math.random() * lighterPool.length)];
    setDeck((prev) => prev.map((item, idx) => (idx === currentIndex ? pick : item)));
  };

  const handlePauseForBreak = () => {
    if (hasStarted && !isTimerPaused && hasTimer && !timerFinished) {
      if (endTimestampRef.current !== null) {
        const snapMs = Math.max(0, endTimestampRef.current - Date.now());
        pausedRemainingMsRef.current = snapMs;
        setRemainingSeconds(Math.ceil(snapMs / 1000));
      }
      endTimestampRef.current = null;
      setIsTimerPaused(true);
      setTensionSecond(null);
      setTensionLevel(0);
      setSongVolume(1);
    }
    if (songIsPlaying) {
      pauseSong();
    }
  };

  const handleResumeFromBreak = () => {
    if (
      hasStarted &&
      isTimerPaused &&
      hasTimer &&
      !timerFinished &&
      pausedRemainingMsRef.current > 0
    ) {
      endTimestampRef.current = Date.now() + pausedRemainingMsRef.current;
      setIsTimerPaused(false);
    }
  };

  const hasAudio = resolvedPlaylist.length > 0;
  const showStartArea = hasTimer || hasAudio;
  const isNextDisabled = hasTimer && remainingSeconds > 0;
  const showPolaroid = Boolean(
    currentChallenge &&
      (currentChallenge.imageUrl?.trim() || currentChallenge.backNote?.trim())
  );

  // Desktop keyboard shortcuts (disabled while typing in inputs)
  useEffect(() => {
    if (!currentChallenge) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        playTapSound();
        if (shortcutsOpen) {
          setShortcutsOpen(false);
        } else {
          setComfortOpen((v) => !v);
        }
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        playTapSound();
        setShortcutsOpen((v) => !v);
        return;
      }

      if (comfortOpen || shortcutsOpen) return;

      if (e.code === 'Space') {
        if (showStartArea) {
          if (!hasStarted) {
            e.preventDefault();
            handleStart();
          } else if (hasTimer && !timerFinished) {
            e.preventDefault();
            handleTogglePauseTimer();
          }
        }
        return;
      }

      if (e.key === 'Enter' || e.code === 'ArrowLeft') {
        if (!isNextDisabled) {
          const activeTag = document.activeElement?.tagName;
          // If user tabbed specifically onto another button (like Skip or Comfort), let Enter click that button
          if (
            e.key === 'Enter' &&
            activeTag === 'BUTTON' &&
            !document.activeElement?.className.includes('btn-primary-ember')
          ) {
            return;
          }
          e.preventDefault();
          playTapSound();
          playSparkSound();
          advance(false);
        }
        return;
      }

      if (e.code === 'ArrowRight') {
        if (currentIndex > 0) {
          e.preventDefault();
          goPreviousChallenge();
        }
        return;
      }

      if (e.code === 'KeyS') {
        e.preventDefault();
        playTapSound();
        advance(true);
        return;
      }

      if (e.code === 'KeyF') {
        if (showPolaroid) {
          e.preventDefault();
          setPolaroidFlipKey((k) => k + 1);
        }
        return;
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        const next = !isSfxEnabled();
        setSfxEnabled(next);
        if (next) playTapSound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    advance,
    comfortOpen,
    currentChallenge,
    currentIndex,
    goPreviousChallenge,
    handleStart,
    handleTogglePauseTimer,
    hasStarted,
    hasTimer,
    isNextDisabled,
    shortcutsOpen,
    showPolaroid,
    showStartArea,
    timerFinished,
  ]);

  if (!currentChallenge) {
    return (
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="relative z-10 min-h-[100dvh] lg:h-[100dvh] flex flex-col items-center justify-center px-5 py-10 text-center"
      >
        <div className="scrapbook-paper torn-edge-note max-w-md p-8 text-[#1B0A22]">
          <h2 className="font-calligraphy text-3xl font-bold mb-3">
            لا توجد تحديات مفعّلة في هذا القسم
          </h2>
          <p className="text-sm text-[#4A253A] mb-6 leading-relaxed">
            جرّبا إضافة أو تفعيل تحديات في هذا القسم من لوحة التحكم.
          </p>
          <button
            type="button"
            onClick={handleExit}
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#14081A] hover:bg-[#230E2D] text-[#F4E8D8] font-bold text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
          >
            العودة للطاولة الرئيسية
          </button>
        </div>
      </motion.main>
    );
  }

  const displayText = formatChallengeText(currentChallenge.text, names);
  const displayBackNote = currentChallenge.backNote
    ? formatChallengeText(currentChallenge.backNote, names)
    : '';
  const inTensionOverlay = tensionSecond !== null;

  return (
    <motion.main
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden flex flex-col items-center px-4 sm:px-6 lg:px-10 pt-16 lg:pt-[54px] pb-6 lg:pb-3"
    >
      {/* Heartbeat Ember/Red Edge Vignette during Final Seconds */}
      <AnimatePresence>
        {inTensionOverlay && (
          <motion.div
            key="tension-vignette"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{
              opacity: candleMode
                ? [0.15, 0.45, 0.22, 0.48, 0.15]
                : [0.3, 0.92, 0.42, 0.96, 0.3],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.72, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none fixed inset-0 z-20"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, transparent 44%, rgba(255, 68, 51, 0.38) 84%, rgba(255, 77, 141, 0.52) 100%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Huge Translucent Center Countdown Overlay (5..0) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center overflow-hidden"
      >
        <AnimatePresence mode="popLayout">
          {tensionSecond !== null && (
            <motion.span
              key={`big-sec-${tensionSecond}`}
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { scale: 1.75, opacity: 0 }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: candleMode ? 0.16 : 0.26 }
                  : { scale: 1, opacity: candleMode ? 0.2 : 0.34 }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { scale: 0.78, opacity: 0 }
              }
              transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
              className="font-neon text-[10rem] sm:text-[14rem] leading-none tabular-nums select-none text-[#FF7A3D]"
              style={{
                textShadow: candleMode
                  ? '0 0 24px rgba(255, 122, 61, 0.3)'
                  : '0 0 42px rgba(255, 77, 141, 0.48)',
              }}
            >
              {tensionSecond}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Centered Max-Width Stage (~1600px on wide screens) */}
      <div className="relative z-20 w-full max-w-[1600px] mx-auto flex-1 min-h-0 flex flex-col">
        {/* Compact Header Bar */}
        <div className="mb-3 lg:mb-[clamp(0.5rem,1.4vh,1rem)] flex items-center justify-between gap-4 px-1 shrink-0">
          <button
            type="button"
            onClick={handleExit}
            className="min-h-[44px] px-3.5 py-2 rounded-lg text-sm font-medium text-[#F4E8D8]/85 hover:text-[#FF7A3D] hover:bg-white/5 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A3D]"
          >
            <ArrowRight className="h-4 w-4" />
            <span>الرئيسية</span>
          </button>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#B98A9E] tabular-nums">
            <span className="font-calligraphy text-lg sm:text-xl text-[#F4E8D8]">
              {category.title}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {currentIndex + 1} / {deck.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapSound();
              setShortcutsOpen(true);
            }}
            aria-label="اختصارات لوحة المفاتيح"
            title="اختصارات لوحة المفاتيح (?)"
            className="min-h-[44px] min-w-[44px] px-3 rounded-lg border border-[#B98A9E]/30 bg-[#1C0B24]/75 hover:border-[#FF4D8D]/65 text-[#F4E8D8] inline-flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#FF4D8D]/50 bg-[#FF4D8D]/15 text-[#FF4D8D] text-xs font-bold leading-none">
              ?
            </span>
            <span className="hidden sm:inline">اختصارات</span>
          </button>
        </div>

        {/* Wide Landscape Stage */}
        <div className="flex-1 min-h-0 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentChallenge.id}-${currentIndex}`}
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.985, y: 6 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.985, y: -6 }
              }
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 min-h-0 flex flex-col"
            >
              <ChallengeStage
                challenge={currentChallenge}
                displayText={displayText}
                displayBackNote={displayBackNote}
                remainingSeconds={remainingSeconds}
                totalSeconds={totalDurationSeconds}
                timerFinished={timerFinished}
                hasStarted={hasStarted}
                isTimerPaused={isTimerPaused}
                heartBurstKey={heartBurstKey}
                finishBurstKey={finishBurstKey}
                tensionSecond={tensionSecond}
                tensionMaxSecond={tensionMaxSecond}
                candleMode={candleMode}
                canGoPrev={currentIndex > 0}
                polaroidFlipKey={polaroidFlipKey}
                showKeyHints={showKeyHints}
                playlist={resolvedPlaylist}
                activeTrackIndex={trackIndex}
                onPrevTrack={() => handleSelectTrack(trackIndex - 1)}
                onNextTrack={() => handleSelectTrack(trackIndex + 1)}
                onStart={handleStart}
                onTogglePauseTimer={handleTogglePauseTimer}
                onSkip={() => advance(true)}
                onNext={() => advance(false)}
                onPrevChallenge={goPreviousChallenge}
                onOpenComfort={() => {
                  playTapSound();
                  setComfortOpen(true);
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ComfortSheet
        open={comfortOpen}
        onClose={() => setComfortOpen(false)}
        onSkipWithoutQuestions={() => advance(true)}
        onSwapLighter={handleSwapLighter}
        onPauseForBreak={handlePauseForBreak}
        onResumeFromBreak={handleResumeFromBreak}
        onEndNight={() => finishNight(completedCount, skippedCount)}
        hasLighterAlternative={lighterPool.length > 0}
      />

      <ShortcutsSheet
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </motion.main>
  );
}
