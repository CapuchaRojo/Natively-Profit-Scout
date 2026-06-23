// ============================================================
// LinkedIn Source Assistant — v0.6
// Paste-text source-type detector, employee/role extraction,
// and auto-fill mapping for CompanyPeople fields
// ============================================================

import type {
  ConfidenceLevel, PeopleSignalSourceType,
  DiscoveredEmployee, CompanyPeople, RoleMapEntry,
} from '../types';
import { extractEmployeesFromLinkedInText } from './publicSourceDiscovery';

interface SourceTypeDetection {
  sourceType: PeopleSignalSourceType;
  label: string;
  confidence: ConfidenceLevel;
  indicators: string[];
}

// ─── Source Type Detection ─────────────────────────────────────

export function detectSourceType(text: string): SourceTypeDetection {
  const lower = text.toLowerCase();
  const indicators: string[] = [];

  // LinkedIn company About page
  if (/linkedin\.com\/company/.test(lower) || /^\s*about\s*$/m.test(lower)) {
    indicators.push('Contains LinkedIn company URL or "About" section');
  }
  if (
    (lower.includes('linkedin') && lower.includes('company')) ||
    lower.includes('about us') ||
    lower.includes('our story')
  ) {
    indicators.push('LinkedIn company mention + narrative text');
  }

  // Employee profile patterns
  const nameRolePattern = /([A-Z][a-z]+ [A-Z][a-z]+)\s*[|–—]\s*([A-Za-z][A-Za-z\s/]+)/;
  const bulletNames = /[•\-]\s*[A-Z][a-z]+ [A-Z][a-z]+/;
  const experienceSection = /\b(experience|about|summary)\b[\s\S]{0,200}\b(at|current|previous)\b/i;

  if (nameRolePattern.test(text) && bulletNames.test(text)) {
    indicators.push('Name–role pairs with bullet points (employee listing pattern)');
  }
  if (experienceSection.test(text)) {
    indicators.push('Experience/summary section with career timeline');
  }

  // Job posting patterns
  const jobPatterns = [
    /\b(we are hiring|open position|join our team|job posting|career opportunity)\b/i,
    /\b(responsibilities|qualifications|requirements|what you[’']ll do)\b/i,
    /\b(apply now|submit your application|send your resume)\b/i,
  ];
  const jobScore = jobPatterns.filter(p => p.test(text)).length;

  // Team page patterns
  const teamPatterns = [
    /\b(our team|meet the team|leadership team|management team)\b/i,
    /\b(ceo|cto|cfo|coo|founder|president|director|vp of|head of)\b/i,
    /(role|title|position)\s*[:|]/i,
  ];
  const teamScore = teamPatterns.filter(p => p.test(text)).length;

  // Hiring signals
  const hiringKeywords = [
    'hiring', 'open role', 'we are looking', 'join our team', 'careers',
    'job posting', 'position', 'recruiting',
  ];
  const hiringScore = hiringKeywords.filter(k => lower.includes(k)).length;

  // Press release patterns
  const pressPatterns = [
    /\b(announces|launches|partners with|today announced|is pleased to)\b/i,
    /\b(new partnership|series [ab]|funding round|investment)\b/i,
    /\b(press release|media contact|for immediate release)\b/i,
  ];
  const pressScore = pressPatterns.filter(p => p.test(text)).length;

  // Determine source type
  let sourceType: PeopleSignalSourceType = 'manual_role_notes';
  let label = 'Manual Role Notes';
  let confidence: ConfidenceLevel = 'Low';

  if (lower.includes('linkedin')) {
    if (hiringScore >= 2 || jobScore >= 2) {
      sourceType = 'linkedin_job_post';
      label = 'LinkedIn Job Post';
      confidence = hiringScore >= 3 ? 'High' : 'Medium';
      indicators.push(`Hiring/job keywords found (${hiringScore + jobScore} matches)`);
    } else if (nameRolePattern.test(text) && bulletNames.test(text)) {
      sourceType = 'linkedin_employee_profile';
      label = 'LinkedIn Employee Profile / People Search';
      confidence = 'Medium';
      indicators.push('Employee name–role pairs detected');
    } else if (lower.includes('posts') || lower.includes('feed')) {
      sourceType = 'linkedin_company_post';
      label = 'LinkedIn Company Post';
      confidence = 'Medium';
      indicators.push('LinkedIn post/feed content detected');
    } else {
      sourceType = 'linkedin_company_about';
      label = 'LinkedIn Company About / Overview';
      confidence = 'Medium';
      indicators.push('LinkedIn company content detected');
    }
  } else if (teamScore >= 2) {
    sourceType = 'company_team_page';
    label = 'Company Team / Leadership Page';
    confidence = teamScore >= 3 ? 'High' : 'Medium';
    indicators.push(`Team/leadership patterns found (${teamScore} matches)`);
  } else if (pressScore >= 2) {
    sourceType = 'press_release';
    label = 'Press Release / News';
    confidence = pressScore >= 3 ? 'High' : 'Medium';
    indicators.push(`Press release patterns found (${pressScore} matches)`);
  } else if (hiringScore >= 2) {
    sourceType = 'careers_page';
    label = 'Careers / Jobs Page';
    confidence = hiringScore >= 3 ? 'High' : 'Medium';
    indicators.push(`Hiring keywords found (${hiringScore} matches)`);
  } else if (nameRolePattern.test(text) || bulletNames.test(text)) {
    sourceType = 'company_team_page';
    label = 'Team / Employee Listing';
    confidence = 'Medium';
    indicators.push('Name–role pairs detected in text');
  } else if (text.length > 200) {
    sourceType = 'manual_role_notes';
    label = 'Manual Role Notes / General';
    confidence = 'Low';
    indicators.push('General text — no strong source pattern detected');
  }

  return { sourceType, label, confidence, indicators };
}

// ─── Auto-Fill People Fields Mapping ────────────────────────────

export interface PeopleFieldsAutoFill {
  leadership: string;
  salesTeam: string;
  technicalTeam: string;
  operationsTeam: string;
  supportTeam: string;
  financeAdmin: string;
  employeeCount: number;
  peopleNotes: string;
}

export function extractPeopleForAutoFill(
  text: string,
  companyName: string
): {
  employees: DiscoveredEmployee[];
  peopleFields: PeopleFieldsAutoFill;
  roleMapEntries: RoleMapEntry[];
} {
  const extracted = extractEmployeesFromLinkedInText(text, companyName);

  // Categorize employees into people fields
  const leadership: string[] = [];
  const sales: string[] = [];
  const technical: string[] = [];
  const operations: string[] = [];
  const support: string[] = [];
  const finance: string[] = [];
  const unknown: string[] = [];

  for (const emp of extracted) {
    const dept = (emp.department || '').toLowerCase();
    const role = (emp.role || '').toLowerCase();
    const name = emp.name;

    if (dept.includes('executive') || role.includes('ceo') || role.includes('founder') ||
        role.includes('president') || role.includes('chief') || role.includes('vp')) {
      leadership.push(`${name}${emp.role ? ` — ${emp.role}` : ''}`);
    } else if (dept.includes('sales') || dept.includes('marketing') || role.includes('sales') ||
               role.includes('marketing') || role.includes('revenue') || role.includes('bdr')) {
      sales.push(`${name} — ${emp.role || 'Sales'}`);
    } else if (dept.includes('technology') || dept.includes('product') || role.includes('engineer') ||
               role.includes('developer') || role.includes('cto') || role.includes('product') ||
               role.includes('technical')) {
      technical.push(`${name} — ${emp.role || 'Technical'}`);
    } else if (dept.includes('operation') || role.includes('operation') || role.includes('ops')) {
      operations.push(`${name} — ${emp.role || 'Operations'}`);
    } else if (dept.includes('support') || dept.includes('customer') || role.includes('support') ||
               role.includes('success') || role.includes('service')) {
      support.push(`${name} — ${emp.role || 'Support'}`);
    } else if (dept.includes('finance') || dept.includes('admin') || role.includes('finance') ||
               role.includes('accounting') || role.includes('cfo') || role.includes('admin')) {
      finance.push(`${name} — ${emp.role || 'Finance'}`);
    } else if (emp.role) {
      unknown.push(`${name} — ${emp.role}`);
    } else {
      unknown.push(name);
    }
  }

  // Build role map entries from categorized employees
  const roleMapEntries: RoleMapEntry[] = [];
  const seenRoles = new Set<string>();

  const addRoleMapEntry = (title: string, department: string) => {
    if (seenRoles.has(title)) return;
    seenRoles.add(title);
    roleMapEntries.push({
      roleType: mapRoleType(department),
      roleTitle: title,
      department,
      evidence: `Extracted from pasted source: ${title}`,
      confidence: 'Medium',
      sourceType: 'linkedin_employee_profile',
      sourceUrl: `${companyName} — LinkedIn/people source`,
    });
  };

  // Add leadership role(s)
  if (leadership.length > 0) {
    addRoleMapEntry('Leadership/Executive Team', 'Executive');
  }
  if (sales.length > 0) addRoleMapEntry('Sales / GTM Team', 'Sales & Marketing');
  if (technical.length > 0) addRoleMapEntry('Technical / Product Team', 'Technology & Product');
  if (operations.length > 0) addRoleMapEntry('Operations Team', 'Operations');
  if (support.length > 0) addRoleMapEntry('Support / Customer Success Team', 'Customer Support');
  if (finance.length > 0) addRoleMapEntry('Finance / Admin Team', 'Finance & Administration');

  const peopleFields: PeopleFieldsAutoFill = {
    leadership: leadership.join('\n'),
    salesTeam: sales.join('\n'),
    technicalTeam: technical.join('\n'),
    operationsTeam: operations.join('\n'),
    supportTeam: support.join('\n'),
    financeAdmin: finance.join('\n'),
    employeeCount: extracted.length,
    peopleNotes: [
      `Source: Pasted public people/company text`,
      `Total names extracted: ${extracted.length}`,
      leadership.length > 0 ? `Leadership: ${leadership.length} person(s)` : '',
      sales.length > 0 ? `Sales: ${sales.length} person(s)` : '',
      technical.length > 0 ? `Technical: ${technical.length} person(s)` : '',
      operations.length > 0 ? `Operations: ${operations.length} person(s)` : '',
      support.length > 0 ? `Support: ${support.length} person(s)` : '',
      finance.length > 0 ? `Finance/Admin: ${finance.length} person(s)` : '',
      unknown.length > 0 ? `Other roles: ${unknown.length} person(s)` : '',
    ].filter(Boolean).join('\n'),
  };

  return { employees: extracted, peopleFields, roleMapEntries };
}

function mapRoleType(department: string): RoleMapEntry['roleType'] {
  const d = department.toLowerCase();
  if (d.includes('executive')) return 'executive_founder';
  if (d.includes('sales') || d.includes('marketing')) return 'sales_gtm';
  if (d.includes('technology') || d.includes('product')) return 'technical_product';
  if (d.includes('operation')) return 'operations';
  if (d.includes('support') || d.includes('customer')) return 'support';
  if (d.includes('finance') || d.includes('admin')) return 'finance_admin';
  return 'unknown_decision_maker_gap';
}
