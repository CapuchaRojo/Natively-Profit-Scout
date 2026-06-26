// ============================================================
// HubSpot CRM Export — Formats company data for HubSpot import
// Maps Profit Scout fields to HubSpot deal, contact & note formats
// ============================================================
import type { Company, CRMExport, Stakeholder, PainPoint, Opportunity } from '../types';

// ─── HubSpot Deal Properties ────────────────────────────────────

export interface HubSpotDeal {
  dealname: string;
  dealstage: string;
  pipeline: string;
  amount: string;
  closedate: string;
  description: string;
  hs_notes: string;
  hubspot_owner_id?: string;
  // Custom properties
  opportunity_score?: number;
  prospect_status?: string;
  recommended_product?: string;
  suggested_package?: string;
  industry?: string;
  company_size?: number;
  location?: string;
}

export interface HubSpotContact {
  firstname?: string;
  lastname?: string;
  jobtitle?: string;
  hs_lead_status?: string;
  lifecycle_stage?: string;
  hs_notes?: string;
}

export interface HubSpotNote {
  body: string;
  engagement_type: 'NOTE' | 'CALL' | 'MEETING' | 'EMAIL' | 'TASK';
  timestamp: string;
}

// ─── Map Deal Stage ─────────────────────────────────────────────

const hubspotStageMap: Record<string, string> = {
  'discovery': 'appointmentscheduled',
  'qualification': 'qualifiedtobuy',
  'demo': 'presentationscheduled',
  'proposal': 'decisionmakerboughtin',
  'negotiation': 'contractsent',
  'closed_won': 'closedwon',
  'closed_lost': 'closedlost',
};

const hubspotPipelineMap: Record<string, string> = {
  'discovery': 'default',
  'qualification': 'default',
  'demo': 'default',
  'proposal': 'default',
  'negotiation': 'default',
  'closed_won': 'default',
  'closed_lost': 'default',
};

// ─── Export Functions ───────────────────────────────────────────

export function companyToHubSpotDeal(company: Company): HubSpotDeal {
  const crm = company.crmExport;
  const stage = hubspotStageMap[crm?.dealStage || 'discovery'] || 'appointmentscheduled';

  return {
    dealname: `${company.basic.name} — AI Automation Opportunity`,
    dealstage: stage,
    pipeline: 'default',
    amount: estimateDealAmount(company),
    closedate: crm?.followupDate || '',
    description: buildDealDescription(company),
    hs_notes: buildHubSpotNotes(company),
    opportunity_score: crm?.opportunityScore || 50,
    prospect_status: crm?.prospectStatus || 'unknown',
    recommended_product: crm?.recommendedProduct || 'Natively AI Automation',
    suggested_package: crm?.suggestedPackage || '',
    industry: company.basic.industry,
    company_size: company.basic.employeeCount,
    location: company.basic.location,
  };
}

export function stakeholdersToHubSpotContacts(company: Company): HubSpotContact[] {
  return company.stakeholders.map(s => ({
    firstname: s.name?.split(' ')[0] || '',
    lastname: s.name?.split(' ').slice(1).join(' ') || '',
    jobtitle: s.role,
    hs_lead_status: mapAccessStatusToLeadStatus(s.accessStatus),
    lifecycle_stage: mapBuyingInfluenceToLifecycle(s.buyingInfluence),
    hs_notes: `Profit Scout Stakeholder\nCategory: ${s.category}\nInfluence: ${s.buyingInfluence}/5\nPriorities: ${s.likelyPriorities}\nBest Talk Track: ${s.bestTalkTrack}\nConfidence: ${s.confidence}`,
  }));
}

