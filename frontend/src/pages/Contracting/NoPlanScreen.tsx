import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import Heading from "../../components/Heading/Heading";
import Text from "../../components/Text/Text";

interface NoPlanScreenProps {
	projectName: string;
}

const NoPlanScreen: React.FC<NoPlanScreenProps> = ({ projectName }) => {
	const navigate = useNavigate();

	return (
		<div className="min-h-[600px] flex items-center justify-center p-4 sm:p-6">
			<div className="max-w-3xl w-full">
				{/* Main Content Card */}
				<div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
					<div className="p-8 sm:p-12 text-center space-y-8">
						{/* Icon with animated gradient background */}
						<div className="flex justify-center">
							<div className="relative">
								<div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
								<div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
									<FileText className="w-12 h-12 text-white" strokeWidth={2.5} />
								</div>
							</div>
						</div>

						{/* Heading */}
						<div className="space-y-4">
							<Heading level={1} className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-gray-900 bg-clip-text text-transparent">
								Create Your Renovation Plan First
							</Heading>
							<Text className="text-gray-600 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
								To connect with contractors for{" "}
								<span className="font-bold text-emerald-700">{projectName}</span>, you'll need a detailed renovation plan that outlines your vision and requirements.
							</Text>
						</div>

						{/* Feature Cards */}
						<div className="grid sm:grid-cols-3 gap-4 pt-4">
							<div className="bg-white/80 backdrop-blur rounded-xl p-5 border border-emerald-100/50 shadow-sm hover:shadow-md transition-shadow">
								<CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
								<Text className="font-semibold text-gray-900 mb-1.5">Define Scope</Text>
								<Text className="text-sm text-gray-600">Set your budget, timeline & goals</Text>
							</div>
							<div className="bg-white/80 backdrop-blur rounded-xl p-5 border border-emerald-100/50 shadow-sm hover:shadow-md transition-shadow">
								<Sparkles className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
								<Text className="font-semibold text-gray-900 mb-1.5">AI-Powered</Text>
								<Text className="text-sm text-gray-600">Get intelligent recommendations</Text>
							</div>
							<div className="bg-white/80 backdrop-blur rounded-xl p-5 border border-emerald-100/50 shadow-sm hover:shadow-md transition-shadow">
								<ArrowRight className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
								<Text className="font-semibold text-gray-900 mb-1.5">Ready to Share</Text>
								<Text className="text-sm text-gray-600">Professional plan for contractors</Text>
							</div>
						</div>

						{/* CTA Buttons */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
							<button
								onClick={() => navigate("/planning")}
								className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl hover:scale-105 text-lg"
							>
								<Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
								Create Plan Now
								<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</button>
							
							<button
								onClick={() => navigate("/")}
								className="text-gray-600 hover:text-gray-900 font-medium transition-colors px-4 py-2"
							>
								← Back to Home
							</button>
						</div>
					</div>
				</div>

				{/* Bottom info text */}
				<div className="text-center mt-6">
					<Text className="text-sm text-gray-500">
						Takes only 5-10 minutes • Save and continue anytime
					</Text>
				</div>
			</div>
		</div>
	);
};

export default NoPlanScreen;
