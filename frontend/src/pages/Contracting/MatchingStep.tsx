import React, { useState, useEffect, useCallback, useRef } from "react";
import Heading from "../../components/Heading/Heading";
import Text from "../../components/Text/Text";
import { contractorApi, Contractor } from "../../services/contractors";
import { Project } from "../../services/projects";
import { Star, MapPin, CheckCircle2, Loader2, X, Users, ChevronDown } from "lucide-react";

interface MatchingStepProps {
	selectedProject: Project;
	selectedContractors: Set<number>;
	onContractorToggle: (contractorId: number) => void;
	onStepChange: (step: number) => void;
	onContractorsLoaded?: (contractors: Contractor[]) => void;
}

const MatchingStep: React.FC<MatchingStepProps> = ({
	selectedProject,
	selectedContractors,
	onContractorToggle,
	onStepChange,
	onContractorsLoaded,
}) => {
	const [contractors, setContractors] = useState<Contractor[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [visibleContractorsCount, setVisibleContractorsCount] = useState(3);
	
	// Use ref to store callback to avoid re-render loops
	const onContractorsLoadedRef = useRef(onContractorsLoaded);
	
	// Update ref when callback changes
	useEffect(() => {
		onContractorsLoadedRef.current = onContractorsLoaded;
	}, [onContractorsLoaded]);

	// Load contractors when project changes - use project ID to prevent re-renders when object reference changes
	useEffect(() => {
		if (!selectedProject?.id) return;

		let isMounted = true;

		const loadContractors = async () => {
			setLoading(true);
			setError(null);
			try {
				const data = await contractorApi.getAll(
					selectedProject.project_type,
					selectedProject.city,
					selectedProject.postal_code,
					selectedProject.state
				);
				
				if (isMounted) {
					setContractors(data);
					if (onContractorsLoadedRef.current) {
						onContractorsLoadedRef.current(data);
					}
					setVisibleContractorsCount(3); // Reset pagination when loading new contractors
				}
			} catch (err) {
				if (isMounted) {
					setError(err instanceof Error ? err.message : "Failed to load contractors");
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadContractors();

		return () => {
			isMounted = false;
		};
	}, [selectedProject?.id, selectedProject?.project_type, selectedProject?.city, selectedProject?.postal_code, selectedProject?.state]);

	const handleLoadMore = () => {
		setVisibleContractorsCount((prev) => Math.min(prev + 3, contractors.length));
	};

	const selectedContractorsList = contractors.filter(
		(c) => c.id !== undefined && selectedContractors.has(c.id)
	);

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* Selected Contractors Section */}
			{selectedContractors.size > 0 && (
				<div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-200 p-3 sm:p-4 md:p-6 shadow-sm">
					<div className="flex items-center gap-3 mb-4">
						<div className="bg-emerald-600 p-2 rounded-lg">
							<Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
						</div>
						<div className="flex-1">
							<Heading level={3} className="text-lg sm:text-xl text-gray-900 mb-1">
								Selected Contractors
							</Heading>
							<Text className="text-sm sm:text-base text-gray-700">
								{selectedContractors.size} contractor{selectedContractors.size !== 1 ? "s" : ""} selected for invitation
							</Text>
						</div>
					</div>

					{/* Selected Contractors List */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
						{selectedContractorsList.map((contractor) => (
							<div
								key={contractor.id}
								className="bg-white rounded-lg border border-emerald-200 p-3 sm:p-4 flex items-start justify-between gap-3 hover:shadow-md transition-shadow"
							>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
										<h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
											{contractor.name}
										</h4>
									</div>
									{contractor.rating !== null && contractor.rating !== undefined && (
										<div className="flex items-center gap-1 mb-1">
											<Star className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
											<span className="text-xs sm:text-sm font-medium text-gray-700">
												{Number(contractor.rating).toFixed(1)}
											</span>
											{contractor.reviews_count > 0 && (
												<span className="text-xs text-gray-500">
													({contractor.reviews_count})
												</span>
											)}
										</div>
									)}
									{contractor.city && contractor.state && (
										<div className="flex items-center gap-1 text-xs text-gray-600">
											<MapPin className="w-3 h-3" />
											<span className="truncate">
												{contractor.city}, {contractor.state}
											</span>
										</div>
									)}
								</div>
								<button
									onClick={(e) => {
										e.stopPropagation();
										if (contractor.id !== undefined) {
											onContractorToggle(contractor.id);
										}
									}}
									className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
									title="Remove contractor"
								>
									<X className="w-4 h-4 sm:w-5 sm:h-5" />
								</button>
							</div>
						))}
					</div>

					{/* Action Button */}
					{selectedContractors.size > 0 && (
						<div className="mt-4 pt-4 border-t border-emerald-200">
							<button
								onClick={() => onStepChange(3)}
								className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
							>
								<Users className="w-4 h-4" />
								<span>Proceed to Invite ({selectedContractors.size})</span>
							</button>
						</div>
					)}
				</div>
			)}

			{/* Selection Count Badge (when no contractors selected) */}
			{selectedContractors.size === 0 && (
				<div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
						<Text className="text-xs sm:text-sm text-gray-600">
							Select contractors to invite for your project
						</Text>
						<div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 w-full sm:w-auto justify-center sm:justify-start">
							<Users className="w-4 h-4 text-gray-400" />
							<span className="text-xs sm:text-sm font-medium text-gray-600">0 selected</span>
						</div>
					</div>
				</div>
			)}

			{/* Loading State */}
			{loading && (
				<div className="flex items-center justify-center py-8 sm:py-12">
					<Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-emerald-600" />
					<Text className="ml-2 sm:ml-3 text-gray-600 text-sm sm:text-base">Loading contractors...</Text>
				</div>
			)}

			{/* Error State */}
			{error && !loading && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
					<Text className="text-red-800 text-sm sm:text-base">{error}</Text>
				</div>
			)}

			{/* Contractors List */}
			{!loading && !error && (
				<>
					{contractors.length === 0 ? (
						<div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg border border-gray-200 px-4">
							<Text className="text-gray-500 text-sm sm:text-base">
								No contractors found matching your project criteria.
							</Text>
						</div>
					) : (
						<>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
								{contractors.slice(0, visibleContractorsCount).map((contractor) => {
									const isSelected = contractor.id !== undefined && selectedContractors.has(contractor.id);

									return (
										<div
											key={contractor.id}
											className={`
												border-2 rounded-lg p-4 sm:p-5 cursor-pointer transition-all relative overflow-hidden
												${isSelected
													? "border-emerald-500 bg-emerald-50 shadow-lg ring-2 ring-emerald-200"
													: "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/30"
												}
											`}
											onClick={() => contractor.id !== undefined && onContractorToggle(contractor.id)}
										>
											{/* Selection Indicator Badge */}
											{isSelected && (
												<div className="absolute top-2 right-2 bg-emerald-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-md z-10">
													<CheckCircle2 className="w-3 h-3" />
													<span className="hidden sm:inline">Selected</span>
												</div>
											)}

											<div className="flex items-start justify-between mb-2 sm:mb-3 pr-12 sm:pr-16">
												<div className="flex-1 min-w-0">
													<h3 className="font-semibold text-sm sm:text-base md:text-lg text-gray-900 mb-1 sm:mb-2 truncate">
														{contractor.name}
													</h3>
													{contractor.rating !== null && contractor.rating !== undefined && (
														<div className="flex items-center gap-1.5 text-xs sm:text-sm mb-1 sm:mb-2 flex-wrap">
															<Star className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
															<span className="font-semibold text-gray-900">
																{Number(contractor.rating).toFixed(1)}
															</span>
															{contractor.reviews_count > 0 && (
																<span className="text-gray-500 text-xs">
																	({contractor.reviews_count} {contractor.reviews_count === 1 ? 'review' : 'reviews'})
																</span>
															)}
														</div>
													)}
												</div>
											</div>

											{contractor.city && contractor.state && (
												<div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
													<MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
													<span className="font-medium truncate">
														{contractor.city}, {contractor.state}
													</span>
												</div>
											)}

											{contractor.specializations && (
												<div className="mb-2 sm:mb-3">
													<Text className="text-xs font-medium text-gray-500 mb-1 sm:mb-1.5 uppercase tracking-wide">
														Specializations
													</Text>
													<Text className="text-xs sm:text-sm text-gray-700 line-clamp-2 leading-relaxed">
														{contractor.specializations}
													</Text>
												</div>
											)}

											<div className="flex items-center gap-2 flex-wrap">
												{contractor.years_in_business && (
													<div className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium">
														<span>🏢</span>
														<span>{contractor.years_in_business} years</span>
													</div>
												)}

												{contractor.kfw_eligible && (
													<div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
														<span>✓</span>
														<span>KfW Eligible</span>
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>

							{/* Load More Button */}
							{visibleContractorsCount < contractors.length && (
								<div className="flex justify-center mt-6">
									<button
										onClick={handleLoadMore}
										className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
									>
										<ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
										<span>Load More Contractors ({contractors.length - visibleContractorsCount} remaining)</span>
									</button>
								</div>
							)}
						</>
					)}
				</>
			)}
		</div>
	);
};

export default MatchingStep;