export function companyToHubSpotNote(company: Company): string {
  const lines: string[] = [];
  const crm = company.crmExport;

  lines.push(`# ${company.basic.name} — Profit Scout Recon Brief`);
  lines.push(`**Generated:** ${new Date().toISOString().split('T')[0]}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Company Overview');
  lines.push(`- **Industry:** ${company.basic.industry}`);
  lines.push(`- **Location:** ${company.basic.location}`);
  lines.push(`- **Employees:** ${company.basic.employeeCount}`);
  lines.push(`- **Revenue Est:** ${company.basic.revenueEstimate}`);
  lines.push(`- **Website:** ${company.basic.website}`);
  lines.push('');
  lines.push('## Business Context');
  lines.push(`- **Products/Services:** ${company.business.productsServices}`);
  lines.push(`- **Target Customers:** ${company.business.targetCustomers}`);
  lines.push(`- **Sales Model:** ${company.business.salesModel}`);
  lines.push('');
  lines.push('## Pain Points');
  company.painPoints.slice(0, 5).forEach(p => {
    lines.push(`- **${p.name}** (${p.department}, severity: ${p.severity}/5)`);
    lines.push(`  - ${p.symptoms}`);
    if (p.discoveryQuestion) lines.push(`  - ❓ ${p.discoveryQuestion}`);
  });
  lines.push('');

  // People Intelligence
  const recon = company.reconFindings;
  const ps = recon?.peopleSignals;
  if (ps) {
    lines.push('## 👤 People Intelligence');
    if (ps.roleMap.length > 0) {
      lines.push('### Detected Roles');
      ps.roleMap.forEach(r => lines.push(`- [${r.confidence}] ${r.roleTitle} (${r.department})`));
      lines.push('');
    }
    if (ps.stakeholderHypotheses.length > 0) {
      lines.push('### Stakeholder Hypotheses');
      ps.stakeholderHypotheses.forEach(h => {
        lines.push(`- **${h.roleTitle}** — ${h.likelyConcern}`);
        lines.push(`  - ❓ ${h.likelyDiscoveryQuestion}`);
        lines.push(`  - Influence: ${h.likelyBuyingInfluence}/5 · Confidence: ${h.confidence}`);
      });
      lines.push('');
    }
    if (ps.outreachAngles.length > 0) {
      lines.push('### Outreach Angles');
      ps.outreachAngles.forEach(o => lines.push(`- "${o.angleText}" (→ ${o.targetRole})`));
      lines.push('');
    }
    if (ps.discoveryQuestions.length > 0) {
      lines.push('### Discovery Questions');
      ps.discoveryQuestions.forEach(q => lines.push(`- [${q.targetRole}] ${q.question}`));
      lines.push('');
    }
    if (ps.hiringSignals.length > 0) {
      lines.push('### Hiring Signals');
      ps.hiringSignals.forEach(h => lines.push(`- Hiring: ${h.openRole || h.roleGap} (${h.department})`));
      lines.push('');
    }
    if (ps.milestoneSignals.length > 0) {
      lines.push('### Milestone Signals');
      ps.milestoneSignals.forEach(m => lines.push(`- ${m.description} [${m.milestoneType}]`));
      lines.push('');
    }
  }

  // Detected Tools
  const tools = recon?.detectedTools || [];
  if (tools.length > 0) {
    lines.push('## 🔧 Detected Tech Stack');
    tools.forEach(t => lines.push(`- ${t.toolName} (${t.category}) — ${t.evidence}`));
    lines.push('');
  }

  // Opportunities
  if (company.opportunities.length > 0) {
    lines.push('## ⚡ Opportunities');
    company.opportunities.slice(0, 3).forEach(o => {
      lines.push(`- **${o.title}**`);
      lines.push(`  - Problem: ${o.businessProblem}`);
      if (o.suggestedDemoAngle) lines.push(`  - Demo Angle: ${o.suggestedDemoAngle}`);
    });
    lines.push('');
  }

  // CRM Info
  if (crm) {
    lines.push('## CRM Data');
    lines.push(`- **Score:** ${crm.opportunityScore}/100`);
    lines.push(`- **Stage:** ${crm.dealStage}`);
    lines.push(`- **Status:** ${crm.prospectStatus}`);
    lines.push(`- **Next Step:** ${crm.nextStep}`);
    lines.push(`- **Follow-up:** ${crm.followupDate}`);
    lines.push(`- **Tags:** ${crm.crmTags.join(', ')}`);
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Generated by Natively Profit Scout — ${new Date().toISOString()}`);

  return lines.join('\n');
}

export function companyToHubSpotCsvRow(company: Company): string {
  const crm = company.crmExport;
  const stage = hubspotStageMap[crm?.dealStage || 'discovery'] || 'appointmentscheduled';

  const fields = [
    `"${company.basic.name}"`,                                     // Company Name
    `"${company.basic.website}"`,                                  // Website
    `"${company.basic.industry}"`,                                 // Industry
    `"${company.basic.location}"`,                                 // Location
    company.basic.employeeCount,                                    // Company Size
    crm?.opportunityScore || 50,                                    // Opportunity Score
    `"${stage}"`,                                                   // Deal Stage
    `"${crm?.prospectStatus || 'unknown'}"`,                       // Prospect Status
    `"${crm?.recommendedProduct || 'Natively AI Automation'}"`,    // Product
    `"${crm?.suggestedPackage || ''}"`,                            // Package
    `"${crm?.nextStep || ''}"`,                                    // Next Step
    `"${crm?.followupDate || ''}"`,                                // Follow-up Date
    `"${company.painPoints.map(p => p.name).join('; ')}"`,         // Pain Points (semicolon separated)
    `"${company.stakeholders.map(s => `${s.role} (${s.department})`).join('; ')}"`,  // Stakeholders
    `"${crm?.crmTags?.join(', ') || ''}"`,                         // Tags
    `"${crm?.notes || ''}"`,                                      // Notes
    // Recon data
    `"${(company.reconFindings?.detectedTools || []).map((t: any) => t.toolName).join('; ')}"`,  // Detected Tools
    `"${(company.reconFindings?.peopleSignals?.roleMap || []).map((r: any) => r.roleTitle).join('; ')}"`,  // People Roles
    `"${(company.reconFindings?.peopleSignals?.hiringSignals || []).map((h: any) => h.openRole).join('; ')}"`,  // Hiring Signals
  ];

  return fields.join(',');
}

