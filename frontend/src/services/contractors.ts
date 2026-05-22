import { apiRequest } from "./http";

export interface Contractor {
	id?: number;
	name: string;
	address: string;
	city: string;
	postal_code: string;
	state: string;
	phone: string;
	website: string;
	email: string;
	price_range: string;
	service_area: string;
	business_size: string;
	years_in_business: number | null;
	services: string;
	description: string;
	specializations: string;
	rating: number | null;
	reviews_count: number;
	certifications: string;
	kfw_eligible: boolean;
	source: string;
	additional_info: string;
	project_types: string;
}

export const contractorApi = {
	async getAll(
		projectType: string,
		city?: string,
		postal_code?: string,
		state?: string
	): Promise<Contractor[]> {
		const params = new URLSearchParams();
		params.append("project_type", projectType);
		if (city) {
			params.append("city", city);
		}
		if (postal_code) {
			params.append("postal_code", postal_code);
		}
		if (state) {
			params.append("state", state);
		}

		return apiRequest<Contractor[]>(`/contracting/contractors/?${params.toString()}`);
	},

	async getByIds(contractorIds: number[]): Promise<Contractor[]> {
		if (!contractorIds || contractorIds.length === 0) {
			return [];
		}

		const params = new URLSearchParams();
		params.append("ids", contractorIds.join(","));

		return apiRequest<Contractor[]>(`/contracting/contractors/?${params.toString()}`);
	},
};


