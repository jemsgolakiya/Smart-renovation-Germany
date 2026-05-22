/**
 * Type definitions for the Financing module
 * Provides type safety across the application
 */

// ============================================================================
// Form Data Types
// ============================================================================

export interface FinancingFormData {
  // Basic Project Info
  renovationType: string;
  propertyLocation?: string;    // Property location/bundesland (cross-module)

  // STEP 0: Quality Preference (NEW)
  qualityPreference?: string;

  // STEP 1: Area Selection
  bathroomRenovationAreas?: string[]; // Array of selected renovation areas

  // SECTION 1: Renovation Goal (Always shown) - Enhanced
  renovationGoal?: string;
  renovationGoal_other?: string; // "Other" field for renovation goal
  bathroomSize?: number; // NEW: Bathroom size in m²

  // SECTION 2: Common Fields (Always shown) - Enhanced
  bathroomType?: string;
  bathroomType_other?: string; // "Other" field
  designStyle?: string;
  designStyle_other?: string; // "Other" field
  colorSchemeMain?: string;
  colorSchemeAccent?: string;
  metalFinish?: string;
  metalFinish_other?: string; // "Other" field

  // SECTION 3: Shower Area (Conditional) - Enhanced
  showerType?: string;
  showerType_other?: string; // "Other" field
  showerFixtureQuality?: string; // NEW: Quality level for shower fixtures
  showerBrand?: string; // German market brand (legacy)
  showerBrand_other?: string; // "Other" field
  showerEnclosureGlass?: string;
  showerEnclosureThickness?: number;
  showerEnclosureFrame?: string;
  showerFixtures?: string[];
  drainType?: string;

  // SECTION 4: Bathtub (Conditional) - Enhanced
  bathtubWanted?: string;
  bathtubType?: string;
  bathtubType_other?: string; // "Other" field
  bathtubMaterialQuality?: string; // NEW: Quality level for bathtub material
  bathtubMaterial?: string; // Legacy field
  bathtubMaterial_other?: string; // "Other" field
  bathtubBrand?: string; // German market brand (legacy)
  bathtubBrand_other?: string; // "Other" field
  bathtubSize?: string;

  // SECTION 5: Toilet Area (Conditional) - Enhanced
  toiletType?: string;
  toiletType_other?: string; // "Other" field
  toiletQuality?: string; // NEW: Quality level for toilet
  toiletBrand?: string; // German market brand (legacy)
  toiletBrand_other?: string; // "Other" field
  flushSystem?: string;
  flushSystem_other?: string; // "Other" field (changed from array to string)

  // SECTION 6: Washbasin Area (Conditional) - Enhanced
  basinCount?: string;
  basinType?: string;
  basinType_other?: string; // "Other" field
  basinQuality?: string; // NEW: Quality level for basin
  basinBrand?: string; // German market brand (legacy)
  basinBrand_other?: string; // "Other" field
  faucetQuality?: string; // NEW: Quality level for faucet
  countertopMaterialQuality?: string; // NEW: Quality level for countertop
  basinCountertopMaterial?: string; // Bathroom washbasin countertop material
  basinCountertopMaterial_other?: string; // "Other" field
  faucetBrand?: string; // German market brand (legacy)
  faucetBrand_other?: string; // "Other" field

  // SECTION 7: Tiles & Surfaces (Conditional)
  floorTileQuality?: string; // NEW: Quality level for floor tiles
  floorTileType?: string; // Legacy field
  floorTileSize?: string;
  wallTilesQuality?: string; // NEW: Quality level for wall tiles
  wallTilesHeight?: string;
  wallTilesMaterial?: string; // Legacy field
  accentWall?: string;
  groutQuality?: string; // NEW: Quality level for grout
  groutType?: string; // Legacy field
  groutColor?: string;

  // SECTION 8: Electrical & Lighting (Conditional)
  ceilingLights?: string[];
  lightingQuality?: string; // NEW: Quality level for lighting fixtures
  mirrorLights?: string;
  mirrorQuality?: string; // NEW: Quality level for mirror
  smartFeatures?: string[];

  // SECTION 9: Plumbing (Conditional)
  plumbingIssues?: string[];
  replacePipes?: string;
  hotWaterSystem?: string;
  pipeMaterial?: string;

  // SECTION 10: Water Pressure (Conditional)
  currentWaterPressure?: string;
  lowPressureLocation?: string[];
  waterSupplyType?: string;
  wantStrongerPressure?: string;
  boosterPumpOk?: string;

  // SECTION 11: Heating (NEW - Conditional)
  heatingType?: string[];
  heatingType_other?: string; // "Other" field
  heatedTowelRailQuality?: string; // NEW: Quality level for heated towel rail
  heatedTowelRailBrand?: string; // Legacy field
  heatedTowelRailBrand_other?: string; // "Other" field

