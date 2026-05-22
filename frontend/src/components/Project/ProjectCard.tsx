import React from "react";
import { Edit, Trash2, CheckCircle2 } from "lucide-react";
import { Project } from "../../services/projects";
import { formatBudget } from "../../utils/formatting";

interface ProjectCardProps {
	project: Project;
	isSelected: boolean;
	onSelect: (project: Project) => void;
	onEdit: (project: Project) => void;
	onDelete: (project: Project) => void;
	getProjectTypeLabel: (projectType: string) => string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
	project,
	isSelected,
	onSelect,
	onEdit,
	onDelete,
	getProjectTypeLabel,
}) => {
	return (
		<div
			className={`bg-white border rounded-lg p-4 shadow-sm ${
				isSelected ? "border-emerald-500 border-2 bg-emerald-50" : "border-gray-200"
			}`}
		>
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-2 flex-1 min-w-0">
					<h3 className="text-base font-semibold text-gray-900 truncate">{project.name}</h3>
					{isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
				</div>
			</div>
			<div className="space-y-2 mb-4">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-gray-500 uppercase">Type</span>
					<span className="text-sm text-gray-900">{getProjectTypeLabel(project.project_type)}</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-gray-500 uppercase">Address</span>
					<span className="text-sm text-gray-900">{project.address}</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-gray-500 uppercase">Budget</span>
					<span className="text-sm text-gray-900">{formatBudget(project.budget)}</span>
				</div>
			</div>
			<div className="flex items-center gap-2 pt-3 border-t border-gray-200">
				<button
					onClick={() => onSelect(project)}
					className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
						isSelected ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
					}`}
				>
					{isSelected ? "Selected" : "Select"}
				</button>
				<button
					onClick={() => onEdit(project)}
					className="p-2 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors"
					title="Edit"
				>
					<Edit className="w-5 h-5" />
				</button>
				<button
					onClick={() => onDelete(project)}
					className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
					title="Delete"
				>
					<Trash2 className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
};

export default ProjectCard;

