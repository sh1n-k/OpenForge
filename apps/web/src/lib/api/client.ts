const defaultBaseUrl = "http://127.0.0.1:8080";

function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultBaseUrl;
  }

  return (
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    defaultBaseUrl
  );
}

async function getServerCookieHeader(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") return {};
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("of_access_token");
    if (token) {
      return { Cookie: `of_access_token=${token.value}` };
    }
  } catch {
    // cookies() throws outside of server component context
  }
  return {};
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
  const serverCookies = await getServerCookieHeader();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    credentials: "include",
    ...requestInit,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...serverCookies,
      ...(requestInit.headers ?? {}),
    },
  });

  if (response.status === 401 && !suppressAuthRedirect) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    const { redirect } = await import("next/navigation");
    redirect("/login");
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