  // SECTION 12: Ventilation (NEW - Conditional)
  ventilationType?: string;
  ventilationType_other?: string; // "Other" field
  ventilationCapacity?: string;
  ventilationCapacity_other?: string; // "Other" field

  // SECTION 13: Accessories (Conditional)
  accessoriesWanted?: string[];

  // SECTION 14: Waterproofing (Conditional)
  waterproofingRequired?: string;
  waterproofingIssues?: string[];
  waterproofingPreference?: string;

  // ========================================================================
  // KITCHEN RENOVATION FIELDS
  // ========================================================================
  kitchenRenovationAreas?: string[];
  kitchenRenovationGoal?: string;
  kitchenType?: string;
  layoutPreference?: string;
  cabinetWorkRequired?: string;
  cabinetMaterial?: string;
  cabinetType?: string[];
  storageAccessories?: string[];
  countertopMaterial?: string;
  counterLength?: string;
  islandCountertop?: string;
  backsplashPreference?: string;
  sinkType?: string;
  sinkMaterial?: string;
  faucetFeatures?: string[];
  hobType?: string;
  numberOfBurners?: string;
  brandPreference?: string;
  hoodType?: string;
  suctionPower?: string;
  ductingAvailable?: string;
  additionalAppliances?: string[];
  kitchenFlooringType?: string;
  kitchenWallFinishes?: string;
  kitchenCeilingLights?: string[];
  underCabinetLights?: string;
  electricalOutlets?: string[];
  kitchenSmartFeatures?: string[];
  kitchenPlumbingIssues?: string[];
  replaceKitchenPlumbing?: string;
  kitchenHotWater?: string;
  kitchenWaterPressure?: string;
  gasConnection?: string;
  gasType?: string;
  changeGasLine?: string;
  windowWork?: string[];
  kitchenAccessories?: string[];
  kitchenWaterproofing?: string;
  kitchenWaterproofingIssues?: string[];

  // ========================================================================
  // BASEMENT RENOVATION FIELDS
  // ========================================================================
  basementRenovationGoal?: string;
  basementFinished?: string;
  basementIssues?: string[];
  basementCeilingHeight?: string;
  basementUse?: string[];
  basementBathroom?: string;
  basementKitchen?: string;
  basementDesignStyle?: string;
  basementColorPreference?: string;
  basementComfortLevel?: string;
  basementNaturalLight?: string;
  improveNaturalLight?: string[];
  basementLightingPreference?: string[];
  basementVentilationRequired?: string;
  basementFlooringPreference?: string;
  basementWallFinish?: string;
  basementPlumbingIssues?: string[];
  addBasementPlumbing?: string[];
  basementElectricalCondition?: string;
  basementPowerRequirements?: string;
  basementSmartFeatures?: string[];
  basementWaterproofing?: string;
  basementMoistureControl?: string[];
  basementAccessType?: string;
  basementSafety?: string[];
  basementStorage?: string[];

  // ========================================================================
  // ROOFING RENOVATION FIELDS
  // ========================================================================
  roofingRenovationGoal?: string;
  currentRoofType?: string;
  currentRoofMaterial?: string;
  roofProblems?: string[];
  roofWaterproofing?: string;
  roofWaterproofingCondition?: string;
  rainwaterDrainage?: string;
  drainageType?: string;
  heatProblem?: string;
  thermalInsulation?: string;
  insulationSolution?: string;
  structuralIssues?: string[];
  futureLoadPlans?: string[];
  skylightsWanted?: string;
  skylightType?: string;
  skylightPurpose?: string[];
  roofAccessType?: string;
  roofSafety?: string[];
  solarSystem?: string;
  rainwaterHarvesting?: string;
  roofFinish?: string;
  roofColor?: string;

  // ========================================================================
  // ELECTRICAL RENOVATION FIELDS
  // ========================================================================
  electricalRenovationGoal?: string;
  electricalCondition?: string;
  wiringAge?: string;
  addPowerPoints?: string;
  numberOfPowerPoints?: string;
  switchType?: string;
  lightingUpgrade?: string;
  lightingTypes?: string[];
  lightingControl?: string[];
  highLoadAppliances?: string[];
  separateCircuits?: string;
  electricalSmartFeatures?: string[];
  safetyUpgrades?: string[];
  pastElectricalAccidents?: string;
  distributionBoardCondition?: string;
  distributionBoardLocation?: string;
  powerBackupSystem?: string[];
  solarPowerIntegration?: string;
  wiringType?: string;
  wallWorkAllowed?: string;

