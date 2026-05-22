import React, { useState, useEffect, useCallback } from "react";
import { projectApi, Project, PROJECT_TYPES } from "../../services/projects";
import Heading from "../../components/Heading/Heading";
import Text from "../../components/Text/Text";
import { Plus, Sparkles } from "lucide-react";
import { useProject } from "../../contexts/ProjectContext";
import ProjectRow from "../../components/Project/ProjectRow";
import ProjectCard from "../../components/Project/ProjectCard";
import ProjectCreateUpdateModal from "../../components/Project/ProjectCreateUpdateModal";
import ConfirmModal from "../../components/Modal/ConfirmModal";

const Home: React.FC = () => {
	const { selectedProject: contextSelectedProject, selectProject } = useProject();
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);
	const [formData, setFormData] = useState<Omit<Project, "id">>({
		name: "",
		project_type: "general",
		address: "",
		city: "",
		postal_code: "",
		state: "",
		budget: null,
		additional_information: "",
	});

	useEffect(() => {
		loadProjects();
	}, []);

	const loadProjects = async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await projectApi.getAll();
			setProjects(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load projects");
		} finally {
			setLoading(false);
		}
	};

	const handleOpenCreateModal = () => {
		setSelectedProject(null);
		setFormData({
			name: "",
			project_type: "general",
			address: "",
			city: "",
			postal_code: "",
			state: "",
			budget: null,
			additional_information: "",
		});
		setIsModalOpen(true);
	};

	const handleSelectProject = (project: Project) => {
		selectProject(project);
	};

	const handleOpenEditModal = (project: Project) => {
		setSelectedProject(project);
		setFormData({
			name: project.name,
			project_type: project.project_type,
			address: project.address || "",
			city: project.city || "",
			postal_code: project.postal_code || "",
			state: project.state || "",
			budget: project.budget,
			additional_information: project.additional_information,
		});
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setSelectedProject(null);
		setError(null);
	};

	const handleFormDataChange = useCallback((updates: Partial<Omit<Project, "id">>) => {
		setFormData((prev) => ({
			...prev,
			...updates,
		}));
	}, []);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		try {
			setError(null);
			if (selectedProject?.id) {
				await projectApi.update(selectedProject.id, formData);
			} else {
				await projectApi.create(formData);
			}
			handleCloseModal();
			loadProjects();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save project");
		}
	};

	const handleDeleteClick = (project: Project) => {
		setSelectedProject(project);
		setIsDeleteModalOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!selectedProject?.id) return;

		const projectId = selectedProject.id;

		try {
			setError(null);
			await projectApi.delete(projectId);
			setIsDeleteModalOpen(false);
			setSelectedProject(null);
			if (contextSelectedProject?.id === projectId) {
				selectProject(null);
			}
			loadProjects();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete project");
		}
	};

	const getProjectTypeLabel = (value: string): string => {
		return PROJECT_TYPES.find((type) => type.value === value)?.label || value;
	};

	return (
		<div className="space-y-8">
			{/* Renovation Assistant Overview */}
			<div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4 sm:p-6 md:p-8 shadow-sm">
				<div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
					<div className="bg-emerald-600 p-2 sm:p-3 rounded-lg shadow-md flex-shrink-0">
						<Sparkles className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
					</div>
					<div className="flex-1 min-w-0">
						<Heading level={1} className="mb-2 sm:mb-3 text-gray-900 text-lg sm:text-xl md:text-2xl">
							Welcome to Your Renovation Assistant
						</Heading>
						<Text className="text-gray-700 text-sm sm:text-base leading-relaxed mb-3 sm:mb-4">
							Here you can manage all your renovation projects in one place. 
							Create new projects, track your progress, and let our AI-powered assistant guide you through every step of your renovation journey.
						</Text>
						<Text className="text-gray-600 text-xs sm:text-sm">
							Select a project to start planning, explore financing options, and connect with contractors. 
						</Text>
					</div>
				</div>
			</div>

			{/* Projects Section */}
			<div>
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
					<Heading level={2}>Projects</Heading>
					<button
						onClick={handleOpenCreateModal}
						className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors w-full sm:w-auto justify-center"
					>
						<Plus className="w-5 h-5" />
						<span className="text-sm sm:text-base">Create Project</span>
					</button>
				</div>

				{loading ? (
					<div className="text-center py-12 bg-white rounded-lg border border-gray-200">
						<Text className="text-gray-600">Loading projects...</Text>
					</div>
				) : projects.length === 0 ? (
					<div className="text-center py-12 bg-white rounded-lg border border-gray-200">
						<Text className="text-gray-600 mb-4">No projects found.</Text>
						<button
							onClick={handleOpenCreateModal}
							className="text-emerald-600 hover:text-emerald-700 font-medium"
						>
							Create your first project
						</button>
					</div>
				) : (
					<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
						{/* Desktop Table View */}
						<div className="hidden md:block overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Project Name
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Type
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Address
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Budget
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{projects.map((project) => (
										<ProjectRow
											key={project.id}
											project={project}
											isSelected={contextSelectedProject?.id === project.id}
											onSelect={handleSelectProject}
											onEdit={handleOpenEditModal}
											onDelete={handleDeleteClick}
											getProjectTypeLabel={getProjectTypeLabel}
										/>
									))}
								</tbody>
							</table>
						</div>

						{/* Mobile Card View */}
						<div className="md:hidden p-4 space-y-4">
							{projects.map((project) => (
								<ProjectCard
									key={project.id}
									project={project}
									isSelected={contextSelectedProject?.id === project.id}
									onSelect={handleSelectProject}
									onEdit={handleOpenEditModal}
									onDelete={handleDeleteClick}
									getProjectTypeLabel={getProjectTypeLabel}
								/>
							))}
						</div>
					</div>
				)}
			</div>

			<ProjectCreateUpdateModal
				isOpen={isModalOpen}
				selectedProject={selectedProject}
				formData={formData}
				error={error}
				onClose={handleCloseModal}
				onSubmit={handleSubmit}
				onFormDataChange={handleFormDataChange}
				projectTypes={PROJECT_TYPES}
			/>

			<ConfirmModal
				isOpen={isDeleteModalOpen && !!selectedProject}
				title="Delete Project"
				message={
					selectedProject ? (
						<>
							Are you sure you want to delete "<span className="font-semibold">{selectedProject.name}</span>"? This action cannot be undone.
						</>
					) : (
						"Are you sure you want to delete this project? This action cannot be undone."
					)
				}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				onCancel={() => {
					setIsDeleteModalOpen(false);
					setSelectedProject(null);
				}}
				onConfirm={handleDeleteConfirm}
			/>
		</div>
	);
};

export default Home;
