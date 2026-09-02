import { act, createRef } from "react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  YouTubeLearningPlayer,
  type YouTubeLearningPlayerHandle,
} from "./YouTubeLearningPlayer";

vi.mock("next/script", () => ({ default: () => null }));

afterEach(() => {
  vi.useRealTimers();
  delete window.YT;
});

describe("YouTubeLearningPlayer", () => {
  it("connects when the YouTube API becomes available after the component renders", () => {
    vi.useFakeTimers();
    const onTimeUpdate = vi.fn();
    const ref = createRef<YouTubeLearningPlayerHandle>();

    render(
      <YouTubeLearningPlayer
        ref={ref}
        videoId="ABCDEFGHIJK"
        title="테스트 영상"
        initialSeconds={0}
        onTimeUpdate={onTimeUpdate}
      />,
    );

    class MockPlayer {
      constructor(_element: HTMLElement, options: { events: { onReady: () => void } }) {
        options.events.onReady();
      }
      destroy() {}
      getCurrentTime() { return 83; }
      pauseVideo() {}
      playVideo() {}
      seekTo() {}
    }

    window.YT = {
      Player: MockPlayer,
      PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
    };
    act(() => vi.advanceTimersByTime(100));

    expect(ref.current?.getCurrentTime()).toBe(83);
    expect(onTimeUpdate).toHaveBeenLastCalledWith(83, false);
  });
});
