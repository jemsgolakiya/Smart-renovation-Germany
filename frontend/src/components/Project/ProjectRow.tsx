import React from "react";
import { Edit, Trash2, CheckCircle2 } from "lucide-react";
import { Project } from "../../services/projects";
import { formatBudget } from "../../utils/formatting";

interface ProjectRowProps {
	project: Project;
	isSelected: boolean;
	onSelect: (project: Project) => void;
	onEdit: (project: Project) => void;
	onDelete: (project: Project) => void;
	getProjectTypeLabel: (projectType: string) => string;
}

const ProjectRow: React.FC<ProjectRowProps> = ({
	project,
	isSelected,
	onSelect,
	onEdit,
	onDelete,
	getProjectTypeLabel,
}) => {
	return (
		<tr className={`hover:bg-gray-50 ${isSelected ? "bg-emerald-50 border-l-4 border-emerald-500" : ""}`}>
			<td className="px-6 py-4 whitespace-nowrap">
				<div className="flex items-center gap-2">
					<div className="text-sm font-medium text-gray-900">{project.name}</div>
					{isSelected && (
						<span title="Selected project">
							<CheckCircle2 className="w-4 h-4 text-emerald-600" />
						</span>
					)}
				</div>
			</td>
			<td className="px-6 py-4 whitespace-nowrap">
				<div className="text-sm text-gray-500">{getProjectTypeLabel(project.project_type)}</div>
			</td>
			<td className="px-6 py-4 whitespace-nowrap">
				<div className="text-sm text-gray-500">{project.address}</div>
			</td>
			<td className="px-6 py-4 whitespace-nowrap">
				<div className="text-sm text-gray-500">{formatBudget(project.budget)}</div>
			</td>
			<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
				<div className="flex items-center gap-2">
					<button
						onClick={() => onSelect(project)}
						className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
							isSelected ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
						title={isSelected ? "Project selected" : "Select project"}
					>
						{isSelected ? "Selected" : "Select"}
					</button>
					<button
						onClick={() => onEdit(project)}
						className="text-emerald-600 hover:text-emerald-900 p-1 rounded"
						title="Edit"
					>
						<Edit className="w-4 h-4" />
					</button>
					<button
						onClick={() => onDelete(project)}
						className="text-red-600 hover:text-red-900 p-1 rounded"
						title="Delete"
					>
						<Trash2 className="w-4 h-4" />
					</button>
				</div>
			</td>
		</tr>
	);
};

export default ProjectRow;

