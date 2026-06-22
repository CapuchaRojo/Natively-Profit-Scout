// ============================================================
// Templates for Pain Points, Opportunities, and Stakeholders
// ============================================================
import type { PainDepartment, PainPoint, Opportunity, OpportunityType, Stakeholder, StakeholderCategory } from '../types';

export interface PainPointTemplate {
  name: string;
  symptoms: string;
  likelyCost: string;
  timeLost: string;
  revenueImpact: string;
  automationOpportunity: string;
  suggestedSolution: string;
  discoveryQuestion: string;
  severity: number;
  frequency: number;
  revenueImpactScore: number;
  easeOfSolution: number;
  decisionMakerVisibility: number;
}

export const painPointTemplates: Record<PainDepartment, PainPointTemplate[]> = {
  sales: [
    {
      name: 'Missed Lead Follow-Up',
      symptoms: 'Leads fall through cracks, no automated follow-up sequence, reps forget to call',
      likelyCost: '$500+ per lost lead',
      timeLost: '2-4 hrs/day per rep',
      revenueImpact: '20-30% of pipeline lost',
      automationOpportunity: 'Auto-enroll leads into sequences, trigger follow-ups on activity',
      suggestedSolution: 'Sales engagement automation with lead routing and follow-up sequences',
      discoveryQuestion: 'How quickly do you typically follow up with a new inbound lead?',
      severity: 4, frequency: 5, revenueImpactScore: 5, easeOfSolution: 3, decisionMakerVisibility: 4
    },
    {
      name: 'Manual Lead Routing',
      symptoms: 'Leads emailed manually, no round-robin, territory assignment is manual',
      likelyCost: 'Admin time waste',
      timeLost: '1-2 hrs/day',
      revenueImpact: 'Slow response = 10% conversion loss',
      automationOpportunity: 'Auto-assign leads by territory, score, or round-robin',
      suggestedSolution: 'Smart lead routing engine with rules engine',
      discoveryQuestion: 'How are leads currently assigned to your sales reps?',
      severity: 3, frequency: 4, revenueImpactScore: 4, easeOfSolution: 4, decisionMakerVisibility: 3
    },
    {
      name: 'No CRM Pipeline Visibility',
      symptoms: 'Managers don\'t know true pipeline, spreadsheets used as workaround',
      likelyCost: 'Poor forecasting = missed targets',
      timeLost: '3-5 hrs/week in reporting',
      revenueImpact: 'Inaccurate forecast = 15% miss rate',
      automationOpportunity: 'Build a real-time dashboard with pipeline stages and forecasts',
      suggestedSolution: 'Executive sales dashboard with real-time pipeline tracking',
      discoveryQuestion: 'How do you currently track your sales pipeline?',
      severity: 4, frequency: 4, revenueImpactScore: 4, easeOfSolution: 3, decisionMakerVisibility: 5
    },
  ],
  marketing: [
    {
      name: 'Manual Content Publishing',
      symptoms: 'Copy-paste to multiple platforms, no scheduling, inconsistent branding',
      likelyCost: 'Wasted marketing salary hours',
      timeLost: '5-10 hrs/week',
      revenueImpact: 'Inconsistent presence = lower engagement',
      automationOpportunity: 'Content calendar with cross-platform publishing and templates',
      suggestedSolution: 'Content ops automation with scheduling and templates',
      discoveryQuestion: 'How do you currently publish content across your channels?',
      severity: 3, frequency: 5, revenueImpactScore: 3, easeOfSolution: 4, decisionMakerVisibility: 3
    },
    {
      name: 'No Lead Scoring',
      symptoms: 'Marketing generates leads but sales ignores them, no qualification system',
      likelyCost: 'Wasted ad spend on unqualified leads',
      timeLost: 'Sales wastes 40% time on bad leads',
      revenueImpact: '30% of MQLs never contacted',
      automationOpportunity: 'Build a lead scoring system from CRM + behavior data',
      suggestedSolution: 'Automated lead scoring engine with behavior tracking',
      discoveryQuestion: 'How do you determine which leads are worth pursuing?',
      severity: 4, frequency: 4, revenueImpactScore: 5, easeOfSolution: 3, decisionMakerVisibility: 4
    },
  ],
  customer_support: [
    {
      name: 'Ticket Backlog',
      symptoms: 'Support tickets pile up, customers wait days, no SLA tracking',
      likelyCost: 'Lost customers, churn',
      timeLost: 'Agents overwhelmed',
      revenueImpact: '30% churn from poor support',
      automationOpportunity: 'Auto-triage, canned responses, chatbot for common questions',
      suggestedSolution: 'AI support ticket triage and knowledge base chatbot',
      discoveryQuestion: 'How many support tickets do you get per day and how long is the wait?',
      severity: 5, frequency: 5, revenueImpactScore: 5, easeOfSolution: 3, decisionMakerVisibility: 4
    },
    {
      name: 'Repetitive Tier-1 Questions',
      symptoms: 'Same questions answered daily, no knowledge base for self-service',
      likelyCost: '$30-50/hr for agent time on simple questions',
      timeLost: '60% of support time on tier-1',
      revenueImpact: 'Customer frustration from wait times',
      automationOpportunity: 'FAQ chatbot + knowledge base self-service portal',
      suggestedSolution: 'AI-powered FAQ chatbot with escalation to human agents',
      discoveryQuestion: 'What are the top 5 questions your support team answers daily?',
      severity: 4, frequency: 5, revenueImpactScore: 3, easeOfSolution: 4, decisionMakerVisibility: 3
    },
  ],
  operations: [
    {
      name: 'Manual Reporting',
      symptoms: 'Weekly reports created by hand, pulling data from multiple sources',
      likelyCost: '$30K+/yr in analyst time',
      timeLost: '1-2 days/week per report',
      revenueImpact: 'Slow decisions = missed opportunities',
      automationOpportunity: 'Auto-generated dashboard with data source integration',
      suggestedSolution: 'Operations dashboard with automated data aggregation',
      discoveryQuestion: 'How long does it take to generate your weekly operations report?',
      severity: 3, frequency: 4, revenueImpactScore: 3, easeOfSolution: 4, decisionMakerVisibility: 4
    },
    {
      name: 'Manual Data Entry Between Systems',
      symptoms: 'Same data entered in multiple systems, copy-paste, sync issues',
      likelyCost: '$20K/yr in labor',
      timeLost: '2-4 hrs/day across team',
      revenueImpact: 'Data errors = bad decisions',
      automationOpportunity: 'API integration layer to sync data between systems',
      suggestedSolution: 'Integration middleware for system-to-system sync',
      discoveryQuestion: 'How many systems do you use and how do they share data?',
      severity: 4, frequency: 5, revenueImpactScore: 3, easeOfSolution: 3, decisionMakerVisibility: 3
    },
  ],
  admin: [
    {
      name: 'Manual Invoicing',
      symptoms: 'Invoices created by hand, emailed individually, payment follow-up manual',
      likelyCost: 'Late payments = cash flow issues',
      timeLost: '3-5 days/month',
      revenueImpact: '15% of invoices paid late',
      automationOpportunity: 'Auto-generate and send invoices with payment reminders',
      suggestedSolution: 'Automated invoicing system with payment tracking',
      discoveryQuestion: 'How do you currently handle invoicing and payment follow-up?',
      severity: 3, frequency: 4, revenueImpactScore: 4, easeOfSolution: 4, decisionMakerVisibility: 3
    },
  ],
  finance: [
    {
      name: 'Manual Expense Tracking',
      symptoms: 'Receipts collected in envelopes, manual spreadsheet entry',
      likelyCost: 'Missed deductions, fraud risk',
      timeLost: '2-3 days/month',
      revenueImpact: '5-10% expense leakage',
      automationOpportunity: 'Expense scanning and auto-categorization system',
      suggestedSolution: 'Digital expense management with receipt OCR',
      discoveryQuestion: 'How do your employees submit and track expenses?',
      severity: 3, frequency: 3, revenueImpactScore: 3, easeOfSolution: 4, decisionMakerVisibility: 3
    },
  ],
  hr_recruiting: [
    {
      name: 'Manual Resume Screening',
      symptoms: 'Hundreds of resumes for each role, manual review, slow hiring',
      likelyCost: '$5K per bad hire',
      timeLost: '20-30 hrs per hire',
      revenueImpact: 'Slow hiring = missed growth targets',
      automationOpportunity: 'Auto-screen resumes by keyword matching and scoring',
      suggestedSolution: 'AI resume screening and candidate ranking tool',
      discoveryQuestion: 'How many candidates apply per role and how do you screen them?',
      severity: 3, frequency: 3, revenueImpactScore: 4, easeOfSolution: 3, decisionMakerVisibility: 4
    },
    {
      name: 'Manual Onboarding',
      symptoms: 'Paper forms, manual account setup, inconsistent training',
      likelyCost: 'Productivity loss of 2-4 weeks per new hire',
      timeLost: '10+ hrs of admin per hire',
      revenueImpact: 'Slow ramp = delayed revenue contribution',
      automationOpportunity: 'Digital onboarding portal with automated account provisioning',
      suggestedSolution: 'Employee onboarding automation with checklists and provisioning',
      discoveryQuestion: 'How long does it take to fully onboard a new employee?',
      severity: 3, frequency: 2, revenueImpactScore: 3, easeOfSolution: 3, decisionMakerVisibility: 3
    },
  ],
  it_security: [
    {
      name: 'Manual Security Checks',
      symptoms: 'Security audits done manually, no automated monitoring, compliance risk',
      likelyCost: 'Data breach avg $150K for SMB',
      timeLost: '1 week per audit',
      revenueImpact: 'Compliance fines + breach costs',
      automationOpportunity: 'Automated security scanning and compliance reporting',
      suggestedSolution: 'Automated security compliance monitoring dashboard',
      discoveryQuestion: 'How do you currently manage security compliance?',
      severity: 5, frequency: 2, revenueImpactScore: 5, easeOfSolution: 2, decisionMakerVisibility: 5
    },
  ],
  field_service: [
    {
      name: 'Manual Scheduling & Dispatch',
      symptoms: 'Phone-based scheduling, paper routes, no mobile tracking',
      likelyCost: 'Fuel waste, overtime costs',
      timeLost: '3-5 hrs/day dispatch coordination',
      revenueImpact: 'Fewer jobs completed per day',
      automationOpportunity: 'Auto-scheduling with GPS dispatch and mobile app',
      suggestedSolution: 'Field service scheduling and dispatch platform',
      discoveryQuestion: 'How do you currently schedule and dispatch field technicians?',
      severity: 4, frequency: 5, revenueImpactScore: 4, easeOfSolution: 3, decisionMakerVisibility: 4
    },
  ],
  leadership_reporting: [
    {
      name: 'No Real-Time Executive Dashboard',
      symptoms: 'Executives rely on static reports, no real-time visibility into KPIs',
      likelyCost: 'Slow decisions = $100K+ in missed opportunities',
      timeLost: 'Waiting for reports delays decisions by weeks',
      revenueImpact: 'Delayed strategic decisions',
      automationOpportunity: 'Real-time executive dashboard with key business metrics',
      suggestedSolution: 'Executive real-time KPI dashboard with drill-down',
      discoveryQuestion: 'How do you currently track and review business KPIs?',
      severity: 4, frequency: 3, revenueImpactScore: 4, easeOfSolution: 3, decisionMakerVisibility: 5
    },
  ],
};

