import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BackupRestore } from "./BackupRestore";
import { LearningLibrary } from "./LearningLibrary";
import {
  learningStoreKey,
  type LearningStore,
  type LearningVideo,
} from "../lib/storage/learningStore";

function video(youtubeId: string, title: string, updatedAt: string): LearningVideo {
  return {
    youtubeId,
    title,
    normalizedUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    status: "not-started",
    playbackSeconds: 0,
    notes: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt,
  };
}

function store(videos: LearningVideo[]): LearningStore {
  return { schemaVersion: 1, videos, lastOpenedVideoId: null };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("BackupRestore", () => {
  it("rejects a damaged JSON file", async () => {
    render(<BackupRestore />);
    const file = { text: async () => "not json" };

    fireEvent.change(screen.getByLabelText("JSON 가져오기"), {
      target: { files: [file] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "JSON 파일을 읽을 수 없습니다.",
    );
  });

  it("previews duplicates and merges using the newest update", async () => {
    const current = store([
      video("AAAAAAAAAAA", "현재 제목", "2026-08-01T00:00:00.000Z"),
    ]);
    const incoming = store([
      video("AAAAAAAAAAA", "백업 최신 제목", "2026-08-03T00:00:00.000Z"),
      video("BBBBBBBBBBB", "백업 새 영상", "2026-08-02T00:00:00.000Z"),
    ]);
    window.localStorage.setItem(learningStoreKey, JSON.stringify(current));
    render(<BackupRestore />);

    fireEvent.change(screen.getByLabelText("JSON 가져오기"), {
      target: { files: [{ text: async () => JSON.stringify(incoming) }] },
    });

    expect(await screen.findByText("영상 2개 · 메모 0개 · 현재 목록과 중복 1개")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "병합" }));

    await waitFor(() => {
      const saved = JSON.parse(
        window.localStorage.getItem(learningStoreKey) ?? "null",
      ) as LearningStore;
      expect(saved.videos).toHaveLength(2);
      expect(saved.videos.find((item) => item.youtubeId === "AAAAAAAAAAA")?.title)
        .toBe("백업 최신 제목");
    });
  });

  it("overwrites the current list only after preview", async () => {
    const current = store([
      video("AAAAAAAAAAA", "현재 영상", "2026-08-01T00:00:00.000Z"),
    ]);
    const incoming = store([
      video("BBBBBBBBBBB", "교체 영상", "2026-08-02T00:00:00.000Z"),
    ]);
    window.localStorage.setItem(learningStoreKey, JSON.stringify(current));
    render(<BackupRestore />);

    fireEvent.change(screen.getByLabelText("JSON 가져오기"), {
      target: { files: [{ text: async () => JSON.stringify(incoming) }] },
    });
    await screen.findByText("가져오기 미리보기");
    fireEvent.click(screen.getByRole("button", { name: "덮어쓰기" }));

    expect(JSON.parse(window.localStorage.getItem(learningStoreKey) ?? "null"))
      .toEqual(incoming);
  });

  it("refreshes the visible learning list after restoring", async () => {
    const current = store([
      video("AAAAAAAAAAA", "복원 전 영상", "2026-08-01T00:00:00.000Z"),
    ]);
    const incoming = store([
      video("BBBBBBBBBBB", "복원 후 영상", "2026-08-02T00:00:00.000Z"),
    ]);
    window.localStorage.setItem(learningStoreKey, JSON.stringify(current));
    render(
      <>
        <LearningLibrary />
        <BackupRestore />
      </>,
    );

    fireEvent.change(screen.getByLabelText("JSON 가져오기"), {
      target: { files: [{ text: async () => JSON.stringify(incoming) }] },
    });
    await screen.findByText("가져오기 미리보기");
    fireEvent.click(screen.getByRole("button", { name: "덮어쓰기" }));

    await waitFor(() => {
      expect(screen.queryAllByText("복원 전 영상")).toHaveLength(0);
      expect(screen.getAllByText("복원 후 영상").length).toBeGreaterThan(0);
    });
  });
});
