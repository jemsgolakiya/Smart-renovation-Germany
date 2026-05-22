import { Bell, X, FolderKanban, LogOut, Menu } from "lucide-react";
import { Avatar } from "../Avatar/Avatar";
import { useProject } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { PROJECT_TYPES } from "../../services/api";
import Heading from "../Heading/Heading";
import { useState, useRef, useEffect } from "react";

type TopBarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export function TopBar({ isSidebarOpen, onToggleSidebar }: TopBarProps) {
  const { selectedProject, clearProject } = useProject();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/login");
    }
  };

  const getProjectTypeLabel = (value: string): string => {
    return PROJECT_TYPES.find((type) => type.value === value)?.label || value;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          {selectedProject && !isSidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {selectedProject ? (
            <div className="flex items-center gap-2 sm:gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-2 sm:px-4 py-2 min-w-0 flex-1 sm:flex-initial">
              <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-medium text-emerald-900 truncate">
                  {selectedProject.name}
                </span>
                <span className="text-xs text-emerald-700 truncate">
                  {getProjectTypeLabel(selectedProject.project_type)} • {selectedProject.address}
                </span>
              </div>
              <button
                onClick={clearProject}
                className="ml-2 p-1 text-emerald-600 hover:bg-emerald-100 rounded transition-colors flex-shrink-0"
                title="Clear project selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Heading level={1} className="text-emerald-600 truncate">
              <span className="hidden sm:inline">RenovAlte - Home Renovation Assistant</span>
              <span className="sm:hidden">RenovAlte</span>
            </Heading>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-full"
              aria-label="User menu"
            >
              <Avatar initials={user ? (user.first_name?.[0] || user.username[0].toUpperCase()) + (user.last_name?.[0] || user.username[1]?.toUpperCase() || "") : "U"} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {user && (
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user.username}</p>
                    {user.first_name && user.last_name && (
                      <p className="text-xs text-gray-500">{user.first_name} {user.last_name}</p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