export interface OpportunityTemplate {
  title: string;
  businessProblem: string;
  proposedSolution: string;
  nativelyBuildIdea: string;
  requiredFeatures: string;
  suggestedDemoAngle: string;
  suggestedBuildPrompt: string;
  discoveryQuestions: string;
  proofNeeded: string;
  closeStrategy: string;
  estimatedComplexity: 'Low' | 'Medium' | 'High';
  estimatedBusinessValue: 'Low' | 'Medium' | 'High';
}

export const opportunityTemplates: Record<OpportunityType, OpportunityTemplate> = {
  internal_dashboard: {
    title: 'Executive Operations Dashboard',
    businessProblem: 'No real-time visibility into key business metrics across departments',
    proposedSolution: 'Build a custom dashboard aggregating data from existing tools',
    nativelyBuildIdea: 'Natively internal dashboard with drag-and-drop widgets',
    requiredFeatures: 'Data source connectors, real-time charts, role-based access, export',
    suggestedDemoAngle: '5-minute setup: connect 3 data sources, show live dashboard',
    suggestedBuildPrompt: 'Build an internal dashboard with revenue, support, and ops KPIs',
    discoveryQuestions: 'What are the top 5 metrics you check weekly? Where does that data live?',
    proofNeeded: 'Case study of similar company that saved 10 hrs/week on reporting',
    closeStrategy: 'Start with one department, prove value, expand across org',
    estimatedComplexity: 'Medium', estimatedBusinessValue: 'High',
  },
  crm_cleanup: {
    title: 'CRM Data Hygiene Automation',
    businessProblem: 'CRM full of duplicates, outdated contacts, incomplete records',
    proposedSolution: 'Automated deduplication, enrichment, and data standardization',
    nativelyBuildIdea: 'CRM cleanup agent that deduplicates and enriches records',
    requiredFeatures: 'Dedup engine, data enrichment API integration, merge workflows',
    suggestedDemoAngle: 'Scan their CRM, show 200+ duplicates found, auto-merge 10 in demo',
    suggestedBuildPrompt: 'Build a CRM dedup and data quality agent',
    discoveryQuestions: 'How many contacts in your CRM? When was the last cleanup?',
    proofNeeded: 'Show 30% improvement in email deliverability post-cleanup',
    closeStrategy: 'Free CRM audit report → then sell cleanup solution',
    estimatedComplexity: 'Low', estimatedBusinessValue: 'Medium',
  },
  lead_routing: {
    title: 'Smart Lead Distribution System',
    businessProblem: 'Leads not assigned promptly or to the right rep',
    proposedSolution: 'Automated lead scoring and round-robin or skills-based assignment',
    nativelyBuildIdea: 'Natively lead router with rules engine + Slack/email notifications',
    requiredFeatures: 'Lead scoring rules, round-robin assignment, CRM integration, notifications',
    suggestedDemoAngle: 'Show lead coming in → auto-scored → assigned in < 1 second',
    suggestedBuildPrompt: 'Build an intelligent lead routing system with rules engine',
    discoveryQuestions: 'How are leads assigned today? How long does assignment take?',
    proofNeeded: 'Client who improved response time from 4hrs to 2min',
    closeStrategy: 'Pilot with one team, measure response time improvement, expand',
    estimatedComplexity: 'Low', estimatedBusinessValue: 'High',
  },
  sales_followup: {
    title: 'Automated Sales Follow-Up Sequences',
    proposedSolution: 'Automated multi-channel follow-up sequences (email, SMS, call reminders)',
    nativelyBuildIdea: 'Natively sales cadence engine with templates and triggers',
    suggestedDemoAngle: 'Set up a 5-step follow-up sequence in 3 minutes during demo',
    suggestedBuildPrompt: 'Build a sales follow-up automation with sequences and triggers',
    discoveryQuestions: 'What does your follow-up process look like today?',
    proofNeeded: 'Client who increased lead conversion by 40% with automated follow-up',
    closeStrategy: 'Show quick setup ROI, start with 30-day pilot',
    estimatedComplexity: 'Low', estimatedBusinessValue: 'High',
  },
  customer_support_assistant: {
    title: 'AI Support Assistant & Knowledge Base',
    businessProblem: 'Support team overwhelmed by repetitive tier-1 questions',
    proposedSolution: 'AI chatbot + knowledge base for self-service, escalation to humans',
    nativelyBuildIdea: 'Natively customer support bot with training on their docs',
    requiredFeatures: 'Chat UI, knowledge base, intent recognition, escalation, analytics',
    suggestedDemoAngle: 'Upload their FAQ → bot answers 5 questions correctly in demo',
    suggestedBuildPrompt: 'Build a customer support chatbot with knowledge base',
    discoveryQuestions: 'What are your top 10 most common support questions?',
    proofNeeded: 'Client who automated 60% of tier-1 tickets, saving $20K/quarter',
    closeStrategy: 'Start with FAQ bot, expand to full support automation',
    estimatedComplexity: 'Medium', estimatedBusinessValue: 'High',
  },
  intake_form_routing: {
    title: 'Intake Form & Auto-Routing System',
    businessProblem: 'Client intake forms arrive by email, manually entered into systems',
    proposedSolution: 'Web intake forms with auto-routing to the right team',
    nativelyBuildIdea: 'Natively intake form builder with workflow routing engine',
    requiredFeatures: 'Form builder, routing rules, notification system, CRM integration',
    suggestedDemoAngle: 'Build a multi-step intake form in 2 minutes, show auto-routing',
    suggestedBuildPrompt: 'Build an intake form system with automated routing',
    discoveryQuestions: 'How do new client requests come in? Who handles routing?',
    proofNeeded: 'Client who reduced intake-to-assignment from 24hrs to 30min',
    closeStrategy: 'Replace their Google Form + manual process with integrated system',
    estimatedComplexity: 'Low', estimatedBusinessValue: 'Medium',
  },
  proposal_generator: {
    title: 'Automated Proposal Generator',
    businessProblem: 'Proposals created manually from scratch each time, inconsistent quality',
    proposedSolution: 'Template-based proposal generator with dynamic pricing and content',
    nativelyBuildIdea: 'Natively proposal builder with templates, pricing calculator, and e-sign',
    requiredFeatures: 'Template library, pricing engine, dynamic content, e-sign integration',
    suggestedDemoAngle: 'Generate a branded, priced proposal from 3 inputs in 60 seconds',
    suggestedBuildPrompt: 'Build an automated proposal generator with templates',
    discoveryQuestions: 'How many proposals do you send per month? How long does each take?',
    proofNeeded: 'Client who cut proposal creation time from 4hrs to 30min',
    closeStrategy: 'Free proposal template setup → sell automation on volume',
    estimatedComplexity: 'Medium', estimatedBusinessValue: 'High',
  },
  booking_scheduling: {
    title: 'Automated Booking & Scheduling System',
    businessProblem: 'Manual back-and-forth to schedule meetings, double-booking, no-shows',
    proposedSolution: 'Self-service booking portal with automated reminders and calendar sync',
    nativelyBuildIdea: 'Natively booking system with calendar sync, reminders, and rescheduling',
    requiredFeatures: 'Calendar integration, booking page, reminder emails/SMS, availability rules',
    suggestedDemoAngle: 'Show booking page → pick time → auto-confirm in 30 seconds',
    suggestedBuildPrompt: 'Build a self-service booking and scheduling system',
    discoveryQuestions: 'How do prospects currently book time with your team?',
    proofNeeded: 'Client who reduced no-shows by 60% with automated reminders',
    closeStrategy: 'Replace Calendly/Calendly competitor with branded, integrated solution',
    estimatedComplexity: 'Low', estimatedBusinessValue: 'Medium',
  },
  knowledge_base_assistant: {
    title: 'Internal Knowledge Base AI',
    businessProblem: 'Tribal knowledge lost when employees leave, no central documentation',
    proposedSolution: 'Searchable knowledge base with AI-powered answers from company docs',
    nativelyBuildIdea: 'Natively internal wiki with AI search and Q&A from indexed content',
    requiredFeatures: 'Document upload, indexing, search, AI Q&A, role-based access',
    suggestedDemoAngle: 'Upload a few docs → ask natural language questions → get answers',
    suggestedBuildPrompt: 'Build an internal knowledge base with AI search',
    discoveryQuestions: 'Where does your team store knowledge and processes today?',
    proofNeeded: 'Client who reduced new hire ramp time by 50% with knowledge base',
    closeStrategy: 'Start with process documentation, expand to full knowledge management',
    estimatedComplexity: 'Medium', estimatedBusinessValue: 'Medium',
  },
  compliance_checklist: {
    title: 'Compliance & Audit Checklist Automation',
    businessProblem: 'Manual compliance checklists, missed items, audit anxiety',
    proposedSolution: 'Automated compliance tracking with checklist templates and audit trails',
    nativelyBuildIdea: 'Natively compliance tracker with automated checks and audit reports',
    requiredFeatures: 'Checklist builder, automated checks, audit log, reporting, alerts',
    suggestedDemoAngle: 'Set up a compliance checklist, show auto-checks, generate audit report',
    suggestedBuildPrompt: 'Build a compliance checklist automation system',
    discoveryQuestions: 'What compliance requirements do you need to meet? How do you track them?',
    proofNeeded: 'Client who passed audit with 100% compliance using automated system',
    closeStrategy: 'Industry-specific compliance packs → sell on risk reduction',
    estimatedComplexity: 'Medium', estimatedBusinessValue: 'Medium',
  },
  security_triage_dashboard: {
    title: 'Security Alert Triage Dashboard',
    businessProblem: 'Security alerts missed or buried in email, slow response time',
    proposedSolution: 'Centralized security alert dashboard with triage workflow',
    nativelyBuildIdea: 'Natively security operations dashboard with alert aggregation',
    requiredFeatures: 'Alert ingestion, severity scoring, triage workflow, SLA tracking',
    suggestedDemoAngle: 'Simulate security alerts, show triage in action, auto-escalation',
    suggestedBuildPrompt: 'Build a security alert triage and response dashboard',
    discoveryQuestions: 'How do you currently monitor and respond to security alerts?',
    proofNeeded: 'Client who reduced alert response time from 4hrs to 15min',
    closeStrategy: 'Free security assessment → show gaps → sell dashboard',
    estimatedComplexity: 'High', estimatedBusinessValue: 'High',
  },
  inventory_work_order_tracker: {
    title: 'Inventory & Work Order Management',
    proposedSolution: 'Digital inventory tracker with work order creation and status tracking',
    title: 'Inventory & Work Order Management',
    businessProblem: 'Inventory tracked in spreadsheets, work orders on paper, no visibility',
    nativelyBuildIdea: 'Natively inventory + work order management system',
    suggestedBuildPrompt: 'Build an inventory and work order management system',
    discoveryQuestions: 'How do you track inventory and manage work orders today?',
    proofNeeded: 'Client who reduced inventory loss by 25% with digital tracking',
    closeStrategy: 'Replace spreadsheets and paper with digital system',
    estimatedComplexity: 'Medium', estimatedBusinessValue: 'Medium',
  },
  content_engine: {
    title: 'Content Marketing Engine',
    businessProblem: 'Content creation is slow, inconsistent, no content calendar',
    proposedSolution: 'Content planning, creation workflow, and automated publishing',
    nativelyBuildIdea: 'Natively content engine with calendar, templates, AI drafting, publishing',
    requiredFeatures: 'Content calendar, AI drafting tool, approval workflow, publishing API',
    suggestedDemoAngle: 'Create and schedule a month of social posts in 10 minutes',
    suggestedBuildPrompt: 'Build a content marketing automation engine',
    discoveryQuestions: 'How do you plan, create, and publish content today?',
    proofNeeded: 'Client who increased content output 5x with the same team',
    closeStrategy: 'Start with social content, expand to blog and email',
    estimatedComplexity: 'Medium', estimatedBusinessValue: 'Medium',
  },
  community_onboarding: {
    title: 'Community & Onboarding Automation',
    businessProblem: 'New community members or customers get no structured onboarding',
    proposedSolution: 'Automated onboarding sequence with emails, tasks, and progress tracking',
    nativelyBuildIdea: 'Natively onboarding portal with welcome sequences and milestone tracking',
    requiredFeatures: 'Onboarding templates, email sequences, task lists, progress dashboard',
    suggestedDemoAngle: 'Create an onboarding sequence, show new member experience',
    suggestedBuildPrompt: 'Build an automated community onboarding system',
    discoveryQuestions: 'How do you currently onboard new members or customers?',
    proofNeeded: 'Client who improved onboarding completion from 20% to 80%',
    closeStrategy: 'Show activation rate improvement, prove ROI with retention',
    estimatedComplexity: 'Low', estimatedBusinessValue: 'Medium',
  },
  employee_training: {
    title: 'Employee Training & LMS Portal',
    businessProblem: 'No structured employee training, inconsistent onboarding',
    proposedSolution: 'Custom learning management portal with courses, quizzes, and tracking',
    nativelyBuildIdea: 'Natively LMS with course builder, assessments, and certification',
    requiredFeatures: 'Course builder, video embedding, assessments, progress tracking, reporting',
    suggestedDemoAngle: 'Build a 3-module course with quiz in 5 minutes during demo',
    suggestedBuildPrompt: 'Build an employee training and LMS portal',
    discoveryQuestions: 'How do you train new employees and track their progress?',
    proofNeeded: 'Client who reduced onboarding time by 40% with structured LMS',
    closeStrategy: 'Start with onboarding course, expand to full training library',
    estimatedComplexity: 'Medium', estimatedBusinessValue: 'Medium',
  },
  client_portal: {
    title: 'Client Portal & Document Exchange',
    businessProblem: 'Files shared via email, no client hub, version control problems',
    proposedSolution: 'Secure client portal with document sharing, messaging, and project view',
    nativelyBuildIdea: 'Natively client portal with secure file exchange and collaboration',
    requiredFeatures: 'Client accounts, secure upload, messaging, file versioning, activity log',
    suggestedDemoAngle: 'Create a client workspace, upload files, show client view',
    suggestedBuildPrompt: 'Build a secure client portal for document and communication exchange',
    discoveryQuestions: 'How do you share documents and communicate with clients today?',
    proofNeeded: 'Client who reduced email attachment volume by 70% with portal',
    closeStrategy: 'Replace email-based file sharing with branded portal',
    estimatedComplexity: 'Medium', estimatedBusinessValue: 'High',
  },
  executive_reporting_dashboard: {
    title: 'Executive Real-Time Reporting Dashboard',
    businessProblem: 'Executives wait weeks for reports, no real-time decision-making data',
    proposedSolution: 'Real-time executive dashboards with key business metrics',
    nativelyBuildIdea: 'Natively executive dashboard with KPI widgets and drill-down',
    requiredFeatures: 'KPI visualizations, data connectors, drill-down, PDF export, automated reports',
    suggestedDemoAngle: 'Connect 4 data sources, show live dashboard with 8 KPIs in 10 minutes',
    suggestedBuildPrompt: 'Build an executive reporting dashboard with real-time data aggregation',
    discoveryQuestions: 'What reports do you review monthly and where does the data come from?',
    proofNeeded: 'Client who saved 40 hrs/month on reporting with dashboards',
    closeStrategy: 'One dashboard free → sell additional dashboards per department',
    estimatedComplexity: 'Medium', estimatedBusinessValue: 'High',
  },
  custom: {
    title: 'Custom Automation Solution',
    businessProblem: 'Unique business process that needs custom automation',
    proposedSolution: 'Tailored Natively-built application for their specific workflow',
    nativelyBuildIdea: 'Custom Natively application built to their exact specifications',
    requiredFeatures: 'To be determined during discovery',
    suggestedDemoAngle: 'Tailored to the specific workflow',
    suggestedBuildPrompt: 'Build a custom automation solution',
    discoveryQuestions: 'What specific process would you like automated?',
    proofNeeded: 'Custom proof points to be developed during discovery',
    closeStrategy: 'Start with a pilot/scope, prove value, expand',
    estimatedComplexity: 'Medium' as const,
    estimatedBusinessValue: 'High' as const,
  },
};

