import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  DollarSign,
  ClipboardList,
  HardHat,
  X,
  // FileCheck,
  // FolderOpen,
  // Settings,
} from "lucide-react";
import Heading from "../Heading/Heading";
import { useProject } from "../../contexts/ProjectContext";
import Text from "../Text/Text";
import logoImage from "../../assets/images/Logo.png";

type NavItem = {
  name: string;
  icon: React.ElementType;
  to: string;
  requiresProject?: boolean;
};

const allNavigationItems: NavItem[] = [
  { name: "Home", icon: Home, to: "/" },
  { name: "Planning the Work", icon: ClipboardList, to: "/planning", requiresProject: true },
  { name: "Financing", icon: DollarSign, to: "/financing", requiresProject: true },
  { name: "Contracting", icon: HardHat, to: "/contracting", requiresProject: true },
  // { name: "Approvals", icon: FileCheck, to: "/approvals" },
  // { name: "Documentation", icon: FolderOpen, to: "/documentation" },
  // { name: "Settings", icon: Settings, to: "/settings" },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { selectedProject } = useProject();

  const navigationItems = allNavigationItems.filter(
    (item) => !item.requiresProject || selectedProject
  );

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 md:z-auto transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:block"
      }`}>
        <div className="p-4 md:p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <img 
                src={logoImage} 
                alt="RenovAlte Logo" 
                className="h-8 md:h-10 w-auto object-contain"
              />
              <Heading level={1} className="text-emerald-600 text-lg md:text-xl">RenovAlte</Heading>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="px-2 md:px-3">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={() => {
                    // Close sidebar on mobile when navigating
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                  end={item.to === "/"}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm md:text-base">{item.name}</span>
                </NavLink>
              );
            })}
            {!selectedProject && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Text className="text-xs text-amber-800">
                  Select a project to access workflow steps (Financing, Planning, Contracting)
                </Text>
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
