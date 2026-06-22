// ============================================================
// Workflow Inference Engine
// Detect public workflow signals from text
// ============================================================
import type { InferredWorkflow, ConfidenceLevel } from '../types';

interface WorkflowSignal {
  workflowName: string;
  department: string;
  keywords: string[];
  likelyCurrentProcess: string;
  possibleBottleneck: string;
  automationOpportunity: string;
  suggestedNativeBuilderDemo: string;
  discoveryQuestion: string;
}

const workflowSignals: WorkflowSignal[] = [
  {
    workflowName: 'Lead Capture & Routing',
    department: 'Sales',
    keywords: ['get a quote', 'request a quote', 'contact sales', 'book a demo', 'schedule demo', 'free consultation', 'talk to sales', 'request demo'],
    likelyCurrentProcess: 'Manual lead intake via contact form or phone',
    possibleBottleneck: 'Leads sit in an inbox, no routing, delayed response',
    automationOpportunity: 'Auto-capture lead → score → route to right rep → CRM entry',
    suggestedNativeBuilderDemo: 'Build a lead capture form that auto-routes and creates CRM records',
    discoveryQuestion: 'How do leads currently reach you and how fast do you respond?',
  },
  {
    workflowName: 'Demo Booking & Scheduling',
    department: 'Sales',
    keywords: ['book a demo', 'schedule demo', 'book demo', 'schedule a call', 'book a call', 'free demo', 'see it in action'],
    likelyCurrentProcess: 'Manual back-and-forth email scheduling',
    possibleBottleneck: 'Slow scheduling, double-booking, no reminders, no-shows',
    automationOpportunity: 'Self-service booking with auto-reminders and calendar sync',
    suggestedNativeBuilderDemo: 'Build a self-service demo booking page with reminders',
    discoveryQuestion: 'How do prospects currently book time with your sales team?',
  },
  {
    workflowName: 'Quote / Estimate Generation',
    department: 'Sales',
    keywords: ['request a quote', 'get a quote', 'free estimate', 'custom quote', 'get pricing', 'request pricing'],
    likelyCurrentProcess: 'Manual quote creation in email or spreadsheets',
    possibleBottleneck: 'Inconsistent pricing, slow turnaround, no tracking',
    automationOpportunity: 'Template-based quote generator with dynamic pricing and approval workflow',
    suggestedNativeBuilderDemo: 'Build a quote generator that outputs branded PDF quotes',
    discoveryQuestion: 'How many quotes do you send per month and how long does each take?',
  },
  {
    workflowName: 'Consultation / Intake Qualification',
    department: 'Sales',
    keywords: ['free consultation', 'book a consultation', 'schedule consultation', 'discovery call', 'strategy session'],
    likelyCurrentProcess: 'Manual intake via phone or email',
    possibleBottleneck: 'No qualification, unqualified leads waste sales time',
    automationOpportunity: 'Pre-qualification form → auto-score → route to appropriate team',
    suggestedNativeBuilderDemo: 'Build a qualification wizard that scores and routes leads',
    discoveryQuestion: 'How do you qualify leads before a sales call?',
  },
  {
    workflowName: 'Customer Onboarding',
    department: 'Operations',
    keywords: ['onboarding', 'getting started', 'welcome', 'set up', 'implementation', 'go live', 'customer onboarding'],
    likelyCurrentProcess: 'Manual onboarding via email and phone calls',
    possibleBottleneck: 'Inconsistent onboarding, slow time-to-value, customer churn',
    automationOpportunity: 'Digital onboarding portal with checklists, automated emails, and progress tracking',
    suggestedNativeBuilderDemo: 'Build an automated onboarding sequence with tasks and milestones',
    discoveryQuestion: 'How do you currently onboard new customers?',
  },
  {
    workflowName: 'Customer Portal / Account Management',
    department: 'Support',
    keywords: ['customer portal', 'client portal', 'client login', 'account login', 'customer login', 'member login', 'my account'],
    likelyCurrentProcess: 'Account management handled via email and phone',
    possibleBottleneck: 'High support volume, slow resolution, no self-service',
    automationOpportunity: 'Self-service portal with account info, billing, support tickets, knowledge base',
    suggestedNativeBuilderDemo: 'Build a client portal with self-service support and account management',
    discoveryQuestion: 'How do customers currently manage their accounts and get support?',
  },
  {
    workflowName: 'Support Ticket / Help Desk',
    department: 'Support',
    keywords: ['support ticket', 'submit a ticket', 'help desk', 'open a case', 'get support', 'contact support', 'support request'],
    likelyCurrentProcess: 'Support requests via email — manually triaged',
    possibleBottleneck: 'Ticket backlog, no priority routing, slow resolution',
    automationOpportunity: 'Auto-triage tickets by topic/urgency → route → canned responses → escalate',
    suggestedNativeBuilderDemo: 'Build a support ticket system with auto-triage and knowledge base',
    discoveryQuestion: 'How many support tickets do you receive daily and how are they handled?',
  },
  {
    workflowName: 'Live Chat / Conversational Support',
    department: 'Support',
    keywords: ['live chat', 'chat with us', 'chat now', 'start chat', 'chat support', 'talk to us'],
    likelyCurrentProcess: 'Manual live chat handled by support agents',
    possibleBottleneck: 'Agents handle repetitive questions, limited availability',
    automationOpportunity: 'AI chatbot for tier-1 questions with escalation to human agents',
    suggestedNativeBuilderDemo: 'Build an AI chatbot trained on your FAQ and knowledge base',
    discoveryQuestion: 'What are the most common questions your support team answers daily?',
  },
  {
    workflowName: 'Knowledge Base / Self-Service',
    department: 'Support',
    keywords: ['knowledge base', 'help center', 'faq', 'help articles', 'documentation', 'guide', 'tutorials', 'support center'],
    likelyCurrentProcess: 'Support handled via email/phone — no self-service',
    possibleBottleneck: 'High support volume, repeat questions, agent burnout',
    automationOpportunity: 'Searchable knowledge base with AI Q&A and self-service deflection',
    suggestedNativeBuilderDemo: 'Build an AI-powered knowledge base that answers customer questions',
    discoveryQuestion: 'Do customers have access to a self-service knowledge base?',
  },
  {
    workflowName: 'Invoice / Payment Processing',
    department: 'Finance',
    keywords: ['invoice', 'pay online', 'make a payment', 'billing', 'payment portal', 'pay invoice', 'view invoice'],
    likelyCurrentProcess: 'Manual invoicing via email, payment follow-up manual',
    possibleBottleneck: 'Late payments, manual reconciliation, cash flow issues',
    automationOpportunity: 'Auto-generated invoices → send → reminders → reconcile payments',
    suggestedNativeBuilderDemo: 'Build an automated invoicing system with payment tracking',
    discoveryQuestion: 'How do you currently invoice customers and track payments?',
  },
  {
    workflowName: 'Subscription / Membership Management',
    department: 'Finance',
    keywords: ['subscription', 'membership', 'recurring', 'subscribe', 'plan', 'pricing plan', 'monthly', 'annual'],
    likelyCurrentProcess: 'Manual subscription management in spreadsheets',
    possibleBottleneck: 'Billing errors, churn tracking manual, no automated dunning',
    automationOpportunity: 'Subscription management with automated billing, dunning, and churn analytics',
    suggestedNativeBuilderDemo: 'Build a subscription management dashboard with dunning automation',
    discoveryQuestion: 'How do you manage recurring billing and subscription changes?',
  },
  {
    workflowName: 'Field Service / Dispatch Scheduling',
    department: 'Operations',
    keywords: ['field service', 'dispatch', 'technician', 'service appointment', 'schedule service', 'on-site', 'field tech'],
    likelyCurrentProcess: 'Manual dispatch via phone, paper routes',
    possibleBottleneck: 'Inefficient routing, overtime costs, customer wait times',
    automationOpportunity: 'Auto-scheduling with GPS dispatch and mobile status updates',
    suggestedNativeBuilderDemo: 'Build a field service dispatch and scheduling system',
    discoveryQuestion: 'How do you currently dispatch field technicians and manage schedules?',
  },
  {
    workflowName: 'Intake / Application Form Processing',
    department: 'Operations',
    keywords: ['apply now', 'application form', 'submit application', 'intake form', 'register', 'enroll', 'sign up'],
    likelyCurrentProcess: 'Manual form processing via email',
    possibleBottleneck: 'Manual data entry, slow processing, errors',
    automationOpportunity: 'Digital intake form → auto-process → route to workflow → confirmation',
    suggestedNativeBuilderDemo: 'Build an intake form with auto-processing and routing',
    discoveryQuestion: 'How do you currently process applications or intake forms?',
  },
  {
    workflowName: 'Compliance / Audit Reporting',
    department: 'Operations',
    keywords: ['compliance', 'audit', 'regulation', 'certified', 'iso', 'gdpr', 'hipaa', 'sox', 'standards', 'accredited'],
    likelyCurrentProcess: 'Manual compliance checklists and audit prep',
    possibleBottleneck: 'Missed items, audit anxiety, manual evidence collection',
    automationOpportunity: 'Automated compliance tracking with checklists, evidence collection, and reporting',
    suggestedNativeBuilderDemo: 'Build a compliance checklist automation with audit trail',
    discoveryQuestion: 'What compliance requirements do you need to meet and how do you track them?',
  },
  {
    workflowName: 'Reporting / Business Intelligence',
    department: 'Leadership',
    keywords: ['reports', 'dashboard', 'analytics', 'business intelligence', 'kpi', 'metrics', 'data-driven', 'insights'],
    likelyCurrentProcess: 'Manual report creation in spreadsheets',
    possibleBottleneck: 'Delayed decisions, data silos, manual effort',
    automationOpportunity: 'Auto-generated dashboards with real-time data from multiple sources',
    suggestedNativeBuilderDemo: 'Build a real-time executive dashboard with KPIs from your data sources',
    discoveryQuestion: 'How do you currently generate business reports and track KPIs?',
  },
  {
    workflowName: 'Employee Training / LMS',
    department: 'HR',
    keywords: ['training', 'learning', 'lms', 'courses', 'employee training', 'onboarding training', 'certification', 'learn'],
    likelyCurrentProcess: 'Manual training via documents and in-person sessions',
    possibleBottleneck: 'Inconsistent training, no tracking, slow ramp time',
    automationOpportunity: 'Structured LMS with courses, quizzes, progress tracking, and certifications',
    suggestedNativeBuilderDemo: 'Build an employee training portal with courses and progress tracking',
    discoveryQuestion: 'How do you currently train new employees and track their progress?',
  },
  {
    workflowName: 'Recruiting / Applicant Tracking',
    department: 'HR',
    keywords: ['careers', 'jobs', 'open positions', 'join our team', 'work with us', 'apply', 'hiring', 'recruiting', 'job openings'],
    likelyCurrentProcess: 'Manual resume review and interview scheduling',
    possibleBottleneck: 'Slow hiring, manual screening, lost candidates',
    automationOpportunity: 'Auto-screen resumes → score candidates → schedule interviews → track pipeline',
    suggestedNativeBuilderDemo: 'Build an applicant tracking system with AI resume screening',
    discoveryQuestion: 'How many applications do you receive per role and how do you screen them?',
  },
  {
    workflowName: 'Case / Matter Management',
    department: 'Operations',
    keywords: ['case management', 'matter', 'file a claim', 'open a case', 'track case', 'case status'],
    likelyCurrentProcess: 'Manual case tracking in spreadsheets or email',
    possibleBottleneck: 'Lost cases, slow resolution, no status visibility',
    automationOpportunity: 'Digital case management with status tracking, auto-assignment, and client portal',
    suggestedNativeBuilderDemo: 'Build a case management system with client portal and auto-assignment',
    discoveryQuestion: 'How do you currently track cases and communicate status to clients?',
  },
  {
    workflowName: 'Order Tracking / Fulfillment',
    department: 'Operations',
    keywords: ['order tracking', 'track order', 'order status', 'fulfillment', 'shipping', 'delivery', 'order management'],
    likelyCurrentProcess: 'Manual order tracking via phone or email',
    possibleBottleneck: 'Customer inquiries about order status, manual updates',
    automationOpportunity: 'Self-service order tracking portal with automated status notifications',
    suggestedNativeBuilderDemo: 'Build an order tracking portal with automated status updates',
    discoveryQuestion: 'How do customers currently track their orders?',
  },
  {
    workflowName: 'Returns / Warranty / Service Request',
    department: 'Support',
    keywords: ['returns', 'warranty', 'service request', 'rma', 'return policy', 'refund', 'exchange', 'repair'],
    likelyCurrentProcess: 'Manual return/warranty processing via email',
    possibleBottleneck: 'Slow processing, customer frustration, no tracking',
    automationOpportunity: 'Automated return/warranty portal with RMA generation and status tracking',
    suggestedNativeBuilderDemo: 'Build a returns and warranty management portal',
    discoveryQuestion: 'How do customers currently initiate returns or warranty claims?',
  },
  {
    workflowName: 'Partner / Affiliate Program Management',
    department: 'Sales',
    keywords: ['partner program', 'affiliate program', 'become a partner', 'partner portal', 'affiliate', 'reseller'],
    likelyCurrentProcess: 'Manual partner management via email and spreadsheets',
    possibleBottleneck: 'No partner portal, manual commissions, poor partner experience',
    automationOpportunity: 'Partner portal with automated commission tracking, resources, and lead sharing',
    suggestedNativeBuilderDemo: 'Build a partner portal with commission tracking and resource center',
    discoveryQuestion: 'How do you currently manage your partner or affiliate program?',
  },
];