export function hubSpotCsvHeader(): string {
  return [
    'Company Name', 'Website', 'Industry', 'Location', 'Company Size',
    'Opportunity Score', 'Deal Stage', 'Prospect Status', 'Recommended Product',
    'Suggested Package', 'Next Step', 'Follow-up Date', 'Pain Points',
    'Stakeholders', 'Tags', 'Notes', 'Detected Tools', 'People Roles', 'Hiring Signals',
  ].map(h => `"${h}"`).join(',');
}

export function companyToHubSpotJson(company: Company): string {
  const crm = company.crmExport;
  return JSON.stringify({
    company: {
      name: company.basic.name,
      website: company.basic.website,
      industry: company.basic.industry,
      location: company.basic.location,
      companySize: company.basic.employeeCount,
      revenueEstimate: company.basic.revenueEstimate,
    },
    deal: companyToHubSpotDeal(company),
    contacts: stakeholdersToHubSpotContacts(company),
    note: companyToHubSpotNote(company),
    crm: crm ? {
      score: crm.opportunityScore,
      stage: crm.dealStage,
      status: crm.prospectStatus,
      product: crm.recommendedProduct,
      package: crm.suggestedPackage,
      nextStep: crm.nextStep,
      followupDate: crm.followupDate,
      tags: crm.crmTags,
    } : null,
    recon: company.reconFindings ? {
      tools: company.reconFindings.detectedTools.map(t => ({ name: t.toolName, category: t.category, confidence: t.confidence })),
      workflows: company.reconFindings.inferredWorkflows.map(w => ({ name: w.workflowName, department: w.department, confidence: w.confidence })),
      peopleSignals: company.reconFindings.peopleSignals ? {
        roleCount: company.reconFindings.peopleSignals.roleMap.length,
        stakeholderHypothesisCount: company.reconFindings.peopleSignals.stakeholderHypotheses.length,
        hiringSignalCount: company.reconFindings.peopleSignals.hiringSignals.length,
        milestoneCount: company.reconFindings.peopleSignals.milestoneSignals.length,
        outreachAngleCount: company.reconFindings.peopleSignals.outreachAngles.length,
        discoveryQuestionCount: company.reconFindings.peopleSignals.discoveryQuestions.length,
      } : null,
    } : null,
    generatedAt: new Date().toISOString(),
    generator: 'Natively Profit Scout',
  }, null, 2);
}

// ─── Helpers ────────────────────────────────────────────────────

function estimateDealAmount(company: Company): string {
  const crm = company.crmExport;
  if (!crm) return '0';
  const score = crm.opportunityScore;
  const emp = company.basic.employeeCount;

  if (score >= 70 && emp >= 200) return '50000';
  if (score >= 50 && emp >= 50) return '25000';
  if (score >= 30) return '10000';
  return '5000';
}

function buildDealDescription(company: Company): string {
  const parts: string[] = [];
  parts.push(`Profit Scout Analysis for ${company.basic.name}`);
  parts.push(`Industry: ${company.basic.industry}`);
  parts.push(`Pain Points: ${company.painPoints.length} identified`);
  parts.push(`Opportunities: ${company.opportunities.length} identified`);
  if (company.reconFindings?.peopleSignals?.roleMap.length) {
    parts.push(`People Signals: ${company.reconFindings.peopleSignals.roleMap.length} roles detected`);
  }
  parts.push(`Score: ${company.crmExport?.opportunityScore || 0}/100`);
  return parts.join(' | ');
}

function buildHubSpotNotes(company: Company): string {
  return companyToHubSpotNote(company).slice(0, 5000);
}

function mapAccessStatusToLeadStatus(status: string): string {
  switch (status) {
    case 'known': case 'suspected': return 'NEW';
    case 'contacted': return 'CONTACTED';
    case 'meeting_booked': return 'WORKING';
    case 'champion': return 'OPEN';
    case 'blocker': return 'OPEN';
    default: return 'NEW';
  }
}

function mapBuyingInfluenceToLifecycle(influence: number): string {
  if (influence >= 4) return 'opportunity';
  if (influence >= 2) return 'lead';
  return 'subscriber';
}
