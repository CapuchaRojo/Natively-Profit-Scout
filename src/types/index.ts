// ============================================================
// Natively Profit Scout — Core Type Definitions
// ============================================================

export interface CompanyBasic {
  name: string;
  website: string;
  industry: string;
  location: string;
  employeeCount: number;
  revenueEstimate: string;
  notes: string;
}

export interface CompanyBusiness {
  productsServices: string;
  targetCustomers: string;
  salesModel: string;
  deliveryModel: string;
  supportModel: string;
  operationsModel: string;
}

export interface CompanyPeople {
  leadership: string;
  salesTeam: string;
  technicalTeam: string;
  operationsTeam: string;
  supportTeam: string;
  financeAdmin: string;
  knownChampions: string;
  knownBlockers: string;
  unknownDecisionMaker: string;
}

export interface CompanyTools {
  crm: string;
  websitePlatform: string;
  schedulingTools: string;
  emailTools: string;
  projectManagement: string;
  communicationTools: string;
  supportTools: string;
  billingTools: string;
  automationTools: string;
  aiTools: string;
  securityTools: string;
  unknownTools: string;
}

export interface WorkloadFriction {
  dailyRepeats: string;
  manualCopyPaste: string;
  delays: string;
  customerWait: string;
  employeeTimeWaste: string;
  missedRevenue: string;
  errors: string;
  complianceRisk: string;
  softwareCouldAssist: string;
}

export interface SalesContext {
  approachReason: string;
  likelyBusinessPain: string;
  desiredResult: string;
  budgetOwner: string;
  painFeeler: string;
  dealBlocker: string;
  dealChampion: string;
}

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type AccessStatus =
  | 'known'
  | 'suspected'
  | 'unknown'
  | 'contacted'
  | 'meeting_booked'
  | 'champion'
  | 'blocker'
  | 'researchable'
  | 'email_known';
export type StakeholderCategory =
  | 'economic_buyer'
  | 'technical_buyer'
  | 'daily_user'
  | 'champion'
  | 'blocker'
  | 'influencer'
  | 'executive_sponsor'
  | 'procurement_admin'
  | 'unknown_but_needed';

export interface Stakeholder {
  id: string;
  category: StakeholderCategory;
  name?: string;
  role: string;
  department: string;
  likelyPriorities: string;
  likelyObjections: string;
  whatTheyCareAbout: string;
  bestTalkTrack: string;
  bestProof: string;
  buyingInfluence: number; // 1-5
  accessStatus: AccessStatus;
  confidence: ConfidenceLevel;
}

export type PainDepartment =
  | 'sales'
  | 'marketing'
  | 'customer_support'
  | 'operations'
  | 'admin'
  | 'finance'
  | 'hr_recruiting'
  | 'it_security'
  | 'field_service'
  | 'leadership_reporting';

export interface PainPoint {
  id: string;
  name: string;
  department: PainDepartment;
  symptoms: string;
  likelyCost: string;
  timeLost: string;
  revenueImpact: string;
  automationOpportunity: string;
  suggestedSolution: string;
  confidence: ConfidenceLevel;
  discoveryQuestion: string;
  severity: number; // 1-5
  frequency: number; // 1-5
  revenueImpactScore: number; // 1-5
  easeOfSolution: number; // 1-5
  decisionMakerVisibility: number; // 1-5
}

export interface Tool {
  id: string;
  name: string;
  function: string;
  department: string;
  currentPain: string;
  betterWorkflow: string;
  possibleNativelyBuild: string;
  integrationNotes: string;
  confidence: ConfidenceLevel;
}

export interface HighlanderRepurpose {
  toolName: string;
  whatItDoes: string;
  whoUsesIt: string;
  businessFunction: string;
  canBeReplicated: boolean;
  canBeAutomated: boolean;
  canBeSimplified: boolean;
  canBeEnhanced: boolean;
  v1ReplacementIdea: string;
  confidence: ConfidenceLevel;
}

