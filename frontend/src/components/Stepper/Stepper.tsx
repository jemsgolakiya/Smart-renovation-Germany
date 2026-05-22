import React from "react";
import { Check } from "lucide-react";

export interface StepperStep {
	id: number;
	label: string;
}

interface StepperProps {
	steps: StepperStep[];
	activeStep: number;
	onStepClick?: (stepId: number) => void;
}

const Stepper: React.FC<StepperProps> = ({ steps, activeStep, onStepClick }) => {
	return (
		<div className="w-full min-w-0">
			<div className="flex items-center justify-between gap-1 sm:gap-2">
				{steps.map((step, index) => {
					const isActive = step.id === activeStep;
					const isCompleted = step.id < activeStep;
					const isClickable = onStepClick && (isCompleted || isActive);

					return (
						<React.Fragment key={step.id}>
							{/* Step Circle */}
							<div className="flex flex-col items-center flex-1 min-w-0">
								<button
									type="button"
									onClick={() => isClickable && onStepClick(step.id)}
									disabled={!isClickable}
									className={`
										flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all flex-shrink-0
										${
											isCompleted
												? "bg-emerald-600 border-emerald-600 text-white"
												: isActive
													? "border-emerald-600 bg-white text-emerald-600"
													: "border-gray-300 bg-white text-gray-400"
										}
										${isClickable ? "cursor-pointer hover:scale-110" : "cursor-not-allowed"}
									`}
								>
									{isCompleted ? (
										<Check className="w-4 h-4 sm:w-5 sm:h-5" />
									) : (
										<span className="font-semibold text-xs sm:text-sm">{step.id}</span>
									)}
								</button>
								{/* Step Label */}
								<div className="mt-1 sm:mt-2 text-center w-full">
									<span
										className={`
											text-xs sm:text-sm font-medium block truncate px-0.5
											${isActive ? "text-emerald-600" : isCompleted ? "text-gray-700" : "text-gray-400"}
										`}
									>
										{step.label}
									</span>
								</div>
							</div>
							{/* Connector Line */}
							{index < steps.length - 1 && (
								<div
									className={`
										flex-1 h-0.5 mx-1 sm:mx-2 -mt-4 sm:-mt-5 min-w-[8px] sm:min-w-0
										${step.id < activeStep ? "bg-emerald-600" : "bg-gray-300"}
									`}
								/>
							)}
						</React.Fragment>
					);
				})}
			</div>
		</div>
	);
};

export default Stepper;

