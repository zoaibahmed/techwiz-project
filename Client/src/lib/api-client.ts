export class ApiHttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`API request failed (${status})`);
    this.name = "ApiHttpError";
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { json?: unknown };

/** Transport only: endpoint, authentication and response schemas await approval. */
export function createApiClient(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
) {
  if (!baseUrl.trim()) throw new Error("An approved API base URL is required.");
  const base = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error(
      "API base URL must be HTTP(S), without credentials, query or fragment.",
    );
  }

  return {
    async request(
      path: string,
      options: RequestOptions = {},
    ): Promise<unknown> {
      // Paths are relative to the approved base; prevent redirecting credentials.
      if (
        !path ||
        path.startsWith("/") ||
        path.includes("\\") ||
        path.includes("#")
      ) {
        throw new Error("Use a contract-approved relative endpoint path.");
      }
      const url = new URL(path, base);
      if (
        url.origin !== base.origin ||
        !url.pathname.startsWith(base.pathname) ||
        url.username ||
        url.password
      ) {
        throw new Error("Endpoint must stay within the approved API base.");
      }
      const { json, ...init } = options;
      const headers = new Headers(init.headers);
      headers.set("Accept", "application/json");
      if (json !== undefined) headers.set("Content-Type", "application/json");
      const response = await fetcher(url, {
        ...init,
        headers,
        body: json === undefined ? undefined : JSON.stringify(json),
        credentials: init.credentials ?? "omit",
        redirect: "error",
      });
      const text = response.status === 204 ? "" : await response.text();
      let body: unknown = text || undefined;
      if (
        text &&
        /\bjson\b/i.test(response.headers.get("content-type") ?? "")
      ) {
        try {
          body = JSON.parse(text);
        } catch {
          if (response.ok) throw new Error("API returned invalid JSON.");
        }
      }
      if (!response.ok) throw new ApiHttpError(response.status, body);
      return body;
    },
  };
}

// Do not instantiate until configuration and API contract are approved.
// Validate the unknown response against that contract at the feature boundary.
