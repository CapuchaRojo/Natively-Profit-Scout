// ============================================================
// Sample Companies for Testing
// ============================================================
import type { Company } from '../types';

const now = new Date().toISOString();

const pipelineDefaults = {
  accountType: 'client_lead' as const,
  productLane: 'builder' as const,
  pipelineStatus: 'new' as const,
  owner: '',
  priority: 'unset' as const,
  nextAction: '',
  nextActionDate: '',
  lastContactedAt: '',
  sourceCampaign: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  hubspotLifecycleStage: '',
  hubspotDealStage: '',
  comments: [],
};

// ============== TechFlow Solutions ==============
export const techFlowSolutions: Company = {
  id: 'sample-techflow',
  ...pipelineDefaults,
  basic: {
    name: 'TechFlow Solutions',
    website: 'techflowsolutions.com',
    industry: 'B2B SaaS — CRM Platform',
    location: 'Austin, TX (Hybrid)',
    employeeCount: 50,
    revenueEstimate: '$5-10M ARR',
    notes: 'Mid-market CRM company. Growing fast but ops not keeping up. Competes with HubSpot and Salesforce at lower price point. Recently raised Series A. Looking for operational efficiency tools.',
  },
  business: {
    productsServices: 'CRM platform for mid-market B2B sales teams. Includes contact management, pipeline tracking, and basic reporting.',
    targetCustomers: 'B2B companies with 20-200 employees. SMB segment, manufacturing, professional services.',
    salesModel: 'Inbound + outbound inside sales. Demo-driven. 5-person sales team. $500-2000/mo subscription.',
    deliveryModel: 'Cloud SaaS, self-serve onboarding with optional implementation support.',
    supportModel: 'Email + chat support. 2 support agents. No phone support. SLA is 24hr response.',
    operationsModel: 'Remote-first, hybrid office in Austin. Weekly all-hands. Slack-heavy communication.',
  },
  people: {
    leadership: 'Sarah Chen — CEO/Founder (former Salesforce exec). Mark Torres — COO (ops background).',
    salesTeam: 'Jake Wilson — Head of Sales. 4 SDRs/BDRs.',
    technicalTeam: 'David Park — CTO. 12 engineers. Using React, Node, Postgres.',
    operationsTeam: 'Mark Torres (COO) also handles ops. No dedicated ops person.',
    supportTeam: '2 support agents: Maria and James.',
    financeAdmin: 'Outsourced bookkeeper (part-time). Mark handles financial reporting.',
    knownChampions: 'Jake Wilson (Head of Sales) — frustrated with lead follow-up.',
    knownBlockers: 'David Park (CTO) — skeptical about third-party integrations.',
    unknownDecisionMaker: 'VP of Customer Success (position vacant). Board member influence unknown.',
  },
  tools: {
    crm: 'They ARE the CRM company — using their own product plus HubSpot for marketing',
    websitePlatform: 'Webflow',
    schedulingTools: 'Calendly',
    emailTools: 'Google Workspace + Outreach',
    projectManagement: 'Linear',
    communicationTools: 'Slack',
    supportTools: 'Intercom',
    billingTools: 'Stripe',
    automationTools: 'Zapier (basic usage)',
    aiTools: 'None yet — exploring options',
    securityTools: 'Okta + basic antivirus',
    unknownTools: 'Unknown — may have more tools in engineering',
  },
  workloadFriction: {
    dailyRepeats: 'Sales team enters same data in CRM and Outreach manually. Support agents answer same 10 questions daily.',
    manualCopyPaste: 'Lead data copied from LinkedIn to CRM. Support chat messages copied to tickets.',
    delays: 'Lead assignment takes 2-4 hours. Support responses take 12-24 hours.',
    customerWait: 'Customers wait 24+ hours for support. No self-service option.',
    employeeTimeWaste: 'Sales team spends 4 hours/day on admin. Support team 60% on tier-1 tickets.',
    missedRevenue: '30% of inbound leads never get contacted. Churn at 5% monthly.',
    errors: 'Duplicate contacts in CRM. Wrong lead assignments. Billing errors from manual entry.',
    complianceRisk: 'No automated audit trail. Manual data export for board reports.',
    softwareCouldAssist: 'Lead auto-assignment, support chatbot, automated reporting, billing automation.',
  },
  salesContext: {
    approachReason: 'TechFlow is growing fast but ops efficiency hasn\'t kept pace. High automation potential.',
    likelyBusinessPain: 'Lead leakage (30% not contacted), support backlog, no real-time reporting.',
    desiredResult: 'Automate lead routing, reduce support burden, get real-time ops dashboard.',
    budgetOwner: 'Sarah Chen (CEO) for new tools. Budget likely $2-5K/mo for ops tools.',
    painFeeler: 'Jake Wilson (Sales) and the support team feel it daily.',
    dealBlocker: 'David Park (CTO) — technical and security concerns.',
    dealChampion: 'Jake Wilson (Head of Sales) — wants lead routing fixed.',
  },
  painPoints: [],
  stakeholders: [],
  toolMap: [],
  highladerRepurpose: [],
  opportunities: [],
  salesPlan: undefined,
  crmExport: undefined,
  createdAt: now,
  updatedAt: now,
  publicIntelSources: [],
  publicIntelSignals: [],
  publicIntelOpenings: [],
  isSample: true,
  productLane: 'builder' as const,
};

