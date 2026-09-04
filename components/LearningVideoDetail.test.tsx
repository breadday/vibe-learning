import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatTimestamp, LearningVideoDetail } from "./LearningVideoDetail";
import {
  learningStoreKey,
  loadLearningStore,
  type LearningStore,
} from "../lib/storage/learningStore";
import { removeLearningRecord } from "../lib/storage/idb";

const videoId = "ABCDEFGHIJK";
const seekTo = vi.hoisted(() => vi.fn());
const playSegment = vi.hoisted(() => vi.fn());
const getCurrentTime = vi.hoisted(() => vi.fn(() => 0));

vi.mock("./YouTubeLearningPlayer", async () => {
  const React = await import("react");

  return {
    YouTubeLearningPlayer: React.forwardRef(function MockPlayer(
      { initialSeconds }: { initialSeconds: number },
      ref: React.ForwardedRef<{ getCurrentTime: () => number; seekTo: (seconds: number) => void; playSegment: (start: number, end: number) => void }>,
    ) {
      React.useImperativeHandle(ref, () => ({
        getCurrentTime: () => getCurrentTime() || initialSeconds,
        seekTo,
        playSegment,
      }));
      return <div aria-label="테스트 영상 플레이어" />;
    }),
  };
});

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: videoId }),
}));

