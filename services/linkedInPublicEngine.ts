// ============================================================
// LinkedIn Public Engine — v1.0
// Processes LinkedIn public page data (fetched via proxy —
// logged-out views only) into structured signals:
//   - LinkedInJobSignal:  job titles, departments, tech stack, growth
//   - LinkedInCompanySignal: description, size, industry, location
//
// All data is from the PUBLIC logged-out view of LinkedIn.
// No login, no private profiles, no credential-based access.
// ============================================================

import type { ConfidenceLevel } from '../types';
import { inferDepartment } from './teamExtractor';

// ── Output types ──────────────────────────────────────────────

export interface LinkedInJobSignal {
  title: string;
  department: string;
  location: string;
  techStackMentions: string[];
  growthSignal: string;
  nativelyImplication: string;
  confidence: ConfidenceLevel;
}

export interface LinkedInCompanySignal {
  description: string;
  employeeRange: string;
  industry: string;
  headquarters: string;
  website?: string;
  growthIndicators: string[];
  confidence: ConfidenceLevel;
}

// ── Known tech stack terms to detect in job descriptions ─────

const TECH_STACK_TERMS = [
  // Languages & Frameworks
  'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask',
  'Ruby on Rails', 'Spring', 'Laravel', '.NET', 'ASP.NET', 'Golang', 'Rust',
  'Python', 'TypeScript', 'JavaScript', 'Java', 'C#', 'PHP', 'Swift', 'Kotlin',
  // Cloud & Infra
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform',
  'Serverless', 'Lambda', 'CloudFront', 'S3', 'EC2', 'RDS', 'BigQuery',
  // Data & AI
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Kafka',
  'Spark', 'Airflow', 'Databricks', 'Snowflake', 'Tableau', 'Power BI',
  'TensorFlow', 'PyTorch', 'MLflow', 'Machine Learning', 'AI',
  // CRM & Business
  'Salesforce', 'HubSpot', 'Marketo', 'Pardot', 'Zendesk', 'Intercom',
  'Jira', 'Confluence', 'Slack', 'Notion', 'Asana', 'Monday.com', 'Airtable',
  'Stripe', 'Shopify', 'Magento', 'WordPress', 'Webflow',
  // DevOps
  'CI/CD', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'ArgoCD',
  'Prometheus', 'Grafana', 'Datadog', 'New Relic', 'Sentry',
];

// ── Extract jobs from LinkedIn HTML/text ──────────────────────

