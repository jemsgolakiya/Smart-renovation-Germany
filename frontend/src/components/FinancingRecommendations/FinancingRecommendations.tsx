import React, { useState } from 'react';
import {
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Target,
  Star,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface FinancingOption {
  name: string;
  type: 'grant' | 'subsidy' | 'loan';
  priority: number;
  maxAmount: string;
  interestRate: string;
  eligibility: string;
  pros: string[];
  cons: string[];
  applicationSteps: string[];
  matchScore: number;
  applicationUrl?: string;
}

interface FinancingRecommendationsProps {
  recommendations: FinancingOption[];
  summary: string;
  nextSteps: string[];
}

const FinancingRecommendations: React.FC<FinancingRecommendationsProps> = ({
  recommendations,
  summary,
  nextSteps
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number>(0); // First item expanded by default

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'grant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'subsidy':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'loan':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) {
      return (
        <span className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 text-xs px-3 py-1 rounded-full font-bold shadow-sm">
          <Star className="w-3 h-3 fill-current" />
          TOP CHOICE
        </span>
      );
    } else if (priority === 2) {
      return (
        <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-semibold border border-blue-200">
          Recommended
        </span>
      );
    }
    return null;
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    return 'text-amber-600';
  };

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your Personalized Strategy</h2>
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-emerald-600" />
            Immediate Next Steps
          </h3>
          <ol className="space-y-2">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-semibold text-xs">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Recommendations Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Award className="w-7 h-7" />
            Prioritized Financing Options
          </h2>
          <p className="text-indigo-100 text-sm mt-2">
            Ranked by best match for your specific project (AI-analyzed)
          </p>
        </div>

        {/* Recommendations List */}
        <div className="divide-y divide-gray-200">
          {recommendations.map((option, index) => {
            const isExpanded = expandedIndex === index;
            const borderColor = index === 0 ? 'border-yellow-300' : 'border-transparent';

            return (
              <div
                key={index}
                className={`transition-all ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50' : 'bg-white hover:bg-gray-50'
                }`}
              >
                {/* Collapsed View */}
                <div
                  onClick={() => toggleExpand(index)}
                  className={`p-6 cursor-pointer border-l-4 ${borderColor} ${
                    isExpanded ? '' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Priority Number */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {option.priority}
                      </div>

                      <div className="flex-1">
                        {/* Title and Badges */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900">{option.name}</h3>
                          {getPriorityBadge(option.priority)}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getTypeBadgeColor(option.type)}`}>
                            {option.type.toUpperCase()}
                          </span>
                        </div>

                        {/* Key Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-600">Max Amount</p>
                            <p className="text-sm font-semibold text-gray-900">{option.maxAmount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Interest Rate</p>
                            <p className="text-sm font-semibold text-gray-900">{option.interestRate}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Match Score</p>
                            <p className={`text-sm font-bold ${getMatchScoreColor(option.matchScore)}`}>
                              {option.matchScore}/100
                            </p>
                          </div>
                        </div>

                        {/* Eligibility */}
                        <div className="flex items-start gap-2 bg-white/50 rounded-lg p-3 border border-gray-200">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Eligibility: </span>
                            {option.eligibility}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <button className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded View */}
                {isExpanded && (
                  <div className="px-6 pb-6 space-y-4 animate-fadeIn">
                    {/* Pros and Cons */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Pros */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Advantages
                        </h4>
                        <ul className="space-y-2">
                          {option.pros.map((pro, idx) => (
                            <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                              <span className="text-green-600 font-bold">•</span>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cons */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Considerations
                        </h4>
                        <ul className="space-y-2">
                          {option.cons.map((con, idx) => (
                            <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                              <span className="text-amber-600 font-bold">•</span>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Application Steps */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        How to Apply - Step by Step
                      </h4>
                      <ol className="space-y-2 mb-4">
                        {option.applicationSteps.map((step, idx) => (
                          <li key={idx} className="text-sm text-blue-800 flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-900 rounded-full flex items-center justify-center font-semibold text-xs">
                              {idx + 1}
                            </span>
                            <span className="pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>

                      {/* Apply Now Button */}
                      {option.applicationUrl && (
                        <a
                          href={option.applicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                        >
                          <ExternalLink className="w-5 h-5" />
                          Apply Now - Start Your Application
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FinancingRecommendations;
