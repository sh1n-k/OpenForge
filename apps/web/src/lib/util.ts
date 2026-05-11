import { toast } from "@/lib/toast";

export interface RunActionOptions {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  toast?: {
    success?: string;
    error?: string | true;
  };
}

export async function runAction<T>(
  work: () => Promise<T>,
  options?: RunActionOptions,
): Promise<T | undefined> {
  try {
    const result = await work();
    options?.onSuccess?.();
    if (options?.toast?.success) {
      toast.success(options.toast.success);
    }
    return result;
  } catch (e) {
    const err = e instanceof Error ? e : new Error("요청 처리 중 오류가 발생했습니다.");
    options?.onError?.(err);
    if (options?.toast?.error !== undefined) {
      const message = options.toast.error === true ? err.message : options.toast.error;
      toast.error(message);
    }
    return undefined;
  }
}

export function errorMessage(e: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  return e instanceof Error ? e.message : fallback;
}
