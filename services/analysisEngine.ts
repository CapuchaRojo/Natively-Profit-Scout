// ============================================================
// Natively Profit Scout — Analysis Engine
// Deterministic rule-based analysis functions
// ============================================================
import type {
  Company, CompanyProfile, ProfileSection, PainPoint, PainDepartment,
  Stakeholder, StakeholderCategory, Tool, HighlanderRepurpose,
  Opportunity, OpportunityType, SalesPlan, ConfidenceLevel,
  CRMExport, DealStage, ProspectStatus, OfferType
} from '../types';
import {
  painPointTemplates, opportunityTemplates,
  stakeholderRoleTemplates, findMatchingPainTemplates,
  type PainPointTemplate
} from '../data/templates';

let idCounter = 0;
function uid(prefix = 'gen'): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

// ============================================================
// Company Profile Generation
// ============================================================
export function generateCompanyProfile(company: Company): CompanyProfile {
  const { basic, business, tools, workloadFriction, notes } = company;

  const hasFullBasic = Boolean(basic.name && basic.industry);
  const hasBusiness = Boolean(business.productsServices && business.targetCustomers);
  const hasTools = Object.values(tools).some(v => v && v !== 'None' && v !== 'Unknown');
  const hasFriction = Object.values(workloadFriction).some(v => v && v.length > 10);

  const dataCompleteness = [hasFullBasic, hasBusiness, hasTools, hasFriction].filter(Boolean).length;
  const baseConfidence: ConfidenceLevel = dataCompleteness >= 3 ? 'High' : dataCompleteness >= 2 ? 'Medium' : 'Low';

  const toolCount = Object.values(tools).filter(v => v && v !== 'None' && v !== 'Unknown' && !v.includes('Unknown')).length;
  const aiToolCount = Object.values(tools).filter(v =>
    v && v.toLowerCase().includes('ai')
  ).length;

  const sections: ProfileSection[] = [
    {
      title: 'Business Model Assessment',
      findings: business.productsServices
        ? `${basic.name} operates as a ${business.salesModel || 'business'} company offering ${business.productsServices}.`
        : `Business model information is limited. Based on industry (${basic.industry}), likely operates a service/product model.`,
      evidence: business.productsServices || basic.industry,
      confidence: hasBusiness ? 'High' : 'Low',
      missingInfo: business.productsServices ? '' : 'Products/services description needed',
    },
    {
      title: 'Customer & Market Position',
      findings: business.targetCustomers
        ? `Targets ${business.targetCustomers}. Located in ${basic.location || 'unknown location'}.`
        : `Customer segments unclear from available data.`,
      evidence: business.targetCustomers || basic.location,
      confidence: business.targetCustomers ? 'High' : 'Low',
      missingInfo: business.targetCustomers ? '' : 'Target customer segments needed',
    },
    {
      title: 'Digital Maturity Assessment',
      findings: toolCount <= 2
        ? `${basic.name} has very low digital adoption. Most processes are likely manual or paper-based. Significant automation opportunity.`
        : toolCount <= 5
          ? `${basic.name} uses some digital tools (${toolCount} identified) but likely lacks integration between them. Good automation opportunity.`
          : `${basic.name} has solid digital adoption with ${toolCount} tools identified. Opportunities exist in integration and AI enhancement.`,
      evidence: `${toolCount} tools identified${aiToolCount > 0 ? `, ${aiToolCount} AI-related` : ''}`,
      confidence: toolCount > 0 ? 'High' : 'Low',
      missingInfo: toolCount === 0 ? 'No tools identified — complete the tool inventory' : '',
    },
    {
      title: 'Operational Pain Assessment',
      findings: hasFriction
        ? `Workflow analysis reveals operational friction. Key areas: ${workloadFriction.delays ? 'process delays, ' : ''}${workloadFriction.manualCopyPaste ? 'manual data entry, ' : ''}${workloadFriction.missedRevenue ? 'revenue leakage' : ''}.`
        : 'Friction data is limited. A more detailed workflow assessment would identify specific automation opportunities.',
      evidence: workloadFriction.delays || workloadFriction.employeeTimeWaste || 'Limited data',
      confidence: hasFriction ? 'Medium' : 'Low',
      missingInfo: hasFriction ? '' : 'Complete the workload friction section',
    },
    {
      title: 'AI Readiness Assessment',
      findings: aiToolCount > 0
        ? `${basic.name} already uses AI tools (${aiToolCount} identified). Likely receptive to AI automation solutions.`
        : toolCount >= 3
          ? `Has digital foundation but no AI adoption yet. Ready for AI introduction.`
          : `Low digital maturity means AI readiness is low. Start with basic automation before AI.`,
      evidence: aiToolCount > 0 ? `${aiToolCount} AI tool(s) in use` : 'No AI tools detected',
      confidence: baseConfidence,
      missingInfo: aiToolCount > 0 ? '' : 'Explore AI readiness through conversation',
    },
    {
      title: 'Sales & Outreach Opportunity',
      findings: notes
        ? `Research notes indicate: ${notes}`
        : 'No research notes available. Additional discovery needed.',
      evidence: notes || 'N/A',
      confidence: notes ? 'Medium' : 'Low',
      missingInfo: notes ? '' : 'Add research notes for better profile',
    },
  ];

  const summary = `${basic.name} is a${basic.employeeCount > 100 ? ' large' : basic.employeeCount > 20 ? ' mid-sized' : ' small'} ${basic.industry || 'business'} company with ${basic.employeeCount || 'unknown number of'} employees. ` +
    `Digital maturity is ${toolCount <= 2 ? 'low' : toolCount <= 5 ? 'moderate' : 'high'} (${toolCount} tools identified). ` +
    `The company ${hasFriction ? 'has identified operational friction that suggests strong automation potential' : 'may benefit from an automation assessment'}.`;

  // Company-size-based maturity heuristics
  const opLevel = basic.employeeCount >= 50 ? 'Structured' : basic.employeeCount >= 15 ? 'Emerging' : 'Small Business';
  const digLevel = toolCount >= 6 ? 'Digitally Advanced' : toolCount >= 3 ? 'Digitally Transitioning' : 'Low Digital Adoption';
  const aiLevel = aiToolCount >= 1 ? 'AI-Aware' : toolCount >= 3 ? 'AI-Ready' : 'Pre-AI';
  const budgetLevel = basic.employeeCount >= 50 ? 'Significant ($3-10K/mo)' : basic.employeeCount >= 15 ? 'Moderate ($1-3K/mo)' : 'Limited ($300-1K/mo)';
  const salesDiffLevel = basic.employeeCount >= 50 ? 'Medium (multiple stakeholders)' : basic.employeeCount >= 15 ? 'Low-Medium' : 'Easy (direct owner)';

  return {
    summary,
    businessModel: business.productsServices || `Unknown — based on industry: ${basic.industry || 'N/A'}`,
    customerSegments: business.targetCustomers || 'Unknown — needs discovery',
    likelyDepartments: ['sales', 'operations', 'customer_support'].filter((_, i) =>
      basic.employeeCount > 10 || i < 2
    ),
    publicPositioning: `Company website: ${basic.website || 'unknown'}. Industry: ${basic.industry || 'unknown'}.`,
    operationalMaturity: { level: opLevel, confidence: baseConfidence },
    digitalMaturity: { level: digLevel, confidence: toolCount > 0 ? 'High' : 'Low' },
    aiReadiness: { level: aiLevel, confidence: aiToolCount > 0 || toolCount >= 3 ? 'Medium' : 'Low' },
    budgetLikelihood: { level: budgetLevel, confidence: baseConfidence },
    salesDifficulty: { level: salesDiffLevel, confidence: baseConfidence },
    bestConversationAngle: !hasFriction
      ? 'Start with discovery questions about daily workflow challenges'
      : workloadFriction.missedRevenue && workloadFriction.missedRevenue.includes('lead')
        ? 'Lead conversion and pipeline efficiency'
        : workloadFriction.employeeTimeWaste
          ? 'Employee productivity and time savings'
          : 'Operational efficiency and automation',
    sections,
  };
}

