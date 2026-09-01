"use client";

import Script from "next/script";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

type Player = {
  destroy: () => void;
  getCurrentTime: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};

type PlayerConstructor = new (
  element: HTMLElement,
  options: {
    videoId: string;
    playerVars: Record<string, number | string>;
    events: {
      onReady: () => void;
      onStateChange: (event: { data: number }) => void;
    };
  },
) => Player;

declare global {
  interface Window {
    YT?: {
      Player: PlayerConstructor;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
  }
}

export type YouTubeLearningPlayerHandle = {
  getCurrentTime: () => number;
  seekTo: (seconds: number) => void;
  playSegment: (startSeconds: number, endSeconds: number) => void;
};

type Props = {
  videoId: string;
  title: string;
  initialSeconds: number;
  onTimeUpdate: (seconds: number, shouldPersist: boolean) => void;
};

export const YouTubeLearningPlayer = forwardRef<YouTubeLearningPlayerHandle, Props>(
  function YouTubeLearningPlayer(
    { videoId, title, initialSeconds, onTimeUpdate },
    ref,
  ) {
    const containerRef = useRef<HTMLIFrameElement>(null);
    const playerRef = useRef<Player | null>(null);
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const lastPersistedSecondRef = useRef(initialSeconds);
    const activeSegmentEndRef = useRef<number | null>(null);
    const startingSegmentRef = useRef(false);

    useEffect(() => {
      onTimeUpdateRef.current = onTimeUpdate;
    }, [onTimeUpdate]);

    const readCurrentTime = useCallback((shouldPersist: boolean) => {
      const player = playerRef.current;
      const currentTime = player && typeof player.getCurrentTime === "function"
        ? player.getCurrentTime()
        : initialSeconds;
      const seconds = Math.max(
        0,
        Math.floor(currentTime),
      );
      onTimeUpdateRef.current(seconds, shouldPersist);
      if (shouldPersist) lastPersistedSecondRef.current = seconds;
      return seconds;
    }, [initialSeconds]);

    function createPlayer() {
      if (!containerRef.current || playerRef.current || !window.YT?.Player) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
          start: initialSeconds,
        },
        events: {
          onReady: () => {
            if (initialSeconds > 0) playerRef.current?.seekTo(initialSeconds, true);
          },
          onStateChange: (event) => {
            const states = window.YT?.PlayerState;
            if (states && event.data === states.PLAYING) {
              if (startingSegmentRef.current) startingSegmentRef.current = false;
              else activeSegmentEndRef.current = null;
            }
            if (states && (event.data === states.PAUSED || event.data === states.ENDED)) {
              readCurrentTime(true);
            }
          },
        },
      });
    }

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => readCurrentTime(false),
      seekTo: (seconds: number) => {
        activeSegmentEndRef.current = null;
        const player = playerRef.current;
        if (player && typeof player.seekTo === "function") {
          player.seekTo(seconds, true);
        }
        onTimeUpdateRef.current(seconds, false);
      },
      playSegment: (startSeconds: number, endSeconds: number) => {
        const player = playerRef.current;
        activeSegmentEndRef.current = endSeconds;
        startingSegmentRef.current = true;
        if (player) {
          player.seekTo(startSeconds, true);
          player.playVideo();
        }
        onTimeUpdateRef.current(startSeconds, false);
      },
    }));

    useEffect(() => {
      createPlayer();
    });

    useEffect(() => {
      const interval = window.setInterval(() => {
        if (!playerRef.current) return;
        const seconds = readCurrentTime(false);
        if (activeSegmentEndRef.current !== null && seconds >= activeSegmentEndRef.current) {
          playerRef.current.pauseVideo();
          activeSegmentEndRef.current = null;
          readCurrentTime(true);
          return;
        }
        if (Math.abs(seconds - lastPersistedSecondRef.current) >= 5) {
          readCurrentTime(true);
        }
      }, 1_000);
      const persistBeforeLeaving = () => readCurrentTime(true);
      window.addEventListener("pagehide", persistBeforeLeaving);

      return () => {
        window.clearInterval(interval);
        window.removeEventListener("pagehide", persistBeforeLeaving);
        readCurrentTime(true);
        playerRef.current = null;
      };
    }, [readCurrentTime]);

    return (
      <>
        <div className="saved-player">
          <iframe
            ref={containerRef}
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&start=${Math.floor(initialSeconds)}`}
            title={`${title} 영상 플레이어`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <Script
          src="https://www.youtube.com/iframe_api"
          strategy="afterInteractive"
          onReady={createPlayer}
        />
      </>
    );
  },
);
