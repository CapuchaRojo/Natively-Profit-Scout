// ============================================================
// Vibe Input Parser — Natural Language → Structured Company Data
// ============================================================
// Parses raw intel text (like the Vibe Generation brief) into
// structured company fields for auto-fill and creation.
// ============================================================

import type {
  CompanyBasic,
  CompanyBusiness,
  CompanyPeople,
  CompanyTools,
  WorkloadFriction,
  SalesContext,
  VerifiedStatus,
} from '../types';

// ============================================================
// Parsed Output
// ============================================================

export interface ParsedField {
  field: string;
  section: string;
  value: string;
  source: string; // The raw text snippet that produced this
  confidence: 'high' | 'medium' | 'low';
}

export interface VibeParsedCompany {
  basic: CompanyBasic;
  business: CompanyBusiness;
  people: CompanyPeople;
  tools: CompanyTools;
  workloadFriction: WorkloadFriction;
  salesContext: SalesContext;
  verifiedStatus: VerifiedStatus;
  // Extra fields not in the standard model
  relatedEntities: string;
  linkedInUrl: string;
  linkedInStatus: string;
  executiveContacts: { name: string; title: string; linkedIn?: string }[];
  teamMembers: { name: string; title: string }[];
  entityClassification: string;
  internalContext: string;
  scoutTask: string;
  evaluationCriteria: string[];
  risksAndUnknowns: string;
  parsedFields: ParsedField[];
  rawText: string;
}

// ============================================================
// URL extraction
// ============================================================

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s\n\r\)\]>,]+/g;
  return text.match(urlRegex) || [];
}

// ============================================================
// Key-value line extraction
// ============================================================

function extractKeyValuePairs(text: string): Map<string, string> {
  const pairs = new Map<string, string>();
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match patterns like "Key: Value" or "Key:Value"
    const match = trimmed.match(/^([A-Za-z][A-Za-z\s\/\-]+?):\s*(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();
      if (value && !pairs.has(key)) {
        pairs.set(key, value);
      }
    }
  }

  return pairs;
}

// ============================================================
// Person name + title extraction
// "Paolo Bonetti — CEO" or "Davide Locatelli — Partner"
// ============================================================

function extractPeopleWithTitles(text: string): { name: string; title: string }[] {
  const people: { name: string; title: string }[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match "- Name — Title" or "— Name — Title" or "Name — Title"
    const bulletMatch = trimmed.match(/^[-–—•]\s*([A-Z][a-zà-ü]+(?:\s+[A-Z][a-zà-ü]+)+)\s*[-–—]\s*(.+)$/);
    if (bulletMatch) {
      people.push({ name: bulletMatch[1].trim(), title: bulletMatch[2].trim() });
      continue;
    }
    // Match bare "Name — Title" (no bullet)
    const bareMatch = trimmed.match(/^([A-Z][a-zà-ü]+(?:\s+[A-Z][a-zà-ü]+)+)\s*[-–—]\s*(.+)$/);
    if (bareMatch && !trimmed.startsWith('http') && !trimmed.match(/^https?:\/\//)) {
      people.push({ name: bareMatch[1].trim(), title: bareMatch[2].trim() });
    }
  }

  return people;
}

// ============================================================
// LinkedIn URL extraction
// ============================================================

function extractLinkedInUrl(text: string): string {
  const urls = extractUrls(text);
  for (const url of urls) {
    if (url.includes('linkedin.com')) return url;
  }
  return '';
}

// ============================================================
// Section splitting
// ============================================================

interface TextSection {
  header: string;
  content: string;
}

function splitIntoSections(text: string): TextSection[] {
  const sections: TextSection[] = [];
  const lines = text.split('\n');

  let currentHeader = '_preamble';
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect section headers: lines ending with ":" that are short and don't look like key-value pairs
    const isSectionHeader =
      trimmed.length > 5 &&
      trimmed.length < 80 &&
      trimmed.endsWith(':') &&
      !trimmed.match(/^https?:\/\//) &&
      !trimmed.match(/^[A-Za-z][a-z]+:\s/) && // Not a key:value pair
      trimmed === trimmed.charAt(0).toUpperCase() + trimmed.slice(1); // Starts with capital

    if (isSectionHeader) {
      if (currentContent.length > 0) {
        sections.push({ header: currentHeader, content: currentContent.join('\n').trim() });
      }
      currentHeader = trimmed.slice(0, -1).trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Don't forget the last section
  if (currentContent.length > 0) {
    sections.push({ header: currentHeader, content: currentContent.join('\n').trim() });
  }

  return sections;
}

// ============================================================
// Numbered list extraction
// ============================================================

function extractNumberedList(text: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n');
  let currentItem = '';

  for (const line of lines) {
    const trimmed = line.trim();
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
    if (numMatch) {
      if (currentItem) items.push(currentItem.trim());
      currentItem = numMatch[2];
    } else if (currentItem && trimmed) {
      currentItem += ' ' + trimmed;
    }
  }
  if (currentItem) items.push(currentItem.trim());

  return items;
}

// ============================================================
// Bullet list extraction
// ============================================================

function extractBulletList(text: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[-–—•]\s/) && trimmed.length > 3) {
      items.push(trimmed.replace(/^[-–—•]\s*/, ''));
    }
  }

  return items;
}