// ============================================================
// Pain Point Generation
// ============================================================
function scorePainTemplate(template: PainPointTemplate, company: Company): number {
  const { workloadFriction, business, basic } = company;
  const searchText = [
    workloadFriction.dailyRepeats, workloadFriction.delays,
    workloadFriction.customerWait, workloadFriction.employeeTimeWaste,
    workloadFriction.missedRevenue, workloadFriction.errors,
    workloadFriction.softwareCouldAssist, business.productsServices,
    business.operationsModel, basic.notes,
  ].filter(Boolean).join(' ').toLowerCase();

  const templateText = (template.name + ' ' + template.symptoms + ' ' + template.automationOpportunity).toLowerCase();
  const templateKeywords = templateText.split(/\s+/).filter(w => w.length > 4);
  const matches = templateKeywords.filter(kw => searchText.includes(kw)).length;
  const matchRatio = templateKeywords.length > 0 ? matches / templateKeywords.length : 0;

  if (matchRatio > 0.3) return 10;
  if (matchRatio > 0.15) return 7;
  if (matchRatio > 0.05) return 4;
  return 1;
}

export function generatePainPoints(company: Company): PainPoint[] {
  const painPoints: PainPoint[] = [];
  const addedNames = new Set<string>();

  const departments = Object.keys(painPointTemplates) as PainDepartment[];

  for (const dept of departments) {
    const templates = painPointTemplates[dept];
    const scored = templates.map(t => ({
      template: t,
      score: scorePainTemplate(t, company),
    })).filter(s => s.score > 2);

    scored.sort((a, b) => b.score - a.score);

    for (const s of scored.slice(0, 2)) {
      if (addedNames.has(s.template.name)) continue;
      addedNames.add(s.template.name);

      const confidence: ConfidenceLevel = s.score >= 7 ? 'High' : s.score >= 4 ? 'Medium' : 'Low';

      painPoints.push({
        id: uid('pain'),
        name: s.template.name,
        department: dept,
        symptoms: s.template.symptoms,
        likelyCost: s.template.likelyCost,
        timeLost: s.template.timeLost,
        revenueImpact: s.template.revenueImpact,
        automationOpportunity: s.template.automationOpportunity,
        suggestedSolution: s.template.suggestedSolution,
        confidence,
        discoveryQuestion: s.template.discoveryQuestion,
        severity: s.template.severity,
        frequency: s.template.frequency,
        revenueImpactScore: s.template.revenueImpactScore,
        easeOfSolution: s.template.easeOfSolution,
        decisionMakerVisibility: s.template.decisionMakerVisibility,
      });
    }
  }

  return painPoints.sort((a, b) => {
    const scoreA = a.severity + a.frequency + a.revenueImpactScore;
    const scoreB = b.severity + b.frequency + b.revenueImpactScore;
    return scoreB - scoreA;
  });
}

