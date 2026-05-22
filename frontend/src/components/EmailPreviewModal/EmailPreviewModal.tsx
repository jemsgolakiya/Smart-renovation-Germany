import React, { useState, useEffect, useRef } from "react";
import { X, Send, Edit, Mail, Loader2 } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import './EmailPreviewModal.css';

interface EmailPreviewModalProps {
	emailHtml: string;
	subject: string;
	reasoning: string;
	onApprove: (modifiedHtml?: string) => void;
	onClose: () => void;
	isLoading?: boolean;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
	emailHtml,
	subject,
	reasoning,
	onApprove,
	onClose,
	isLoading = false,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	// Tiptap editor for WYSIWYG editing
	const editor = useEditor({
		extensions: [
			StarterKit,
			Link.configure({
				openOnClick: false,
			}),
		],
		content: emailHtml,
		editorProps: {
			attributes: {
				class: 'focus:outline-none',
			},
		},
	});

	// Update editor content when emailHtml changes
	useEffect(() => {
		if (editor && emailHtml) {
			editor.commands.setContent(emailHtml);
		}
	}, [emailHtml, editor]);

	// Update iframe content when not editing
	useEffect(() => {
		if (!isEditing) {
			const updateIframe = () => {
				if (!iframeRef.current) return;

				const iframe = iframeRef.current;
				const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
				
				if (!iframeDoc) return;

				// Create a complete HTML document with proper styling for email rendering
				const fullHtml = `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		body {
			margin: 0;
			padding: 20px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			font-size: 14px;
			line-height: 1.6;
			color: #333;
			background-color: #ffffff;
		}
		p {
			margin: 0 0 12px 0;
		}
		ul, ol {
			margin: 12px 0;
			padding-left: 24px;
		}
		li {
			margin: 4px 0;
		}
		strong, b {
			font-weight: 600;
		}
		table {
			border-collapse: collapse;
			width: 100%;
		}
		img {
			max-width: 100%;
			height: auto;
		}
		a {
			color: #059669;
			text-decoration: none;
		}
		a:hover {
			text-decoration: underline;
		}
		@media only screen and (max-width: 600px) {
			body {
				padding: 10px;
				font-size: 13px;
			}
		}
	</style>
</head>
<body>${emailHtml}</body>
</html>`;
				
				// Write to iframe
				iframeDoc.open();
				iframeDoc.write(fullHtml);
				iframeDoc.close();
			};

			// Small delay to ensure iframe is ready
			const timeoutId = setTimeout(updateIframe, 10);
			return () => clearTimeout(timeoutId);
		}
	}, [emailHtml, isEditing]);

	const handleApprove = () => {
		if (isEditing && editor) {
			// If editing, send the modified HTML
			const modifiedHtml = editor.getHTML();
			onApprove(modifiedHtml);
		} else {
			// If not editing, send original
			onApprove();
		}
	};

	const handleSaveEdit = () => {
		setIsEditing(false);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
					<div className="flex items-center gap-3 flex-1">
						<div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
							<Mail className="w-5 h-5 text-white" />
						</div>
						<div>
							<h2 className="text-xl font-bold text-gray-900">Email Preview</h2>
						</div>
					</div>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
						disabled={isLoading}
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Email Client-like Header */}
				<div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
					<div className="flex items-start gap-2">
						<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide  mt-1">
							Subject:
						</span>
						<span className="font-semibold text-gray-900 flex-1">{subject}</span>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-hidden flex flex-col">
					{isEditing ? (
						<div className="flex-1 overflow-y-auto p-6">
							<div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
								{/* Editor Toolbar */}
								<div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
									<button
										onClick={() => editor?.chain().focus().toggleBold().run()}
										disabled={!editor?.can().chain().focus().toggleBold().run()}
										className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
											editor?.isActive('bold')
												? 'bg-emerald-600 text-white'
												: 'bg-white text-gray-700 hover:bg-gray-100'
										} disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300`}
									>
										Bold
									</button>
									<button
										onClick={() => editor?.chain().focus().toggleItalic().run()}
										disabled={!editor?.can().chain().focus().toggleItalic().run()}
										className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
											editor?.isActive('italic')
												? 'bg-emerald-600 text-white'
												: 'bg-white text-gray-700 hover:bg-gray-100'
										} disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300`}
									>
										Italic
									</button>
									<button
										onClick={() => editor?.chain().focus().toggleBulletList().run()}
										className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
											editor?.isActive('bulletList')
												? 'bg-emerald-600 text-white'
												: 'bg-white text-gray-700 hover:bg-gray-100'
										} border border-gray-300`}
									>
										• List
									</button>
									<button
										onClick={() => editor?.chain().focus().toggleOrderedList().run()}
										className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
											editor?.isActive('orderedList')
												? 'bg-emerald-600 text-white'
												: 'bg-white text-gray-700 hover:bg-gray-100'
										} border border-gray-300`}
									>
										1. List
									</button>
									<div className="w-px bg-gray-300 mx-1"></div>
									<button
										onClick={() => editor?.chain().focus().undo().run()}
										disabled={!editor?.can().chain().focus().undo().run()}
										className="px-3 py-1.5 rounded text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 transition-colors"
									>
										Undo
									</button>
									<button
										onClick={() => editor?.chain().focus().redo().run()}
										disabled={!editor?.can().chain().focus().redo().run()}
										className="px-3 py-1.5 rounded text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 transition-colors"
									>
										Redo
									</button>
								</div>

								{/* Editor Content */}
								<div className="bg-white">
									<EditorContent editor={editor} />
								</div>
							</div>

							{/* Save Button */}
							<div className="mt-4 flex justify-end">
								<button
									onClick={handleSaveEdit}
									className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
								>
									<Edit className="w-4 h-4" />
									Done Editing
								</button>
							</div>
						</div>
					) : (
						<div className="flex-1 overflow-y-auto p-6">
							<div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm">
								<iframe
									ref={iframeRef}
									title="Email Preview"
									className="w-full min-h-[500px] border-0 bg-white"
									sandbox="allow-same-origin"
									style={{ display: 'block' }}
								/>
							</div>
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
					{!isEditing ? (
						<>
							<button
								onClick={() => setIsEditing(true)}
								disabled={isLoading}
								className="px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
							>
								<Edit className="w-4 h-4" />
								Edit Email
							</button>
							<button
								onClick={handleApprove}
								disabled={isLoading}
								className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
							>
								{isLoading ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Sending...
									</>
								) : (
									<>
										<Send className="w-4 h-4" />
										Send Email
									</>
								)}
							</button>
						</>
					) : (
						<button
							onClick={handleApprove}
							disabled={isLoading}
							className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
						>
							{isLoading ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Sending...
								</>
							) : (
								<>
									<Send className="w-4 h-4" />
									Send Email
								</>
							)}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default EmailPreviewModal;