  // ========================================================================
  // PLUMBING RENOVATION FIELDS
  // ========================================================================
  plumbingRenovationGoal?: string;
  plumbingCondition?: string;
  plumbingAge?: string;
  waterSupplySource?: string;
  storageSystem?: string[];
  waterPressure?: string;
  lowPressureAreas?: string[];
  improvePressure?: string;
  drainageIssues?: string[];
  drainageSystemType?: string[];
  replacePipesPlumbing?: string;
  preferredPipeMaterial?: string;
  hotWaterAvailable?: string;
  hotWaterSystemType?: string;
  plumbingWorkAreas?: string[];
  newPlumbingPoints?: string;
  waterproofingIssuesPlumbing?: string;
  waterproofingWorkRequired?: string;
  waterFiltrationSystem?: string;
  rainwaterHarvestingPlumbing?: string;

  // ========================================================================
  // HVAC RENOVATION FIELDS
  // ========================================================================
  hvacRenovationGoal?: string;
  propertyType?: string;
  hvacAreas?: string;
  hvacCeilingHeight?: string;
  existingHVACSystem?: string;
  currentSystemType?: string;
  existingSystemIssues?: string[];
  coolingRequirement?: string;
  heatingRequirement?: string;
  airDistributionType?: string;
  ductworkCondition?: string;
  airQualityConcerns?: string[];
  airQualitySolutions?: string[];
  noiseSensitivity?: string;
  hvacPriority?: string;
  controlPreference?: string;
  zoningControl?: string;
  electricalReadiness?: string;
  outdoorUnitPlacement?: string;
  wallCeilingModification?: string;
  spaceConstraints?: string[];

  // ========================================================================
  // FLOORING RENOVATION FIELDS
  // ========================================================================
  flooringRenovationGoal?: string;
  flooringWorkAreas?: string[];
  flooringPropertyType?: string;
  existingFlooringType?: string;
  existingFlooringIssues?: string[];
  preferredFlooringMaterial?: string;
  flooringFinish?: string;
  tilePlankSize?: string;
  patternLayout?: string;
  slipResistance?: string;
  waterResistance?: string;
  comfortPreference?: string[];
  subfloorCondition?: string;
  existingFlooringRemoval?: string;
  flooringColorPreference?: string;
  groutPreference?: string;
  staircaseFlooring?: string;
  balconyFlooring?: string;

  // ========================================================================
  // WINDOWS & DOORS RENOVATION FIELDS
  // ========================================================================
  windowsDoorsRenovationGoal?: string;
  windowsDoorsWorkAreas?: string[];
  windowsDoorsPropertyType?: string;
  existingFrameMaterial?: string;
  existingWindowsDoorsIssues?: string[];
  windowType?: string;
  glassType?: string;
  windowFunctionPriority?: string[];
  doorType?: string;
  doorMaterial?: string;
  doorCorePreference?: string;
  lockingSystem?: string;
  additionalSecurityFeatures?: string[];
  soundInsulation?: string;
  thermalInsulationWindowsDoors?: string;
  frameColorPreference?: string;
  finishType?: string;
  wallModificationAllowed?: string;
  changeSizeOpening?: string;

  // ========================================================================
  // EXTERIOR RENOVATION FIELDS
  // ========================================================================
  exteriorRenovationGoal?: string;
  exteriorAreas?: string[];
  exteriorPropertyType?: string;
  existingExteriorFinish?: string;
  exteriorIssues?: string[];
  preferredExteriorFinish?: string;
  exteriorColorPreference?: string;
  waterSeepage?: string;
  exteriorWaterproofing?: string;
  protectionNeeded?: string[];
  exteriorThermalInsulation?: string;
  exteriorShading?: string[];
  securityUpgradesExterior?: string[];
  exteriorLightingTypes?: string[];
  exteriorLightingControl?: string;
  outdoorElements?: string[];
  structuralRepairs?: string;
  accessLimitations?: string[];

  // ========================================================================
  // GENERAL RENOVATION FIELDS
  // ========================================================================
  generalRenovationGoal?: string;
  generalPropertyUsage?: string;
  propertyAge?: string;
  areasIncluded?: string[];
  overallCondition?: string;
  generalExistingIssues?: string[];
  preferredDesignStyle?: string;
  generalColorPreference?: string;
  structuralChanges?: string;
  structuralChangeTypes?: string[];
  comfortImprovements?: string[];
  smartFeaturesDesired?: string[];
  safetyImprovements?: string[];
  systemUpgrades?: string[];
  renovationApproach?: string;
}

// ============================================================================
// Financing Option Types
// ============================================================================

export type FinancingType = 'loan' | 'subsidy' | 'grant';

export interface FinancingOption {
  id: string;
  name: string;
  type: FinancingType;
  provider: string;
  description: string;
  eligibility: string[];
  interestRate?: string;
  maxAmount?: string;
  renovationTypes: string[];
  incomeRequirement?: string;
  link: string;
  advantages: string[];
}