// ============================================================
// Stakeholder Generation
// ============================================================
function inferDepartments(company: Company): string[] {
  const depts: string[] = [];
  if (company.people.salesTeam || company.people.leadership) depts.push('Sales');
  if (company.people.technicalTeam) depts.push('Technology');
  if (company.people.operationsTeam) depts.push('Operations');
  if (company.people.supportTeam) depts.push('Customer Support');
  if (company.people.financeAdmin) depts.push('Finance');
  if (depts.length === 0) depts.push('Leadership');
  return depts;
}

export function generateStakeholders(company: Company): Stakeholder[] {
  const stakeholders: Stakeholder[] = [];
  const { people } = company;
  const departments = inferDepartments(company);
  const usedRoles = new Set<string>();

  // Map people section entries to stakeholders
  const peopleEntries = [
    { text: people.leadership, dept: 'Leadership' },
    { text: people.salesTeam, dept: 'Sales' },
    { text: people.technicalTeam, dept: 'Technology' },
    { text: people.operationsTeam, dept: 'Operations' },
    { text: people.supportTeam, dept: 'Customer Support' },
    { text: people.financeAdmin, dept: 'Finance' },
  ];

  for (const entry of peopleEntries) {
    if (!entry.text || entry.text === 'None' || entry.text === 'Unknown') continue;
    if (entry.text.includes('—') || entry.text.includes('.')) {
      const names = entry.text.split(/[,.;]/).filter(Boolean);
      for (const namePart of names.slice(0, 2)) {
        const trimmed = namePart.trim();
        if (!trimmed) continue;
        const roleMatch = trimmed.match(/^([A-Za-z\s]+)\s*[—–-]\s*(.+)/);
        if (roleMatch) {
          const personName = roleMatch[1].trim().split(/\s+/).slice(0, 2).join(' ');
          const role = roleMatch[2].trim();
          if (usedRoles.has(role)) continue;
          usedRoles.add(role);

          const category: StakeholderCategory =
            entry.dept === 'Leadership' ? 'economic_buyer' :
            entry.dept === 'Technology' ? 'technical_buyer' :
            entry.dept === 'Sales' ? 'influencer' : 'influencer';

          stakeholders.push({
            id: uid('sh'),
            category,
            name: personName,
            role,
            department: entry.dept,
            likelyPriorities: getPriorityForRole(role, entry.dept),
            likelyObjections: getObjectionForRole(role, entry.dept),
            whatTheyCareAbout: getCareForRole(role, entry.dept),
            bestTalkTrack: getTalkTrackForRole(role, entry.dept),
            bestProof: getProofForRole(role, entry.dept),
            buyingInfluence: entry.dept === 'Leadership' ? 5 : entry.dept === 'Technology' ? 3 : 4,
            accessStatus: 'known',
            confidence: 'High',
          });
        }
      }
    }
  }

  // Add champion if mentioned
  if (people.knownChampions && people.knownChampions.length > 3) {
    const champText = people.knownChampions;
    const champMatch = champText.match(/^([A-Za-z\s]+)\s*[—–-]\s*(.+)/);
    stakeholders.push({
      id: uid('sh'),
      category: 'champion',
      name: champMatch ? champMatch[1].trim() : 'Unknown Champion',
      role: champMatch ? champMatch[2].trim() : 'Internal Champion',
      department: 'Various',
      likelyPriorities: 'Solving current pain, being the hero, career advancement',
      likelyObjections: 'Implementation time, budget constraints',
      whatTheyCareAbout: 'Getting the solution they need',
      bestTalkTrack: 'You\'re the one pushing for change — let\'s make you look brilliant',
      bestProof: 'Success stories, peer examples, fast time-to-value',
      buyingInfluence: 4,
      accessStatus: 'champion',
      confidence: 'High',
    });
  }

  // Add blocker if mentioned
  if (people.knownBlockers && people.knownBlockers.length > 3) {
    const blockerText = people.knownBlockers;
    const blockerMatch = blockerText.match(/^([A-Za-z\s]+)\s*[—–-]\s*(.+)/);
    stakeholders.push({
      id: uid('sh'),
      category: 'blocker',
      name: blockerMatch ? blockerMatch[1].trim() : 'Unknown Blocker',
      role: blockerMatch ? blockerMatch[2].trim() : 'Skeptic',
      department: 'Various',
      likelyPriorities: 'Stability, risk avoidance, existing processes',
      likelyObjections: 'Too risky, too expensive, not broken',
      whatTheyCareAbout: 'Not being wrong, maintaining status quo',
      bestTalkTrack: 'Acknowledge concerns, provide data, start small',
      bestProof: 'Pilot results, risk mitigation plan, case studies',
      buyingInfluence: 3,
      accessStatus: 'blocker',
      confidence: 'Medium',
    });
  }

  // Add unknown decision maker if mentioned
  if (people.unknownDecisionMaker && people.unknownDecisionMaker.length > 3) {
    stakeholders.push({
      id: uid('sh'),
      category: 'unknown_but_needed',
      name: undefined,
      role: 'Unknown Decision Maker',
      department: 'Unknown',
      likelyPriorities: 'Unknown — needs discovery',
      likelyObjections: 'Unknown — needs discovery',
      whatTheyCareAbout: 'Unknown — needs discovery',
      bestTalkTrack: 'Discovery conversation',
      bestProof: 'General case studies',
      buyingInfluence: 4,
      accessStatus: 'unknown',
      confidence: 'Low',
    });
  }

  // Fill in with template-based stakeholders for missing key roles
  const keyCategories: StakeholderCategory[] = ['economic_buyer', 'technical_buyer', 'influencer'];
  for (const cat of keyCategories) {
    const hasRole = stakeholders.some(s => s.category === cat);
    if (!hasRole) {
      const template = stakeholderRoleTemplates.find(t => t.category === cat);
      if (template) {
        stakeholders.push({
          id: uid('sh'),
          category: cat,
          role: template.role,
          department: departments[0] || 'Unknown',
          likelyPriorities: template.likelyPriorities,
          likelyObjections: template.likelyObjections,
          whatTheyCareAbout: template.whatTheyCareAbout,
          bestTalkTrack: template.bestTalkTrack,
          bestProof: template.bestProof,
          buyingInfluence: template.buyingInfluence,
          accessStatus: 'suspected',
          confidence: 'Low',
        });
      }
    }
  }

  return stakeholders;
}

