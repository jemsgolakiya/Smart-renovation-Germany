import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Project } from "../services/projects";
import { useAuth } from "./AuthContext";

interface ProjectContextType {
	selectedProject: Project | null;
	selectProject: (project: Project | null) => void;
	clearProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);
	const { isAuthenticated } = useAuth();

	useEffect(() => {
		if (!isAuthenticated) {
			setSelectedProject(null);
		}
	}, [isAuthenticated]);

	const selectProject = (project: Project | null) => {
		setSelectedProject(project);
	};

	const clearProject = () => {
		setSelectedProject(null);
	};

	return (
		<ProjectContext.Provider value={{ selectedProject, selectProject, clearProject }}>
			{children}
		</ProjectContext.Provider>
	);
};

export const useProject = (): ProjectContextType => {
	const context = useContext(ProjectContext);
	if (context === undefined) {
		throw new Error("useProject must be used within a ProjectProvider");
	}
	return context;
};

