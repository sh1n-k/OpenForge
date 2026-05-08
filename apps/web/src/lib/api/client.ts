function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? "";
}

export type ApiFetchOptions = RequestInit & {
  suppressAuthRedirect?: boolean;
};

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions,
): Promise<T> {
  const { suppressAuthRedirect, ...requestInit } = init ?? {};
  const isFormData = requestInit.body instanceof FormData;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    credentials: "include",
    ...requestInit,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(requestInit.headers ?? {}),
    },
  });

  if (response.status === 401 && !suppressAuthRedirect) {
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const body = (await response.json()) as {
        detail?: string;
        title?: string;
      };
      message = body.detail ?? body.title ?? message;
    } catch {
      // ignore parsing errors
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