// ============================================================
// Smart inference: extract structured fields from narrative text
// ============================================================

function inferIndustry(text: string, lowerText: string): string {
  const patterns: { regex: RegExp; industry: string }[] = [
    { regex: /digital\s+consultanc(?:y|ies)/i, industry: 'Digital Consultancy' },
    { regex: /AI[-\s]?(?:focused|native|powered|driven)/i, industry: 'AI & Technology' },
    { regex: /artificial\s+intelligence/i, industry: 'AI & Technology' },
    { regex: /software\s+(?:development|delivery)/i, industry: 'Software Development' },
    { regex: /consult(?:ing|ancy)\s+(?:firm|group|company|brand)/i, industry: 'Consulting' },
    { regex: /SaaS/i, industry: 'SaaS' },
    { regex: /fintech|financial\s+technology/i, industry: 'Fintech' },
    { regex: /healthcare|health\s+tech/i, industry: 'Healthcare' },
    { regex: /manufacturing/i, industry: 'Manufacturing' },
    { regex: /e[-\s]?commerce/i, industry: 'E-commerce' },
    { regex: /cyber\s*security/i, industry: 'Cybersecurity' },
    { regex: /marketing|advertising/i, industry: 'Marketing & Advertising' },
    { regex: /education|ed[-\s]?tech/i, industry: 'Education' },
    { regex: /real\s+estate|proptech/i, industry: 'Real Estate' },
    { regex: /logistics|supply\s+chain/i, industry: 'Logistics & Supply Chain' },
  ];

  for (const { regex, industry } of patterns) {
    if (regex.test(text)) return industry;
  }

  // Check for agency/consulting/service-firm patterns
  if (/agency|studio|firm|group/i.test(lowerText) && /digital|creative|design|strategy|technology/i.test(lowerText)) {
    return 'Digital Consultancy';
  }

  return '';
}

function inferLocation(text: string): string {
  const patterns: { regex: RegExp; location: string }[] = [
    { regex: /\bItaly\b/i, location: 'Italy' },
    { regex: /\bItalian\b/i, location: 'Italy' },
    { regex: /\bMilan\b/i, location: 'Milan, Italy' },
    { regex: /\bRome\b/i, location: 'Rome, Italy' },
    { regex: /\bTurin\b/i, location: 'Turin, Italy' },
    { regex: /\bSan Francisco\b/i, location: 'San Francisco, CA' },
    { regex: /\bNew York\b/i, location: 'New York, NY' },
    { regex: /\bLondon\b/i, location: 'London, UK' },
    { regex: /\bBerlin\b/i, location: 'Berlin, Germany' },
    { regex: /\bParis\b/i, location: 'Paris, France' },
    { regex: /\bAmsterdam\b/i, location: 'Amsterdam, Netherlands' },
    { regex: /\bSingapore\b/i, location: 'Singapore' },
    { regex: /\bSydney\b/i, location: 'Sydney, Australia' },
    { regex: /\bToronto\b/i, location: 'Toronto, Canada' },
  ];

  for (const { regex, location } of patterns) {
    if (regex.test(text)) return location;
  }

  return '';
}