export const stakeholderRoleTemplates: {
  category: StakeholderCategory;
  role: string;
  department: string;
  likelyPriorities: string;
  likelyObjections: string;
  whatTheyCareAbout: string;
  bestTalkTrack: string;
  bestProof: string;
  buyingInfluence: number;
}[] = [
  {
    category: 'economic_buyer',
    role: 'CEO / Founder',
    department: 'Leadership',
    likelyPriorities: 'Revenue growth, cost reduction, competitive advantage',
    likelyObjections: 'ROI unclear, too expensive, too much change',
    whatTheyCareAbout: 'Bottom line, growth, efficiency, competitive edge',
    bestTalkTrack: 'Revenue impact, cost savings, competitive differentiation',
    bestProof: 'ROI case studies from similar companies',
    buyingInfluence: 5,
  },
  {
    category: 'economic_buyer',
    role: 'President / Managing Director',
    department: 'Leadership',
    likelyPriorities: 'Operational excellence, growth, team efficiency',
    likelyObjections: 'Disruption risk, unclear implementation timeline',
    whatTheyCareAbout: 'Efficiency, control, predictable outcomes',
    bestTalkTrack: 'Operations improvement, risk reduction, team productivity',
    bestProof: 'Implementation timeline + success metrics',
    buyingInfluence: 5,
  },
  {
    category: 'economic_buyer',
    role: 'VP / Director of Operations',
    department: 'Operations',
    likelyPriorities: 'Process efficiency, cost control, team productivity',
    likelyObjections: 'Integration complexity, training burden',
    whatTheyCareAbout: 'Smooth operations, measurable efficiency gains',
    bestTalkTrack: 'Process automation, time savings, error reduction',
    bestProof: 'Efficiency metrics from similar deployments',
    buyingInfluence: 4,
  },
  {
    category: 'technical_buyer',
    role: 'CTO / Head of Technology',
    department: 'Technology',
    likelyPriorities: 'Technical fit, security, scalability, integration ease',
    likelyObjections: 'Security concerns, technical debt, integration challenges',
    whatTheyCareAbout: 'Technical quality, security, developer experience',
    bestTalkTrack: 'API-first approach, security, integration flexibility',
    bestProof: 'Technical documentation, security certifications, architecture review',
    buyingInfluence: 4,
  },
  {
    category: 'technical_buyer',
    role: 'IT Manager',
    department: 'IT',
    likelyPriorities: 'System compatibility, user management, support',
    likelyObjections: 'Too many tools already, integration difficulties',
    whatTheyCareAbout: 'Stability, security, ease of management',
    bestTalkTrack: 'Easy deployment, minimal maintenance, existing integrations',
    bestProof: 'System requirements, integration guides, support SLAs',
    buyingInfluence: 3,
  },
  {
    category: 'daily_user',
    role: 'Sales Representative',
    department: 'Sales',
    likelyPriorities: 'Easier to sell, less admin, more commission',
    likelyObjections: 'Another tool to learn, takes time away from selling',
    whatTheyCareAbout: 'Time savings, ease of use, quota attainment',
    bestTalkTrack: 'Less admin work, faster processes, more time selling',
    bestProof: 'Demo showing time savings, peer testimonials',
    buyingInfluence: 2,
  },
  {
    category: 'daily_user',
    role: 'Support Agent',
    department: 'Customer Support',
    likelyPriorities: 'Fewer repetitive questions, faster resolutions',
    likelyObjections: 'Job security concerns, AI replacing them',
    whatTheyCareAbout: 'Less boring work, better customer interactions',
    bestTalkTrack: 'Automate the boring stuff, focus on complex cases',
    bestProof: 'Show how it makes their day easier',
    buyingInfluence: 2,
  },
  {
    category: 'influencer',
    role: 'Head of Sales / Sales Manager',
    department: 'Sales',
    likelyPriorities: 'Pipeline visibility, rep productivity, forecasting',
    likelyObjections: 'Rep adoption, CRM disruption',
    whatTheyCareAbout: 'Team performance, accurate forecasts, hitting targets',
    bestTalkTrack: 'Pipeline analytics, rep productivity boost, better forecasting',
    bestProof: 'Improved metrics from similar sales teams',
    buyingInfluence: 4,
  },
  {
    category: 'influencer',
    role: 'Head of Marketing / CMO',
    department: 'Marketing',
    likelyPriorities: 'Lead quality, marketing ROI, campaign efficiency',
    likelyObjections: 'Budget constraints, integration with existing martech',
    whatTheyCareAbout: 'Attribution, lead quality, campaign performance',
    bestTalkTrack: 'Better lead scoring, campaign automation, ROI tracking',
    bestProof: 'Attribution data, lead quality improvement case studies',
    buyingInfluence: 4,
  },
  {
    category: 'executive_sponsor',
    role: 'Board Member / Investor',
    department: 'Leadership',
    likelyPriorities: 'Company valuation, growth trajectory, competitive position',
    likelyObjections: 'Distraction from core business, unclear strategic fit',
    whatTheyCareAbout: 'Strategic value, competitive advantage, growth enablement',
    bestTalkTrack: 'Strategic differentiation, growth enablement, market positioning',
    bestProof: 'Strategic value analysis, competitive landscape',
    buyingInfluence: 5,
  },
  {
    category: 'procurement_admin',
    role: 'Procurement Manager',
    department: 'Finance/Admin',
    likelyPriorities: 'Vendor management, contract terms, cost control',
    likelyObjections: 'Too expensive, too long a contract, too many vendors',
    whatTheyCareAbout: 'Compliance, budget adherence, contract simplicity',
    bestTalkTrack: 'Simple pricing, flexible terms, fast deployment',
    bestProof: 'Pricing transparency, contract flexibility',
    buyingInfluence: 3,
  },
  {
    category: 'unknown_but_needed',
    role: 'Key Decision Maker (Unknown)',
    department: 'Unknown',
    likelyPriorities: 'Unknown — needs discovery',
    likelyObjections: 'Unknown — needs discovery',
    whatTheyCareAbout: 'Needs discovery',
    bestTalkTrack: 'Value proposition, discovery-based conversation',
    bestProof: 'General case studies and ROI data',
    buyingInfluence: 4,
  },
];

export function getTemplatesForDepartment(dept: PainDepartment): PainPointTemplate[] {
  return painPointTemplates[dept] || [];
}

export function getOpportunityTemplate(type: OpportunityType): OpportunityTemplate | undefined {
  return opportunityTemplates[type];
}

export function findMatchingPainTemplates(text: string, dept?: PainDepartment): PainPointTemplate[] {
  const results: PainPointTemplate[] = [];
  const departments = dept ? [dept] : (Object.keys(painPointTemplates) as PainDepartment[]);

  const keywords = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  for (const d of departments) {
    for (const template of painPointTemplates[d]) {
      const templateText = (template.name + ' ' + template.symptoms + ' ' + template.automationOpportunity).toLowerCase();
      const matchCount = keywords.filter(k => templateText.includes(k)).length;
      if (matchCount >= 2) {
        results.push(template);
      }
    }
  }
  return results.slice(0, 5);
}
