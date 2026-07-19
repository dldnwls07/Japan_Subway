import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "../src";

afterEach(cleanup);

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>시작</Button>);
    expect(screen.getByRole("button", { name: "시작" })).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>시작</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        시작
      </Button>
    );
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to the primary variant and switches with the variant prop", () => {
    const { rerender } = render(<Button>A</Button>);
    const primaryBg = getComputedStyle(screen.getByRole("button")).backgroundColor;
    rerender(<Button variant="secondary">A</Button>);
    const secondaryBg = getComputedStyle(screen.getByRole("button")).backgroundColor;
    expect(primaryBg).not.toBe(secondaryBg);
  });

  it("sets type=button by default to avoid accidental form submits", () => {
    render(<Button>A</Button>);
    expect((screen.getByRole("button") as HTMLButtonElement).type).toBe("button");
  });

  it("forwards arbitrary button props such as aria-label", () => {
    render(<Button aria-label="다시 시작">↻</Button>);
    expect(screen.getByRole("button", { name: "다시 시작" })).toBeTruthy();
  });
});
