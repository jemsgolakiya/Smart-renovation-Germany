const API_BASE_URL = "http://localhost:8000/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions extends RequestInit {
	method?: HttpMethod;
	requireCsrf?: boolean;
}

const CSRF_HTTP_METHODS: HttpMethod[] = ["POST", "PUT", "PATCH", "DELETE"];

const getCsrfToken = (): string => {
	if (typeof document === "undefined" || !document.cookie) {
		return "";
	}

	const name = "csrftoken";
	const cookies = document.cookie.split(";") ?? [];

	for (const cookie of cookies) {
		const trimmedCookie = cookie.trim();
		if (trimmedCookie.startsWith(`${name}=`)) {
			return decodeURIComponent(trimmedCookie.substring(name.length + 1));
		}
	}

	return "";
};

const fetchCsrfToken = async (): Promise<string> => {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
			method: "GET",
			credentials: "include",
		});

		const data = await response.json();
		return data.csrfToken ?? "";
	} catch (error) {
		console.error("Failed to get CSRF token:", error);
		return "";
	}
};

const ensureCsrfToken = async (): Promise<string> => {
	const token = getCsrfToken();
	return token || (await fetchCsrfToken());
};

const redirectToLogin = () => {
	if (typeof window !== "undefined") {
		window.location.href = "/login";
	}
};

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		if (response.status === 401) {
			redirectToLogin();
		}

		// Try to extract a meaningful error message from JSON or text
		let message = `HTTP error! status: ${response.status}`;
		try {
			const contentType = response.headers.get("content-type") || "";
			if (contentType.includes("application/json")) {
				const data = await response.json();
				// Common DRF patterns:
				// - { detail: "..." }
				// - { field: ["msg1", "msg2"], ... }
				// - { non_field_errors: ["..."] }
				if (data) {
					if (typeof data.detail === "string" && data.detail.trim().length > 0) {
						message = data.detail;
					} else if (typeof data.message === "string" && data.message.trim().length > 0) {
						message = data.message;
					} else if (typeof data === "object") {
						// Find the first string or first element of an array of strings
						for (const value of Object.values(data)) {
							if (Array.isArray(value) && value.length > 0) {
								const first = value[0];
								if (typeof first === "string" && first.trim().length > 0) {
									message = first;
									break;
								}
							} else if (typeof value === "string" && value.trim().length > 0) {
								message = value;
								break;
							}
						}
					}
				}
			} else {
				// Fallback to plain text if available
				const text = await response.text();
				if (text && text.trim().length > 0) {
					message = text.trim();
				}
			}
		} catch {
			// Ignore parse errors and keep default message
		}

		throw new Error(message);
	}

	if (response.status === 204 || response.status === 205) {
		return undefined as T;
	}

	const contentLength = response.headers.get("content-length");
	if (contentLength !== null && Number(contentLength) === 0) {
		return undefined as T;
	}

	const text = await response.text();
	if (!text) {
		return undefined as T;
	}

	try {
		return JSON.parse(text) as T;
	} catch {
		return text as unknown as T;
	}
}

export const apiRequest = async <T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> => {
	const { method = "GET", headers, requireCsrf, credentials, ...rest } = options;

	const shouldAttachCsrf = requireCsrf ?? CSRF_HTTP_METHODS.includes(method);
	const csrfToken = shouldAttachCsrf ? await ensureCsrfToken() : undefined;

	const mergedHeaders: HeadersInit = {
		"Content-Type": "application/json",
		...(headers || {}),
		...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
	};

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		method,
		credentials: credentials ?? "include",
		headers: mergedHeaders,
		// Prevent any intermediary/browser caching for API calls
		cache: method === "GET" ? "no-store" : "no-cache",
		...rest,
	});

	return handleResponse<T>(response);
};

export { API_BASE_URL };