// Simple heuristic helper functions
function getPriorityForRole(role: string, dept: string): string {
  const lcRole = role.toLowerCase();
  if (lcRole.includes('ceo') || lcRole.includes('founder') || dept === 'Leadership') return 'Revenue growth, cost reduction, strategic advantage';
  if (lcRole.includes('cto') || lcRole.includes('tech')) return 'Security, scalability, technical quality';
  if (lcRole.includes('sales') || lcRole.includes('revenue')) return 'Pipeline, conversion, team productivity';
  if (lcRole.includes('ops') || lcRole.includes('operat')) return 'Efficiency, process improvement, cost control';
  return 'Department performance, team satisfaction, budget management';
}
function getObjectionForRole(role: string, dept: string): string {
  const lcRole = role.toLowerCase();
  if (lcRole.includes('ceo') || lcRole.includes('founder')) return 'ROI unclear, too much change, distraction from core';
  if (lcRole.includes('cto') || lcRole.includes('tech')) return 'Security risk, integration complexity, tech debt';
  if (lcRole.includes('finance') || lcRole.includes('cfo')) return 'Budget constraints, unclear pricing, long-term commitment';
  return 'Process disruption, training burden, another tool to learn';
}
function getCareForRole(role: string, dept: string): string {
  if (dept === 'Leadership') return 'Bottom line, growth, competitive position';
  if (dept === 'Technology') return 'System performance, security, reliability';
  if (dept === 'Sales') return 'Hitting quota, reducing admin, winning deals';
  return 'Getting work done efficiently, recognition, career growth';
}
function getTalkTrackForRole(role: string, dept: string): string {
  if (dept === 'Leadership') return 'Revenue impact, cost savings, competitive advantage';
  if (dept === 'Technology') return 'Technical simplicity, security, scalable architecture';
  if (dept === 'Sales') return 'More time selling, better data, faster follow-up';
  return 'Less manual work, fewer errors, faster processes';
}
function getProofForRole(role: string, dept: string): string {
  if (dept === 'Leadership') return 'ROI case studies, customer testimonials';
  if (dept === 'Technology') return 'Technical specs, security certifications, API docs';
  if (dept === 'Sales') return 'Peer success stories, performance data';
  return 'Time savings metrics, ease-of-use demonstrations';
}