// ============== BrightPath Consulting ==============
export const brightPathConsulting: Company = {
  id: 'sample-brightpath',
  ...pipelineDefaults,
  basic: {
    name: 'BrightPath Consulting',
    website: 'brightpathconsult.com',
    industry: 'Professional Services — Management Consulting',
    location: 'Chicago, IL (Remote-first)',
    employeeCount: 25,
    revenueEstimate: '$3-5M',
    notes: 'Boutique management consulting firm. 10 consultants, 3 partners, rest in operations/marketing. Heavy on PowerPoint and Excel. Clients are mid-market manufacturing and logistics companies.',
  },
  business: {
    productsServices: 'Management consulting for mid-market companies. Strategy, operations, digital transformation advisory.',
    targetCustomers: 'Manufacturing and logistics companies with $20-200M revenue. Midwest focus.',
    salesModel: 'Partner-led relationship selling. Presentations and proposals. 3-6 month engagement cycles.',
    deliveryModel: 'On-site and remote consulting. Teams of 2-4 consultants per engagement.',
    supportModel: 'Partner handles client relationship. No formal support structure.',
    operationsModel: 'Project-based with heavy documentation. Proposals, SOWs, status reports all manual.',
  },
  people: {
    leadership: 'Michael Bright — Managing Partner. Janet Russo — Partner, Operations Practice.',
    salesTeam: 'Partners sell. No dedicated sales team.',
    technicalTeam: 'David Liu — Manager, Digital Practice. 10 consultants.',
    operationsTeam: 'Lisa Park — Operations Manager. Handles scheduling, billing, resourcing.',
    supportTeam: '1 admin assistant (part-time).',
    financeAdmin: 'External accounting firm. Lisa handles internal billing.',
    knownChampions: 'Janet Russo (Partner) — wants better project reporting.',
    knownBlockers: 'Michael Bright (Managing Partner) — change-averse, likes existing processes.',
    unknownDecisionMaker: 'IT person/contractor who manages their systems.',
  },
  tools: {
    crm: 'HubSpot (basic — contacts only, no pipeline)',
    websitePlatform: 'Squarespace',
    schedulingTools: 'Microsoft Bookings',
    emailTools: 'Microsoft 365',
    projectManagement: 'Microsoft Planner + Excel',
    communicationTools: 'Microsoft Teams',
    supportTools: 'None — partner handles all client comms',
    billingTools: 'QuickBooks + Excel invoicing',
    automationTools: 'None',
    aiTools: 'None',
    securityTools: 'Microsoft 365 built-in',
    unknownTools: 'Unknown — might use SharePoint extensively',
  },
  workloadFriction: {
    dailyRepeats: 'Consultants fill out timesheets in Excel. Weekly status reports created manually.',
    manualCopyPaste: 'Email attachments downloaded and re-uploaded. Proposal content reused but manually.',
    delays: 'Reports take 1-2 days to compile. Invoicing delayed 2-3 weeks.',
    customerWait: 'Clients wait for status updates via email. No client portal.',
    employeeTimeWaste: 'Consultants spend 10-15% of time on admin. Operations spends 50% on reporting.',
    missedRevenue: 'Billing delays = cash flow issues. No systematic lead follow-up.',
    errors: 'Timesheet errors, billing from wrong rates, outdated proposals.',
    complianceRisk: 'No document version control. Client data on individual laptops.',
    softwareCouldAssist: 'Project dashboard, automated status reports, client portal, proposal generator.',
  },
  salesContext: {
    approachReason: 'BrightPath is operations-heavy with manual everything. Their digital maturity is low despite consulting on digital topics.',
    likelyBusinessPain: 'Manual reporting eats 50% of ops time. No client portal. Proposal creation is slow.',
    desiredResult: 'Automated project reporting, client portal, faster proposals.',
    budgetOwner: 'Michael Bright (Managing Partner). Budget $1-3K/mo.',
    painFeeler: 'Lisa Park (Operations) and Janet Russo (Partner) feel inefficiencies.',
    dealBlocker: 'Michael Bright (Managing Partner) — needs to see ROI before committing.',
    dealChampion: 'Janet Russo (Partner) — sees inefficiency and wants it fixed.',
  },
  painPoints: [],
  stakeholders: [],
  toolMap: [],
  highladerRepurpose: [],
  opportunities: [],
  salesPlan: undefined,
  crmExport: undefined,
  createdAt: now,
  updatedAt: now,
  publicIntelSources: [],
  publicIntelSignals: [],
  publicIntelOpenings: [],
  isSample: true,
  productLane: 'relay' as const,
};

