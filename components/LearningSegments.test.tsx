import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LearningSegments } from "./LearningSegments";

describe("LearningSegments", () => {
  it("does not replace either time with zero when the player time is unavailable", () => {
    render(
      <LearningSegments
        segments={[]}
        youtubeId="ABCDEFGHIJK"
        mode="embedded"
        getCurrentSeconds={() => null}
        onSave={() => true}
        onPlay={vi.fn()}
      />,
    );
    const startInput = screen.getByLabelText("구간 시작 시간");
    const endInput = screen.getByLabelText("구간 종료 시간");
    fireEvent.change(startInput, { target: { value: "1:23" } });
    fireEvent.change(endInput, { target: { value: "2:34" } });

    const buttons = screen.getAllByRole("button", { name: "현재 위치 적용" });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(startInput).toHaveValue("1:23");
    expect(endInput).toHaveValue("2:34");
    expect(screen.getByRole("alert")).toHaveTextContent("현재 위치를 읽을 수 없습니다");
  });
});