// ============================================================
// Tool Map Generation
// ============================================================
export function generateToolMap(company: Company): { tools: Tool[]; repurpose: HighlanderRepurpose[] } {
  const tools: Tool[] = [];
  const repurpose: HighlanderRepurpose[] = [];
  const { tools: toolsData } = company;

  const toolEntries: { key: string; label: string; value: string }[] = [
    { key: 'crm', label: 'CRM', value: toolsData.crm },
    { key: 'websitePlatform', label: 'Website Platform', value: toolsData.websitePlatform },
    { key: 'schedulingTools', label: 'Scheduling', value: toolsData.schedulingTools },
    { key: 'emailTools', label: 'Email', value: toolsData.emailTools },
    { key: 'projectManagement', label: 'Project Management', value: toolsData.projectManagement },
    { key: 'communicationTools', label: 'Communication', value: toolsData.communicationTools },
    { key: 'supportTools', label: 'Support', value: toolsData.supportTools },
    { key: 'billingTools', label: 'Billing', value: toolsData.billingTools },
    { key: 'automationTools', label: 'Automation', value: toolsData.automationTools },
    { key: 'aiTools', label: 'AI', value: toolsData.aiTools },
    { key: 'securityTools', label: 'Security', value: toolsData.securityTools },
  ];

  for (const entry of toolEntries) {
    const toolName = entry.value;
    const isKnown = toolName && toolName !== 'None' && toolName !== 'Unknown' && !toolName.startsWith('Unknown');
    const isSuspected = !isKnown;

    if (isSuspected) {
      tools.push({
        id: uid('tool'),
        name: `Unknown ${entry.label}`,
        function: `Suspected ${entry.label} tool`,
        department: getToolDepartment(entry.key),
        currentPain: 'Unknown — needs discovery',
        betterWorkflow: 'Unknown — needs discovery',
        possibleNativelyBuild: 'Possible Natively replacement',
        integrationNotes: 'Need to verify current solution',
        confidence: 'Low',
      });
      continue;
    }

    const toolId = uid('tool');
    tools.push({
      id: toolId,
      name: toolName || entry.label,
      function: getToolFunction(entry.key, toolName),
      department: getToolDepartment(entry.key),
      currentPain: getToolPain(entry.key),
      betterWorkflow: getToolBetterWorkflow(entry.key),
      possibleNativelyBuild: getNativelyBuildIdea(entry.key),
      integrationNotes: getIntegrationNotes(entry.key, toolName),
      confidence: 'Medium',
    });

    repurpose.push({
      toolName: toolName || entry.label,
      whatItDoes: getToolFunction(entry.key, toolName),
      whoUsesIt: 'Relevant team members',
      businessFunction: getToolDepartment(entry.key),
      canBeReplicated: entry.key === 'crm' || entry.key === 'supportTools' || entry.key === 'schedulingTools',
      canBeAutomated: entry.key === 'automationTools' || entry.key === 'emailTools',
      canBeSimplified: entry.key === 'projectManagement' || entry.key === 'schedulingTools',
      canBeEnhanced: entry.key === 'crm' || entry.key === 'aiTools' || entry.key === 'reporting',
      v1ReplacementIdea: getRepurposeIdea(entry.key),
      confidence: 'Medium',
    });
  }

  return { tools, repurpose };
}

function getToolDepartment(key: string): string {
  const map: Record<string, string> = {
    crm: 'Sales', websitePlatform: 'Marketing', schedulingTools: 'Operations',
    emailTools: 'All', projectManagement: 'Operations', communicationTools: 'All',
    supportTools: 'Customer Support', billingTools: 'Finance', automationTools: 'Operations',
    aiTools: 'Technology', securityTools: 'IT/Security',
  };
  return map[key] || 'General';
}
function getToolFunction(key: string, name?: string): string {
  const map: Record<string, string> = {
    crm: `Contact and pipeline management${name ? ` (${name})` : ''}`,
    websitePlatform: 'Website hosting and content management',
    schedulingTools: 'Meeting and appointment scheduling',
    emailTools: 'Business email and communication',
    projectManagement: 'Task and project tracking',
    communicationTools: 'Team messaging and collaboration',
    supportTools: 'Customer support and ticketing',
    billingTools: 'Invoicing and payment processing',
    automationTools: 'Workflow automation',
    aiTools: 'Artificial intelligence tools',
    securityTools: 'Identity and security management',
  };
  return map[key] || `Business tool for ${key}`;
}
function getToolPain(key: string): string {
  const map: Record<string, string> = {
    crm: 'Manual data entry, duplicate records, limited reporting',
    schedulingTools: 'Back-and-forth emails, double-booking, no-shows',
    supportTools: 'Ticket backlog, manual responses, no self-service',
    billingTools: 'Manual invoicing, payment tracking, late payments',
    projectManagement: 'Task updates missed, status reports manual',
    emailTools: 'Overloaded inbox, missed messages, no automation',
    automationTools: 'Limited or no automation setup',
    aiTools: 'Not leveraging AI for business processes',
  };
  return map[key] || 'Tool may not be fully utilized';
}
function getToolBetterWorkflow(key: string): string {
  const map: Record<string, string> = {
    crm: 'Auto-enrichment, dedup, pipeline analytics dashboard',
    schedulingTools: 'Self-service booking with auto-reminders and calendar sync',
    supportTools: 'AI triage, knowledge base, auto-responses for common issues',
    billingTools: 'Auto-invoicing, payment reminders, reconciliation',
    projectManagement: 'Auto-status updates, dependency tracking, reporting',
    emailTools: 'Smart inbox, templates, follow-up sequences',
    automationTools: 'Unified automation across all tools',
    aiTools: 'AI-powered automation of repetitive tasks',
  };
  return map[key] || 'Streamlined workflow with automation';
}

function getNativelyBuildIdea(key: string): string {
  const map: Record<string, string> = {
    crm: 'Custom CRM with auto-lead scoring and pipeline views',
    schedulingTools: 'Natively booking system with branded scheduling page',
    supportTools: 'AI support chatbot with knowledge base',
    billingTools: 'Automated invoicing with payment tracking dashboard',
    projectManagement: 'Natively project management with auto-reporting',
    emailTools: 'Email sequence automation with templates and tracking',
    automationTools: 'Natively workflow automation connecting existing tools',
    aiTools: 'AI-powered reporting and analytics',
  };
  return map[key] || 'Possible Natively replacement';
}

function getIntegrationNotes(key: string, name?: string): string {
  return `Currently using ${name || key}. Would need data migration strategy.`;
}