export type OpportunityType =
  | 'internal_dashboard'
  | 'crm_cleanup'
  | 'lead_routing'
  | 'sales_followup'
  | 'customer_support_assistant'
  | 'intake_form_routing'
  | 'proposal_generator'
  | 'booking_scheduling'
  | 'knowledge_base_assistant'
  | 'compliance_checklist'
  | 'security_triage_dashboard'
  | 'inventory_work_order_tracker'
  | 'content_engine'
  | 'community_onboarding'
  | 'employee_training'
  | 'client_portal'
  | 'executive_reporting_dashboard'
  | 'custom';

export type ComplexityLevel = 'Low' | 'Medium' | 'High';
export type BusinessValueLevel = 'Low' | 'Medium' | 'High';

export interface Opportunity {
  id: string;
  title: string;
  businessProblem: string;
  whoFeelsPain: string;
  whoPaysForFix: string;
  proposedSolution: string;
  nativelyBuildIdea: string;
  requiredFeatures: string;
  estimatedComplexity: ComplexityLevel;
  estimatedBusinessValue: BusinessValueLevel;
  suggestedDemoAngle: string;
  suggestedBuildPrompt: string;
  discoveryQuestions: string;
  proofNeeded: string;
  closeStrategy: string;
  opportunityType: OpportunityType;
}

export interface RidePlan {
  demoConcept: string;
  buildPrompt: string;
  whatToShowFirst: string;
  whatToAskDuringDemo: string;
  positiveSignals: string;
  negativeSignals: string;
  howToRedirect: string;
  objections: string;
}

export interface SelectPlan {
  recommendedSolution: string;
  secondaryOption: string;
  expansionPath: string;
  mustHaveFeatures: string;
  niceToHaveFeatures: string;
  futureUpsell: string;
  decisionCriteria: string;
}

export interface PricePlan {
  openingValueStatement: string;
  costOfInaction: string;
  proposedOffer: string;
  fastProof: { name: string; description: string; price: string };
  seriousBuild: { name: string; description: string; price: string };
  teamScale: { name: string; description: string; price: string };
  recommendedPackage: string;
  closeQuestion: string;
  objectionQuestions: string;
  languagePattern: string;
  budgetOwner: string;
  budgetRange: 'small' | 'moderate' | 'serious' | 'enterprise';
  bestNextStep: string;
  concessionStrategy: string;
  followupPlan: string;
}

export interface SalesPlan {
  ride: RidePlan;
  select: SelectPlan;
  price: PricePlan;
}

export type DealStage =
  | 'discovery'
  | 'qualification'
  | 'demo'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export type ProspectStatus = 'hot' | 'warm' | 'cold' | 'unknown';

export interface CRMExport {
  id: string;
  companyName: string;
  website: string;
  industry: string;
  location: string;
  companySize: number;
  primaryContact?: string;
  decisionMaker?: string;
  champion?: string;
  painPoints: string[];
  opportunityScore: number;
  recommendedProduct: string;
  suggestedPackage: string;
  nextStep: string;
  followupDate: string;
  notes: string;
  crmTags: string[];
  source: string;
  confidence: ConfidenceLevel;
  dealStage: DealStage;
  prospectStatus: ProspectStatus;
}

export interface CompanyProfile {
  summary: string;
  businessModel: string;
  customerSegments: string;
  likelyDepartments: string[];
  publicPositioning: string;
  operationalMaturity: { level: string; confidence: ConfidenceLevel };
  digitalMaturity: { level: string; confidence: ConfidenceLevel };
  aiReadiness: { level: string; confidence: ConfidenceLevel };
  budgetLikelihood: { level: string; confidence: ConfidenceLevel };
  salesDifficulty: { level: string; confidence: ConfidenceLevel };
  bestConversationAngle: string;
  sections: ProfileSection[];
}

export interface ProfileSection {
  title: string;
  findings: string;
  evidence: string;
  confidence: ConfidenceLevel;
  missingInfo: string;
}