// ============================================================================
// Cost Estimation Types
// ============================================================================

// Individual line item within a subcategory
export interface CostLineItem {
  item: string;           // e.g., "Smart toilet (Villeroy & Boch)"
  quantity?: number;      // e.g., 1
  unit?: string;          // e.g., "piece", "m²", "hour"
  unitPrice?: number;     // e.g., 800
  cost: number;           // Total cost for this line item
  note?: string;          // Optional note like "German brand, 5-year warranty"
}

// Subcategory within a main category
export interface CostSubcategory {
  name: string;           // e.g., "Fixtures", "Labor", "Materials"
  items: CostLineItem[];  // Individual line items
  subtotal: number;       // Sum of items in this subcategory
}

export interface CostBreakdownItem {
  category: string;
  cost: number;
  description: string;
  details?: string[];              // Simple string details (backward compatible)
  subcategories?: CostSubcategory[]; // Detailed subcategories with line items
}

// Risk/sensitivity item for cost variability section
export interface CostRiskItem {
  factor: string;          // e.g., "Structural changes"
  impact: string;          // e.g., "+20–40%"
  likelihood?: 'low' | 'medium' | 'high';
}

// Financing insight for connecting to financing module
export interface FinancingInsight {
  text: string;
  eligible: boolean;       // true = checkmark, false = warning
}

// Quality tier estimate for comparison toggle
export interface QualityTierEstimate {
  tier: 'budget' | 'standard' | 'premium' | 'luxury';
  totalCost: number;
  highlights: string[];    // Key differences in this tier
  breakdown?: CostBreakdownItem[];  // Tier-specific cost breakdown
}

// Executive summary for brief AI overview
export interface ExecutiveSummary {
  overview: string;                 // 2-3 sentence project overview
  keyHighlights: string[];          // 3-5 bullet points of key cost drivers
  costDrivers: string;              // Brief explanation of main cost factors
  recommendation: string;           // AI recommendation/advice
  savingsTips?: string[];           // Optional tips to reduce costs
}

export interface CostEstimate {
  // Core data
  totalEstimatedCost: number;
  breakdown: CostBreakdownItem[];
  contingency: number;
  explanation: string;

  // AI Executive Summary (brief overview)
  executiveSummary?: ExecutiveSummary;

  // Professional consultant-style additions
  renovationType?: string;          // e.g., "Bathroom Renovation"
  qualityLevel?: string;            // e.g., "Premium"
  estimatedDuration?: string;       // e.g., "3–4 weeks"
  locationAssumption?: string;      // e.g., "Germany (2025 prices)"

  // Trust-building sections
  assumptions?: string[];           // List of assumptions made
  risks?: CostRiskItem[];           // Cost sensitivity & risks
  financingInsights?: FinancingInsight[];  // Financing readiness

  // Quality comparison (optional)
  qualityTiers?: QualityTierEstimate[];
}

// Extended cost estimate with internal fields from backend
export interface CostEstimateResponse extends CostEstimate {
  _originalPrompt?: string;    // Internal field: original prompt sent to Gemini
  _formData?: any;              // Internal field: original form data
  _ragMetadata?: any;           // Internal field: RAG metadata from backend
  _multimodal?: boolean;        // Internal field: whether multimodal AI was used
  _filesAnalyzed?: number;      // Internal field: number of files analyzed
  _uploadedImages?: any[];      // Internal field: base64 encoded images for image generation
}

// ============================================================================
// AI Recommendation Types
// ============================================================================

export interface FinancingRecommendation {
  name: string;
  type: FinancingType;
  priority: number;
  maxAmount: string;
  interestRate: string;
  eligibility: string;
  pros: string[];
  cons: string[];
  applicationSteps: string[];
  matchScore: number;
  applicationUrl?: string; // Direct link to apply for this financing option
}

export interface RAGAnalysisResult {
  costEstimate: CostEstimate;
  recommendations?: FinancingRecommendation[];
  summary?: string;
  nextSteps?: string[];
}

// ============================================================================
// AI Service Types
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

// ============================================================================
// Form Option Types
// ============================================================================

export interface SelectOption {
  value: string;
  label: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface CostCalculatorProps {
  totalEstimatedCost: number;
  breakdown: CostBreakdownItem[];
  contingency: number;
  explanation: string;
  userBudget: number;
}

export interface FinancingRecommendationsProps {
  recommendations: FinancingRecommendation[];
  summary: string;
  nextSteps: string[];
}

export interface DocumentChecklistProps {
  renovationType: string;
  ownership?: string; // Optional for backward compatibility
  energyEfficiency?: string; // Optional for backward compatibility
  estimatedBudget?: string; // Optional for backward compatibility
}

export interface FinancingAssistantProps {
  // Currently no props, but keeping for future extension
}