function inferRevenue(text: string): string {
  // Match patterns like "€8M revenue", "$5-10M ARR", "more than €8M revenue"
  const revenueMatch = text.match(/(?:€|EUR|USD|\$)\s*([\d,.]+[KMB]?)\s*(?:revenue|ARR|MRR)/i);
  if (revenueMatch) {
    return `${revenueMatch[0].trim().replace(/\s+/g, ' ')}`;
  }
  // Match "€8M" or "$5M" standalone near "revenue"
  const moneyMatch = text.match(/(?:more\s+than\s+)?(?:€|EUR|USD|\$)\s*([\d,.]+[KMB])\s/i);
  if (moneyMatch) return moneyMatch[0].trim();
  return '';
}

function inferProductsServices(text: string): string {
  const phrases: string[] = [];

  // Look for descriptive paragraphs about what they do
  const servicesPatterns = [
    { regex: /focus(?:es)?\s+(?:appears\s+to\s+)?include\s+(.+?)(?:\.|$)/i, extract: true },
    { regex: /position(?:s|ing|ed)\s+(?:as|around)\s+(.+?)(?:\.|$)/i, extract: true },
    { regex: /speciali[sz](?:es|ing)\s+in\s+(.+?)(?:\.|$)/i, extract: true },
  ];

  for (const { regex, extract } of servicesPatterns) {
    const match = text.match(regex);
    if (match && extract && match[1]) {
      phrases.push(match[1].trim());
    }
  }

  // If nothing explicit, look for capability keywords
  if (phrases.length === 0) {
    const capabilities: string[] = [];
    const capMap: Record<string, string> = {
      'strategy': 'Strategy Consulting',
      'UI/UX': 'UI/UX Design',
      'technology': 'Technology Services',
      'AI': 'AI Solutions',
      'creativity': 'Creative Services',
      'performance': 'Performance Marketing',
      'KPI': 'KPI & Analytics',
      'brand': 'Brand Strategy',
      'growth': 'Growth Marketing',
      'digital transformation': 'Digital Transformation',
      'lead generation': 'Lead Generation',
      'digital ecosystems': 'Digital Ecosystems',
      'software': 'Software Development',
      'platforms': 'Platform Development',
      'data': 'Data & Analytics',
      '3D': '3D & Immersive',
      'automation': 'Intelligent Automation',
      'voice': 'Voice Solutions',
    };
    for (const [keyword, label] of Object.entries(capMap)) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        capabilities.push(label);
      }
    }
    if (capabilities.length > 0) {
      return capabilities.slice(0, 8).join(', ');
    }
  }

  return phrases.join('; ');
}

function inferSalesModel(text: string): string {
  const lowerText = text.toLowerCase();
  const signals: string[] = [];

  if (/enterprise|B2B|b2b|business[-\s]to[-\s]business/i.test(text)) signals.push('B2B Enterprise');
  if (/SMB|small\s+business|mid[-\s]market/i.test(text)) signals.push('SMB/Mid-Market');
  if (/partner[-\s]?led|channel|reseller/i.test(text)) signals.push('Partner/Channel');
  if (/inbound|content\s+marketing|SEO/i.test(text)) signals.push('Inbound');
  if (/outbound|sales\s+team|SDR/i.test(text)) signals.push('Outbound');
  if (/product[-\s]led|PLG|self[-\s]serve/i.test(text)) signals.push('Product-Led');
  if (/consult(?:ing|ative)\s+sales|advisory/i.test(text)) signals.push('Consultative');
  if (/hackathons?|community|developer[-\s]?led/i.test(text)) signals.push('Community/Developer-Led');

  if (signals.length === 0 && /consultancy|agency|consulting|delivery/i.test(text)) {
    signals.push('Consultative / Relationship-Based');
  }

  return signals.length > 0 ? signals.join(', ') : '';
}

