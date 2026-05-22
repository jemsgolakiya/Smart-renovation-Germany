import React, { useState, useEffect } from "react";
import { Mail, X, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import Heading from "../Heading/Heading";
import Text from "../Text/Text";

interface GmailAuthModalProps {
	isOpen: boolean;
	onClose: () => void;
	onAuthSuccess: () => void;
}

const GmailAuthModal: React.FC<GmailAuthModalProps> = ({
	isOpen,
	onClose,
	onAuthSuccess,
}) => {
	const [isAuthenticating, setIsAuthenticating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [authWindow, setAuthWindow] = useState<Window | null>(null);

	useEffect(() => {
		// Listen for messages from the OAuth callback window
		const handleMessage = (event: MessageEvent) => {
			// Verify origin for security
			if (event.origin !== window.location.origin) {
				return;
			}

			if (event.data.type === "gmail-auth-success") {
				setIsAuthenticating(false);
				onAuthSuccess();
				if (authWindow) {
					authWindow.close();
				}
			} else if (event.data.type === "gmail-auth-error") {
				setIsAuthenticating(false);
				setError(event.data.error || "Authentication failed");
				if (authWindow) {
					authWindow.close();
				}
			}
		};

		window.addEventListener("message", handleMessage);

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [onAuthSuccess, authWindow]);

	const handleConnectGmail = async () => {
		setIsAuthenticating(true);
		setError(null);

		try {
			// Import the gmail service
			const { initiateGmailAuth } = await import("../../services/gmail");
			
			// Open OAuth in popup window
			const popup = await initiateGmailAuth();
			setAuthWindow(popup);

			// Check if popup was blocked
			if (!popup || popup.closed) {
				setError("Popup was blocked. Please allow popups for this site.");
				setIsAuthenticating(false);
				return;
			}

			// Monitor popup closure
			const checkClosed = setInterval(() => {
				if (popup.closed) {
					clearInterval(checkClosed);
					setIsAuthenticating(false);
				}
			}, 500);
		} catch (err) {
			console.error("Failed to initiate Gmail auth:", err);
			setError(err instanceof Error ? err.message : "Failed to start authentication");
			setIsAuthenticating(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-t-2xl">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-4">
							<div className="bg-white p-3 rounded-lg">
								<Mail className="w-8 h-8 text-emerald-600" />
							</div>
							<div>
								<Heading level={2} className="text-2xl font-bold text-white mb-1">
									Connect Your Email
								</Heading>
								<Text className="text-emerald-50">
									Send emails directly from your email account
								</Text>
							</div>
						</div>
						<button
							onClick={onClose}
							disabled={isAuthenticating}
							className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors disabled:opacity-50"
						>
							<X className="w-6 h-6" />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="p-6 space-y-6">
					{/* Why Connect Section */}
					<div>
						<Heading level={3} className="text-lg font-semibold text-gray-900 mb-3">
							Why connect your email?
						</Heading>
						<ul className="space-y-3">
							<li className="flex items-start gap-3">
								<CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
								<Text className="text-gray-700">
									<strong>Send from your address:</strong> Contractors see your email, making communication personal and professional
								</Text>
							</li>
							<li className="flex items-start gap-3">
								<CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
								<Text className="text-gray-700">
									<strong>Track conversations:</strong> All replies appear in your inbox and in RenovAlte
								</Text>
							</li>
							<li className="flex items-start gap-3">
								<CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
								<Text className="text-gray-700">
									<strong>Include attachments:</strong> Automatically attach project plans and documents
								</Text>
							</li>
						</ul>
					</div>

					{/* Email Provider Selection */}
					<div>
						<Heading level={3} className="text-lg font-semibold text-gray-900 mb-3">
							Choose your email provider
						</Heading>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Gmail Option */}
							<button
								onClick={handleConnectGmail}
								disabled={isAuthenticating}
								className="flex items-center gap-4 p-4 border-2 border-emerald-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
							>
								<div className="bg-emerald-100 p-3 rounded-lg flex-shrink-0">
									<Mail className="w-6 h-6 text-emerald-600" />
								</div>
								<div className="text-left flex-1">
									<Text className="font-semibold text-gray-900 text-base">
										Gmail
									</Text>
									<Text className="text-sm text-gray-600">
										Connect with Google
									</Text>
								</div>
								{isAuthenticating && (
									<Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
								)}
							</button>

							{/* Outlook Option (Coming Soon) */}
							<div className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl bg-gray-50 opacity-60 cursor-not-allowed">
								<div className="bg-gray-200 p-3 rounded-lg flex-shrink-0">
									<Mail className="w-6 h-6 text-gray-500" />
								</div>
								<div className="text-left flex-1">
									<Text className="font-semibold text-gray-700 text-base">
										Outlook
									</Text>
									<Text className="text-sm text-gray-500">
										Coming soon
									</Text>
								</div>
							</div>
						</div>
					</div>

					{/* Error Message */}
					{error && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
							<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<Text className="text-sm font-medium text-red-900 mb-1">
									Authentication Failed
								</Text>
								<Text className="text-sm text-red-700">{error}</Text>
							</div>
						</div>
					)}

					{/* Status Message */}
					{isAuthenticating && (
						<div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
							<Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
							<Text className="text-sm text-emerald-800">
								Waiting for authentication... Please complete the process in the popup window.
							</Text>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
					<div className="flex justify-end">
						<button
							onClick={onClose}
							disabled={isAuthenticating}
							className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default GmailAuthModal;