function getRepurposeIdea(key: string): string {
  const map: Record<string, string> = {
    crm: 'Replace with custom CRM built on Natively, tailored to their exact workflow',
    schedulingTools: 'Self-service booking widget integrated into their website',
    supportTools: 'AI chatbot handling 60% of tier-1 tickets',
    billingTools: 'Automated recurring billing with dunning management',
    projectManagement: 'Simplified project tracker with automated status reports',
    emailTools: 'Automated email sequences with CRM triggers',
    automationTools: 'Consolidate Zapier into native Natively automations',
  };
  return map[key] || 'Replicate with Natively for tighter integration';
}

// ============================================================
// Opportunity Generation
// ============================================================
export function generateOpportunities(company: Company, painPoints: PainPoint[]): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const usedTypes = new Set<string>();

  // Map pain points to opportunity types
  const painToOpportunity: Record<string, OpportunityType> = {
    'Missed Lead Follow-Up': 'sales_followup',
    'Manual Lead Routing': 'lead_routing',
    'No CRM Pipeline Visibility': 'internal_dashboard',
    'Ticket Backlog': 'customer_support_assistant',
    'Repetitive Tier-1 Questions': 'customer_support_assistant',
    'Manual Reporting': 'internal_dashboard',
    'Manual Scheduling & Dispatch': 'booking_scheduling',
    'Manual Invoice': 'internal_dashboard',
    'Manual Content Publishing': 'content_engine',
    'Manual Resume Screening': 'employee_training',
    'Manual Onboarding': 'community_onboarding',
    'Manual Security Checks': 'security_triage_dashboard',
    'Manual Data Entry': 'crm_cleanup',
    'No Lead Scoring': 'lead_routing',
    'No Real-Time Executive Dashboard': 'executive_reporting_dashboard',
    'Intake Form & Auto-Routing': 'intake_form_routing',
    'Compliance & Audit': 'compliance_checklist',
    'Inventory & Work Order': 'inventory_work_order_tracker',
    'Client Portal': 'client_portal',
    'Knowledge Base': 'knowledge_base_assistant',
    'Proposal Generator': 'proposal_generator',
  };

  // Generate opportunities from top pain points
  for (const pain of painPoints.slice(0, 5)) {
    const oppType = painToOpportunity[pain.name] || 'custom';
    if (usedTypes.has(oppType)) continue;
    usedTypes.add(oppType);

    const template = opportunityTemplates[oppType];
    if (!template) continue;

    opportunities.push({
      id: uid('opp'),
      title: template.title,
      businessProblem: `${pain.name}: ${pain.symptoms}`,
      whoFeelsPain: `Department: ${pain.department}`,
      whoPaysForFix: company.people.leadership ? 'Leadership/Executive team' : 'Decision makers',
      proposedSolution: template.proposedSolution,
      nativelyBuildIdea: template.nativelyBuildIdea,
      requiredFeatures: template.requiredFeatures,
      estimatedComplexity: template.estimatedComplexity,
      estimatedBusinessValue: template.estimatedBusinessValue,
      suggestedDemoAngle: template.suggestedDemoAngle,
      suggestedBuildPrompt: template.suggestedBuildPrompt,
      discoveryQuestions: template.discoveryQuestions,
      proofNeeded: template.proofNeeded,
      closeStrategy: template.closeStrategy,
      opportunityType: oppType,
    });
  }

  // If no opportunities from pain points, add general ones
  if (opportunities.length === 0) {
    for (const [key, oppType] of Object.entries(painToOpportunity).slice(0, 3)) {
      if (usedTypes.has(oppType)) continue;
      usedTypes.add(oppType);
      const template = opportunityTemplates[oppType];
      if (!template) continue;
      opportunities.push({
        id: uid('opp'),
        title: template.title,
        businessProblem: template.businessProblem,
        whoFeelsPain: 'Relevant departments',
        whoPaysForFix: 'Company leadership',
        proposedSolution: template.proposedSolution,
        nativelyBuildIdea: template.nativelyBuildIdea,
        requiredFeatures: template.requiredFeatures,
        estimatedComplexity: template.estimatedComplexity,
        estimatedBusinessValue: template.estimatedBusinessValue,
        suggestedDemoAngle: template.suggestedDemoAngle,
        suggestedBuildPrompt: template.suggestedBuildPrompt,
        discoveryQuestions: template.discoveryQuestions,
        proofNeeded: template.proofNeeded,
        closeStrategy: template.closeStrategy,
        opportunityType: oppType,
      });
    }
  }

  return opportunities.sort((a, b) => {
    const valueOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    const complexOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    const scoreA = valueOrder[a.estimatedBusinessValue] * 2 - complexOrder[a.estimatedComplexity];
    const scoreB = valueOrder[b.estimatedBusinessValue] * 2 - complexOrder[b.estimatedComplexity];
    return scoreB - scoreA;
  });
}