export interface Company {
  id: string;
  basic: CompanyBasic;
  business: CompanyBusiness;
  people: CompanyPeople;
  tools: CompanyTools;
  workloadFriction: WorkloadFriction;
  salesContext: SalesContext;
  profile?: CompanyProfile;
  painPoints: PainPoint[];
  stakeholders: Stakeholder[];
  toolMap: Tool[];
  highladerRepurpose: HighlanderRepurpose[];
  opportunities: Opportunity[];
  salesPlan?: SalesPlan;
  crmExport?: CRMExport;
  publicIntelSources: PublicIntelSource[];
  publicIntelSignals: PublicIntelSignal[];
  publicIntelOpenings: PublicIntelOpening[];
  publicIntelSummary?: PublicIntelSummary;
  reconFindings?: ReconFindings;
  createdAt: string;
  updatedAt: string;
  isSample?: boolean;
}

export interface AppSettings {
  userName: string;
  company: string;
  defaultOfferTypes: string[];
  defaultPackages: string;
  crmExportFormat: 'json' | 'csv' | 'markdown' | 'text';
  scoringWeights: {
    painSeverity: number;
    frequency: number;
    revenueImpact: number;
    decisionMakerVisibility: number;
    easeOfSolution: number;
  };
  customDiscoveryQuestions: string;
  customSalesLanguage: string;
  dataPrivacyConsent: boolean;
  publicIntelSettings: {
    autoAnalyzeOnFetch: boolean;
    maxSourcesPerCompany: number;
    showAssumedBadges: boolean;
  };
  reconSettings: ReconApiClientSettings;
}

export interface DashboardMetrics {
  totalCompanies: number;
  hotProspects: number;
  warmProspects: number;
  coldUnknown: number;
  averageOpportunityScore: number;
  upcomingFollowups: number;
  recentAnalyses: Company[];
  topTargets: Company[];
  exportQueue: number;
}

export type OfferType =
  | 'ai_automation'
  | 'agent_build'
  | 'workflow_optimization'
  | 'cybersecurity'
  | 'crm_cleanup'
  | 'content_engine'
  | 'internal_tool'
  | 'customer_support_bot'
  | 'sales_ops_automation'
  | 'custom';

export interface NewAnalysisData {
  basic: CompanyBasic;
  business: CompanyBusiness;
  people: CompanyPeople;
  tools: CompanyTools;
  workloadFriction: WorkloadFriction;
  salesContext: SalesContext;
  offerType: OfferType;
  customOfferType?: string;
}

// Public Intel Types
// ============================================================

export type SourceType =
  | 'company_homepage'
  | 'about_page'
  | 'services_products_page'
  | 'pricing_page'
  | 'careers_page'
  | 'blog_news_page'
  | 'contact_page'
  | 'other_url'
  | 'linkedin_notes'
  | 'manual_paste'
  | 'user_notes';

export type SourceStatus =
  | 'pending'
  | 'fetched'
  | 'pasted'
  | 'analyzed'
  | 'failed';

export type SignalCategory =
  | 'growth_signal'
  | 'hiring_signal'
  | 'tech_stack_signal'
  | 'sales_motion_signal'
  | 'support_burden_signal'
  | 'manual_workflow_signal'
  | 'compliance_security_signal'
  | 'expansion_signal'
  | 'funding_revenue_signal'
  | 'partnership_signal'
  | 'customer_pain_signal'
  | 'market_positioning_signal'
  | 'decision_maker_signal'
  | 'outreach_opening_signal';

export interface PublicIntelSource {
  sourceId: string;
  companyId: string;
  sourceType: SourceType;
  sourceUrl: string;
  sourceTitle: string;
  rawText: string;
  extractedSignals: string[];
  confidence: ConfidenceLevel;
  createdAt: string;
  lastAnalyzedAt: string;
  status: SourceStatus;
  notes: string;
}

export interface PublicIntelSignal {
  signalId: string;
  sourceId: string;
  companyId: string;
  title: string;
  category: SignalCategory;
  evidence: string;
  whyItMatters: string;
  possiblePainPoint: string;
  nativelyOpportunity: string;
  discoveryQuestion: string;
  confidence: ConfidenceLevel;
  sourceReference: string;
  isVerified: boolean;
  createdAt: string;
}

