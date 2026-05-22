import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Contractor, contractorApi } from "../../services/contractors";
import { Project } from "../../services/projects";
import { 
	contractingPlanningApi, 
	InvitationResponse,
	ContractingPlanningResponse 
} from "../../services/contractingPlanning";
import { checkGmailStatus } from "../../services/gmail";
import Heading from "../../components/Heading/Heading";
import Text from "../../components/Text/Text";
import GmailAuthModal from "../../components/GmailAuthModal/GmailAuthModal";
import { 
	Loader2, 
	Download, 
	FileText, 
	Mail, 
	Paperclip,
	ArrowLeft,
	AlertCircle,
	Info,
	Upload,
	Sparkles,
	Users,
	Send,
	MessageSquare,
	X
} from "lucide-react";

interface InviteStepProps {
	selectedProject: Project;
	selectedContractors: Set<number>;
	onStepChange: (step: number) => void;
}

const InviteStep: React.FC<InviteStepProps> = ({
	selectedProject,
	selectedContractors,
	onStepChange,
}) => {
	const [isGenerating, setIsGenerating] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [invitationData, setInvitationData] = useState<InvitationResponse | null>(null);
	const [aiPrompt, setAiPrompt] = useState("");
	const [isModifyingEmail, setIsModifyingEmail] = useState(false);
	const [modifyError, setModifyError] = useState<string | null>(null);
	const [excludedFileIds, setExcludedFileIds] = useState<Set<number>>(new Set());
	
	// Contractors state - fetch by selected IDs
	const [contractors, setContractors] = useState<Contractor[]>([]);
	const [isLoadingContractors, setIsLoadingContractors] = useState(true);
	
	// Gmail authentication state
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [sendingProgress, setSendingProgress] = useState<string>("");

	// TipTap editor for email content (editable)
	const emailEditor = useEditor({
		extensions: [
			StarterKit,
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-emerald-600 underline hover:text-emerald-700",
				},
			}),
			Placeholder.configure({
				placeholder: "Compose your invitation email...",
			}),
		],
		content: "",
		editorProps: {
			attributes: {
				class: "tiptap-editor focus:outline-none",
				spellcheck: "false",
			},
		},
	});

	// Fetch contractors by selected IDs
	useEffect(() => {
		const fetchContractors = async () => {
			if (selectedContractors.size === 0) {
				setContractors([]);
				setIsLoadingContractors(false);
				return;
			}

			setIsLoadingContractors(true);
			try {
				const contractorIds = Array.from(selectedContractors);
				const data = await contractorApi.getByIds(contractorIds);
				setContractors(data);
			} catch (err) {
				console.error("Failed to load contractors:", err);
				setError(err instanceof Error ? err.message : "Failed to load contractor details");
			} finally {
				setIsLoadingContractors(false);
			}
		};

		fetchContractors();
	}, [selectedContractors]);

	// Generate invitation content on mount
	useEffect(() => {
		const generateContent = async () => {
			if (!selectedProject.id || selectedContractors.size === 0) {
				setError("Please select at least one contractor");
				return;
			}

			setIsGenerating(true);
			setError(null);

			try {
				// Generate invitation content
				const contractorIds = Array.from(selectedContractors);
				const response = await contractingPlanningApi.generateInvitation(
					selectedProject.id,
					contractorIds
				);

				setInvitationData(response);

				// Set editor content
				if (emailEditor && response.email_html) {
					emailEditor.commands.setContent(response.email_html);
				}
			} catch (err) {
				console.error("Failed to generate invitation:", err);
				setError(err instanceof Error ? err.message : "Failed to generate invitation content");
			} finally {
				setIsGenerating(false);
			}
		};

		generateContent();
	}, [selectedProject.id, selectedContractors, emailEditor]);

	// Handle PDF download
	const handleDownloadPDF = async () => {
		if (!invitationData?.renovation_plan_html || !selectedProject.id) return;

		setIsDownloading(true);
		setError(null);

		try {
			const filename = `Renovation_Plan_${selectedProject.name.replace(/\s+/g, "_")}.pdf`;

			const pdfBlob = await contractingPlanningApi.generatePDF(
				selectedProject.id,
				invitationData.renovation_plan_html,
				filename
			);

			// Create download link
			const url = window.URL.createObjectURL(pdfBlob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Failed to download PDF:", err);
			setError(err instanceof Error ? err.message : "Failed to download PDF");
		} finally {
			setIsDownloading(false);
		}
	};

	// Handle Gmail authentication success
	const handleAuthSuccess = async () => {
		setShowAuthModal(false);
		// Proceed with sending invitations
		await sendInvitationsToContractors();
	};

	// Send invitations to contractors
	const sendInvitationsToContractors = async () => {
		if (!emailEditor || !invitationData || !selectedProject.id) {
			setError("Missing required data to send invitations");
			return;
		}

		setIsSending(true);
		setError(null);
		setSendingProgress("Preparing emails...");

		try {
			const contractorIds = Array.from(selectedContractors);
			const emailHtml = emailEditor.getHTML();
			const renovationPlanHtml = invitationData.renovation_plan_html;
			
			// Get file IDs to attach (excluding removed ones)
			const visibleFiles = getVisibleFiles();
			const attachmentFileIds = visibleFiles.map(file => file.id);

			setSendingProgress(`Sending to ${contractorIds.length} contractor${contractorIds.length !== 1 ? 's' : ''}...`);

			const result = await contractingPlanningApi.sendInvitations(
				selectedProject.id,
				contractorIds,
				emailHtml,
				renovationPlanHtml,
				attachmentFileIds
			);

			if (result.success > 0) {
				setSendingProgress(`Successfully sent ${result.success} invitation${result.success !== 1 ? 's' : ''}!`);
				
				// Wait a moment to show success message
				setTimeout(() => {
					// Navigate to CommunicateStep (step 4)
					onStepChange(4);
				}, 1500);
			} else {
				throw new Error("Failed to send invitations to any contractors");
			}

			// Log any partial failures
			if (result.failed > 0) {
				console.warn(`Failed to send to ${result.failed} contractor(s):`, result.errors);
			}

		} catch (err) {
			console.error("Failed to send invitations:", err);
			setError(err instanceof Error ? err.message : "Failed to send invitations");
			setIsSending(false);
			setSendingProgress("");
		}
	};

	// Handle send invitations
	const handleSendInvitations = async () => {
		if (!selectedProject.id || selectedContractors.size === 0) {
			setError("Please select at least one contractor");
			return;
		}

		setError(null);
		setSendingProgress("Checking email authentication...");

		try {
			// Check if user has Gmail authentication
			const gmailStatus = await checkGmailStatus();

			if (!gmailStatus.authenticated) {
				// Show authentication modal
				setSendingProgress("");
				setShowAuthModal(true);
			} else {
				// User is already authenticated, proceed with sending
				await sendInvitationsToContractors();
			}
		} catch (err) {
			console.error("Failed to check Gmail status:", err);
			setError(err instanceof Error ? err.message : "Failed to check email authentication");
			setSendingProgress("");
		}
	};

	// Handle AI email modification
	const handleModifyWithAI = async () => {
		if (!aiPrompt.trim() || !emailEditor || !selectedProject.id) {
			return;
		}

		setIsModifyingEmail(true);
		setModifyError(null);

		try {
			const currentEmailHtml = emailEditor.getHTML();
			
			const response = await contractingPlanningApi.modifyEmailWithAI(
				selectedProject.id,
				currentEmailHtml,
				aiPrompt.trim()
			);

			// Update the editor with the modified email
			if (response.email_html) {
				emailEditor.commands.setContent(response.email_html);
			}

			// Clear the prompt after successful modification
			setAiPrompt("");
		} catch (err) {
			console.error("Failed to modify email with AI:", err);
			setModifyError(err instanceof Error ? err.message : "Failed to modify email");
		} finally {
			setIsModifyingEmail(false);
		}
	};

	// Handle removing file from invitation attachments (not deleting from planning)
	const handleRemoveFileFromInvitation = (fileId: number) => {
		setExcludedFileIds(prev => {
			const newSet = new Set(prev);
			newSet.add(fileId);
			return newSet;
		});
	};

	// Get filtered files (excluding removed ones)
	const getVisibleFiles = () => {
		if (!invitationData) return [];
		return invitationData.relevant_files.filter(file => !excludedFileIds.has(file.id));
	};

	// Get selected contractor details
	const selectedContractorsList = contractors.filter((c) =>
		c.id !== undefined && selectedContractors.has(c.id)
	);

	// Check for duplicate attachments (only for visible files)
	const hasDuplicateAttachments = () => {
		const visibleFiles = getVisibleFiles();
		if (visibleFiles.length === 0) return false;
		return visibleFiles.some(file => 
			file.filename.toLowerCase().includes('renovation') || 
			file.filename.toLowerCase().includes('plan')
		);
	};

	if (isGenerating || isLoadingContractors) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<div className="relative">
					<Loader2 className="w-16 h-16 animate-spin text-emerald-600 mb-6" />
				</div>
				<Heading level={2} className="text-2xl mb-3 text-center">
					{isLoadingContractors ? "Loading Contractor Details" : "Drafting Your Invitation"}
				</Heading>
				<Text className="text-gray-600 text-center max-w-lg">
					{isLoadingContractors 
						? "Fetching information about your selected contractors..."
						: "Our AI is personalizing invitation emails and generating a professional plan for your selected contractors."
					}
				</Text>
			</div>
		);
	}

	if (error && !invitationData) {
		return (
			<div className="space-y-4">
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
					<div className="bg-red-100 p-2 rounded-full flex-shrink-0">
						<AlertCircle className="w-6 h-6 text-red-600" />
					</div>
					<div className="flex-1">
						<Heading level={3} className="text-lg text-red-900 mb-2">Unable to Generate Invitations</Heading>
						<Text className="text-red-700">{error}</Text>
					</div>
				</div>
				<button
					onClick={() => onStepChange(2)}
					className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to Contractor Selection
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-6 mx-auto">
			{/* ===== 1. HEADER AREA ===== */}
			<div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
				<div className="flex items-start gap-4">
					<div className="bg-emerald-600 p-3 rounded-lg flex-shrink-0">
						<Mail className="w-6 h-6 text-white" />
					</div>
					<div className="flex-1">
						<Heading level={2} className="text-2xl mb-2 text-gray-900">
							Review Your Invitation
						</Heading>
						<Text className="text-gray-700 text-base">
							Review and customize your invitation email with project details and attachments before sending.
						</Text>
					</div>
				</div>
			</div>

			{/* Error message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
					<Text className="text-red-700 text-sm">{error}</Text>
				</div>
			)}

			{/* ===== 2. SELECTED CONTRACTORS SECTION ===== */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
				<div className="flex items-center gap-3 mb-4">
					<Users className="w-5 h-5 text-gray-700" />
					<Heading level={3} className="text-lg font-semibold text-gray-900">
						Selected Contractors ({selectedContractorsList.length})
					</Heading>
					<div className="group relative">
						<Info className="w-4 h-4 text-gray-400 cursor-help" />
						<div className="invisible group-hover:visible absolute left-0 top-6 bg-gray-900 text-white text-xs rounded px-3 py-2 w-64 z-10">
							These contractors will receive your invitation
						</div>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					{selectedContractorsList.map((contractor) => (
						<div
							key={contractor.id}
							className="inline-flex items-center bg-emerald-50 border-2 border-emerald-200 rounded-full px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 transition-colors"
						>
							{contractor.name}
						</div>
					))}
				</div>
			</div>

			{/* ===== 3. EMAIL EDITOR AND AI MODIFICATION SECTION ===== */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Email Editor */}
				<div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gray-50 border-b border-gray-200 p-5">
						<div className="flex items-center gap-3">
							<Mail className="w-5 h-5 text-gray-700" />
							<div>
								<Heading level={3} className="text-lg font-semibold text-gray-900">
									Invitation Email
								</Heading>
								<Text className="text-sm text-gray-600 mt-1">
									Customize your invitation message to contractors
								</Text>
							</div>
						</div>
					</div>

				{emailEditor && (
					<>
						{/* Editor Toolbar */}
						<div className="border-b border-gray-200 bg-white p-3 flex flex-wrap gap-2">
							<button
								onClick={() => emailEditor.chain().focus().toggleBold().run()}
								className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
									emailEditor.isActive("bold")
										? "bg-emerald-600 text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
								title="Bold"
							>
								<strong>B</strong>
							</button>
							<button
								onClick={() => emailEditor.chain().focus().toggleItalic().run()}
								className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
									emailEditor.isActive("italic")
										? "bg-emerald-600 text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
								title="Italic"
							>
								<em>I</em>
							</button>
							<button
								onClick={() => emailEditor.chain().focus().toggleBulletList().run()}
								className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
									emailEditor.isActive("bulletList")
										? "bg-emerald-600 text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
								title="Bullet List"
							>
								• List
							</button>
							<button
								onClick={() => emailEditor.chain().focus().toggleOrderedList().run()}
								className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
									emailEditor.isActive("orderedList")
										? "bg-emerald-600 text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
								title="Numbered List"
							>
								1. List
							</button>
						</div>

						{/* Editor Area */}
						<div className="p-6 bg-white min-h-[350px] max-h-[500px] overflow-y-auto">
							<style>{`
								.tiptap-editor {
									width: 100%;
									min-height: 300px;
								}
								
								.tiptap-editor h1 {
									font-size: 2em;
									font-weight: 700;
									margin-bottom: 0.5em;
									margin-top: 0.5em;
									line-height: 1.2;
									color: #111827;
								}
								
								.tiptap-editor h2 {
									font-size: 1.5em;
									font-weight: 600;
									margin-bottom: 0.5em;
									margin-top: 0.75em;
									line-height: 1.3;
									color: #1f2937;
								}
								
								.tiptap-editor h3 {
									font-size: 1.25em;
									font-weight: 600;
									margin-bottom: 0.5em;
									margin-top: 0.75em;
									line-height: 1.4;
									color: #374151;
								}
								
								.tiptap-editor p {
									margin-bottom: 1em;
									line-height: 1.75;
									color: #374151;
								}
								
								.tiptap-editor p:last-child {
									margin-bottom: 0;
								}
								
								.tiptap-editor strong {
									font-weight: 600;
									color: #111827;
								}
								
								.tiptap-editor em {
									font-style: italic;
								}
								
								.tiptap-editor ul,
								.tiptap-editor ol {
									padding-left: 1.5em;
									margin-bottom: 1em;
									color: #374151;
								}
								
								.tiptap-editor ul {
									list-style-type: disc;
								}
								
								.tiptap-editor ol {
									list-style-type: decimal;
								}
								
								.tiptap-editor li {
									margin-bottom: 0.5em;
									line-height: 1.75;
								}
								
								.tiptap-editor li p {
									margin-bottom: 0.5em;
								}
								
								.tiptap-editor a {
									color: #059669;
									text-decoration: underline;
									cursor: pointer;
								}
								
								.tiptap-editor a:hover {
									color: #047857;
								}
								
								.tiptap-editor blockquote {
									border-left: 3px solid #d1d5db;
									padding-left: 1em;
									margin-left: 0;
									margin-bottom: 1em;
									color: #6b7280;
									font-style: italic;
								}
								
								.tiptap-editor code {
									background-color: #f3f4f6;
									border-radius: 0.25rem;
									padding: 0.125rem 0.375rem;
									font-family: 'Courier New', monospace;
									font-size: 0.875em;
									color: #059669;
								}
								
								.tiptap-editor pre {
									background-color: #1f2937;
									color: #f9fafb;
									border-radius: 0.5rem;
									padding: 1em;
									overflow-x: auto;
									margin-bottom: 1em;
								}
								
								.tiptap-editor pre code {
									background-color: transparent;
									color: inherit;
									padding: 0;
								}
								
								.tiptap-editor hr {
									border: none;
									border-top: 2px solid #e5e7eb;
									margin: 2em 0;
								}
								
								.tiptap-editor p.is-editor-empty:first-child::before {
									content: attr(data-placeholder);
									float: left;
									color: #9ca3af;
									pointer-events: none;
									height: 0;
								}
							`}</style>
							<EditorContent editor={emailEditor} />
						</div>
					</>
				)}
				</div>

				{/* AI Modification Panel */}
				<div className="lg:col-span-1 order-1 lg:order-2">
					<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden sticky top-4">
						<div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 p-5">
							<div className="flex items-center gap-3 mb-2">
								<div className="bg-emerald-600 p-2 rounded-lg">
									<Sparkles className="w-5 h-5 text-white" />
								</div>
								<Heading level={3} className="text-lg font-semibold text-gray-900">
									AI Email Assistant
								</Heading>
							</div>
							<Text className="text-sm text-gray-700 leading-relaxed">
								Use AI to refine your email. Describe what you want improved.
							</Text>
						</div>

						<div className="p-6 space-y-4">
							{/* Prompt Input */}
							<div>
								<label className="block mb-2">
									<Text className="text-sm font-medium text-gray-900">
										Your Instructions
									</Text>
								</label>
								<textarea
									value={aiPrompt}
									onChange={(e) => setAiPrompt(e.target.value)}
									placeholder="Describe how you'd like to improve the email..."
									className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none bg-white text-sm leading-relaxed"
									rows={6}
									disabled={isModifyingEmail}
								/>
							</div>

							{/* Example Prompt Chips */}
							<div>
								<Text className="text-xs font-medium text-gray-700 mb-2">
									Quick suggestions:
								</Text>
								<div className="flex flex-wrap gap-2">
									{[
										"More professional",
										"More friendly",
										"Shorter email",
										"Add timeline details",
										"Clarify project scope"
									].map((chip, idx) => (
										<button
											key={idx}
											onClick={() => setAiPrompt(chip)}
											disabled={isModifyingEmail}
											className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
										>
											{chip}
										</button>
									))}
								</div>
							</div>

							{/* Error message */}
							{modifyError && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
									<AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
									<Text className="text-xs text-red-700">{modifyError}</Text>
								</div>
							)}

							{/* Action Button */}
							<button
								onClick={handleModifyWithAI}
								disabled={!aiPrompt.trim() || isModifyingEmail || !emailEditor}
								className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3.5 rounded-lg font-semibold text-sm hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{isModifyingEmail ? (
									<>
										<Loader2 className="w-5 h-5 animate-spin" />
										<span>Improving Email...</span>
									</>
								) : (
									<>
										<Sparkles className="w-5 h-5" />
										<span>Improve Email with AI</span>
									</>
								)}
							</button>

							{/* Help text */}
							<div className="pt-2 border-t border-gray-200">
								<Text className="text-xs text-gray-600 leading-relaxed">
									💡 <strong>Tip:</strong> Be specific about tone, length, or content changes you want.
								</Text>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* ===== 4. ATTACHMENTS SECTION ===== */}
			<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
				<div className="bg-gray-50 border-b border-gray-200 p-5">
					<div className="flex items-center gap-3">
						<Paperclip className="w-5 h-5 text-gray-700" />
						<div>
							<Heading level={3} className="text-lg font-semibold text-gray-900">
								Email Attachments
							</Heading>
							<Text className="text-sm text-gray-600 mt-1">
								Files that will be sent with your invitation
							</Text>
						</div>
					</div>
				</div>

				<div className="p-6 space-y-6">
					{/* System-Generated Attachments */}
					<div>
						<div className="flex items-center gap-2 mb-3">
							<Sparkles className="w-4 h-4 text-emerald-600" />
							<Text className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
								System-Generated
							</Text>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-lg group hover:shadow-md transition-shadow">
								<div className="flex items-center gap-3 flex-1">
									<div className="bg-emerald-600 p-2 rounded-lg">
										<FileText className="w-5 h-5 text-white" />
									</div>
									<div className="flex-1 min-w-0">
										<Text className="font-semibold text-gray-900">Renovation Plan (AI Generated).pdf</Text>
										<Text className="text-xs text-gray-600 mt-0.5">
											Professional project brief created by AI
										</Text>
									</div>
								</div>
								<button
									onClick={handleDownloadPDF}
									disabled={isDownloading}
									className="ml-4 p-2 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									title="Download PDF"
								>
									{isDownloading ? (
										<Loader2 className="w-5 h-5 animate-spin" />
									) : (
										<Download className="w-5 h-5" />
									)}
								</button>
							</div>
						</div>
					</div>

					{/* User Uploads */}
					{invitationData && getVisibleFiles().length > 0 && (
						<div>
							<div className="flex items-center gap-2 mb-3">
								<Upload className="w-4 h-4 text-gray-600" />
								<Text className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
									Your Uploads
								</Text>
							</div>
							<div className="space-y-2">
								{getVisibleFiles().map((file) => (
									<div
										key={file.id}
										className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg group hover:shadow-md transition-shadow"
									>
										<div className="flex items-center gap-3 flex-1 min-w-0">
											<div className="bg-gray-600 p-2 rounded-lg">
												<Paperclip className="w-5 h-5 text-white" />
											</div>
											<div className="flex-1 min-w-0">
												<Text className="font-semibold text-gray-900 truncate">{file.filename}</Text>
												<Text className="text-xs text-gray-600 mt-0.5">
													User-uploaded file
												</Text>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<a
												href={file.url}
												download
												className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
												target="_blank"
												rel="noopener noreferrer"
												title="Download file"
											>
												<Download className="w-5 h-5" />
											</a>
											<button
												onClick={() => handleRemoveFileFromInvitation(file.id)}
												className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
												title="Remove from invitation"
											>
												<X className="w-5 h-5" />
											</button>
										</div>
									</div>
								))}
							</div>

							{/* Info Messages */}
							<div className="mt-4 space-y-3">
								{/* Duplicate Warning */}
								{hasDuplicateAttachments() && (
									<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
										<div className="flex items-start gap-3">
											<AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
											<div>
												<Text className="text-sm font-medium text-yellow-900 mb-1">
													Possible Duplicate Detected
												</Text>
												<Text className="text-sm text-yellow-800">
													You may have uploaded a renovation plan that's similar to the AI-generated one. Consider removing duplicates before sending.
												</Text>
											</div>
										</div>
									</div>
								)}
								
								{/* Excluded Files Info */}
								{excludedFileIds.size > 0 && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
										<div className="flex items-start gap-3">
											<Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
											<div>
												<Text className="text-sm font-medium text-blue-900 mb-1">
													{excludedFileIds.size} File{excludedFileIds.size !== 1 ? 's' : ''} Removed from Invitation
												</Text>
												<Text className="text-sm text-blue-800">
													These files remain in your project but won't be sent with this invitation. You can still access them later.
												</Text>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* ===== 5. INFO / REASSURANCE PANEL ===== */}
			<div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm">
				<div className="flex items-start gap-4">
					<div className="bg-emerald-600 p-3 rounded-lg flex-shrink-0">
						<Info className="w-6 h-6 text-white" />
					</div>
					<div className="flex-1 space-y-3">
						<Heading level={3} className="text-lg font-semibold text-gray-900">
							What Happens Next?
						</Heading>
						<ul className="space-y-2">
							<li className="flex items-start gap-3">
								<div className="bg-emerald-100 p-1 rounded-full flex-shrink-0 mt-0.5">
									<Mail className="w-4 h-4 text-emerald-600" />
								</div>
								<Text className="text-gray-700 text-sm">
									<strong>Your invitation will be sent to all selected contractors</strong> with your project details
								</Text>
							</li>
							<li className="flex items-start gap-3">
								<div className="bg-emerald-100 p-1 rounded-full flex-shrink-0 mt-0.5">
									<MessageSquare className="w-4 h-4 text-emerald-600" />
								</div>
								<Text className="text-gray-700 text-sm">
									<strong>All replies will appear in the next step</strong> where you can continue the conversation
								</Text>
							</li>
							<li className="flex items-start gap-3">
								<div className="bg-emerald-100 p-1 rounded-full flex-shrink-0 mt-0.5">
									<Paperclip className="w-4 h-4 text-emerald-600" />
								</div>
								<Text className="text-gray-700 text-sm">
									<strong>Attachments are included automatically</strong> – no need to manually attach files
								</Text>
							</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Sending Progress */}
			{isSending && (
				<div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm">
					<div className="flex items-center gap-4">
						<Loader2 className="w-8 h-8 animate-spin text-emerald-600 flex-shrink-0" />
						<div className="flex-1">
							<Heading level={3} className="text-lg font-semibold text-gray-900 mb-1">
								Sending Invitations...
							</Heading>
							<Text className="text-gray-700">{sendingProgress}</Text>
						</div>
					</div>
				</div>
			)}

			{/* ===== 6. FOOTER CTA ===== */}
			<div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between pt-6 pb-4">
				<button
					onClick={() => onStepChange(2)}
					disabled={isSending}
					className="flex items-center justify-center gap-2 px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium transition-colors order-2 sm:order-1 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to Contractor Selection
				</button>

				<button
					onClick={handleSendInvitations}
					disabled={!emailEditor || isDownloading || isSending}
					className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
				>
					{isSending ? (
						<>
							<Loader2 className="w-6 h-6 animate-spin" />
							<span>Sending...</span>
						</>
					) : (
						<>
							<Send className="w-6 h-6" />
							<span>Send Invitations to {selectedContractorsList.length} Contractor{selectedContractorsList.length !== 1 ? "s" : ""}</span>
						</>
					)}
				</button>
			</div>

			{/* Gmail Auth Modal */}
			<GmailAuthModal
				isOpen={showAuthModal}
				onClose={() => setShowAuthModal(false)}
				onAuthSuccess={handleAuthSuccess}
			/>

		</div>
	);
};

export default InviteStep;
