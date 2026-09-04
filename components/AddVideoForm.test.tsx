import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddVideoForm } from "./AddVideoForm";
import * as idb from "../lib/storage/idb";
import { removeLearningRecord } from "../lib/storage/idb";
import {
  learningStoreKey,
  loadLearningStore,
  type LearningStore,
} from "../lib/storage/learningStore";

const push = vi.fn();
const videoId = "ABCDEFGHIJK";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(async () => {
  await removeLearningRecord();
  push.mockReset();
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: "자동 학습 제목" }), { status: 200 }),
    ),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function startTitleLookup(id = videoId) {
  fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
    target: { value: `https://youtu.be/${id}` },
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

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

  it("loads a title for a valid URL and enables submission", async () => {
    let resolveLookup!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
    );
    render(<AddVideoForm />);

    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: `https://youtu.be/${videoId}` },
    });
    expect(fetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.getByText("영상 제목을 가져오는 중입니다.")).toBeInTheDocument();
    await act(async () => {
      resolveLookup(
        new Response(JSON.stringify({ title: "자동 학습 제목" }), { status: 200 }),
      );
    });
    expect(screen.getByLabelText("학습 제목")).toHaveValue("자동 학습 제목");
    expect(screen.getByRole("button", { name: "학습에 추가" })).toBeEnabled();
    expect(fetch).toHaveBeenCalledWith(
      `/api/youtube-title?videoId=${videoId}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("does not request a title for an empty or invalid URL", async () => {
    render(<AddVideoForm />);

    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: "https://example.com/watch?v=ABCDEFGHIJK" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps a user title when a late lookup completes", async () => {
    let resolveLookup!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
    );
    render(<AddVideoForm />);

    await startTitleLookup();
    fireEvent.change(screen.getByLabelText("학습 제목"), {
      target: { value: "내가 쓴 제목" },
    });
    await act(async () => {
      resolveLookup(
        new Response(JSON.stringify({ title: "늦게 온 제목" }), { status: 200 }),
      );
    });

    expect(screen.getByLabelText("학습 제목")).toHaveValue("내가 쓴 제목");
  });

  it("ignores an old response after the URL changes", async () => {
    const secondVideoId = "LMNOPQRSTUV";
    let resolveFirst!: (response: Response) => void;
    vi.mocked(fetch)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ title: "두 번째 제목" }), { status: 200 }),
      );
    render(<AddVideoForm />);

    await startTitleLookup();
    await startTitleLookup(secondVideoId);
    await act(async () => {
      resolveFirst(
        new Response(JSON.stringify({ title: "첫 번째 제목" }), { status: 200 }),
      );
    });
    await act(async () => {});

    expect(screen.getByLabelText("학습 제목")).toHaveValue("두 번째 제목");
  });

  it("clears only an automatic title when a different video is entered", async () => {
    render(<AddVideoForm />);
    await startTitleLookup();
    await act(async () => {});
    expect(screen.getByLabelText("학습 제목")).toHaveValue("자동 학습 제목");

    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: "https://youtu.be/LMNOPQRSTUV" },
    });
    expect(screen.getByLabelText("학습 제목")).toHaveValue("");

    fireEvent.change(screen.getByLabelText("학습 제목"), {
      target: { value: "직접 쓴 제목" },
    });
    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: "https://youtu.be/ZYXWVUTSRQP" },
    });
    expect(screen.getByLabelText("학습 제목")).toHaveValue("직접 쓴 제목");
  });

  it("shows a non-blocking lookup error and allows manual registration", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));
    render(<AddVideoForm />);
    await startTitleLookup();
    await act(async () => {});

    expect(
      screen.getByText("제목을 자동으로 가져오지 못했습니다. 직접 입력해 주세요."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("학습 제목"), {
      target: { value: "수동 제목" },
    });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "학습에 추가" }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(`/videos/${videoId}`);
    });
  });

  it("aborts the lookup when the component unmounts", async () => {
    let requestSignal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation((_input, init) => {
      requestSignal = init?.signal ?? undefined;
      return new Promise(() => {});
    });
    const { unmount } = render(<AddVideoForm />);
    await startTitleLookup();

    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });

  it("keeps save errors separate from title lookup status", async () => {
    vi.spyOn(idb, "writeLearningRecord").mockRejectedValueOnce(
      new DOMException("blocked", "SecurityError"),
    );
    render(<AddVideoForm />);
    await startTitleLookup();
    await act(async () => {});
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "학습에 추가" }));

    expect(screen.getByText("영상 제목을 자동으로 입력했습니다. 필요하면 수정할 수 있습니다."))
      .toBeInTheDocument();
    expect(
      await screen.findByText("브라우저에 저장할 수 없습니다. 저장소 사용 설정을 확인해 주세요."),
    ).toBeInTheDocument();
  });

  it("stores a new video and navigates to its detail page", async () => {
    render(<AddVideoForm />);

    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: `https://youtu.be/${videoId}` },
    });
    fireEvent.change(screen.getByLabelText("학습 제목"), {
      target: { value: "  나의 학습 영상  " },
    });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "학습에 추가" }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(`/videos/${videoId}`);
    });

    const stored = await loadLearningStore();
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

  it("offers navigation to an existing video instead of duplicating it", async () => {
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
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "학습에 추가" }));

    expect(await screen.findByText("이미 학습 목록에 등록된 영상입니다.")).toBeInTheDocument();
    expect(await loadLearningStore()).toEqual(store);

    fireEvent.click(screen.getByRole("button", { name: "기존 영상으로 이동" }));
    expect(push).toHaveBeenCalledWith(`/videos/${videoId}`);
  });

  it("restores a cached automatic title when a video is re-selected", async () => {
    const videoA = "ABCDEFGHIJK";
    const videoB = "LMNOPQRSTUV";
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ title: "제목 A" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ title: "제목 B" }), { status: 200 }),
      );

    render(<AddVideoForm />);

    await startTitleLookup(videoA);
    await act(async () => {});
    expect(screen.getByLabelText("학습 제목")).toHaveValue("제목 A");

    await startTitleLookup(videoB);
    await act(async () => {});
    expect(screen.getByLabelText("학습 제목")).toHaveValue("제목 B");

    await startTitleLookup(videoA);
    await act(async () => {});
    expect(screen.getByLabelText("학습 제목")).toHaveValue("제목 A");

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("re-fetches a video that previously failed lookup when re-selected", async () => {
    const videoA = "ABCDEFGHIJK";
    const videoB = "LMNOPQRSTUV";
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ title: "제목 B" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ title: "제목 A 재시도" }), { status: 200 }),
      );

    render(<AddVideoForm />);

    await startTitleLookup(videoA);
    await act(async () => {});
    expect(
      screen.getByText(
        "제목을 자동으로 가져오지 못했습니다. 직접 입력해 주세요.",
      ),
    ).toBeInTheDocument();

    await startTitleLookup(videoB);
    await act(async () => {});
    expect(screen.getByLabelText("학습 제목")).toHaveValue("제목 B");

    await startTitleLookup(videoA);
    await act(async () => {});
    expect(screen.getByLabelText("학습 제목")).toHaveValue("제목 A 재시도");

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("does not show a success message when the user title is preserved", async () => {
    let resolveLookup!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
    );
    render(<AddVideoForm />);

    await startTitleLookup();
    fireEvent.change(screen.getByLabelText("학습 제목"), {
      target: { value: "내가 쓴 제목" },
    });
    await act(async () => {
      resolveLookup(
        new Response(JSON.stringify({ title: "늦게 온 제목" }), { status: 200 }),
      );
    });

    expect(screen.getByLabelText("학습 제목")).toHaveValue("내가 쓴 제목");
    expect(
      screen.queryByText(
        "영상 제목을 자동으로 입력했습니다. 필요하면 수정할 수 있습니다.",
      ),
    ).not.toBeInTheDocument();
  });

  it("does not override a user title with a cached automatic title", async () => {
    const videoA = "ABCDEFGHIJK";
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ title: "제목 A" }), { status: 200 }),
    );

    render(<AddVideoForm />);
    await startTitleLookup(videoA);
    await act(async () => {});
    fireEvent.change(screen.getByLabelText("학습 제목"), {
      target: { value: "내가 쓴 제목" },
    });

    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("YouTube 주소를 붙여 넣으세요"), {
      target: { value: `https://youtu.be/${videoA}` },
    });
    await act(async () => {});

    expect(screen.getByLabelText("학습 제목")).toHaveValue("내가 쓴 제목");
    expect(
      screen.queryByText(
        "영상 제목을 자동으로 입력했습니다. 필요하면 수정할 수 있습니다.",
      ),
    ).not.toBeInTheDocument();
  });

  it("does not issue duplicate requests for the same videoId during re-renders", async () => {
    let resolveLookup!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
    );
    const { rerender } = render(<AddVideoForm />);

    await startTitleLookup();
    expect(fetch).toHaveBeenCalledTimes(1);

    rerender(<AddVideoForm />);
    await act(async () => {});
    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLookup(
        new Response(JSON.stringify({ title: "자동 학습 제목" }), {
          status: 200,
        }),
      );
    });
    expect(screen.getByLabelText("학습 제목")).toHaveValue("자동 학습 제목");
  });
});
