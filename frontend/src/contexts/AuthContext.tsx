import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, User } from "../services/auth";

interface AuthContextType {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (username: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	register: (userData: {
		username: string;
		email: string;
		password: string;
		password_confirm: string;
		first_name?: string;
		last_name?: string;
	}) => Promise<void>;
	checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Check authentication status on mount
	useEffect(() => {
		checkAuth();
	}, []);

	const checkAuth = async () => {
		try {
			setIsLoading(true);
			const response = await authApi.checkAuthStatus();
			if (response.authenticated && response.user) {
				setUser(response.user);
			} else {
				setUser(null);
			}
		} catch (error) {
			console.error("Failed to check auth status:", error);
			setUser(null);
		} finally {
			setIsLoading(false);
		}
	};

	const login = async (username: string, password: string) => {
		try {
			const response = await authApi.login({ username, password });
			setUser(response.user);
		} catch (error) {
			throw error;
		}
	};

	const logout = async () => {
		try {
			await authApi.logout();
			setUser(null);
		} catch (error) {
			console.error("Logout error:", error);
			// Clear user state even if API call fails
			setUser(null);
		}
	};

	const register = async (userData: {
		username: string;
		email: string;
		password: string;
		password_confirm: string;
		first_name?: string;
		last_name?: string;
	}) => {
		try {
			const response = await authApi.register(userData);
			setUser(response.user);
		} catch (error) {
			throw error;
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isAuthenticated: !!user,
				isLoading,
				login,
				logout,
				register,
				checkAuth,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

