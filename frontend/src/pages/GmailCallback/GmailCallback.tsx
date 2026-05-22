import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Heading from "../../components/Heading/Heading";
import Text from "../../components/Text/Text";

const GmailCallback: React.FC = () => {
	const location = useLocation();
	const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
	const [message, setMessage] = useState<string>("");

	useEffect(() => {
		const handleCallback = async () => {
			// Get the authorization code from URL parameters
			const params = new URLSearchParams(location.search);
			const code = params.get("code");
			const state = params.get("state");
			const error = params.get("error");

			// Check for error from OAuth provider
			if (error) {
				setStatus("error");
				setMessage(`Authentication failed: ${error}`);
				
				// Notify opener window
				if (window.opener) {
					window.opener.postMessage(
						{
							type: "gmail-auth-error",
							error: `Authentication failed: ${error}`,
						},
						window.location.origin
					);
				}
				
				// Auto-close after delay
				setTimeout(() => {
					window.close();
				}, 3000);
				return;
			}

			if (!code) {
				setStatus("error");
				setMessage("No authorization code received");
				
				// Notify opener window
				if (window.opener) {
					window.opener.postMessage(
						{
							type: "gmail-auth-error",
							error: "No authorization code received",
						},
						window.location.origin
					);
				}
				
				// Auto-close after delay
				setTimeout(() => {
					window.close();
				}, 3000);
				return;
			}

			try {
				// Send code to backend
				const { API_BASE_URL } = await import("../../services/http");
				
				// Get CSRF token
				const getCsrfToken = (): string => {
					const name = "csrftoken";
					const cookies = document.cookie.split(";");
					for (const cookie of cookies) {
						const trimmedCookie = cookie.trim();
						if (trimmedCookie.startsWith(`${name}=`)) {
							return decodeURIComponent(trimmedCookie.substring(name.length + 1));
						}
					}
					return "";
				};
				
				let csrfToken = getCsrfToken();
				
				// If no CSRF token in cookies, fetch it
				if (!csrfToken) {
					try {
						const csrfResponse = await fetch(`${API_BASE_URL}/auth/csrf/`, {
							method: "GET",
							credentials: "include",
						});
						const csrfData = await csrfResponse.json();
						csrfToken = csrfData.csrfToken || "";
					} catch (err) {
						console.error("Failed to fetch CSRF token:", err);
					}
				}
				
				const response = await fetch(`${API_BASE_URL}/gmail/oauth/callback/`, {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
						"X-CSRFToken": csrfToken,
					},
					body: JSON.stringify({
						code,
						state,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.detail || `Server error: ${response.status}`);
				}

				const data = await response.json();

				setStatus("success");
				setMessage(`Successfully connected to ${data.gmail_email || "Gmail"}`);

				// Notify opener window of success
				if (window.opener) {
					window.opener.postMessage(
						{
							type: "gmail-auth-success",
							email: data.gmail_email,
						},
						window.location.origin
					);
				}

				// Auto-close after short delay
				setTimeout(() => {
					window.close();
				}, 1500);
			} catch (err) {
				console.error("OAuth callback error:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to complete authentication";
				
				setStatus("error");
				setMessage(errorMessage);

				// Notify opener window
				if (window.opener) {
					window.opener.postMessage(
						{
							type: "gmail-auth-error",
							error: errorMessage,
						},
						window.location.origin
					);
				}

				// Auto-close after delay
				setTimeout(() => {
					window.close();
				}, 3000);
			}
		};

		handleCallback();
	}, [location]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
				<div className="text-center space-y-6">
					{/* Status Icon */}
					<div className="flex justify-center">
						{status === "loading" && (
							<div className="bg-emerald-100 p-4 rounded-full">
								<Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
							</div>
						)}
						{status === "success" && (
							<div className="bg-emerald-100 p-4 rounded-full">
								<CheckCircle className="w-12 h-12 text-emerald-600" />
							</div>
						)}
						{status === "error" && (
							<div className="bg-red-100 p-4 rounded-full">
								<AlertCircle className="w-12 h-12 text-red-600" />
							</div>
						)}
					</div>

					{/* Status Message */}
					<div>
						<Heading level={2} className="text-2xl mb-2 text-gray-900">
							{status === "loading" && "Completing Authentication..."}
							{status === "success" && "Success!"}
							{status === "error" && "Authentication Failed"}
						</Heading>
						<Text className="text-gray-600">
							{status === "loading" && "Please wait while we complete your Gmail connection."}
							{status === "success" && message}
							{status === "error" && message}
						</Text>
					</div>

					{/* Auto-close Message */}
					{status !== "loading" && (
						<Text className="text-sm text-gray-500">
							This window will close automatically...
						</Text>
					)}

					{/* Manual Close Button (backup) */}
					{status !== "loading" && (
						<button
							onClick={() => window.close()}
							className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
						>
							Close Window
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default GmailCallback;