// ============================================================
// Main parser
// ============================================================

const emptyBasic: CompanyBasic = {
  name: '', website: '', industry: '', location: '', employeeCount: 0,
  revenueEstimate: '', notes: '',
};

const emptyBusiness: CompanyBusiness = {
  productsServices: '', targetCustomers: '', salesModel: '',
  deliveryModel: '', supportModel: '', operationsModel: '',
};

const emptyPeople: CompanyPeople = {
  leadership: '', salesTeam: '', technicalTeam: '', operationsTeam: '',
  supportTeam: '', financeAdmin: '', knownChampions: '', knownBlockers: '',
  unknownDecisionMaker: '',
};

const emptyTools: CompanyTools = {
  crm: '', websitePlatform: '', schedulingTools: '', emailTools: '',
  projectManagement: '', communicationTools: '', supportTools: '',
  billingTools: '', automationTools: '', aiTools: '', securityTools: '',
  unknownTools: '',
};

const emptyFriction: WorkloadFriction = {
  dailyRepeats: '', manualCopyPaste: '', delays: '', customerWait: '',
  employeeTimeWaste: '', missedRevenue: '', errors: '', complianceRisk: '',
  softwareCouldAssist: '',
};

const emptyContext: SalesContext = {
  approachReason: '', likelyBusinessPain: '', desiredResult: '',
  budgetOwner: '', painFeeler: '', dealBlocker: '', dealChampion: '',
};