beforeEach(async () => {
  await removeLearningRecord();
  seekTo.mockClear();
  playSegment.mockClear();
  getCurrentTime.mockReset();
  getCurrentTime.mockReturnValue(0);
  const store: LearningStore = {
    schemaVersion: 1,
    videos: [
      {
        youtubeId: videoId,
        title: "상태를 바꿀 영상",
        normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
        status: "not-started",
        playbackMode: "embedded",
        playbackSeconds: 0,
        notes: [],
        segments: [],
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    lastOpenedVideoId: null,
  };
  window.localStorage.clear();
  window.localStorage.setItem(learningStoreKey, JSON.stringify(store));
});

async function renderDetail() {
  const result = render(<LearningVideoDetail />);
  await screen.findByLabelText("학습 상태");
  return result;
}

describe("LearningVideoDetail", () => {
  it("persists a status change across remounts", async () => {
    const { unmount } = await renderDetail();

    fireEvent.change(screen.getByLabelText("학습 상태"), {
      target: { value: "in-progress" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("학습 상태")).toHaveValue("in-progress");
    });
    const stored = await loadLearningStore();
    expect(stored.videos[0]).toMatchObject({
      youtubeId: videoId,
      status: "in-progress",
    });
    expect(stored.videos[0].updatedAt).not.toBe("2026-08-01T00:00:00.000Z");
    expect(stored.lastOpenedVideoId).toBe(videoId);

    unmount();
    await renderDetail();
    expect(screen.getByLabelText("학습 상태")).toHaveValue("in-progress");
  });

  it("adds, edits, and deletes a trimmed personal note", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await renderDetail();

    fireEvent.change(screen.getByLabelText("메모 내용"), {
      target: { value: "  처음 메모  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "메모 저장" }));
    await screen.findByRole("button", { name: "[0:00] 위치로 이동" });
    expect(screen.getByText("처음 메모")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("메모 수정 내용"), {
      target: { value: "수정한 메모" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => {
      expect(screen.queryByLabelText("메모 수정 내용")).not.toBeInTheDocument();
    });
    expect(screen.getByText("수정한 메모")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(await screen.findByText("아직 작성한 개인 메모가 없습니다.")).toBeInTheDocument();
  });

  it("disables blank notes and exposes the 2,000 character limit", async () => {
    await renderDetail();
    expect(screen.getByRole("button", { name: "메모 저장" })).toBeDisabled();
    expect(screen.getByLabelText("메모 내용")).toHaveAttribute("maxlength", "2000");
  });

  it("shows the saved playback position as a clickable note timestamp", async () => {
    const store = JSON.parse(
      window.localStorage.getItem(learningStoreKey) ?? "null",
    ) as LearningStore;
    store.videos[0].playbackSeconds = 763;
    window.localStorage.setItem(learningStoreKey, JSON.stringify(store));

    await renderDetail();
    fireEvent.change(screen.getByLabelText("메모 내용"), {
      target: { value: "현재 위치 메모" },
    });
    fireEvent.click(screen.getByRole("button", { name: "메모 저장" }));

    expect(
      await screen.findByRole("button", { name: "[12:43] 위치로 이동" }),
    ).toBeInTheDocument();
    const stored = await loadLearningStore();
    expect(stored.videos[0].notes[0].timestampSeconds).toBe(763);
  });

  it("seeks to the note timestamp when its accessible button is clicked", async () => {
    const store = JSON.parse(
      window.localStorage.getItem(learningStoreKey) ?? "null",
    ) as LearningStore;
    store.videos[0].notes = [{
      id: "123e4567-e89b-42d3-a456-426614174000",
      timestampSeconds: 185,
      text: "다시 볼 부분",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }];
    window.localStorage.setItem(learningStoreKey, JSON.stringify(store));

    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "[3:05] 위치로 이동" }));

    expect(seekTo).toHaveBeenCalledWith(185);
  });

  it("switches from the existing embedded player to the external workspace", async () => {
    await renderDetail();
    expect(screen.getByLabelText("테스트 영상 플레이어")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "YouTube에서 학습하기" }));

    await screen.findByLabelText("외부 재생 도구");
    expect(screen.queryByLabelText("테스트 영상 플레이어")).not.toBeInTheDocument();
    expect(screen.getByLabelText("외부 재생 도구")).toBeInTheDocument();
    expect(document.querySelector(".detail-player-column")).not.toBeInTheDocument();
    expect(document.querySelector(".saved-player")).not.toBeInTheDocument();
    const workspace = document.querySelector(".external-learning-workspace");
    const segments = screen.getByRole("region", { name: "학습 구간" });
    const notes = screen.getByRole("region", { name: "개인 메모" });
    expect(workspace).toContainElement(segments);
    expect(workspace).toContainElement(notes);
    expect(segments.parentElement).toBe(workspace);
    expect(notes.parentElement).toBe(workspace);
    expect(segments.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(screen.getByLabelText("외부 재생 도구").closest(".external-learning-workspace"))
      .toBeNull();
    expect(screen.getByRole("link", { name: "YouTube에서 보기" }))
      .toHaveAttribute("href", `https://www.youtube.com/watch?v=${videoId}`);
    expect(screen.getByRole("link", { name: "YouTube에서 보기" }))
      .toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "YouTube에서 보기" }))
      .toHaveAttribute("rel", "noreferrer");
  });

  it("saves an external position and uses it for a new note", async () => {
    const store = JSON.parse(
      window.localStorage.getItem(learningStoreKey) ?? "null",
    ) as LearningStore;
    store.videos[0].playbackMode = "external";
    window.localStorage.setItem(learningStoreKey, JSON.stringify(store));

    await renderDetail();
    fireEvent.change(screen.getByLabelText("마지막 학습 위치"), {
      target: { value: "12:43" },
    });
    fireEvent.click(screen.getByRole("button", { name: "위치 저장" }));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "YouTube에서 보기" }))
        .toHaveAttribute("href", `https://www.youtube.com/watch?v=${videoId}&t=763s`);
    });
    fireEvent.change(screen.getByLabelText("메모 내용"), {
      target: { value: "외부 재생 메모" },
    });
    fireEvent.click(screen.getByRole("button", { name: "메모 저장" }));
    await screen.findByRole("button", { name: "[12:43] 위치로 이동" });

    const saved = await loadLearningStore();
    expect(saved.videos[0].playbackSeconds).toBe(763);
    expect(saved.videos[0].notes[0].timestampSeconds).toBe(763);
    expect(saved.videos[0].updatedAt).not.toBe("2026-08-01T00:00:00.000Z");
    expect(saved.lastOpenedVideoId).toBe(videoId);
    expect(screen.getByRole("link", { name: "YouTube에서 보기" }))
      .toHaveAttribute("href", `https://www.youtube.com/watch?v=${videoId}&t=763s`);
  });

  it("rejects an invalid external time and opens note timestamps on YouTube", async () => {
    const store = JSON.parse(
      window.localStorage.getItem(learningStoreKey) ?? "null",
    ) as LearningStore;
    store.videos[0].playbackMode = "external";
    store.videos[0].notes = [{
      id: "123e4567-e89b-42d3-a456-426614174000",
      timestampSeconds: 1_100,
      text: "다시 볼 부분",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }];
    window.localStorage.setItem(learningStoreKey, JSON.stringify(store));
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    await renderDetail();
    fireEvent.change(screen.getByLabelText("마지막 학습 위치"), {
      target: { value: "-1:20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "위치 저장" }));
    expect(screen.getByRole("alert")).toHaveTextContent("올바른 시간을 입력");
    const saved = await loadLearningStore();
    expect(saved.videos[0].playbackSeconds).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "[18:20] 위치로 이동" }));
    expect(open).toHaveBeenCalledWith(
      `https://www.youtube.com/watch?v=${videoId}&t=1100s`,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("returns to the embedded player without losing external learning data", async () => {
    const store = JSON.parse(
      window.localStorage.getItem(learningStoreKey) ?? "null",
    ) as LearningStore;
    store.videos[0].playbackMode = "external";
    store.videos[0].playbackSeconds = 245;
    store.videos[0].notes = [{
      id: "123e4567-e89b-42d3-a456-426614174000",
      timestampSeconds: 245,
      text: "보존할 메모",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }];
    window.localStorage.setItem(learningStoreKey, JSON.stringify(store));

    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "앱에서 재생 시도" }));

    expect(await screen.findByLabelText("테스트 영상 플레이어")).toBeInTheDocument();
    expect(screen.getByText("보존할 메모")).toBeInTheDocument();
    const saved = await loadLearningStore();
    expect(saved.videos[0]).toMatchObject({
      playbackMode: "embedded",
      playbackSeconds: 245,
    });
    expect(saved.videos[0].notes).toHaveLength(1);
  });

  it("formats timestamps beyond one hour without losing minute padding", () => {
    expect(formatTimestamp(3_723)).toBe("[1:02:03]");
  });

  it("uses the external saved position and creates a segment timestamp link", async () => {
    const store = JSON.parse(window.localStorage.getItem(learningStoreKey) ?? "null") as LearningStore;
    store.videos[0].playbackMode = "external";
    store.videos[0].playbackSeconds = 125;
    window.localStorage.setItem(learningStoreKey, JSON.stringify(store));
    await renderDetail();
    fireEvent.change(screen.getByLabelText("구간 제목"), { target: { value: "외부 구간" } });
    fireEvent.click(screen.getAllByRole("button", { name: "마지막 위치 적용" })[0]);
    fireEvent.change(screen.getByLabelText("구간 종료 시간"), { target: { value: "2:30" } });
    fireEvent.click(screen.getByRole("button", { name: "구간 추가" }));
    expect(await screen.findByRole("link", { name: "YouTube에서 시작" })).toHaveAttribute("href", `https://www.youtube.com/watch?v=${videoId}&t=125s`);
  });

  it("adds, validates, edits, plays, and deletes a learning segment", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await renderDetail();
    fireEvent.change(screen.getByLabelText("구간 제목"), { target: { value: "핵심 구간" } });
    fireEvent.change(screen.getByLabelText("구간 시작 시간"), { target: { value: "00:20" } });
    fireEvent.change(screen.getByLabelText("구간 종료 시간"), { target: { value: "00:10" } });
    fireEvent.click(screen.getByRole("button", { name: "구간 추가" }));
    expect(screen.getByRole("alert")).toHaveTextContent("시작 시간보다 커야");

    fireEvent.change(screen.getByLabelText("구간 종료 시간"), { target: { value: "00:40" } });
    fireEvent.click(screen.getByRole("button", { name: "구간 추가" }));
    expect(await screen.findByText("00:20–00:40")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "구간 재생" }));
    expect(playSegment).toHaveBeenCalledWith(20, 40);
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("구간 제목"), { target: { value: "수정 구간" } });
    fireEvent.click(screen.getByRole("button", { name: "구간 수정 저장" }));
    expect(await screen.findByText("수정 구간")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(await screen.findByText("아직 저장한 학습 구간이 없습니다.")).toBeInTheDocument();
  });

  it("applies the player's current time when each segment time button is clicked", async () => {
    getCurrentTime.mockReturnValueOnce(83).mockReturnValueOnce(147);
    await renderDetail();

    const applyButtons = screen.getAllByRole("button", { name: "현재 위치 적용" });
    fireEvent.click(applyButtons[0]);
    fireEvent.click(applyButtons[1]);

    expect(screen.getByLabelText("구간 시작 시간")).toHaveValue("1:23");
    expect(screen.getByLabelText("구간 종료 시간")).toHaveValue("2:27");
    expect(getCurrentTime).toHaveBeenCalledTimes(2);
  });
});
