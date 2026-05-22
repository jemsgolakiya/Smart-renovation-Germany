import React from "react";
import { createPortal } from "react-dom";
import Heading from "../Heading/Heading";
import Text from "../Text/Text";

export interface ConfirmModalProps {
	isOpen: boolean;
	title?: string;
	message: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	onCancel: () => void;
	onConfirm: () => void;
	confirmButtonClassName?: string;
	cancelButtonClassName?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
	isOpen,
	title = "Confirm Action",
	message,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	onCancel,
	onConfirm,
	confirmButtonClassName = "bg-red-600 text-white hover:bg-red-700",
	cancelButtonClassName = "text-gray-700 hover:bg-gray-50 border border-gray-300",
}) => {
	if (!isOpen) {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
				<div className="p-4 sm:p-6">
					<Heading level={2} className="mb-4 text-lg sm:text-xl">
						{title}
					</Heading>
					<Text className="mb-6 text-sm sm:text-base">{message}</Text>
					<div className="flex flex-col sm:flex-row justify-end gap-3">
						<button
							onClick={onCancel}
							className={`w-full sm:w-auto px-4 py-2 rounded-lg transition-colors ${cancelButtonClassName}`}
						>
							{cancelLabel}
						</button>
						<button
							onClick={onConfirm}
							className={`w-full sm:w-auto px-4 py-2 rounded-lg transition-colors ${confirmButtonClassName}`}
						>
							{confirmLabel}
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
};

export default ConfirmModal;

