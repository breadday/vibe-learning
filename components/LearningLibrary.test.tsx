import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningLibrary } from "./LearningLibrary";
import {
  learningStoreKey,
  loadLearningStore,
  type LearningStore,
  type LearningVideo,
} from "../lib/storage/learningStore";
import { removeLearningRecord } from "../lib/storage/idb";

function video(
  youtubeId: string,
  title: string,
  createdAt: string,
  updatedAt: string,
  status: LearningVideo["status"] = "not-started",
): LearningVideo {
  return {
    youtubeId,
    title,
  normalizedUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
  status,
  playbackMode: "embedded",
  playbackSeconds: 0,
  notes: [],
  segments: [],
  createdAt,
    updatedAt,
  };
}

const videos = [
  video("AAAAAAAAAAA", "오래된 영상", "2026-08-01T00:00:00.000Z", "2026-08-03T00:00:00.000Z"),
  video("BBBBBBBBBBB", "이어서 볼 영상", "2026-08-02T00:00:00.000Z", "2026-08-02T00:00:00.000Z", "in-progress"),
  video("CCCCCCCCCCC", "최근 수정 영상", "2026-08-03T00:00:00.000Z", "2026-08-04T00:00:00.000Z"),
];

function store(): LearningStore {
  return { schemaVersion: 1, videos, lastOpenedVideoId: "BBBBBBBBBBB" };
}

beforeEach(async () => {
  await removeLearningRecord();
  window.localStorage.clear();
  window.localStorage.setItem(learningStoreKey, JSON.stringify(store()));
  vi.restoreAllMocks();
});

describe("LearningLibrary", () => {
  it("shows the last unfinished video as the single continue item", async () => {
    render(<LearningLibrary />);

    const section = (await screen.findByText("이어서 학습")).closest("section");
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getByText("이어서 볼 영상")).toBeInTheDocument();
    expect(within(section as HTMLElement).getAllByRole("article")).toHaveLength(1);
  });

  it("sorts the full list by most recently updated", async () => {
    render(<LearningLibrary />);

    const section = (await screen.findByText("전체 학습 목록")).closest("section");
    const titles = within(section as HTMLElement)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(["최근 수정 영상", "오래된 영상", "이어서 볼 영상"]);
  });

  it("keeps a video when deletion is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<LearningLibrary />);

    const section = (await screen.findByText("전체 학습 목록")).closest("section");
    fireEvent.click(within(section as HTMLElement).getAllByRole("button", { name: "삭제" })[0]);

    expect(await loadLearningStore()).toEqual(store());
  });

  it("deletes a confirmed video and keeps the change after remount", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { unmount } = render(<LearningLibrary />);

    const section = (await screen.findByText("전체 학습 목록")).closest("section");
    const newestCard = within(section as HTMLElement).getByText("최근 수정 영상").closest("article");
    fireEvent.click(within(newestCard as HTMLElement).getByRole("button", { name: "삭제" }));
    await waitFor(() => {
      expect(within(section as HTMLElement).queryByText("최근 수정 영상")).not.toBeInTheDocument();
    });

    unmount();
    render(<LearningLibrary />);
    await screen.findByText("전체 학습 목록");
    expect(screen.queryAllByText("최근 수정 영상")).toHaveLength(0);
  });
});