// ─── Main Engine ───────────────────────────────────────────────

export function inferWorkflowsFromText(
  text: string,
  sourceUrl: string,
  detectedTools: { toolName: string; category: string }[] = []
): InferredWorkflow[] {
  const workflows: InferredWorkflow[] = [];
  const lower = text.toLowerCase();
  const usedNames = new Set<string>();

  for (const signal of workflowSignals) {
    const matchedKeywords = signal.keywords.filter(k => lower.includes(k));
    if (matchedKeywords.length === 0) continue;

    // Boost confidence if a related tool is detected
    const hasRelatedTool = detectedTools.some(t =>
      signal.department.toLowerCase().includes(t.category.toLowerCase()) ||
      t.toolName.toLowerCase().includes(signal.department.toLowerCase())
    );

    const confidence: ConfidenceLevel = matchedKeywords.length >= 3 ? 'High'
      : matchedKeywords.length >= 2 ? 'Medium'
      : 'Low';

    const boostedConfidence: ConfidenceLevel = hasRelatedTool && confidence === 'Low' ? 'Medium' : confidence;

    if (usedNames.has(signal.workflowName)) continue;
    usedNames.add(signal.workflowName);

    workflows.push({
      workflowName: signal.workflowName,
      department: signal.department,
      evidence: `Matched keywords on ${sourceUrl}: "${matchedKeywords.join(', ')}"`,
      likelyCurrentProcess: signal.likelyCurrentProcess,
      possibleBottleneck: signal.possibleBottleneck,
      automationOpportunity: signal.automationOpportunity,
      suggestedNativeBuilderDemo: signal.suggestedNativeBuilderDemo,
      discoveryQuestion: signal.discoveryQuestion,
      confidence: boostedConfidence,
    });
  }

  return workflows;
}

/**
 * Analyze full page texts for workflow signals.
 */
export function analyzeAllWorkflows(
  pages: { text: string; url: string }[],
  detectedTools: { toolName: string; category: string }[] = []
): InferredWorkflow[] {
  const workflowMap = new Map<string, InferredWorkflow>();

  for (const page of pages) {
    const results = inferWorkflowsFromText(page.text, page.url, detectedTools);
    for (const wf of results) {
      const existing = workflowMap.get(wf.workflowName);
      if (!existing || wf.confidence === 'High') {
        workflowMap.set(wf.workflowName, wf);
      }
    }
  }

  return Array.from(workflowMap.values());
}
