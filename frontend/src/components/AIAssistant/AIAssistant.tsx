import React, { useState } from "react";
import { Sparkles, X, Send } from "lucide-react";
import Text from "../Text/Text";

// NOTE: This is just a concept UI for the AI assistant. It is not functional yet.
const AIAssistant: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [message, setMessage] = useState("");

	const exampleSuggestions = [
		"Consider contractors with KfW eligibility for better financing options",
		"Top-rated contractors in your area typically have 4.5+ ratings",
		"Look for contractors with experience in your specific project type",
		"Contractors with 10+ years in business often provide more reliable service",
		"Compare multiple contractors to get the best value for your project",
	];

	const handleSend = () => {
		if (message.trim()) {
			// Concept UI - no actual functionality yet
			setMessage("");
		}
	};

	return (
		<>
			{/* Floating Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={`
					fixed bottom-6 right-6 z-40
					w-14 h-14 rounded-full
					bg-emerald-600 text-white
					shadow-lg hover:shadow-xl
					hover:bg-emerald-700
					transition-all duration-300
					flex items-center justify-center
					${isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"}
				`}
				aria-label="Open AI Assistant"
			>
				<Sparkles className="w-6 h-6" />
			</button>

			{/* Panel Overlay */}
			{isOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity duration-300"
					onClick={() => setIsOpen(false)}
				/>
			)}

			{/* Assistant Panel */}
			<div
				className={`
					fixed top-0 right-0 w-full max-w-md
					bg-white shadow-2xl z-50
					transform transition-transform duration-300 ease-in-out
					flex flex-col
					${isOpen ? "translate-x-0" : "translate-x-full"}
				`}
				style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}
			>
				{/* Header */}
				<div className="bg-emerald-600 text-white p-4 flex items-center justify-between flex-shrink-0">
					<div className="flex items-center gap-2">
						<Sparkles className="w-5 h-5" />
						<Text className="text-white font-semibold text-lg">AI Assistant</Text>
					</div>
					<button
						onClick={() => setIsOpen(false)}
						className="p-1 hover:bg-emerald-700 rounded transition-colors"
						aria-label="Close AI Assistant"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content Area */}
				<div className="flex-1 overflow-hidden flex flex-col min-h-0">
					{/* Suggestions Panel */}
					<div className="border-b border-gray-200 p-4 bg-gray-50 flex-shrink-0">
						<div className="flex items-center gap-2 mb-3">
							<Sparkles className="w-4 h-4 text-emerald-600" />
							<Text className="font-semibold text-gray-900">AI Suggestions</Text>
						</div>
						<div className="space-y-2 max-h-48 overflow-y-auto">
							{exampleSuggestions.map((suggestion, index) => (
								<div
									key={index}
									className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700 hover:border-emerald-300 transition-colors"
								>
									<Text className="text-sm">{suggestion}</Text>
								</div>
							))}
						</div>
					</div>

					{/* Chat Interface */}
					<div className="flex-1 flex flex-col min-h-0">
						{/* Chat Messages Area */}
						<div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
							{/* Welcome Message */}
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
									<Sparkles className="w-4 h-4 text-emerald-600" />
								</div>
								<div className="flex-1 bg-gray-100 rounded-lg p-3">
									<Text className="text-sm text-gray-700">
										Hello! I'm your AI assistant for contractor matching. I can help you find the best
										contractors for your project. Ask me anything about contractor selection, or check
										out the suggestions above.
									</Text>
									<Text className="text-xs text-gray-500 mt-2 italic">
										Note: This is a concept UI. Full functionality coming soon.
									</Text>
								</div>
							</div>

							{/* Placeholder for future messages */}
							<div className="text-center py-8">
								<Text className="text-sm text-gray-400">
									Chat functionality will be available soon
								</Text>
							</div>
						</div>

						{/* Message Input */}
						<div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									onKeyPress={(e) => e.key === "Enter" && handleSend()}
									placeholder="Ask me about contractors..."
									className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
									disabled
								/>
								<button
									onClick={handleSend}
									disabled={!message.trim()}
									className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
									aria-label="Send message"
								>
									<Send className="w-4 h-4" />
								</button>
							</div>
							<Text className="text-xs text-gray-400 mt-2 text-center">
								Chat input is disabled in concept mode
							</Text>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default AIAssistant;

