import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, X, Upload } from 'lucide-react';
import { AssessmentQuestion, FilePreview, AnswerConfidence } from '../../types/assessment.types';

interface QuestionCardProps {
  question: AssessmentQuestion;
  value: string | string[] | number | File[] | undefined;
  onChange: (value: string | string[] | number | File[]) => void;
  filePreviews?: FilePreview[];
  onFileUpload?: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  value,
  onChange,
  filePreviews = [],
  onFileUpload,
  onFileRemove
}) => {
  const [showHint, setShowHint] = useState(false);

  // Handle single choice selection
  const handleSingleChoice = (optionValue: string) => {
    onChange(optionValue);
  };

  // Handle multi-select toggle
  const handleMultiSelect = (optionValue: string) => {
    const currentValues = (value as string[]) || [];
    if (currentValues.includes(optionValue)) {
      onChange(currentValues.filter(v => v !== optionValue));
    } else {
      onChange([...currentValues, optionValue]);
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 50 * 1024 * 1024;
      return (isImage || isVideo) && isValidSize;
    });
    if (onFileUpload && validFiles.length > 0) {
      onFileUpload(validFiles);
    }
  };

  // Render based on question type
  const renderInput = () => {
    switch (question.type) {
      case 'single_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  value === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => handleSingleChoice(option.value)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    value === option.value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}
                >
                  {value === option.value && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {option.icon && <span className="text-xl">{option.icon}</span>}
                    <span className="font-medium text-gray-800">{option.label}</span>
                    {option.costImpact && option.costImpact !== 'none' && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          option.costImpact === 'high'
                            ? 'bg-red-100 text-red-700'
                            : option.costImpact === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : option.costImpact === 'savings'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {option.costImpact === 'high' ? '$$$ Higher' :
                         option.costImpact === 'medium' ? '$$ Moderate' :
                         option.costImpact === 'savings' ? 'Savings' :
                         option.costImpact === 'low' ? '$ Lower' : ''}
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        );

      case 'multi_select':
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedValues.includes(option.value)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={selectedValues.includes(option.value)}
                  onChange={() => handleMultiSelect(option.value)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    selectedValues.includes(option.value)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedValues.includes(option.value) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {option.icon && <span className="text-xl">{option.icon}</span>}
                    <span className="font-medium text-gray-800">{option.label}</span>
                    {option.costImpact && option.costImpact !== 'none' && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          option.costImpact === 'high'
                            ? 'bg-red-100 text-red-700'
                            : option.costImpact === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : option.costImpact === 'savings'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {option.costImpact === 'high' ? '$$$ Higher' :
                         option.costImpact === 'medium' ? '$$ Moderate' :
                         option.costImpact === 'savings' ? 'Savings' :
                         option.costImpact === 'low' ? '$ Lower' : ''}
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        );

      case 'range_slider':
        const sliderValue = (value as number) || question.defaultValue || question.min || 0;
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {question.min} {question.unit}
              </span>
              <span className="text-2xl font-bold text-blue-600">
                {sliderValue} {question.unit}
              </span>
              <span className="text-sm text-gray-500">
                {question.max} {question.unit}
              </span>
            </div>
            <input
              type="range"
              min={question.min}
              max={question.max}
              step={question.step || 1}
              value={sliderValue}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        );

      case 'confidence':
        const confidenceOptions: { value: AnswerConfidence; label: string; icon: string }[] = [
          { value: 'confident', label: 'Confident', icon: 'check-circle' },
          { value: 'approximate', label: 'Approximate', icon: 'target' },
          { value: 'not_sure', label: 'Not sure', icon: 'help-circle' }
        ];
        return (
          <div className="flex gap-4 justify-center">
            {confidenceOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${
                  value === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-3xl mb-2 block">{option.icon}</span>
                <span className="font-medium text-gray-800">{option.label}</span>
              </button>
            ))}
          </div>
        );

      case 'file_upload':
        return (
          <div className="space-y-4">
            {/* Upload Area */}
            <label className="block border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-800 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                JPG, PNG, GIF, MP4, MOV, AVI (max 50MB per file)
              </p>
            </label>

            {/* File Previews */}
            {filePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                      {preview.type === 'image' ? (
                        <img
                          src={preview.preview}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={preview.preview}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => onFileRemove?.(index)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {preview.type === 'image' ? 'IMG' : 'VID'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'text_input':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition resize-none"
          />
        );

      case 'number_input':
        return (
          <input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            placeholder={question.placeholder}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 max-w-3xl mx-auto">
      {/* Category Label */}
      <div className="flex items-center gap-2 mb-4">
        {question.categoryIcon && (
          <span className="text-xl">{question.categoryIcon}</span>
        )}
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
          {question.category}
        </span>
      </div>

      {/* Main Question */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {question.text}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </h2>

      {/* Helper Text */}
      {question.helperText && (
        <p className="text-gray-500 mb-6">{question.helperText}</p>
      )}

      {/* Question Input */}
      <div className="mb-6">
        {renderInput()}
      </div>

      {/* Expert Hint (Collapsible) */}
      {question.expertHint && (
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{question.expertHint.title}</span>
            {showHint ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showHint && (
            <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                {question.expertHint.content}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