// ============================================================
// Sales Plan Generation
// ============================================================
export function generateSalesPlan(
  company: Company,
  opportunities: Opportunity[],
  stakeholders: Stakeholder[]
): SalesPlan {
  const topOpp = opportunities[0];
  const budgetOwner = stakeholders.find(s => s.category === 'economic_buyer');
  const champion = stakeholders.find(s => s.category === 'champion');
  const blocker = stakeholders.find(s => s.category === 'blocker');

  // Budget range estimation
  const budgetRange: 'small' | 'moderate' | 'serious' | 'enterprise' =
    company.basic.employeeCount >= 100 ? 'enterprise' :
    company.basic.employeeCount >= 30 ? 'serious' :
    company.basic.employeeCount >= 10 ? 'moderate' : 'small';

  const budgetPricing = {
    small: { fast: { name: 'Starter Automations', description: '1-2 automated workflows, 30-day build', price: '$1,500' }, serious: { name: 'Growth Suite', description: 'Full automation stack + dashboard, 60-day build', price: '$4,500' }, team: { name: 'Enterprise Operations', description: 'Complete transformation + 6 months support', price: '$8,500' } },
    moderate: { fast: { name: 'Quick Win Package', description: 'Key pain point automation, 30-day build', price: '$3,000' }, serious: { name: 'Operations Suite', description: 'Full ops automation + reporting, 60-day build', price: '$7,500' }, team: { name: 'Scale Package', description: 'Enterprise automation + team training + support', price: '$15,000' } },
    serious: { fast: { name: 'Proof of Value', description: 'Single department automation, 30-day pilot', price: '$5,000' }, serious: { name: 'Enterprise Automation', description: 'Multi-department automation + integration, 90-day build', price: '$15,000' }, team: { name: 'Full Transformation', description: 'Complete digital transformation + 12 months support', price: '$35,000' } },
    enterprise: { fast: { name: 'Department Pilot', description: 'Single team automation, 45-day pilot', price: '$8,000' }, serious: { name: 'Enterprise Suite', description: 'Multi-department + custom integrations, 90-day build', price: '$25,000' }, team: { name: 'Enterprise+', description: 'Org-wide transformation + dedicated support team', price: '$50,000+' } },
  };

  const pricing = budgetPricing[budgetRange];

  return {
    ride: {
      demoConcept: topOpp
        ? `Focus on ${topOpp.title}. Show a live version of the solution addressing their specific pain points.`
        : `Custom demo focused on their industry and pain points.`,
      buildPrompt: topOpp
        ? topOpp.suggestedBuildPrompt
        : 'Build a custom automation solution for their business needs',
      whatToShowFirst: 'Start with the problem visualization, then show the solution in action with their data.',
      whatToAskDuringDemo: `"Does this look like something that would help with your ${topOpp?.businessProblem?.slice(0, 50) || 'current challenges'}?"`,
      positiveSignals: 'Asking about pricing, implementation timeline, next steps. Engaging with specific features.',
      negativeSignals: 'Looking at phone, no questions, deferring decisions, focusing on objections.',
      howToRedirect: 'Acknowledge concerns, reframe to value. "I hear you — let me show you how this specifically addresses [their pain]."',
      objections: blocker
        ? `Expect resistance from ${blocker.name || 'blocker'}. Prepare data-driven responses.`
        : `Be ready for pricing and timeline objections. Have case studies ready.`,
    },
    select: {
      recommendedSolution: topOpp?.title || 'Custom Automation Solution',
      secondaryOption: opportunities[1]?.title || 'Alternative approach based on priority shift',
      expansionPath: opportunities.slice(1, 3).map(o => o.title).join(' → ') || 'Start with core, expand to adjacent departments',
      mustHaveFeatures: topOpp?.requiredFeatures?.split(',').slice(0, 3).join(', ') || 'Core automation, reporting, integrations',
      niceToHaveFeatures: topOpp?.requiredFeatures?.split(',').slice(3).join(', ') || 'Advanced analytics, team training, support',
      futureUpsell: opportunities.slice(1).map(o => o.title).join(', '),
      decisionCriteria: 'Pain impact, time-to-value, budget fit, team readiness',
    },
    price: {
      openingValueStatement: `${company.basic.name} is losing ${company.workloadFriction.missedRevenue || 'revenue'} due to manual processes. Our solution directly addresses this.`,
      costOfInaction: company.workloadFriction.missedRevenue || 'Continued inefficiency and missed opportunities',
      proposedOffer: pricing.serious.name,
      fastProof: pricing.fast,
      seriousBuild: pricing.serious,
      teamScale: pricing.team,
      recommendedPackage: pricing.serious.name,
      closeQuestion: 'Based on what we\'ve discussed, does the Serious Build package align with what you\'re looking for?',
      objectionQuestions: 'What concerns do you have about moving forward? Is it budget, timing, or something else?',
      languagePattern: `For ${company.basic.name}, we recommend starting with the ${pricing.fast.name} to validate quickly, then scaling to the full suite.`,
      budgetOwner: budgetOwner?.name || 'Unknown decision maker',
      budgetRange,
      bestNextStep: 'Schedule a technical deep-dive with the team who will use the solution daily.',
      concessionStrategy: 'If budget is tight, offer the Fast Proof package with a 3-month scale commitment.',
      followupPlan: `Day 1: Send demo recap. Day 3: Share case study. Day 7: Follow up on next steps. Day 14: Check in on budget cycle.`,
    },
  };
}

// ============================================================
// Scoring Functions
// ============================================================
export function calculateOpportunityScore(painPoints: PainPoint[]): number {
  if (painPoints.length === 0) return 0;
  const scored = painPoints.map(p => p.severity + p.frequency + p.revenueImpactScore + p.easeOfSolution + p.decisionMakerVisibility);
  const top3 = scored.sort((a, b) => b - a).slice(0, 3);
  const avg = top3.reduce((s, v) => s + v, 0) / top3.length;
  return Math.round((avg / 25) * 100);
}