// ============== GreenLeaf Landscaping ==============
export const greenLeafLandscaping: Company = {
  id: 'sample-greenleaf',
  ...pipelineDefaults,
  basic: {
    name: 'GreenLeaf Landscaping',
    website: 'greenleaflandscaping.net',
    industry: 'Landscaping / Field Services',
    location: 'Portland, OR',
    employeeCount: 12,
    revenueEstimate: '$800K-$1.2M',
    notes: 'Family-owned landscaping business. 2 owners, 8 field crew, 2 office/admin. Growing fast but still operating on phone calls and paper. No digital presence besides a basic website.',
  },
  business: {
    productsServices: 'Residential and commercial landscaping. Lawn care, tree trimming, seasonal clean-up, hardscaping.',
    targetCustomers: 'Homeowners and small businesses in Portland metro area. Residential 70%, Commercial 30%.',
    salesModel: 'Phone inquiries + word-of-mouth. Quotes given in person. Seasonal contracts.',
    deliveryModel: 'Field crews dispatched from central office. Paper work orders.',
    supportModel: 'Phone only. Office hours 8am-5pm. No after-hours support.',
    operationsModel: 'Owner dispatches crews by phone each morning. Paper-based job tracking.',
  },
  people: {
    leadership: 'Tom Greenleaf — Owner/Founder. Sarah Greenleaf — Co-owner (admin/finance).',
    salesTeam: 'Tom handles all sales — quotes given in person.',
    technicalTeam: 'No technical team. Basic IT support from nephew.',
    operationsTeam: 'Tom dispatches. Sarah handles scheduling.',
    supportTeam: 'Office admin (part-time). Routes calls to Tom or Sarah.',
    financeAdmin: 'Sarah handles QuickBooks and payroll.',
    knownChampions: 'Sarah Greenleaf — wants digital scheduling and billing.',
    knownBlockers: 'Tom Greenleaf — likes his paper system, suspicious of technology.',
    unknownDecisionMaker: 'Their nephew (IT person) has some influence on tech decisions.',
  },
  tools: {
    crm: 'None — leads in a spiral notebook',
    websitePlatform: 'Wix (basic, no booking)',
    schedulingTools: 'Paper calendar + phone calls',
    emailTools: 'Gmail basic',
    projectManagement: 'Paper work orders',
    communicationTools: 'Cell phones (personal)',
    supportTools: 'None',
    billingTools: 'QuickBooks Desktop',
    automationTools: 'None',
    aiTools: 'None',
    securityTools: 'None',
    unknownTools: 'None',
  },
  workloadFriction: {
    dailyRepeats: 'Morning dispatch by phone. Manual job site check-ins. Paper timesheets.',
    manualCopyPaste: 'Phone messages written on paper. Customer data moved from notebook to QuickBooks manually.',
    delays: 'Dispatching takes 1 hour every morning. Quotes take 1-2 days to deliver.',
    customerWait: 'Customers wait on hold or get voicemail. No online booking.',
    employeeTimeWaste: 'Tom spends 3+ hours/day on admin/dispatch that could be automated.',
    missedRevenue: 'Phone calls missed = lost jobs. No online booking = lose younger customers.',
    errors: 'Scheduling conflicts. Wrong addresses. Lost paperwork.',
    complianceRisk: 'No documentation of safety meetings. No digital records.',
    softwareCouldAssist: 'Online booking, automated dispatch, digital work orders, automated billing.',
  },
  salesContext: {
    approachReason: 'GreenLeaf is a classic "paper-to-digital" opportunity. Low technical complexity, high business impact.',
    likelyBusinessPain: 'Phone overload, manual dispatch, no online booking, cash flow from slow billing.',
    desiredResult: 'Online booking, auto-dispatch, digital work orders, automated invoicing.',
    budgetOwner: 'Tom Greenleaf (Owner) but Sarah manages money. Budget $300-800/mo.',
    painFeeler: 'Sarah (admin overload) and Tom (dispatch frustration) feel it daily.',
    dealBlocker: 'Tom Greenleaf — technology resistance. Needs to see simple, clear value.',
    dealChampion: 'Sarah Greenleaf — technology-curious, wants less manual work.',
  },
  painPoints: [],
  stakeholders: [],
  toolMap: [],
  highladerRepurpose: [],
  opportunities: [],
  salesPlan: undefined,
  crmExport: undefined,
  createdAt: now,
  updatedAt: now,
  publicIntelSources: [],
  publicIntelSignals: [],
  publicIntelOpenings: [],
  isSample: true,
};

