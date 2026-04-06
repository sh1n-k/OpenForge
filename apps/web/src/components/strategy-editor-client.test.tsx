import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrategyEditorClient } from "@/components/strategy-editor-client";
import * as apiModule from "@/lib/api";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("StrategyEditorClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
  });

  it("enables save after builder validation succeeds", async () => {
    vi.spyOn(apiModule, "validateStrategy").mockResolvedValue({
      valid: true,
      normalizedSpec: {
        version: "1.0",
      },
      yamlPreview: "metadata:\n  name: Builder Draft",
      errors: [],
      warnings: [],
      summary: "Validation passed",
    });

    render(
      <StrategyEditorClient
        strategy={{
          id: "strategy-1",
          name: "Builder Draft",
          description: "draft",
          strategyType: "builder",
          status: "draft",
          latestVersionId: "version-1",
          latestVersionNumber: 1,
          versionCount: 1,
          universeCount: 0,
          latestValidationStatus: "invalid_legacy_draft",
          latestValidationErrors: [],
          latestValidationWarnings: [],
          latestVersion: {
            id: "version-1",
            versionNumber: 1,
            payloadFormat: "builder_json",
            payload: {},
            validationStatus: "invalid_legacy_draft",
            validationErrors: [],
            validationWarnings: [],
            changeSummary: "initial",
            createdAt: "2026-03-31T22:30:00+09:00",
          },
          universes: [],
          createdAt: "2026-03-31T22:30:00+09:00",
          updatedAt: "2026-03-31T22:30:00+09:00",
        }}
      />,
    );

    expect(screen.getByText("전략 정보")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiModule.validateStrategy).toHaveBeenCalled();
    });

    expect(
      screen.getByRole("button", {
        name: "새 버전 저장",
      }),
    ).toBeEnabled();
  });

  it("shows syntax errors for code mode and keeps save disabled", async () => {
    vi.spyOn(apiModule, "validateStrategy").mockResolvedValue({
      valid: false,
      normalizedSpec: null,
      yamlPreview: "",
      errors: [
        {
          category: "syntax",
          message: "mapping values are not allowed here",
        },
      ],
      warnings: [],
      summary: "Validation failed with 1 error(s)",
    });

    render(
      <StrategyEditorClient
        strategy={{
          id: "strategy-2",
          name: "Code Draft",
          description: "code",
          strategyType: "code",
          status: "draft",
          latestVersionId: "version-2",
          latestVersionNumber: 1,
          versionCount: 1,
          universeCount: 0,
          latestValidationStatus: "invalid",
          latestValidationErrors: [],
          latestValidationWarnings: [],
          latestVersion: {
            id: "version-2",
            versionNumber: 1,
            payloadFormat: "code_text",
            payload: {
              source: "metadata:\n name: broken",
              sourceKind: "openforge_yaml",
            },
            validationStatus: "invalid",
            validationErrors: [],
            validationWarnings: [],
            changeSummary: "initial",
            createdAt: "2026-03-31T22:30:00+09:00",
          },
          universes: [],
          createdAt: "2026-03-31T22:30:00+09:00",
          updatedAt: "2026-03-31T22:30:00+09:00",
        }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("[syntax] mapping values are not allowed here"),
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText("검증 실패").length).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByRole("button", {
        name: "새 버전 저장",
      }),
    ).toBeDisabled();
  });

  it("shows validation error state when the validation request fails", async () => {
    vi.spyOn(apiModule, "validateStrategy").mockRejectedValue(
      new Error("validation service unavailable"),
    );

    render(
      <StrategyEditorClient
        strategy={{
          id: "strategy-3",
          name: "Builder Draft",
          description: "draft",
          strategyType: "builder",
          status: "draft",
          latestVersionId: "version-3",
          latestVersionNumber: 1,
          versionCount: 1,
          universeCount: 0,
          latestValidationStatus: "invalid",
          latestValidationErrors: [],
          latestValidationWarnings: [],
          latestVersion: {
            id: "version-3",
            versionNumber: 1,
            payloadFormat: "builder_json",
            payload: {},
            validationStatus: "invalid",
            validationErrors: [],
            validationWarnings: [],
            changeSummary: "initial",
            createdAt: "2026-03-31T22:30:00+09:00",
          },
          universes: [],
          createdAt: "2026-03-31T22:30:00+09:00",
          updatedAt: "2026-03-31T22:30:00+09:00",
        }}
      />,
    );

    await waitFor(() => {
      expect(apiModule.validateStrategy).toHaveBeenCalled();
    });

    expect(screen.getAllByText("validation service unavailable").length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText("검증 오류").length).toBeGreaterThanOrEqual(1);
  });

  it("shows pending state before validation finishes and then switches to failure", async () => {
    vi.spyOn(apiModule, "validateStrategy").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              valid: false,
              normalizedSpec: null,
              yamlPreview: "",
              errors: [],
              warnings: [],
              summary: "Validation failed",
            });
          }, 10);
        }),
    );

    render(
      <StrategyEditorClient
        strategy={{
          id: "strategy-4",
          name: "Pending Draft",
          description: "draft",
          strategyType: "builder",
          status: "draft",
          latestVersionId: "version-4",
          latestVersionNumber: 1,
          versionCount: 1,
          universeCount: 0,
          latestValidationStatus: "invalid",
          latestValidationErrors: [],
          latestValidationWarnings: [],
          latestVersion: {
            id: "version-4",
            versionNumber: 1,
            payloadFormat: "builder_json",
            payload: {},
            validationStatus: "invalid",
            validationErrors: [],
            validationWarnings: [],
            changeSummary: "initial",
            createdAt: "2026-03-31T22:30:00+09:00",
          },
          universes: [],
          createdAt: "2026-03-31T22:30:00+09:00",
          updatedAt: "2026-03-31T22:30:00+09:00",
        }}
      />,
    );

    expect(screen.getAllByText("검증 대기").length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(apiModule.validateStrategy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getAllByText("검증 실패").length).toBeGreaterThanOrEqual(1);
    });
  });
});
