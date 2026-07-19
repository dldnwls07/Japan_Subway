import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProgressBar } from "../src";

afterEach(cleanup);

describe("ProgressBar", () => {
  it("exposes a progressbar role with aria-valuenow/min/max", () => {
    render(<ProgressBar value={3} max={10} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("3");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("10");
  });

  it("fills the bar proportionally (value/max)", () => {
    const { container } = render(<ProgressBar value={1} max={4} />);
    const fill = container.querySelector<HTMLElement>("[data-testid='progress-fill']");
    expect(fill).not.toBeNull();
    expect(fill!.style.width).toBe("25%");
  });

  it("clamps values above max to 100%", () => {
    const { container } = render(<ProgressBar value={99} max={10} />);
    const fill = container.querySelector<HTMLElement>("[data-testid='progress-fill']");
    expect(fill!.style.width).toBe("100%");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("10");
  });

  it("clamps negative values to 0%", () => {
    const { container } = render(<ProgressBar value={-5} max={10} />);
    const fill = container.querySelector<HTMLElement>("[data-testid='progress-fill']");
    expect(fill!.style.width).toBe("0%");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });

  it("defaults max to 1 so it accepts a 0..1 ratio", () => {
    const { container } = render(<ProgressBar value={0.5} />);
    const fill = container.querySelector<HTMLElement>("[data-testid='progress-fill']");
    expect(fill!.style.width).toBe("50%");
  });

  it("treats a non-positive max as empty instead of dividing by zero", () => {
    const { container } = render(<ProgressBar value={5} max={0} />);
    const fill = container.querySelector<HTMLElement>("[data-testid='progress-fill']");
    expect(fill!.style.width).toBe("0%");
  });

  it("applies an accessible label when provided", () => {
    render(<ProgressBar value={1} max={2} label="진행도" />);
    expect(screen.getByRole("progressbar", { name: "진행도" })).toBeTruthy();
  });
});
