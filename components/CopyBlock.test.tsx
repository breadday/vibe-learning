import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyBlock } from "./CopyBlock";

describe("CopyBlock", () => {
  it("renders code as inert text and copies the exact string", async () => {
    const payload = "<script>globalThis.compromised = true</script>";
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<CopyBlock title="안전한 복사" value={payload} language="html" />);

    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "복사" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(payload));
    expect(screen.getByRole("button", { name: "복사됨" })).toBeInTheDocument();
  });

  it("disables copying when content is not verified", () => {
    render(<CopyBlock title="검수 대기" value={null} />);
    expect(screen.getByRole("button", { name: "복사" })).toBeDisabled();
  });
});
