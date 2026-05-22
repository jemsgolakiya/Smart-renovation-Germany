import { User } from "./auth";
import { apiRequest } from "./http";

export interface Project {
	id?: number;
	user?: User;
	name: string;
	project_type: string;
	address: string;
	city?: string;
	postal_code?: string;
	state?: string;
	budget: number | null;
	additional_information: string;
}

export interface ProjectType {
	value: string;
	label: string;
}

export const PROJECT_TYPES: ProjectType[] = [
	{ value: "kitchen", label: "Kitchen Renovation" },
	{ value: "bathroom", label: "Bathroom Renovation" },
	{ value: "basement", label: "Basement Renovation" },
	{ value: "roofing", label: "Roofing" },
	{ value: "electrical", label: "Electrical" },
	{ value: "plumbing", label: "Plumbing" },
	{ value: "hvac", label: "HVAC" },
	{ value: "flooring", label: "Flooring" },
	{ value: "windows_doors", label: "Windows/Doors" },
	{ value: "exterior", label: "Exterior" },
	{ value: "general", label: "General Renovation" },
];

export const projectApi = {
	async getAll(): Promise<Project[]> {
		return apiRequest<Project[]>("/projects/");
	},

	async getById(id: number): Promise<Project> {
		return apiRequest<Project>(`/projects/${id}/`);
	},

	async create(project: Omit<Project, "id">): Promise<Project> {
		return apiRequest<Project>("/projects/", {
			method: "POST",
			body: JSON.stringify(project),
		});
	},

	async update(id: number, project: Partial<Project>): Promise<Project> {
		return apiRequest<Project>(`/projects/${id}/`, {
			method: "PUT",
			body: JSON.stringify(project),
		});
	},

	async delete(id: number): Promise<void> {
		await apiRequest(`/projects/${id}/`, {
			method: "DELETE",
		});
	},
};