export function parseVibeInput(rawText: string): VibeParsedCompany {
  const parsedFields: ParsedField[] = [];
  const addField = (field: string, section: string, value: string, source: string, confidence: 'high' | 'medium' | 'low' = 'medium') => {
    if (value) {
      parsedFields.push({ field, section, value, source, confidence });
    }
  };

  const text = rawText.trim();
  const lowerText = text.toLowerCase();
  const kvPairs = extractKeyValuePairs(text);
  const urls = extractUrls(text);
  const people = extractPeopleWithTitles(text);
  const sections = splitIntoSections(text);
  const linkedInUrl = extractLinkedInUrl(text);

  // ── Company Name ──────────────────────────────────────────
  let companyName = kvPairs.get('company') || kvPairs.get('company name') || '';
  if (!companyName) {
    // Try to find it in the first few lines
    const firstLine = text.split('\n')[0]?.trim() || '';
    const nameMatch = firstLine.match(/^Company:?\s*(.+)$/i);
    if (nameMatch) companyName = nameMatch[1].trim();
  }
  addField('basic.name', 'Company', companyName, 'First line / key-value', companyName ? 'high' : 'low');

  // ── Website ───────────────────────────────────────────────
  let website = kvPairs.get('website') || '';
  if (!website) {
    for (const url of urls) {
      if (!url.includes('linkedin.com')) {
        website = url;
        break;
      }
    }
  }
  addField('basic.website', 'Company', website, 'URL extraction', website ? 'high' : 'low');

  // ── LinkedIn ──────────────────────────────────────────────
  const linkedInStatus = kvPairs.get('linkedin') || '';
  addField('linkedInStatus', 'Company', linkedInStatus, 'Key-value', linkedInStatus ? 'high' : 'low');

  // ── Industry ──────────────────────────────────────────────
  let industry = kvPairs.get('industry') || '';
  if (!industry) {
    industry = inferIndustry(text, lowerText);
    if (industry) addField('basic.industry', 'Company', industry, 'Inferred from context', 'medium');
  } else {
    addField('basic.industry', 'Company', industry, 'Key-value', 'medium');
  }

  // ── Location ──────────────────────────────────────────────
  let location = kvPairs.get('location') || kvPairs.get('headquarters') || '';
  if (!location) {
    location = inferLocation(text);
    if (location) addField('basic.location', 'Company', location, 'Inferred from context', 'medium');
  } else {
    addField('basic.location', 'Company', location, 'Key-value', 'medium');
  }

  // ── Employee Count ────────────────────────────────────────
  const empStr = kvPairs.get('employee count') || kvPairs.get('employees') || kvPairs.get('team size') || '';
  let employeeCount = parseInt(empStr) || 0;
  // Also try to infer from text like "90+ digital professionals"
  if (employeeCount === 0) {
    const teamMatch = text.match(/(\d+)\+?\s+(?:digital\s+)?professionals/i);
    if (teamMatch) employeeCount = parseInt(teamMatch[1]);
  }
  if (employeeCount > 0) {
    addField('basic.employeeCount', 'Company', String(employeeCount), 'Key-value / inference', 'medium');
  }

  // ── Revenue ───────────────────────────────────────────────
  let revenue = kvPairs.get('revenue') || kvPairs.get('revenue estimate') || '';
  if (!revenue) {
    revenue = inferRevenue(text);
    if (revenue) addField('basic.revenueEstimate', 'Company', revenue, 'Inferred from context', 'medium');
  } else {
    addField('basic.revenueEstimate', 'Company', revenue, 'Key-value', 'medium');
  }

  // ── Products/Services ─────────────────────────────────────
  let productsServices = kvPairs.get('products/services') || kvPairs.get('products') || kvPairs.get('services') || '';
  if (!productsServices) {
    productsServices = inferProductsServices(text);
    if (productsServices) addField('business.productsServices', 'Business', productsServices, 'Inferred from context', 'medium');
  } else {
    addField('business.productsServices', 'Business', productsServices, 'Key-value', 'medium');
  }

  // ── Sales Model ───────────────────────────────────────────
  let salesModel = kvPairs.get('sales model') || kvPairs.get('sales') || '';
  if (!salesModel) {
    salesModel = inferSalesModel(text);
    if (salesModel) addField('business.salesModel', 'Business', salesModel, 'Inferred from context', 'low');
  } else {
    addField('business.salesModel', 'Business', salesModel, 'Key-value', 'medium');
  }

  // ── Related Entities ──────────────────────────────────────
  let relatedEntities = kvPairs.get('related company / parent ecosystem') ||
    kvPairs.get('related company') || kvPairs.get('parent ecosystem') || '';
  addField('relatedEntities', 'Company', relatedEntities, 'Key-value', relatedEntities ? 'high' : 'low');

  // ── Entity Classification ─────────────────────────────────
  let entityClassification = kvPairs.get('classify as') || '';
  addField('entityClassification', 'Company', entityClassification, 'Key-value', entityClassification ? 'high' : 'low');

  // ── Executive Contacts ────────────────────────────────────
  let executiveContacts: { name: string; title: string; linkedIn?: string }[] = [];
  const primaryExec = kvPairs.get('primary executive contact') || '';
  if (primaryExec) {
    executiveContacts.push({ name: primaryExec, title: 'Primary Contact' });
    addField('executiveContacts', 'People', primaryExec, 'Key-value', 'high');
  }

  // ── Team Members ──────────────────────────────────────────
  const teamMembers = extractPeopleWithTitles(text);
  if (teamMembers.length > 0) {
    addField('people.leadership', 'People', teamMembers.map(p => `${p.name} — ${p.title}`).join('\n'), 'Name-title pattern', 'high');
  }

  // ── Internal Context ──────────────────────────────────────
  let internalContext = '';
  // Look for "Context from Andrea:" or similar
  for (const section of sections) {
    if (section.header.toLowerCase().includes('context from') ||
        section.header.toLowerCase().includes('internal context') ||
        section.header.toLowerCase().includes('internal notes')) {
      internalContext = section.content;
      addField('internalContext', 'Internal', internalContext, 'Section extraction', 'high');
    }
  }

  // ── Scout Task ────────────────────────────────────────────
  let scoutTask = '';
  for (const section of sections) {
    if (section.header.toLowerCase().includes('scout task') ||
        section.header.toLowerCase().includes('task')) {
      scoutTask = section.content;
      addField('scoutTask', 'Task', scoutTask, 'Section extraction', 'high');
    }
  }

  // ── Evaluation Criteria ───────────────────────────────────
  let evaluationCriteria: string[] = [];
  for (const section of sections) {
    if (section.header.toLowerCase().includes('evaluate')) {
      evaluationCriteria = extractNumberedList(section.content);
      if (evaluationCriteria.length > 0) {
        addField('evaluationCriteria', 'Evaluation', evaluationCriteria.join(' | '), 'Numbered list extraction', 'high');
      }
    }
  }

  // ── Risks and Unknowns ────────────────────────────────────
  let risksAndUnknowns = '';
  for (const section of sections) {
    if (section.header.toLowerCase().includes('risk') ||
        section.header.toLowerCase().includes('unknown')) {
      risksAndUnknowns = section.content;
      addField('risksAndUnknowns', 'Risks', risksAndUnknowns, 'Section extraction', 'high');
    }
  }

  // ── Build basic notes from all context ────────────────────
  const notesParts: string[] = [];
  if (linkedInStatus) notesParts.push(`LinkedIn: ${linkedInStatus}`);
  if (relatedEntities) notesParts.push(`Related: ${relatedEntities}`);
  if (entityClassification) notesParts.push(`Classification: ${entityClassification}`);
  if (internalContext) notesParts.push(`Internal context: ${internalContext}`);
  const notes = notesParts.join('\n\n');

  // ── Build sales context from scout task and evaluation ────
  let approachReason = '';
  let likelyBusinessPain = '';
  let desiredResult = '';

  if (scoutTask) {
    approachReason = scoutTask.split('\n')[0]?.trim() || '';
    // Try to extract pain points from evaluation criteria
    if (evaluationCriteria.length > 0) {
      likelyBusinessPain = evaluationCriteria.slice(0, 3).join('; ');
      desiredResult = evaluationCriteria.slice(0, 2).join('; ');
    }
  }

  // ── Build leadership text ─────────────────────────────────
  let leadershipText = '';
  if (executiveContacts.length > 0) {
    leadershipText = executiveContacts.map(c => `${c.name} — ${c.title}`).join('\n');
  }
  if (teamMembers.length > 0) {
    if (leadershipText) leadershipText += '\n';
    leadershipText += teamMembers.map(p => `${p.name} — ${p.title}`).join('\n');
  }

  // ── Build people text from all people mentions ────────────
  const allPeopleNames = [
    ...executiveContacts.map(c => c.name),
    ...teamMembers.map(p => p.name),
  ];

  // ── Detect tool mentions ──────────────────────────────────
  const toolKeywords: Record<string, string[]> = {
    aiTools: ['lovable', 'cursor', 'copilot', 'chatgpt', 'claude', 'vibe-coding', 'vibe coding', 'bolt', 'v0', 'replit'],
    crm: ['hubspot', 'salesforce', 'pipedrive', 'crm'],
    automationTools: ['zapier', 'make.com', 'n8n', 'automation'],
    emailTools: ['gmail', 'outlook', 'google workspace', 'microsoft 365'],
    communicationTools: ['slack', 'teams', 'discord'],
    projectManagement: ['jira', 'asana', 'linear', 'monday', 'notion', 'trello'],
  };

  const detectedTools: CompanyTools = { ...emptyTools };

  // Detect AI tools
  const aiToolsFound: string[] = [];
  for (const kw of toolKeywords.aiTools) {
    if (lowerText.includes(kw)) aiToolsFound.push(kw);
  }
  if (aiToolsFound.length > 0) {
    detectedTools.aiTools = aiToolsFound.join(', ');
    addField('tools.aiTools', 'Tools', detectedTools.aiTools, 'Keyword detection', 'medium');
  }

  // Detect CRM
  for (const kw of toolKeywords.crm) {
    if (lowerText.includes(kw)) {
      detectedTools.crm = kw;
      addField('tools.crm', 'Tools', kw, 'Keyword detection', 'medium');
      break;
    }
  }

  // ── Verify status ─────────────────────────────────────────
  let verifiedStatus: VerifiedStatus = 'unknown';
  if (internalContext && internalContext.toLowerCase().includes('pending confirmation')) {
    verifiedStatus = 'internal_context_pending_confirmation';
  } else if (text.toLowerCase().includes('not publicly verified') || text.toLowerCase().includes('not verified')) {
    verifiedStatus = 'inferred';
  } else if (urls.length > 0 && companyName) {
    verifiedStatus = 'inferred';
  }
  addField('verifiedStatus', 'Meta', verifiedStatus, 'Context analysis', 'medium');

  // ── Assemble the parsed company ───────────────────────────
  const result: VibeParsedCompany = {
    basic: {
      name: companyName,
      website,
      industry,
      location,
      employeeCount,
      revenueEstimate: revenue,
      notes,
    },
    business: {
      ...emptyBusiness,
      productsServices,
      salesModel,
    },
    people: {
      ...emptyPeople,
      leadership: leadershipText,
    },
    tools: detectedTools,
    workloadFriction: emptyFriction,
    salesContext: {
      approachReason,
      likelyBusinessPain,
      desiredResult,
      budgetOwner: '',
      painFeeler: '',
      dealBlocker: '',
      dealChampion: '',
    },
    verifiedStatus,
    relatedEntities,
    linkedInUrl,
    linkedInStatus,
    executiveContacts,
    teamMembers,
    entityClassification,
    internalContext,
    scoutTask,
    evaluationCriteria,
    risksAndUnknowns,
    parsedFields,
    rawText: text,
  };

  return result;
}

