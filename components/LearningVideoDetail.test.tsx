import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningVideoDetail } from "./LearningVideoDetail";
import {
  learningStoreKey,
  type LearningStore,
} from "../lib/storage/learningStore";

const videoId = "ABCDEFGHIJK";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: videoId }),
}));

beforeEach(() => {
  const store: LearningStore = {
    schemaVersion: 1,
    videos: [
      {
        youtubeId: videoId,
        title: "상태를 바꿀 영상",
        normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
        status: "not-started",
        playbackSeconds: 0,
        notes: [],
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    lastOpenedVideoId: null,
  };
  window.localStorage.clear();
  window.localStorage.setItem(learningStoreKey, JSON.stringify(store));
});

describe("LearningVideoDetail", () => {
  it("persists a status change across remounts", () => {
    const { unmount } = render(<LearningVideoDetail />);

    fireEvent.change(screen.getByLabelText("학습 상태"), {
      target: { value: "in-progress" },
    });

    const stored = JSON.parse(
      window.localStorage.getItem(learningStoreKey) ?? "null",
    ) as LearningStore;
    expect(stored.videos[0]).toMatchObject({
      youtubeId: videoId,
      status: "in-progress",
    });
    expect(stored.videos[0].updatedAt).not.toBe("2026-08-01T00:00:00.000Z");
    expect(stored.lastOpenedVideoId).toBe(videoId);

    unmount();
    render(<LearningVideoDetail />);
    expect(screen.getByLabelText("학습 상태")).toHaveValue("in-progress");
  });

  it("adds, edits, and deletes a trimmed personal note", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<LearningVideoDetail />);

    fireEvent.change(screen.getByLabelText("메모 내용"), {
      target: { value: "  처음 메모  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "메모 추가" }));
    expect(screen.getByText("처음 메모")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("메모 수정 내용"), {
      target: { value: "수정한 메모" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByText("수정한 메모")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.getByText("아직 작성한 개인 메모가 없습니다.")).toBeInTheDocument();
  });

  it("disables blank notes and exposes the 2,000 character limit", () => {
    render(<LearningVideoDetail />);
    expect(screen.getByRole("button", { name: "메모 추가" })).toBeDisabled();
    expect(screen.getByLabelText("메모 내용")).toHaveAttribute("maxlength", "2000");
  });
});
