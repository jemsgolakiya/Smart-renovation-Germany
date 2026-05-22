import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/Card/Card";
import { Button } from "../../components/Button/Button";
import { Badge } from "../../components/Bagde/Badge";
import {
  Search,
  Zap,
  FileText,
  Users,
  Wrench,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type PhaseStatus = "ready" | "pending";
type PhaseColor = "emerald" | "blue" | "amber" | "purple" | "rose" | "gray";

interface Task {
  task_name: string;
  estimated_time: string;
  estimated_cost: string;
  required_by: string;
}

interface Phase {
  id: number;
  title: string;
  icon: string;
  duration: string;
  cost: string;
  status: PhaseStatus;
  color: PhaseColor;
  tasks?: Task[];
  required_documents?: string[];
  stakeholders?: string[];
}

interface RenovationPhasesProps {
  phases?: Phase[];
}

// Icon mapping
const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  Search,
  Zap,
  FileText,
  Users,
  Wrench,
  CheckCircle2,
};

// Helper for Tailwind dynamic color classes
const colorClass = (color: PhaseColor, bgOrText: "bg" | "text", intensity: "50" | "600") =>
  `${bgOrText}-${color}-${intensity}`;

export function RenovationPhases({ phases = [] }: RenovationPhasesProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  const togglePhase = (phaseId: number) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const hasTasks = (phase: Phase) => {
    return phase.tasks && phase.tasks.length > 0;
  };

  if (phases.length === 0) {
    return null; // Don't render if no phases
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-lg font-semibold">Generated Renovation Plan</h3>
        <p className="text-gray-600">
          Your customized renovation roadmap with estimated timelines and costs
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.map((phase) => {
          const IconComponent = iconMap[phase.icon] || Search;
          const isExpanded = expandedPhases.has(phase.id);
          const phaseHasTasks = hasTasks(phase);

          return (
            <Card key={phase.id} className="hover:shadow-md transition-shadow flex flex-col h-full">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg ${colorClass(
                      phase.color,
                      "bg",
                      "50"
                    )} flex-shrink-0`}
                  >
                    <IconComponent
                      className={`w-5 h-5 ${colorClass(
                        phase.color,
                        "text",
                        "600"
                      )}`}
                    />
                  </div>
                  <Badge
                    className={
                      `flex-shrink-0 ml-2 ${
                        phase.status === "ready"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-700"
                      }`
                    }
                  >
                    {phase.status === "ready" ? "Ready" : "Pending"}
                  </Badge>
                </div>
                <CardTitle className="text-base leading-tight min-h-[2.5rem] line-clamp-2">
                  Phase {phase.id}: {phase.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 flex-grow">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{phase.duration}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cost Range:</span>
                  <span className="font-medium text-right">{phase.cost}</span>
                </div>
                
                {/* Tasks Section */}
                {isExpanded && phaseHasTasks && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Tasks ({phase.tasks!.length})
                    </h4>
                    <div className="space-y-3">
                      {phase.tasks!.map((task, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          <div className="font-medium text-sm text-gray-900 mb-2">
                            {task.task_name}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">Time:</span> {task.estimated_time}
                            </div>
                            <div>
                              <span className="font-medium">Cost:</span> {task.estimated_cost}
                            </div>
                            <div className="col-span-2">
                              <span className="font-medium">Responsible:</span> {task.required_by}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required Documents Section */}
                {isExpanded && phase.required_documents && phase.required_documents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Required Documents
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {phase.required_documents.map((doc, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Stakeholders Section */}
                {isExpanded && phase.stakeholders && phase.stakeholders.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Stakeholders
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {phase.stakeholders.map((stakeholder, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100"
                        >
                          {stakeholder}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* View/Hide Tasks Button */}
                {phaseHasTasks && (
                  <Button 
                    variant="primary" 
                    className="w-full mt-2"
                    onClick={() => togglePhase(phase.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Hide Tasks
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        View Tasks ({phase.tasks!.length})
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}