import React, { useCallback, useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Heading from "../Heading/Heading";
import BudgetField from "../BudgetField/BudgetField";
import { Project, ProjectType } from "../../services/projects";

interface ProjectCreateUpdateModalProps {
	isOpen: boolean;
	selectedProject: Project | null;
	formData: Omit<Project, "id">;
	error: string | null;
	onClose: () => void;
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
	onFormDataChange: (updates: Partial<Omit<Project, "id">>) => void;
	projectTypes: ProjectType[];
}

const ProjectCreateUpdateModal: React.FC<ProjectCreateUpdateModalProps> = ({
	isOpen,
	selectedProject,
	formData,
	error,
	onClose,
	onSubmit,
	onFormDataChange,
	projectTypes,
}) => {
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});

	const validationRules = useMemo(
		() => [
			{ key: "name" as const, message: "Project Name is required" },
			{ key: "address" as const, message: "Address is required" },
			{ key: "city" as const, message: "City is required" },
			{ key: "state" as const, message: "State is required" },
		],
		[]
	);

	const validateForm = useCallback(
		(data: Omit<Project, "id">) => {
			const errors: Record<string, string> = {};

			validationRules.forEach(({ key, message }) => {
				const value = data[key];
				if (typeof value !== "number" && !value?.trim()) {
					errors[key] = message;
				}
			});

			if (data.budget === null) {
				errors.budget = "Budget is required";
			} else if (data.budget < 0) {
				errors.budget = "Budget must be a positive number";
			}

			return errors;
		},
		[validationRules]
	);

	const handleSubmit = useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			const errors = validateForm(formData);

			if (Object.keys(errors).length > 0) {
				setFormErrors(errors);
				return;
			}

			setFormErrors({});
			onSubmit(event);
		},
		[formData, onSubmit, validateForm]
	);

	useEffect(() => {
		if (!isOpen) {
			setFormErrors({});
		}
	}, [isOpen]);

	const handleChange =
		useCallback(
			<Key extends keyof Omit<Project, "id">>(key: Key) =>
			(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
				onFormDataChange({ [key]: event.target.value } as Partial<Omit<Project, "id">>);
			},
		[onFormDataChange]);

	if (!isOpen) {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
				<div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
					<Heading level={2} className="text-lg sm:text-xl">
						{selectedProject ? "Edit Project" : "Create Project"}
					</Heading>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
						<X className="w-5 h-5 sm:w-6 sm:h-6" />
					</button>
				</div>
				<form onSubmit={handleSubmit} className="p-4 sm:p-6">
					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
							{error}
						</div>
					)}
					{Object.keys(formErrors).length > 0 && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
							<p className="font-medium mb-2">Please fix the following errors:</p>
							<ul className="list-disc list-inside space-y-1">
								{(Object.values(formErrors) as string[]).map((err, index) => (
									<li key={index} className="text-sm">
										{err}
									</li>
								))}
							</ul>
						</div>
					)}
					<div className="space-y-4">
						<div>
							<label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
								Project Name *
							</label>
							<input
								type="text"
								id="name"
								value={formData.name}
								onChange={handleChange("name")}
								className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
									formErrors.name ? "border-red-500" : "border-gray-300"
								}`}
							/>
							{formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
						</div>

						<div>
							<label htmlFor="project_type" className="block text-sm font-medium text-gray-700 mb-1">
								Project Type *
							</label>
							<select
								id="project_type"
								value={formData.project_type}
								onChange={handleChange("project_type")}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
							>
								{projectTypes.map((type) => (
									<option key={type.value} value={type.value}>
										{type.label}
									</option>
								))}
							</select>
						</div>

						<div>
							<label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
								Address *
							</label>
							<input
								type="text"
								id="address"
								value={formData.address}
								onChange={handleChange("address")}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
								placeholder="Street address"
							/>
							{formErrors.address && <p className="mt-1 text-sm text-red-600">{formErrors.address}</p>}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
									City *
								</label>
								<input
									type="text"
									id="city"
									value={formData.city}
									onChange={handleChange("city")}
									className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
										formErrors.city ? "border-red-500" : "border-gray-300"
									}`}
								/>
								{formErrors.city && <p className="mt-1 text-sm text-red-600">{formErrors.city}</p>}
							</div>

							<div>
								<label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
									State *
								</label>
								<input
									type="text"
									id="state"
									value={formData.state}
									onChange={handleChange("state")}
									className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
										formErrors.state ? "border-red-500" : "border-gray-300"
									}`}
								/>
								{formErrors.state && <p className="mt-1 text-sm text-red-600">{formErrors.state}</p>}
							</div>
						</div>

						<div>
							<label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
								Postal Code
							</label>
							<input
								type="text"
								id="postal_code"
								value={formData.postal_code}
								onChange={handleChange("postal_code")}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
								placeholder="Postal code"
							/>
						</div>

						<BudgetField
							value={formData.budget}
							onChange={(budget) => onFormDataChange({ budget })}
							error={formErrors.budget}
						/>

						<div>
							<label htmlFor="additional_information" className="block text-sm font-medium text-gray-700 mb-1">
								Additional Information
							</label>
							<textarea
								id="additional_information"
								rows={6}
								value={formData.additional_information}
								onChange={handleChange("additional_information")}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
								placeholder="Enter additional context for our AI-powered Assistant..."
							/>
						</div>
					</div>

					<div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
						<button
							type="button"
							onClick={onClose}
							className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
						>
							{selectedProject ? "Update" : "Create"}
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body
	);
};

export default ProjectCreateUpdateModal;

