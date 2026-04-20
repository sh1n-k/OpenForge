import type { StrategyValidateResponse } from "@/lib/api";

export type ValidationUiState =
  | "pending"
  | "validating"
  | "valid"
  | "invalid"
  | "error";

export function resolveValidationUiState({
  validation,
  validationError,
  isValidating,
}: {
  validation: StrategyValidateResponse | null;
  validationError: string | null;
  isValidating: boolean;
}): ValidationUiState {
  if (isValidating) return "validating";
  if (validationError) return "error";
  if (!validation) return "pending";
  return validation.valid ? "valid" : "invalid";
}

export function validationUiLabel(state: ValidationUiState) {
  switch (state) {
    case "valid":
      return "검증 통과";
    case "invalid":
      return "검증 실패";
    case "error":
      return "검증 오류";
    case "validating":
      return "검증 중";
    default:
      return "검증 대기";
  }
}

export function validationUiClassName(state: ValidationUiState) {
  switch (state) {
    case "valid":
      return "status-chip status-chip-success";
    case "invalid":
    case "error":
      return "status-chip status-chip-error";
    default:
      return "status-chip status-chip-info";
  }
}

export function validationUiTextClassName(state: ValidationUiState) {
  switch (state) {
    case "valid":
      return "text-success";
    case "invalid":
    case "error":
      return "text-error";
    default:
      return "text-muted";
  }
}
