import { apiRequest } from "./http";

export interface User {
	id: number;
	username: string;
	email: string;
	first_name?: string;
	last_name?: string;
}

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface RegisterData {
	username: string;
	email: string;
	password: string;
	password_confirm: string;
	first_name?: string;
	last_name?: string;
}

export const authApi = {
	async login(credentials: LoginCredentials): Promise<{ user: User; message: string }> {
		return apiRequest<{ user: User; message: string }>("/auth/login/", {
			method: "POST",
			body: JSON.stringify(credentials),
		});
	},

	async logout(): Promise<{ message: string }> {
		return apiRequest<{ message: string }>("/auth/logout/", {
			method: "POST",
		});
	},

	async register(userData: RegisterData): Promise<{ user: User; message: string }> {
		return apiRequest<{ user: User; message: string }>("/auth/register/", {
			method: "POST",
			body: JSON.stringify(userData),
		});
	},

	async getCurrentUser(): Promise<{ user: User }> {
		return apiRequest<{ user: User }>("/auth/user/");
	},

	async checkAuthStatus(): Promise<{ authenticated: boolean; user?: User }> {
		return apiRequest<{ authenticated: boolean; user?: User }>("/auth/status/");
	},
};


