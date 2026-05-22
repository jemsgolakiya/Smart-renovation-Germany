import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/Card/Card";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { Label } from "../../components/Label/Ladel";
import { Select } from "../../components/Select/Select";
import { Badge } from "../../components/Bagde/Badge";
import Text from "../../components/Text/Text";
import {
  Calendar,
  Sparkles,
  MessageSquare,
  Settings,
  ArrowRight,
  Check,
  AlertCircle,
  Upload,
  X
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import {
  RENOVATIONGOALS,
  HEATING_SYSTEM_OPTIONS,
  INSULATION_OPTIONS,
  BUNDESLAND,
  BUILDING_TYPES,
  WINDOWS_TYPE_OPTIONS,
  NEIGHBOR_IMPACTS_OPTIONS,
  FINANCING_PREFERENCE_OPTIONS,
  INCENTIVE_INTENT_OPTIONS,
  HERITAGE_PROTECTION,
  LIVING_DURING_RENOVATION_OPTIONS,
  ENERGY_CERTIFICATE_RATING_OPTIONS,
  KNOWN_MAJOR_ISSUES_OPTIONS,
  SURVEYS_REQUIRED_OPTIONS,
  ROOM_OPTIONS,
  STANDARD_OPTIONS,
} from "../../utils/constants";
import { ProjectPlanData } from "./Planning";

type InputMode = "manual" | "prompt";

interface ProjectSetupWizardProps {
  onGeneratePlan: (planData: ProjectPlanData) => void;
  isGenerating: boolean;
}

/** DYNAMIC PART TYPES */
interface DynamicAnswers {
  [key: string]: any;
}

interface AIQuestion {
  question_id: string;
  question_text: string;
  explanation?: string;
  input_type: "text" | "select" | "number" | "date";
  options?: { value: string; label: string }[];
  is_complete?: boolean;
}

const MIN_QUESTIONS = 5;
const SAFETY_MAX_LIMIT = 10;

export function ProjectSetupWizard({
  onGeneratePlan,
  isGenerating,
}: ProjectSetupWizardProps) {
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [prompt, setPrompt] = useState("");

  // Chatbot states for prompt mode
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [chatSessionId, setChatSessionId] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Manual input states
  const [buildingType, setBuildingType] = useState("single-family");
  const [budget, setBudget] = useState(50000);
  const [startDate, setStartDate] = useState("2025-01-15");
  const [buildingAge, setBuildingAge] = useState("2024-01-15");
  const [buildingSize, setBuildingSize] = useState(50);
  const [bundesland, setBundesland] = useState("hesse");
  const [renovationSpecification, setRenovationSpecification] = useState("")
  const [renovationStandard, setRenovationStandard] = useState("")
  const [heatingSystem, setHeatingSystem] = useState("electric");
  const [insulationType, setInsulationType] = useState("partial");
  const [windowsType, setWindowsType] = useState("single-pane");
  const [neighborImpact, setNeighborImpact] = useState("no");
  const [incentiveIntent, setIncentiveIntent] = useState("yes");
  const [heritageProtection, setHeritageProtection] = useState("no");
  const [livingDuringRenovation, setLivingDuringRenovation] = useState("no");
  const [knownMajorIssues, setKnownMajorIssues] = useState("");
  const [surveysRequired, setSurveysRequired] = useState("");
  const [energyCertificateRating, setEnergyCertificateRating] =
    useState("a_plus");
  const [financingPreference, setFinancingPreference] =
    useState("personal-savings");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    "Energy Efficiency",
  ]);

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  /** ============ DYNAMIC FLOW STATE (inside manual mode) ============ **/

  type DynamicStep = "off" | "dynamic" | "ready";

  const [dynamicStep, setDynamicStep] = useState<DynamicStep>("off");
  const [dynamicAnswers, setDynamicAnswers] = useState<DynamicAnswers>({});
  const [currentQuestion, setCurrentQuestion] = useState<AIQuestion | null>(
    null
  );
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<AIQuestion[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [dynamicError, setDynamicError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);


  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };
  useEffect(() => {
  chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [chatMessages]);


  const handleStartDynamicFlow = async () => {
    // you can re-use selectedGoals from manual as "goals" here
    if (selectedGoals.length === 0) {
      alert("Please select at least one renovation goal.");
      return;
    }
    setDynamicStep("dynamic");
    setDynamicError(null);

    const initialContext: DynamicAnswers = {
      building_type: buildingType,
      budget,
      location: bundesland,
      goals: selectedGoals,

      renovation_specification: renovationSpecification,  // ADD
      renovation_standard: renovationStandard,
    };

    setDynamicAnswers(initialContext);
    setQuestionHistory([]);
    setQuestionCount(0);
    fetchNextQuestion(initialContext, 0);
  };

  const fetchNextQuestion = async (
    currentContext: DynamicAnswers,
    count: number
  ) => {
    if (count >= SAFETY_MAX_LIMIT) {
      setDynamicStep("ready");
      return;
    }

    setIsLoadingQuestion(true);
    setDynamicError(null);

    try {

      console.log('response', currentContext);
      const response = await fetch(
        "http://127.0.0.1:8000/api/renovation/next-question/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_answers: currentContext }),
        }
      );
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const questionData: AIQuestion = await response.json();

      if (questionData.is_complete && count >= MIN_QUESTIONS) {
        setDynamicStep("ready");
        return;
      }

      setCurrentQuestion(questionData);
      setQuestionCount(count + 1);
      setCurrentAnswer("");
    } catch (err) {
      console.error("Error fetching next question:", err);
      setDynamicError(
        "Failed to connect to AI Consultant. Please ensure the backend is running."
      );
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (!currentAnswer && currentQuestion?.input_type !== "select") return;

    const updatedAnswers: DynamicAnswers = {
      ...dynamicAnswers,
      [currentQuestion!.question_text]: currentAnswer,
    };

    setDynamicAnswers(updatedAnswers);
    setQuestionHistory((prev) => [...prev, currentQuestion!]);

    fetchNextQuestion(updatedAnswers, questionCount);
  };

  const handleDynamicRetry = () => {
    fetchNextQuestion(dynamicAnswers, questionCount);
  };

  const handleDynamicReadySkip = () => {
    setDynamicStep("ready");
  };

  /** ================= CHATBOT FOR PROMPT MODE ================= */
  const handleSendChatMessage = async () => {
    if (!prompt.trim()) return;

    // Add user message to chat
    const userMessage = { role: 'user' as const, content: prompt };
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    setPrompt("");
    setSelectedFile(null);
    setPreviewUrl(null);
    try {
      const formData = new FormData();
      formData.append('message', prompt);
      if (chatSessionId) {
        formData.append('session_id', chatSessionId);
      }
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const response = await fetch("http://127.0.0.1:8000/api/chatbot/message/", {
        method: "POST",
        // headers: { "Content-Type": "application/json" },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      // Store session_id
      if (data.session_id) {
        setChatSessionId(data.session_id);
      }

      // Add assistant response
      const assistantMessage = { role: 'assistant' as const, content: data.response };
      setChatMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = {
        role: 'assistant' as const,
        content: "Sorry, I'm having trouble connecting. Please try again."
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  /** ================= ORIGINAL GENERATE PLAN ================= */

  const handleGeneratePlan = async () => {
    if (inputMode === "manual") {
      const basePlan: ProjectPlanData = {
        buildingType,
        budget,
        startDate,
        goals: selectedGoals,
        buildingAge,
        buildingSize,
        bundesland,
        renovationSpecification,    // <-- ADD THIS
        renovationStandard,
        heatingSystem: selectedGoals.includes("Heating System")
          ? heatingSystem
          : undefined,
        insulationType: selectedGoals.includes("Insulation")
          ? insulationType
          : undefined,
        windowsType: selectedGoals.includes("Windows & Doors")
          ? windowsType
          : undefined,
        neighborImpact,
        financingPreference,
        incentiveIntent,
        livingDuringRenovation,
        energyCertificateRating,
        knownMajorIssues,
        surveysRequired,
      };

      const finalPlan: ProjectPlanData & {
        dynamic_answers?: DynamicAnswers;
      } =
        dynamicStep === "ready" || questionHistory.length > 0
          ? { ...basePlan, dynamic_answers: dynamicAnswers }
          : basePlan;

      onGeneratePlan(finalPlan);
    } else {
      // AI Prompt mode - for now just log the prompt and use default manual data
      if (!chatSessionId) {
        alert("Please have a conversation first before generating a plan.");
        return;
      }
      
      try {
        const response = await fetch("http://127.0.0.1:8000/api/chatbot/generate-from-chat/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: chatSessionId })
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          // Pass the generated plan to parent component
          onGeneratePlan({
            ...result.extracted_data,
            generatedPlan: result.plan
          });
        } else {
          console.error("Error:", result.error);
          alert("Failed to generate plan: " + result.error);
        }
      } catch (error) {
        console.error("Request failed:", error);
        alert("Failed to connect to server. Please try again.");
      }
    
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /*   const handlePromptSubmit = () => {
    if (prompt.trim()) {
      handleGeneratePlan();
    }
  }; */
  return (
    <Card className="border-emerald-100 shadow-sm transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          Start Your Project Plan
        </CardTitle>
        <CardDescription>
          Choose how you want to set up your renovation project
        </CardDescription>

        {/* Mode Selection Tabs */}
        <div className="flex border border-gray-200 rounded-lg p-1 mt-4 bg-gray-50">
          <Button
            onClick={() => setInputMode("manual")}
            className={`flex-1 justify-center py-2 px-3 text-sm font-medium transition-colors ${inputMode === "manual"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-0 shadow-none"
              }`}
          >
            <Settings className="w-4 h-4" />
            Manual Setup
          </Button>
          <Button
            onClick={() => setInputMode("prompt")}
            className={`flex-1 justify-center py-2 px-3 text-sm font-medium transition-colors ${inputMode === "prompt"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-0 shadow-none"
              }`}
          >
            <MessageSquare className="w-4 h-4" />
            AI Prompt
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {inputMode === "manual" ? (
          // Manual Input Form
          <>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="building-type">Building Type</Label>
                <Select
                  value={buildingType}
                  options={BUILDING_TYPES}
                  onChange={setBuildingType}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Estimated Budget (€)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="50000"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bundesland">Location (Bundesland)</Label>
                <Select
                  value={bundesland}
                  options={BUNDESLAND}
                  onChange={setBundesland}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="building-size">Building Size (m²)</Label>
                <Input
                  id="building-size"
                  type="number"
                  placeholder="60"
                  value={buildingSize}
                  onChange={(e) => setBuildingSize(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="renovation-specification">
                  Renovation Specification
                </Label>
                <Select
                  value={renovationSpecification}
                  options={ROOM_OPTIONS}
                  onChange={setRenovationSpecification}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="renovation-standard">Renovation Standard</Label>
                <Select
                  value={renovationStandard}
                  options={STANDARD_OPTIONS}
                  onChange={setRenovationStandard}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Renovation Goals</Label>
              <div className="flex flex-wrap gap-2">
                {RENOVATIONGOALS.map((goal) => (
                  <Badge
                    key={goal}
                    className={`cursor-pointer ${selectedGoals.includes(goal)
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border border-gray-300 hover:bg-gray-100 text-gray-900"
                      }`}
                    onClick={() => toggleGoal(goal)}
                  >
                    {goal}
                  </Badge>
                ))}
              </div>
            </div>
            {/* <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="building-age"> Building Age</Label>
                <div className="relative">
                  <Input
                    id="building-age"
                    type="date"
                    value={buildingAge}
                    onChange={(e) => setBuildingAge(e.target.value)}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div> */}
              {/* <div className="space-y-2">
                <Label htmlFor="timeline">Target Start Date</Label>
                <div className="relative">
                  <Input
                    id="timeline"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div> */}
            {/* <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="financing preference">
                  Financing Preference
                </Label>
                <Select
                  value={financingPreference}
                  options={FINANCING_PREFERENCE_OPTIONS}
                  onChange={setFinancingPreference}
                />
              </div> */}
              {/* <div className="space-y-2">
                <Label htmlFor="incentive-intent">Incentive Intent</Label>
                <Select
                  value={incentiveIntent}
                  options={INCENTIVE_INTENT_OPTIONS}
                  onChange={setIncentiveIntent}
                />
              </div>
            </div> */}

            {/* <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="heritage-protection">
                  Heritage Protection (Denkmalschutz)
                </Label>
                <Select
                  value={heritageProtection}
                  options={HERITAGE_PROTECTION}
                  onChange={setHeritageProtection}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="living-during-renovation">
                  Living During Renovation
                </Label>
                <Select
                  value={livingDuringRenovation}
                  options={LIVING_DURING_RENOVATION_OPTIONS}
                  onChange={setLivingDuringRenovation}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="energy-certificate-rating">
                  Energy Certificate Available
                </Label>
                <Select
                  value={energyCertificateRating}
                  options={ENERGY_CERTIFICATE_RATING_OPTIONS}
                  onChange={setEnergyCertificateRating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="known-major-issues">Known Major Issues</Label>
                <Select
                  value={knownMajorIssues}
                  options={KNOWN_MAJOR_ISSUES_OPTIONS}
                  onChange={setKnownMajorIssues}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="surveys-required">Surveys Require</Label>
                <Select
                  value={surveysRequired}
                  options={SURVEYS_REQUIRED_OPTIONS}
                  onChange={setSurveysRequired}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="Neighbor impacts">Neighbor Impacts</Label>
                <Select
                  value={neighborImpact}
                  options={NEIGHBOR_IMPACTS_OPTIONS}
                  onChange={setNeighborImpact}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {selectedGoals.includes("Heating System") && (
                <div className="space-y-2">
                  <Label htmlFor="heating-system">Heating System Type</Label>
                  <Select
                    value={heatingSystem}
                    options={HEATING_SYSTEM_OPTIONS}
                    onChange={setHeatingSystem}
                  />
                </div> */}
              {/* )} */}
              {/* {selectedGoals.includes("Insulation") && (
                <div className="space-y-2">
                  <Label htmlFor="insulation-type">
                    Current Insulation Status
                  </Label>
                  <Select
                    value={insulationType}
                    options={INSULATION_OPTIONS}
                    onChange={setInsulationType}
                  />
                </div>
              )}
              {selectedGoals.includes("Windows & Doors") && (
                <div className="space-y-2">
                  <Label htmlFor="Windows-type">Window Type</Label>
                  <Select
                    value={windowsType}
                    options={WINDOWS_TYPE_OPTIONS}
                    onChange={setWindowsType}
                  />
                </div>
              )}
            </div> */}

            {/* ====== DYNAMIC FLOW ENTRY BUTTON ====== */}
            {dynamicStep === "off" && (
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-gray-600 mb-3">
                  Optional: Let the AI ask a few targeted questions to refine
                  your plan.
                </p>
                <Button
                  type="button"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleStartDynamicFlow}
                >
                  Start AI Assisted Questions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* ====== DYNAMIC FLOW CONTENT (inside manual mode) ====== */}
            {dynamicStep === "dynamic" && (
              <div className="mt-6 space-y-4 border-t pt-4">
                {/* progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${questionCount >= MIN_QUESTIONS
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-blue-500"
                      }`}
                    style={{
                      width: `${Math.min(
                        (questionCount / SAFETY_MAX_LIMIT) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Started</span>
                  {questionCount < MIN_QUESTIONS && (
                    <span>Min Req: {MIN_QUESTIONS}</span>
                  )}
                  {questionCount >= MIN_QUESTIONS && (
                    <span className="text-emerald-600 font-medium">
                      Refining details...
                    </span>
                  )}
                </div>

                {questionHistory.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {questionHistory.map((q, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                      >
                        {q.question_text.substring(0, 18)}...
                      </span>
                    ))}
                  </div>
                )}

                {/* Error */}
                {dynamicError && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-lg flex flex-col items-center text-center">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <p className="font-medium mb-2">Connection Error</p>
                    <p className="text-sm mb-4">{dynamicError}</p>
                    <Button variant="primary" onClick={handleDynamicRetry}>
                      Try Again
                    </Button>
                  </div>
                )}

                {/* Loading */}
                {!dynamicError && isLoadingQuestion && (
                  <div className="animate-pulse space-y-4 py-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-10 bg-gray-200 rounded mt-2" />
                  </div>
                )}

                {/* Question */}
                {!dynamicError && !isLoadingQuestion && currentQuestion && (
                  <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm">
                    <div className="flex gap-3 mb-4">
                      <div className="bg-emerald-100 p-2 rounded-full h-fit">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-gray-900">
                          {currentQuestion.question_text}
                        </h3>
                        {currentQuestion.explanation && (
                          <p className="text-sm text-gray-500 mt-1">
                            {currentQuestion.explanation}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      {currentQuestion.input_type === "select" &&
                        currentQuestion.options ? (
                        <div className="grid grid-cols-1 gap-2">
                          {currentQuestion.options.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setCurrentAnswer(opt.value)}
                              className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${currentAnswer === opt.value
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1"
                                : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                                }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Input
                          type={
                            currentQuestion.input_type === "number"
                              ? "number"
                              : "text"
                          }
                          value={currentAnswer}
                          onChange={(e) => setCurrentAnswer(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAnswerSubmit()
                          }
                          placeholder="Type your answer here..."
                          className="text-base py-3"
                        />
                      )}
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={handleAnswerSubmit}
                        disabled={!currentAnswer}
                      >
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>

                    {questionCount >= MIN_QUESTIONS && (
                      <div className="mt-3 text-center">
                        <button
                          type="button"
                          onClick={handleDynamicReadySkip}
                          className="text-xs text-gray-400 hover:text-emerald-600 underline"
                        >
                          Skip remaining AI questions and use current answers
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* READY STATE inside manual mode */}
            {dynamicStep === "ready" && (
              <div className="mt-6 border-t pt-4 text-center">
                <div className="bg-emerald-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm text-gray-700 mb-1">
                  AI analysis complete.
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Collected {questionHistory.length} extra data points. These
                  will be added to your plan.
                </p>
              </div>
            )}
          </>
        ) : (
          // Prompt Input - Chatbot Mode
          <div className="space-y-4">
            {/* Chat Messages */}
            <div className="border border-gray-200 rounded-lg h-96 overflow-y-auto p-4 bg-gray-50 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Ask me anything about your renovation project
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      I can help with planning, costs, regulations, and financing
                    </p>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                        }`}
                    >
                      <div ref={chatEndRef} />
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* File upload + preview */}
            <div className="space-y-2">
              {previewUrl && (
                <div className="relative inline-flex items-center gap-3">
                  <img
                    src={previewUrl}
                    alt={selectedFile?.name || "Uploaded image"}
                    className="h-16 w-16 rounded-md object-cover border border-gray-200"
                  />        
                  <Button
                    type="button"
                    onClick={handleRemoveFile}
                    style={{backgroundColor: 'rgb(5 150 105 / var(--tw-bg-opacity))'}}
                    className="
                      absolute -top-2 -right-2
                      h-5 w-5
                      rounded-full                     
                      p-0
                    "
                  >
                    <X className="h-3 w-3 stroke-white" />
                  </Button>

 
                  <div className="text-xs text-gray-600 ml-2">
                    <Text className="font-medium">{selectedFile?.name}</Text>
                    <Text>{(selectedFile!.size / 1024).toFixed(1)} KB</Text>
                  </div>
                </div>
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChatMessage()}
                placeholder="Ask about your renovation project..."
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleFileButtonClick}
                className="text-sm"
              >
                <Upload />
              </Button>
              <Button
                onClick={handleSendChatMessage}
                disabled={!prompt.trim() || isChatLoading}
                variant="primary"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Ask about costs, timelines, permits, KfW funding,
                or any renovation-related questions specific to Germany.
              </p>
            </div>
          </div>
        )}

        {/* Generate Plan Button */}
        <Button
          className="w-full mt-4"
          onClick={handleGeneratePlan}
          disabled={isGenerating || (inputMode === "prompt" && chatMessages.length === 0)}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Generating Plan...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {inputMode === "manual"
                ? "Generate Plan"
                : "Generate Plan from Prompt"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