export function calculateFitScore(company: Company, offerType: OfferType): number {
  const searchText = [
    company.basic.notes, company.business.productsServices,
    company.workloadFriction.softwareCouldAssist,
    ...Object.values(company.tools),
    ...Object.values(company.workloadFriction),
  ].filter(Boolean).join(' ').toLowerCase();

  const offerKeywords: Record<string, string[]> = {
    ai_automation: ['ai', 'automate', 'automat', 'robot', 'intelligent', 'smart', 'machine learning'],
    agent_build: ['agent', 'assistant', 'bot', 'chatbot', 'virtual', 'autonomous'],
    workflow_optimization: ['workflow', 'process', 'efficiency', 'manual', 'repeats', 'bottleneck'],
    cybersecurity: ['security', 'compliance', 'risk', 'audit', 'threat', 'protection'],
    crm_cleanup: ['crm', 'contact', 'lead', 'pipeline', 'salesforce', 'hubspot'],
    content_engine: ['content', 'marketing', 'blog', 'social', 'publish', 'copywrite'],
    internal_tool: ['dashboard', 'report', 'tracking', 'internal', 'operations'],
    customer_support_bot: ['support', 'ticket', 'help', 'faq', 'knowledge base', 'service'],
    sales_ops_automation: ['sales', 'lead', 'follow-up', 'pipeline', 'revenue', 'prospect'],
    custom: ['custom', 'specific', 'unique', 'special'],
  };

  const keywords = offerKeywords[offerType] || [];
  const matches = keywords.filter(kw => searchText.includes(kw)).length;
  const maxMatches = keywords.length;
  const ratio = maxMatches > 0 ? matches / maxMatches : 0;

  return Math.min(10, Math.max(1, Math.round(ratio * 10)));
}

export function calculatePainScore(painPoints: PainPoint[]): number {
  if (painPoints.length === 0) return 0;
  const avgSeverity = painPoints.reduce((s, p) => s + p.severity, 0) / painPoints.length;
  return Math.round((avgSeverity / 5) * 10);
}

export function calculateUrgencyScore(painPoints: PainPoint[]): number {
  if (painPoints.length === 0) return 0;
  const avgUrgency = painPoints.reduce((s, p) => s + (p.frequency + p.revenueImpactScore) / 2, 0) / painPoints.length;
  return Math.round((avgUrgency / 5) * 10);
}

// ============================================================
// CRM Export Generation
// ============================================================
export function generateCRMExport(company: Company, dealStage?: DealStage): CRMExport {
  const topPainPoints = company.painPoints.slice(0, 5).map(p => p.name);
  const opportunityScore = calculateOpportunityScore(company.painPoints);

  let prospectStatus: ProspectStatus = 'unknown';
  if (opportunityScore >= 70) prospectStatus = 'hot';
  else if (opportunityScore >= 40) prospectStatus = 'warm';
  else prospectStatus = 'cold';

  const champion = company.stakeholders.find(s => s.category === 'champion');
  const economicBuyer = company.stakeholders.find(s => s.category === 'economic_buyer');

  return {
    id: uid('crm'),
    companyName: company.basic.name,
    website: company.basic.website,
    industry: company.basic.industry,
    location: company.basic.location,
    companySize: company.basic.employeeCount,
    primaryContact: economicBuyer?.name || champion?.name || 'Unknown',
    decisionMaker: economicBuyer?.name || 'Unknown',
    champion: champion?.name,
    painPoints: topPainPoints,
    opportunityScore,
    recommendedProduct: company.opportunities[0]?.title || 'Custom Automation Solution',
    suggestedPackage: company.salesPlan?.price.recommendedPackage || 'Growth Package',
    nextStep: company.salesPlan?.price.bestNextStep || 'Schedule discovery call',
    followupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: company.basic.notes,
    crmTags: [
      prospectStatus === 'hot' ? 'Hot Prospect' : prospectStatus === 'warm' ? 'Warm Prospect' : 'Cold Prospect',
      company.basic.industry,
      `Score: ${opportunityScore}/100`,
      company.basic.employeeCount >= 50 ? 'Mid-Market' : 'SMB',
    ],
    source: 'Natively Profit Scout Analysis',
    confidence: company.painPoints.some(p => p.confidence === 'High') ? 'High' : 'Medium',
    dealStage: dealStage || 'discovery',
    prospectStatus,
  };
}

// ============================================================
// Full Analysis Generator
// ============================================================
export function generateFullAnalysis(company: Company): Company {
  const profile = generateCompanyProfile(company);
  const painPoints = generatePainPoints(company);
  const stakeholders = generateStakeholders(company);
  const { tools, repurpose } = generateToolMap(company);
  const opportunities = generateOpportunities(company, painPoints);
  const salesPlan = generateSalesPlan(company, opportunities, stakeholders);
  const crmExport = generateCRMExport(company);

  return {
    ...company,
    profile,
    painPoints,
    stakeholders,
    toolMap: tools,
    highladerRepurpose: repurpose,
    opportunities,
    salesPlan,
    crmExport,
    updatedAt: new Date().toISOString(),
  };
}