export function extractJobsFromLinkedInText(
  text: string,
  companyName: string
): LinkedInJobSignal[] {
  const jobs: LinkedInJobSignal[] = [];

  // LinkedIn job cards have recognizable patterns in raw HTML/text
  // Pattern: job title lines, often followed by location and description
  
  // Look for job title patterns (capitalized, contains role keywords)
  const jobTitlePatterns = [
    // LinkedIn-specific: "Job Title" followed by "Company · Location"
    /(?:Senior|Junior|Lead|Principal|Staff|Associate|Head of|VP of|Director of|Manager of)?\s*(?:Software|Data|DevOps|Cloud|ML|AI|Frontend|Backend|Full[-\s]Stack|Sales|Marketing|Customer|Support|Product|Project|Program|Operations|Finance|HR|Security|Design)\s*(?:Engineer|Developer|Architect|Manager|Director|Analyst|Specialist|Representative|Executive|Consultant|Designer|Scientist|Lead)/gi,
    // General: any "Title at Company" format
    /([A-Z][\w\s]+(?:Engineer|Developer|Manager|Director|Analyst|Lead|Architect|Designer|Specialist|Consultant|Executive|Representative|Agent|Coordinator|Officer|Administrator|Strategist|Producer|Writer|Editor|Recruiter|Trainer|Coach|Assistant|Associate|Partner|President|Chief|VP|Head)(?:\s*(?:I{1,3}|Senior|Junior|Lead|Principal|Staff|Associate))?)/g,
  ];

  for (const pattern of jobTitlePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const title = match[0].trim();
      // Skip if too short or too long
      if (title.length < 5 || title.length > 80) continue;
      // Skip non-job titles
      if (/\b(?:the|and|for|with|from|this|that|have|been)\b/i.test(title)) continue;

      // Try to find location context near the job title
      const titleIndex = match.index;
      const contextWindow = text.slice(
        Math.max(0, titleIndex - 50),
        Math.min(text.length, titleIndex + title.length + 200)
      );
      
      const locationMatch = contextWindow.match(/(?:in|at|—|–|-)\s*([A-Z][a-zA-Z\s,]+?)(?:\s*(?:United States|US|Remote|Hybrid|On-site|Full-time|Part-time|Contract|·|\||$))/);
      const location = locationMatch ? locationMatch[1].trim() : '';

      const dept = inferDepartment(title);

      // Extract tech stack mentions from job description context
      const techMentions = TECH_STACK_TERMS.filter(tech =>
        contextWindow.toLowerCase().includes(tech.toLowerCase())
      );

      // Generate growth signal
      const growthSignal = generateGrowthSignal(title, dept);

      jobs.push({
        title,
        department: dept,
        location,
        techStackMentions: techMentions,
        growthSignal,
        nativelyImplication: generateNativelyImplication(title, dept, techMentions),
        confidence: techMentions.length > 0 ? 'Medium' : 'Low',
      });
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  return jobs.filter(j => {
    const key = j.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Extract company info from LinkedIn page ───────────────────

export function extractCompanyFromLinkedInText(
  text: string
): LinkedInCompanySignal {
  const growthIndicators: string[] = [];

  // Employee count
  let employeeRange = '';
  const empMatch = text.match(/(\d+[\s-]+\d+[\s,]*\+?\s*(?:employees?|staff|team\s+members?))/i);
  if (empMatch) employeeRange = empMatch[1].trim();
  else {
    const empRangeMatch = text.match(/(?:company\s+size|employees?)[:\s]*(\d+[\s-]+\d+[\s,]*\+?\s*(?:employees?)?)/i);
    if (empRangeMatch) employeeRange = empRangeMatch[1].trim();
  }

  // Industry
  let industry = '';
  const industryMatch = text.match(/(?:industry)[:\s]*([^•·\n]{3,60})/i);
  if (industryMatch) industry = industryMatch[1].trim();

  // Headquarters
  let headquarters = '';
  const hqMatch = text.match(/(?:headquarters?|HQ|based\s+in)[:\s]*([A-Z][a-zA-Z\s,]{3,60})/i);
  if (hqMatch) headquarters = hqMatch[1].trim();

  // Website
  let website: string | undefined;
  const webMatch = text.match(/(?:website)[:\s]*(https?:\/\/[^\s•·\n]{3,100})/i);
  if (webMatch) website = webMatch[1].trim();

  // Description — grab the first substantial paragraph
  let description = '';
  const descMatch = text.match(/(?:about|overview|description)[:\s]*([\s\S]{20,500}?)(?:\n\n|\n•|\n·|$)/i);
  if (descMatch) description = descMatch[1].trim();
  else {
    // Fallback: first paragraph over 50 chars
    const paragraphs = text.split(/\n{2,}/);
    const firstPara = paragraphs.find(p => p.length > 50 && p.length < 500);
    if (firstPara) description = firstPara.trim();
  }

  // Growth indicators
  if (text.match(/\b(?:growing|expanding|scaling|hiring\s+aggressively|rapidly\s+growing|fast[-\s]growing)\b/i)) {
    growthIndicators.push('Growth mentioned in company description');
  }
  if (text.match(/\b(?:series\s*[a-e]|funding|venture|backed|investors?)\b/i)) {
    growthIndicators.push('Funding/investor language detected');
  }
  if (text.match(/\b(?:award|recognized|named|top|best|leading)\b/i)) {
    growthIndicators.push('Awards/recognition language');
  }

  return {
    description,
    employeeRange,
    industry,
    headquarters,
    website,
    growthIndicators,
    confidence: description ? 'Medium' : 'Low',
  };
}

// ── Analyze job collection for patterns ──────────────────────

export function analyzeJobCollection(jobs: LinkedInJobSignal[]): {
  departmentHiring: Map<string, number>;
  dominantTechStack: string[];
  growthDepartments: string[];
  totalJobs: number;
  summary: string;
} {
  const departmentHiring = new Map<string, number>();
  const allTech = new Map<string, number>();

  for (const job of jobs) {
    departmentHiring.set(job.department, (departmentHiring.get(job.department) || 0) + 1);
    for (const tech of job.techStackMentions) {
      allTech.set(tech, (allTech.get(tech) || 0) + 1);
    }
  }

  const growthDepartments = Array.from(departmentHiring.entries())
    .filter(([, count]) => count >= 3)
    .map(([dept]) => dept);

  const dominantTechStack = Array.from(allTech.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tech]) => tech);

  const topDepartments = Array.from(departmentHiring.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([dept, count]) => `${dept} (${count})`)
    .join(', ');

  const summary = jobs.length === 0
    ? 'No job postings detected.'
    : `${jobs.length} public job postings found. Top hiring departments: ${topDepartments}. ${growthDepartments.length > 0 ? `Departments scaling: ${growthDepartments.join(', ')}.` : ''} ${dominantTechStack.length > 0 ? `Tech stack: ${dominantTechStack.slice(0, 5).join(', ')}.` : ''}`;

  return {
    departmentHiring,
    dominantTechStack,
    growthDepartments,
    totalJobs: jobs.length,
    summary,
  };
}

// ── Helper: Generate growth signal ───────────────────────────

function generateGrowthSignal(title: string, department: string): string {
  const lower = title.toLowerCase();
  if (/\bsenior\b/i.test(lower)) return `Hiring senior ${department} role — indicates existing junior team`;
  if (/\blead\b|\bprincipal\b|\bstaff\b/i.test(lower)) return `Hiring leadership ${department} role — building out the team`;
  if (/\bhead\b|\bdirector\b|\bvp\b/i.test(lower)) return `Hiring ${department} leadership — department expansion or reorg`;
  if (/\bjunior\b|\bassociate\b|\bentry\b/i.test(lower)) return `Hiring entry-level ${department} — scaling execution capacity`;
  return `Hiring ${department} role — team growth`;
}

function generateNativelyImplication(
  title: string,
  department: string,
  techStack: string[]
): string {
  const lower = title.toLowerCase();

  if (department === 'Sales') {
    return 'Growing sales team = likely scaling outreach. CRM automation, lead routing, and follow-up sequences are immediate opportunities.';
  }
  if (department === 'Customer Support') {
    return 'Growing support team = increasing customer base. AI chatbots, auto-responses, and ticket routing can reduce hiring needs.';
  }
  if (department === 'Technology' || department === 'Data & Analytics') {
    const hasCloud = techStack.some(t => ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'].includes(t));
    if (hasCloud) {
      return `Cloud-native tech team. Custom internal tools, dashboards, and automation are natural extensions of their stack.`;
    }
    return 'Technical team growth = engineering capacity. Custom tool builds and API integrations are low-friction entry points.';
  }
  if (department === 'Operations') {
    return 'Ops hiring = process scaling pain. Workflow automation, reporting dashboards, and approval systems are high-value entry points.';
  }
  if (department === 'Marketing') {
    return 'Marketing team growth = content and campaign scaling. Lead capture, content automation, and analytics dashboards are relevant.';
  }
  if (department === 'HR') {
    return 'HR hiring = onboarding and people ops scaling. Employee portals, onboarding automation, and HR workflows are relevant.';
  }
  if (department === 'Finance') {
    return 'Finance hiring = transaction and reporting volume. Invoicing automation, approval workflows, and reporting dashboards are relevant.';
  }

  if (lower.includes('engineer') || lower.includes('developer')) {
    return 'Engineering hire = build capacity. Internal tools and automation are natural extension of their existing development workflow.';
  }
  if (lower.includes('manager') || lower.includes('director')) {
    return 'Management hire = team scaling. Leadership often needs reporting dashboards and team workflow tools.';
  }

  return `${department} team growth indicates operational scaling — workflow automation can offset headcount needs.`;
}