export interface PublicIntelOpening {
  openingId: string;
  companyId: string;
  sourceSignalId: string;
  title: string;
  sourceSignal: string;
  whatThisMightMean: string;
  whyAdamMightCare: string;
  whoToApproach: string;
  suggestedFirstLine: string;
  suggestedDiscoveryQuestion: string;
  suggestedNativelyDemo: string;
  riskUncertainty: string;
  confidence: ConfidenceLevel;
  appliedToPainPoints: boolean;
  appliedToOpportunities: boolean;
  createdAt: string;
  isGenericDiscovery: boolean;
}
export interface PublicIntelSummary {
  topSignals: string[];
  verifiedFacts: string[];
  assumptions: string[];
  missingInfo: string[];
  bestConversationAngle: string;
}

// ============================================================
// Auto-Fill Recon Types (v0.3)
// ============================================================

export type SourceLabel =
  | 'Detected'
  | 'Inferred'
  | 'User Provided'
  | 'Assumed';

export interface ReconDiscoveredUrl {
  urlId: string;
  url: string;
  pageType: string;
  discoveryMethod: 'homepage-link' | 'common-path' | 'sitemap' | 'user-added';
  status: 'unscanned' | 'scanned' | 'failed' | 'blocked' | 'pasted' | 'analyzing';
  confidence: ConfidenceLevel;
  notes: string;
  fetchedText?: string;
  fetchSourceType?: 'browser-fetch' | 'pasted-public-page' | 'edge-function' | 'ninjapear-proxy';
}

export interface DetectedTool {
  toolName: string;
  category: string;
  evidence: string;
  sourceUrl: string;
  detectionMethod: 'Detected' | 'Inferred';
  confidence: ConfidenceLevel;
  likelyDepartment: string;
  possibleWorkflow: string;
  possiblePain: string;
  nativelyOpportunity: string;
}

export interface InferredWorkflow {
  workflowName: string;
  department: string;
  evidence: string;
  likelyCurrentProcess: string;
  possibleBottleneck: string;
  automationOpportunity: string;
  suggestedNativeBuilderDemo: string;
  discoveryQuestion: string;
  confidence: ConfidenceLevel;
}

export interface ReconAutoFillSuggestion {
  field: string;
  suggestedValue: string;
  source: SourceLabel;
  evidence: string;
  confidence: ConfidenceLevel;
}

export interface ReconOpening {
  openingId: string;
  title: string;
  sourceEvidence: string;
  whatThisSuggests: string;
  whyItMatters: string;
  likelyBusinessPain: string;
  whoToApproach: string;
  firstLine: string;
  discoveryQuestion: string;
  suggestedNativelyDemo: string;
  suggestedBuildPrompt: string;
  confidence: ConfidenceLevel;
  riskUncertainty: string;
}

export interface ReconFindings {
  companyId: string;
  discoveredUrls: ReconDiscoveredUrl[];
  detectedTools: DetectedTool[];
  inferredWorkflows: InferredWorkflow[];
  autoFillSuggestions: ReconAutoFillSuggestion[];
  openings: ReconOpening[];
  publicPeopleNotes: string;
  publicLeadershipText: string;
  peopleSignals?: PeopleSignals;
  scanDate: string;
  status: 'pending' | 'scanned' | 'analyzed' | 'applied';
}

export interface ReconApiClientSettings {
  enabled: boolean;
  backendUrl: string;
  respectRobotsTxt: boolean;
  maxPagesPerScan: number;
  maxCharsPerPage: number;
  scanDelayMs: number;
  enableUrlDiscovery: boolean;
  enableToolFingerprinting: boolean;
  enableWorkflowInference: boolean;
  enablePeopleRoleInference: boolean;
  defaultConfidenceThreshold: ConfidenceLevel;
}
// ============================================================
// Public People & Role Signal Types (v0.4)
// ============================================================

export type PeopleSignalSourceType =
  | 'linkedin_company_about'
  | 'linkedin_company_post'
  | 'linkedin_job_post'
  | 'linkedin_employee_profile'
  | 'linkedin_people_search'
  | 'linkedin_company_posts_feed'
  | 'company_team_page'
  | 'leadership_page'
  | 'press_release'
  | 'careers_page'
  | 'manual_role_notes';