// ============== A Storm is Coming LLC ==============
export const aStormIsComing: Company = {
  id: 'sample-astorm',
  ...pipelineDefaults,
  basic: {
    name: 'A Storm is Coming LLC',
    website: 'https://astormscoming.com',
    industry: 'Professional Services / Creative Agency',
    location: 'Remote-First (US)',
    employeeCount: 5,
    revenueEstimate: 'To be determined',
    notes: 'Real company used for testing the Natively Profit Scout NinjaPear proxy flow. Full company profile to be filled in as recon data comes in.',
  },
  business: {
    productsServices: 'Professional services — details to be discovered via public recon.',
    targetCustomers: 'To be discovered',
    salesModel: 'To be discovered',
    deliveryModel: 'To be discovered',
    supportModel: 'To be discovered',
    operationsModel: 'To be discovered',
  },
  people: {
    leadership: 'To be discovered',
    salesTeam: 'To be discovered',
    technicalTeam: 'To be discovered',
    operationsTeam: 'To be discovered',
    supportTeam: 'To be discovered',
    financeAdmin: 'To be discovered',
    knownChampions: '',
    knownBlockers: '',
    unknownDecisionMaker: '',
  },
  tools: {
    crm: '', websitePlatform: '', schedulingTools: '', emailTools: '',
    projectManagement: '', communicationTools: '', supportTools: '',
    billingTools: '', automationTools: '', aiTools: '', securityTools: '',
    unknownTools: '',
  },
  workloadFriction: {
    dailyRepeats: '', manualCopyPaste: '', delays: '', customerWait: '',
    employeeTimeWaste: '', missedRevenue: '', errors: '', complianceRisk: '',
    softwareCouldAssist: '',
  },
  salesContext: {
    approachReason: 'Recon will inform the best approach.',
    likelyBusinessPain: 'To be discovered',
    desiredResult: 'To be discovered',
    budgetOwner: 'To be discovered',
    painFeeler: 'To be discovered',
    dealBlocker: 'To be discovered',
    dealChampion: 'To be discovered',
  },
  painPoints: [],
  stakeholders: [],
  toolMap: [],
  highladerRepurpose: [],
  opportunities: [],
  salesPlan: undefined,
  crmExport: undefined,
  createdAt: now,
  updatedAt: now,
  publicIntelSources: [],
  publicIntelSignals: [],
  publicIntelOpenings: [],
  isSample: true,
};

