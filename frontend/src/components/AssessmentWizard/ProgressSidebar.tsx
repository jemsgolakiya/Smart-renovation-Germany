import React from 'react';
import { Check, Camera, Cpu, Eye, HelpCircle, Calculator, Sparkles, ClipboardList } from 'lucide-react';

interface ProgressItem {
  id: string;
  label: string;
  icon: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface ProgressSidebarProps {
  items: ProgressItem[];
  currentStep: number;
  totalSteps: number;
}

// Helper function to render icons from string names
const getIconComponent = (iconName: string, className: string = "w-4 h-4") => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'camera': <Camera className={className} />,
    'cpu': <Cpu className={className} />,
    'eye': <Eye className={className} />,
    'help-circle': <HelpCircle className={className} />,
    'calculator': <Calculator className={className} />,
    'sparkles': <Sparkles className={className} />,
    'clipboard-list': <ClipboardList className={className} />,
  };
  return iconMap[iconName] || <span className="text-xs font-bold">{iconName.charAt(0).toUpperCase()}</span>;
};

const ProgressSidebar: React.FC<ProgressSidebarProps> = ({
  items,
  currentStep,
  totalSteps
}) => {
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 h-full">
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm font-bold text-blue-600">
            {progressPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step List */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              item.status === 'current'
                ? 'bg-blue-50 border border-blue-200'
                : item.status === 'completed'
                ? 'bg-green-50 border border-green-100'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {/* Status Icon */}
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.status === 'completed'
                  ? 'bg-green-500 text-white'
                  : item.status === 'current'
                  ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {item.status === 'completed' ? (
                <Check className="w-4 h-4" />
              ) : (
                getIconComponent(item.icon, `w-4 h-4 ${
                  item.status === 'current' ? 'text-white' : 'text-gray-400'
                }`)
              )}
            </div>

            {/* Label */}
            <div className="flex-1">
              <span
                className={`text-sm font-medium ${
                  item.status === 'current'
                    ? 'text-blue-800'
                    : item.status === 'completed'
                    ? 'text-green-700'
                    : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
              {item.status === 'current' && (
                <span className="block text-xs text-blue-500">Current step</span>
              )}
            </div>

            {/* Status Indicator */}
            {item.status === 'current' && (
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Your progress is saved automatically
        </p>
      </div>
    </div>
  );
};

export default ProgressSidebar;
