import { API_BASE_URL } from "./http";

export interface GmailStatus {
	authenticated: boolean;
	gmail_email?: string | null;
	token_expiry?: string;
}

/**
 * Check if the user has valid Gmail authentication
 */
export const checkGmailStatus = async (): Promise<GmailStatus> => {
	const response = await fetch(`${API_BASE_URL}/gmail/status/`, {
		method: "GET",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to check Gmail status: ${response.status}`);
	}

	return response.json();
};

/**
 * Initiate Gmail OAuth flow by opening popup window
 * Returns the popup window reference
 */
export const initiateGmailAuth = async (): Promise<Window | null> => {
	// Get the OAuth URL from backend
	const response = await fetch(`${API_BASE_URL}/gmail/oauth/initiate/`, {
		method: "GET",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Failed to initiate OAuth: ${response.status}`);
	}

	const data = await response.json();
	const authUrl = data.authorization_url;

	if (!authUrl) {
		throw new Error("No authorization URL received from server");
	}

	// Open OAuth URL in popup window
	const width = 600;
	const height = 700;
	const left = window.screenX + (window.outerWidth - width) / 2;
	const top = window.screenY + (window.outerHeight - height) / 2;

	const popup = window.open(
		authUrl,
		"Gmail OAuth",
		`width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
	);

	return popup;
};

/**
 * Revoke/disconnect Gmail authentication
 */
export const revokeGmailAuth = async (): Promise<void> => {
	const response = await fetch(`${API_BASE_URL}/gmail/revoke/`, {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Failed to revoke Gmail authentication: ${response.status}`);
	}
};