// ============================================================
// Quick summary generation for the preview
// ============================================================

export function generateVibeSummary(parsed: VibeParsedCompany): string {
  const parts: string[] = [];

  if (parsed.basic.name) {
    parts.push(`🏢 **${parsed.basic.name}**`);
  }
  if (parsed.basic.industry) {
    parts.push(`🏭 ${parsed.basic.industry}`);
  }
  if (parsed.basic.location) {
    parts.push(`📍 ${parsed.basic.location}`);
  }
  if (parsed.basic.revenueEstimate) {
    parts.push(`💰 ${parsed.basic.revenueEstimate}`);
  }
  if (parsed.business.productsServices) {
    parts.push(`📦 ${parsed.business.productsServices}`);
  }
  if (parsed.business.salesModel) {
    parts.push(`💼 ${parsed.business.salesModel}`);
  }
  if (parsed.basic.website) {
    parts.push(`🌐 ${parsed.basic.website}`);
  }
  if (parsed.linkedInUrl) {
    parts.push(`🔗 ${parsed.linkedInUrl}`);
  }
  if (parsed.executiveContacts.length > 0) {
    parts.push(`👤 Primary: ${parsed.executiveContacts.map(c => c.name).join(', ')}`);
  }
  if (parsed.teamMembers.length > 0) {
    parts.push(`👥 Team: ${parsed.teamMembers.length} members detected`);
  }
  if (parsed.relatedEntities) {
    parts.push(`🔗 Related: ${parsed.relatedEntities}`);
  }
  if (parsed.evaluationCriteria.length > 0) {
    parts.push(`📋 ${parsed.evaluationCriteria.length} evaluation criteria`);
  }
  if (parsed.verifiedStatus !== 'unknown') {
    parts.push(`✅ Status: ${parsed.verifiedStatus.replace(/_/g, ' ')}`);
  }
  if (parsed.tools.aiTools) {
    parts.push(`🤖 AI Tools: ${parsed.tools.aiTools}`);
  }

  return parts.join('\n');
}