// ============== Vibe Generation (Hybrid Ecosystem) ==============
export const vibeGeneration: Company = {
  id: 'sample-vibe-generation',
  ...pipelineDefaults,
  accountType: 'partner' as const,
  productLane: 'builder' as const,
  pipelineStatus: 'qualified' as const,
  priority: 'high' as const,
  verifiedStatus: 'internal_context_pending_confirmation' as const,
  basic: {
    name: 'Vibe Generation',
    website: 'https://vibegeneration.it/',
    industry: 'AI Consulting / Software Development / Digital Agency',
    location: 'Italy',
    employeeCount: 90,
    revenueEstimate: '€8M+ (Hybrid Group, 2024)',
    notes: `INTERNAL CONTEXT (Andrea-sourced, pending confirmation):
- Vibe Generation is expected to fully launch in September.
- Financial backing mentioned: Versace family (internal context pending confirmation).
- Andrea says Hybrid/Vibe are targeting a role similar to Accenture in Italy.
- They are already engaging major Italian conglomerates (Ferrari, Barilla mentioned internally).
- They are heavy users of Lovable and similar vibe-coding tools.
- They reached out because they want to organize hackathons in Italy for talent scouting and enterprise innovation cycles.
- Andrea moved the discussion toward them becoming early users of NativelyAI's full suite: Builder + Relay + Compute.
- Potential path: test NativelyAI as their coding/product delivery tool, provide product feedback, and eventually promote/resell to enterprise customers.

ENTITY DISTINCTION:
- Hybrid.one / Hybrid Digital Consultancy is the established digital consultancy/group.
- Vibe Generation appears to be the AI-focused brand/entity being launched around AI, software development, platforms, data, 3D, automation, and voice solutions.
- Do not assume Vibe is legally a subsidiary until confirmed.
- Classification: related AI brand / emerging sub-brand / possible venture under Hybrid ecosystem.

RELATED ENTITIES:
- Hybrid.one / Hybrid Digital Consultancy (parent/related ecosystem)
- Hybrid website: https://hybrid.one/en/
- Hybrid LinkedIn: https://it.linkedin.com/company/hybriddigitalconsultancy
- Hybrid One Group publicly references 90+ digital professionals, >€8M revenue in 2024, six specialized branches.

PRIMARY EXECUTIVE CONTACT:
- Paolo Bonetti — CEO (shared leadership between Hybrid and Vibe Generation)
- Likely LinkedIn: https://it.linkedin.com/in/ingpaolobonetti

KNOWN HYBRID TEAM:
- Paolo Bonetti — CEO
- Davide Locatelli — Partner
- Mustafa Azza — CMO
- Edoardo Ramella — CSO
- Cristina Velluti — CFO
- Nicolò Comai — Media buyer
- Sara Buscema — UI/UX Designer`,
  },
  business: {
    productsServices: 'AI-native consulting and software delivery: AI, software development, platforms, data analysis, 3D, intelligent automation, voice solutions. Positioned as "Artificial intelligence humanly designed."',
    targetCustomers: 'Enterprise clients in Italy — major Italian conglomerates. Consulting-led delivery model targeting digital transformation and AI adoption.',
    salesModel: 'Consulting-led enterprise sales. Partner-driven relationship selling. Leveraging hackathons for talent scouting and client innovation cycles.',
    deliveryModel: 'AI-native delivery using Lovable-style vibe-coding tools for prototyping. Seeking to standardize on a repeatable AI Software Factory platform for enterprise client delivery.',
    supportModel: 'Consulting engagement model — partner handles client relationship. No formal support structure for delivery tooling.',
    operationsModel: 'Project-based consulting delivery. Hybrid team structure across 6 specialized branches. Currently relies on vibe-coding tools for AI prototypes.',
  },
  people: {
    leadership: 'Paolo Bonetti — CEO (shared leadership between Hybrid and Vibe Generation). Davide Locatelli — Partner. Mustafa Azza — CMO. Edoardo Ramella — CSO. Cristina Velluti — CFO.',
    salesTeam: 'Partner-led sales. Paolo Bonetti and Davide Locatelli are primary commercial relationships.',
    technicalTeam: 'Nicolò Comai — Media buyer. Sara Buscema — UI/UX Designer. Expected CTO/technical lead for Vibe Generation (to be confirmed). Heavy users of Lovable and vibe-coding tools.',
    operationsTeam: '90+ digital professionals across Hybrid Group. Six specialized branches.',
    supportTeam: 'Consulting engagement model — partner handles client relationship.',
    financeAdmin: 'Cristina Velluti — CFO.',
    knownChampions: 'Andrea (internal Natively contact) — driving the conversation. Paolo Bonetti — exploring AI-native delivery. Likely Davide Locatelli and Mustafa Azza as additional champions.',
    knownBlockers: 'Potential CTO (not yet identified publicly) — likely technical objections around Lovable vs NativelyAI. Existing investment in Lovable-style tooling could create inertia.',
    unknownDecisionMaker: 'Vibe Generation CTO (not yet identified). Versace family representative (financial backing, role unclear). Hybrid board/leadership group.',
  },
  tools: {
    crm: 'Unknown — likely HubSpot or similar (Hybrid is a digital consultancy)',
    websitePlatform: 'Custom — vibegeneration.it (pre-launch)',
    schedulingTools: 'Unknown',
    emailTools: 'Google Workspace or Microsoft 365',
    projectManagement: 'Unknown — likely Linear, Notion, or similar modern tooling',
    communicationTools: 'Slack or Microsoft Teams',
    supportTools: 'Unknown',
    billingTools: 'Unknown',
    automationTools: 'Lovable and similar vibe-coding tools for AI prototyping',
    aiTools: 'Lovable, vibe-coding tools, AI-assisted development tools. Heavy users of AI-native prototyping tooling.',
    securityTools: 'Unknown',
    unknownTools: 'Full stack details need confirmation in CTO meeting',
  },
  workloadFriction: {
    dailyRepeats: 'Prototyping in Lovable is fast but hard to standardize across client projects. Team likely repeats similar setup/config for each new client engagement.',
    manualCopyPaste: 'Prototype outputs from Lovable may need manual migration to production-grade delivery. No standardized template system across consulting engagements.',
    delays: 'Transition from prototype to enterprise-grade delivery is manual and slow. No governed deployment pipeline for client projects.',
    customerWait: 'Enterprise clients expect production-grade outputs, not just prototypes. Gap between Lovable prototype and deployable solution.',
    employeeTimeWaste: 'Consultants spend time re-building similar patterns across clients. No reusable template library. Hackathon outputs not easily converted to delivery assets.',
    missedRevenue: 'Cannot scale AI delivery as a consulting product without standardized tooling. Each client engagement is bespoke, limiting margins.',
    errors: 'Inconsistent outputs across client projects. Hard to maintain quality standards when each consultant uses different tools/approaches.',
    complianceRisk: 'No governance over model/provider choice. No audit trail for AI-generated outputs. No client workspace isolation.',
    softwareCouldAssist: 'AI Software Factory with reusable templates, governed deployment, model/provider routing, credit management, and client workspace isolation.',
  },
  salesContext: {
    approachReason: 'Vibe Generation is launching as an AI-native delivery brand under the Hybrid ecosystem. They currently use Lovable for prototyping but need a repeatable AI Software Factory for enterprise consulting delivery. They want hackathons for talent scouting and client innovation. Perfect strategic pilot for NativelyAI\'s agency/consulting delivery workflow.',
    likelyBusinessPain: 'Lovable-style tools are fast for prototypes but too weak for repeatable enterprise delivery. Hard to standardize outputs, manage model/provider choice, connect prototypes to production, govern usage/credits, and turn hackathon outputs into reusable delivery assets.',
    desiredResult: 'A repeatable AI Software Factory layer that enables Hybrid/Vibe consultants to prototype, validate, govern, deploy, and repeat client delivery across enterprise customers. Standardized hackathon-to-delivery pipeline.',
    budgetOwner: 'Paolo Bonetti (CEO) and likely Vibe CTO. Budget capacity: enterprise consulting firm with €8M+ revenue.',
    painFeeler: 'Vibe technical team (consultants using Lovable daily). Paolo Bonetti and Andrea (exploring better delivery tooling).',
    dealBlocker: 'Potential CTO — may object that Lovable is "good enough" or that switching tools is risky. Existing investment in Lovable workflow. Need to prove NativelyAI is meaningfully better for enterprise delivery, not just different.',
    dealChampion: 'Andrea (internal Natively contact) — driving the conversation. Paolo Bonetti — wants AI-native delivery brand to succeed.',
  },
  painPoints: [],
  stakeholders: [],
  toolMap: [],
  highladerRepurpose: [],
  opportunities: [],
  salesPlan: undefined,
  crmExport: undefined,
  createdAt: now,
  updatedAt: now,
  publicIntelSources: [],
  publicIntelSignals: [],
  publicIntelOpenings: [],
  isSample: true,
  productLane: 'builder' as const,
  fitScore: {
    total: 8.5,
    confidence: 'Medium' as const,
    builderFit: 9,
    computeFit: 6,
    relayFit: 7,
    providerFit: 0,
    reasons: [
      'AI-native consulting brand launching in September — perfect timing',
      'Already using Lovable/vibe-coding tools — proven AI adoption',
      'Enterprise client base (Ferrari, Barilla-level) — high-value delivery',
      'Hackathon/talent-scouting motion aligns with NativelyAI Builder',
      '90+ digital professionals in parent group — scaled deployment possible',
      'Channel/reseller ambition — potential Italy market entry partner',
      '€8M+ group revenue — budget capacity for enterprise tooling',
    ],
    evidenceUrls: [
      'https://vibegeneration.it/',
      'https://hybrid.one/en/',
      'https://it.linkedin.com/company/hybriddigitalconsultancy',
    ],
  },
  providerProfile: undefined,
  sourceImport: '',
  importedAt: '',
  contacts: [],
};

export const sampleCompanies: Company[] = [
  techFlowSolutions,
  brightPathConsulting,
  greenLeafLandscaping,
  aStormIsComing,
  vibeGeneration,
];