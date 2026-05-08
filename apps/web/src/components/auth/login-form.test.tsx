import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("LoginForm", () => {
  it("should_render_password_input_when_form_rendered", () => {
    render(<LoginForm />);

    expect(screen.getByPlaceholderText("운영 비밀번호를 입력하세요")).toBeInTheDocument();
    expect(screen.getByText("비밀번호")).toBeInTheDocument();
  });

  it("should_render_login_button_when_form_rendered", () => {
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  });

  it("should_render_openforge_heading_when_form_rendered", () => {
    render(<LoginForm />);

    expect(screen.getByRole("heading", { name: "OpenForge" })).toBeInTheDocument();
  });
});