export interface RoleMapEntry {
  roleType: 'executive_founder' | 'sales_gtm' | 'operations' | 'finance_admin' | 'support' | 'technical_product' | 'security_compliance' | 'unknown_decision_maker_gap';
  roleTitle: string;
  department: string;
  evidence: string;
  confidence: ConfidenceLevel;
  sourceType: PeopleSignalSourceType;
  sourceUrl: string;
}

export interface StakeholderHypothesis {
  id: string;
  roleTitle: string;
  department: string;
  likelyConcern: string;
  likelyBuyingInfluence: number;
  likelyDiscoveryQuestion: string;
  confidence: ConfidenceLevel;
  evidence: string;
  sourceType: PeopleSignalSourceType;
  sourceUrl: string;
}

export interface HiringSignal {
  id: string;
  openRole: string;
  department: string;
  growingDepartment: string;
  roleGap: string;
  newInitiative: string;
  repeatedNeed: string;
  toolProcessHint: string;
  evidence: string;
  confidence: ConfidenceLevel;
  sourceType: PeopleSignalSourceType;
  sourceUrl: string;
}

export interface MilestoneSignal {
  id: string;
  milestoneType: 'launch' | 'partnership' | 'funding' | 'award' | 'growth' | 'new_product' | 'customer_win' | 'public_celebration' | 'other';
  description: string;
  evidence: string;
  confidence: ConfidenceLevel;
  sourceType: PeopleSignalSourceType;
  sourceUrl: string;
}

export interface OutreachAngle {
  id: string;
  angleText: string;
  targetRole: string;
  confidence: ConfidenceLevel;
  evidence: string;
  sourceType: PeopleSignalSourceType;
  sourceUrl: string;
}

export interface PeopleDiscoveryQuestion {
  id: string;
  targetRole: string;
  question: string;
  category: 'founder_ceo' | 'operations' | 'sales_gtm' | 'support' | 'finance_admin' | 'security_compliance' | 'technical_product';
  confidence: ConfidenceLevel;
  evidence: string;
  sourceType: PeopleSignalSourceType;
  sourceUrl: string;
}

export interface PeopleSignals {
  roleMap: RoleMapEntry[];
  stakeholderHypotheses: StakeholderHypothesis[];
  hiringSignals: HiringSignal[];
  milestoneSignals: MilestoneSignal[];
  outreachAngles: OutreachAngle[];
  discoveryQuestions: PeopleDiscoveryQuestion[];
}

// ============================================================
// Public People Source Discovery Types (v0.5)
// ============================================================

export type PeopleSourceQueueStatus =
  | 'suggested'
  | 'opened'
  | 'pasted'
  | 'analyzed'
  | 'skipped';

export interface PeopleSourceQueueItem {
  id: string;
  sourceType: PeopleSignalSourceType;
  sourceUrl: string;
  searchUrl?: string;
  reasonSuggested: string;
  status: PeopleSourceQueueStatus;
  pastedText?: string;
  confidence: ConfidenceLevel;
}

// ============================================================
// LinkedIn Discovery Types (v0.6)
// ============================================================

export interface DiscoveredEmployee {
  id: string;
  name: string;
  role?: string;
  linkedInUrl?: string;
  profileSearchUrl?: string;
  department?: string;
  source: 'linkedin_company_page' | 'linkedin_employee_profile' | 'manual_entry';
  status: 'suggested' | 'opened' | 'analyzed' | 'skipped';
  pastedText?: string;
  roleMapEntries?: RoleMapEntry[];
  confidence: ConfidenceLevel;
}

export interface LinkedInPostSignal {
  id: string;
  postUrl?: string;
  authorName?: string;
  authorRole?: string;
  postType: 'company_post' | 'employee_post' | 'job_posting' | 'unknown';
  keyThemes: string[];
  hiringRelevance: string[];
  painPointHints: string[];
  opportunityHints: string[];
  confidence: ConfidenceLevel;
  pastedText?: string;
}
