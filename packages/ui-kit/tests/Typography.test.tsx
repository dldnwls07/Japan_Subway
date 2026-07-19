import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Heading, Text, tokens } from "../src";

afterEach(cleanup);

describe("Text", () => {
  it("renders a span with the children by default", () => {
    render(<Text>완주!</Text>);
    const el = screen.getByText("완주!");
    expect(el.tagName).toBe("SPAN");
  });

  it("renders as the requested element via the `as` prop", () => {
    render(<Text as="p">본문</Text>);
    expect(screen.getByText("본문").tagName).toBe("P");
  });

  it("maps the size prop to the token font-size scale", () => {
    render(<Text size="lg">큰 글씨</Text>);
    expect(screen.getByText("큰 글씨").style.fontSize).toBe(`${tokens.fontSize.lg}px`);
  });
});

describe("Heading", () => {
  it("renders an h2 by default", () => {
    render(<Heading>제목</Heading>);
    expect(screen.getByText("제목").tagName).toBe("H2");
  });

  it("honors the level prop", () => {
    render(<Heading level={1}>큰 제목</Heading>);
    const el = screen.getByRole("heading", { level: 1 });
    expect(el.tagName).toBe("H1");
  });
});

describe("tokens", () => {
  it("exposes the brand palette used by the web app", () => {
    expect(tokens.color.accent).toBe("#22d3ee");
    expect(tokens.color.danger).toBe("#f87171");
  });
});
