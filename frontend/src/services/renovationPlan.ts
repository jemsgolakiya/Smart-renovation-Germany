import { apiRequest } from "./http";

export interface RenovationPlan {
	id: number;
	plan_name: string;
	plan_data: any;
	input_data: any;
	status: string;
	project_id: number | null;
	project_name: string | null;
	created_at: string;
	updated_at: string;
}

export const renovationPlanApi = {
	/**
	 * Get all renovation plans for the authenticated user
	 */
	async getAll(): Promise<RenovationPlan[]> {
		return apiRequest<RenovationPlan[]>("/renovation/plans/");
	},

	/**
	 * Get the most recent renovation plan for a specific project
	 * Returns null if no plan exists
	 */
	async getByProjectId(projectId: number): Promise<RenovationPlan | null> {
		try {
			return await apiRequest<RenovationPlan>(`/renovation/plans/project/${projectId}/`);
		} catch (error: any) {
			// If 404, it means no plan exists
			if (error?.status === 404 || error?.response?.status === 404) {
				return null;
			}
			throw error;
		}
	},
};
