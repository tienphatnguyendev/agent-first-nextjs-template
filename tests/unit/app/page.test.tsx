// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders a neutral foundation shell", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: "Agent-First Modular Monolith",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ready for the first product module."),
    ).toBeInTheDocument();
  });
});
