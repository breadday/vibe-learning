import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddVideoForm } from "./AddVideoForm";
import {
  learningStoreKey,
  type LearningStore,
} from "../lib/storage/learningStore";

const push = vi.fn();
const videoId = "ABCDEFGHIJK";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  push.mockReset();
  window.localStorage.clear();
});

describe("AddVideoForm", () => {
  it("keeps submission disabled until URL and title are valid", () => {
    render(<AddVideoForm />);

    const submitButton = screen.getByRole("button", { name: "학습에 추가" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: "https://fake-youtube.com/watch?v=ABCDEFGHIJK" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "지원하는 YouTube 주소만 등록할 수 있습니다.",
    );
    expect(submitButton).toBeDisabled();
  });

  it("previews a valid video immediately", () => {
    render(<AddVideoForm />);

    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: `https://youtu.be/${videoId}` },
    });

    expect(screen.getByText(videoId)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: `YouTube 영상 ${videoId} 썸네일` }),
    ).toHaveStyle({
      backgroundImage: `url("https://i.ytimg.com/vi/${videoId}/hqdefault.jpg")`,
    });
  });

  it("stores a new video and navigates to its detail page", () => {
    render(<AddVideoForm />);

    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: `https://youtu.be/${videoId}` },
    });
    fireEvent.change(screen.getByLabelText("학습 제목"), {
      target: { value: "  나의 학습 영상  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "학습에 추가" }));

    const stored = JSON.parse(
      window.localStorage.getItem(learningStoreKey) ?? "null",
    ) as LearningStore;
    expect(stored).toMatchObject({
      schemaVersion: 1,
      lastOpenedVideoId: videoId,
      videos: [
        {
          youtubeId: videoId,
          title: "나의 학습 영상",
          normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
          status: "not-started",
        },
      ],
    });
    expect(push).toHaveBeenCalledWith(`/videos/${videoId}`);
  });

  it("offers navigation to an existing video instead of duplicating it", () => {
    const timestamp = "2026-08-29T10:00:00.000Z";
    const store: LearningStore = {
      schemaVersion: 1,
      videos: [
        {
          youtubeId: videoId,
          title: "기존 영상",
          normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
          status: "not-started",
          playbackMode: "embedded",
          playbackSeconds: 0,
          notes: [],
          segments: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      lastOpenedVideoId: null,
    };
    window.localStorage.setItem(learningStoreKey, JSON.stringify(store));
    render(<AddVideoForm />);

    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: `https://youtu.be/${videoId}` },
    });
    fireEvent.change(screen.getByLabelText("학습 제목"), {
      target: { value: "중복 영상" },
    });
    fireEvent.click(screen.getByRole("button", { name: "학습에 추가" }));

    expect(screen.getByText("이미 학습 목록에 등록된 영상입니다.")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(learningStoreKey) ?? "null")).toEqual(store);

    fireEvent.click(screen.getByRole("button", { name: "기존 영상으로 이동" }));
    expect(push).toHaveBeenCalledWith(`/videos/${videoId}`);
  });
});
