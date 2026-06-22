// ============================================================
// Tool Fingerprinting Engine
// Deterministic public website tool detection
// ============================================================
import type { DetectedTool, ConfidenceLevel } from '../types';

// ─── Fingerprint Definitions ────────────────────────────────────

interface Fingerprint {
  toolName: string;
  category: string;
  check: (html: string, scripts: string[], links: string[], text: string) => { detected: boolean; evidence: string };
  likelyDepartment: string;
  possibleWorkflow: string;
  possiblePain: string;
  nativelyOpportunity: string;
}

const fingerprints: Fingerprint[] = [
  // ─── Website / CMS ──────────────────────────────────────────
  {
    toolName: 'WordPress',
    category: 'CMS',
    check: (html, scripts, links) => {
      if (/wp-content|wp-includes|wordpress/i.test(html)) return { detected: true, evidence: 'wp-content / wp-includes detected' };
      if (scripts.some(s => /wp-content|wp-includes/i.test(s))) return { detected: true, evidence: 'WordPress script path' };
      if (/-generator" content="WordPress/i.test(html)) return { detected: true, evidence: 'Meta generator: WordPress' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Content publishing', possiblePain: 'Manual content updates', nativelyOpportunity: 'Headless CMS / content engine',
  },
  {
    toolName: 'Webflow',
    category: 'CMS',
    check: (html) => {
      if (/Webflow/i.test(html) && /wf-page|webflow\.js/i.test(html)) return { detected: true, evidence: 'Webflow script / page marker' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Website management', possiblePain: 'Limited backend automation', nativelyOpportunity: 'Custom backend integration',
  },
  {
    toolName: 'Wix',
    category: 'CMS',
    check: (html, scripts) => {
      if (/Wix\.com|wix\.com/i.test(html)) return { detected: true, evidence: 'Wix.com domain reference' };
      if (scripts.some(s => /wix\.com/i.test(s))) return { detected: true, evidence: 'Wix script reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Website management', possiblePain: 'Limited customization', nativelyOpportunity: 'Custom solution replacing Wix limitations',
  },
  {
    toolName: 'Squarespace',
    category: 'CMS',
    check: (html) => {
      if (/Squarespace/i.test(html) && (/static[12]\.squarespace/i.test(html) || /squarespace\.com/i.test(html))) return { detected: true, evidence: 'Squarespace static assets' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Website management', possiblePain: 'Limited integrations', nativelyOpportunity: 'Custom integrations',
  },
  {
    toolName: 'Shopify',
    category: 'E-commerce',
    check: (html, scripts) => {
      if (/shopify/i.test(html) && /myshopify\.com|cdn\.shopify/i.test(html)) return { detected: true, evidence: 'Shopify CDN / store domain' };
      if (scripts.some(s => /cdn\.shopify/i.test(s))) return { detected: true, evidence: 'Shopify script reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Sales', possibleWorkflow: 'E-commerce / order processing', possiblePain: 'Manual order processing / inventory sync', nativelyOpportunity: 'Automated order-to-CRM sync',
  },
  {
    toolName: 'Framer',
    category: 'CMS',
    check: (html) => {
      if (/framer\.com|framer\.js/i.test(html)) return { detected: true, evidence: 'Framer reference detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Website prototyping', possiblePain: 'Static site — no backend', nativelyOpportunity: 'Add backend workflows',
  },
  {
    toolName: 'Ghost',
    category: 'CMS',
    check: (html) => {
      if (/ghost|ghost\.org/i.test(html) && /ghost(\.io|\.org)/i.test(html)) return { detected: true, evidence: 'Ghost CMS reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Content / blog publishing', possiblePain: 'Limited automation', nativelyOpportunity: 'Content automation engine',
  },
  {
    toolName: 'HubSpot CMS',
    category: 'CMS',
    check: (html) => {
      if (/hubspot/i.test(html) && (/hs-scripts|hs-analytics|js\.hs-scripts/i.test(html) || /HubSpot/i.test(html))) return { detected: true, evidence: 'HubSpot scripts detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'CRM / marketing automation', possiblePain: 'Rigid templates, high cost', nativelyOpportunity: 'Custom CRM + content',
  },

  // ─── Analytics / Tracking ──────────────────────────────────
  {
    toolName: 'Google Analytics',
    category: 'Analytics',
    check: (html, scripts) => {
      if (/gtag|google-analytics|ga\.js|analytics\.js/i.test(html)) return { detected: true, evidence: 'Google Analytics snippet' };
      if (scripts.some(s => /google-analytics|googletagmanager/i.test(s))) return { detected: true, evidence: 'GA script reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Web analytics', possiblePain: 'Data silos — no action from analytics', nativelyOpportunity: 'Unified dashboard with GA data',
  },
  {
    toolName: 'Google Tag Manager',
    category: 'Analytics',
    check: (html) => {
      if (/googletagmanager\.com/i.test(html) && /GTM-/i.test(html)) return { detected: true, evidence: 'GTM container ID detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Tag management', possiblePain: 'Complex tag management', nativelyOpportunity: 'Simplified event tracking',
  },
  {
    toolName: 'Meta Pixel',
    category: 'Analytics',
    check: (html) => {
      if (/facebook\.com\/tr|fbq\(|meta\.com\/tr/i.test(html)) return { detected: true, evidence: 'Meta/Facebook Pixel detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Ad tracking', possiblePain: 'Ad attribution gaps', nativelyOpportunity: 'Full funnel analytics',
  },
  {
    toolName: 'LinkedIn Insight Tag',
    category: 'Analytics',
    check: (html) => {
      if (/linkedin\.com\/insight|_linkedin_partner|insight\.linkedin/i.test(html)) return { detected: true, evidence: 'LinkedIn Insight tag detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'B2B ad tracking', possiblePain: 'Limited B2B attribution', nativelyOpportunity: 'LinkedIn-to-CRM lead sync',
  },
  {
    toolName: 'Microsoft Clarity',
    category: 'Analytics',
    check: (html) => {
      if (/clarity\.ms|clarity/i.test(html) && /clarity\.com/i.test(html)) return { detected: true, evidence: 'Clarity script detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'User behavior analytics', possiblePain: 'Data not actionable', nativelyOpportunity: 'Behavior-driven automation',
  },
  {
    toolName: 'Hotjar',
    category: 'Analytics',
    check: (html) => {
      if (/hotjar\.com|hotjar/i.test(html) && /static\.hotjar/i.test(html)) return { detected: true, evidence: 'Hotjar script detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'UX / behavior analytics', possiblePain: 'Manual UX analysis', nativelyOpportunity: 'Automated UX improvement tracking',
  },
  {
    toolName: 'PostHog',
    category: 'Analytics',
    check: (html) => {
      if (/posthog\.com|posthog\.js|ph\.capture/i.test(html)) return { detected: true, evidence: 'PostHog script detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Product', possibleWorkflow: 'Product analytics', possiblePain: 'Product usage tracking gaps', nativelyOpportunity: 'Product analytics dashboard',
  },
  {
    toolName: 'Segment',
    category: 'Analytics',
    check: (html, scripts) => {
      if (/cdn\.segment\.com|analytics\.segment/i.test(html)) return { detected: true, evidence: 'Segment CDN reference' };
      if (scripts.some(s => /segment\.com/i.test(s))) return { detected: true, evidence: 'Segment script reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Data/Product', possibleWorkflow: 'Customer data pipeline', possiblePain: 'Data fragmentation', nativelyOpportunity: 'Unified data pipeline',
  },

  // ─── CRM / Marketing ────────────────────────────────────────
  {
    toolName: 'HubSpot',
    category: 'CRM',
    check: (html, scripts) => {
      if (/js\.hs-scripts|hubspot|hs-analytics/i.test(html)) return { detected: true, evidence: 'HubSpot forms / analytics detected' };
      if (scripts.some(s => /hs-scripts|hubspot/i.test(s))) return { detected: true, evidence: 'HubSpot script reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Sales/Marketing', possibleWorkflow: 'CRM + marketing automation', possiblePain: 'Costly, complex configuration', nativelyOpportunity: 'Custom CRM / lead management',
  },
  {
    toolName: 'Salesforce',
    category: 'CRM',
    check: (html) => {
      if (/salesforce\.com|force\.com|sfdc/i.test(html)) return { detected: true, evidence: 'Salesforce URL reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Sales', possibleWorkflow: 'CRM / pipeline management', possiblePain: 'Complex, expensive, low adoption', nativelyOpportunity: 'Simplified custom CRM',
  },
  {
    toolName: 'Marketo',
    category: 'Marketing',
    check: (html) => {
      if (/marketo\.com|mktodl|munchkin/i.test(html)) return { detected: true, evidence: 'Marketo forms / tracking detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Marketing automation', possiblePain: 'High complexity, low utilization', nativelyOpportunity: 'Simpler marketing automation',
  },
  {
    toolName: 'Mailchimp',
    category: 'Marketing',
    check: (html) => {
      if (/mailchimp\.com|list-manage\.com/i.test(html)) return { detected: true, evidence: 'Mailchimp form/embed detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Email marketing', possiblePain: 'Basic automation, limited segmentation', nativelyOpportunity: 'Advanced email automation',
  },
  {
    toolName: 'Klaviyo',
    category: 'Marketing',
    check: (html) => {
      if (/klaviyo\.com|klaviyo/i.test(html) && /static\.klaviyo/i.test(html)) return { detected: true, evidence: 'Klaviyo script detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Email / SMS marketing', possiblePain: 'E-commerce focused — limited B2B', nativelyOpportunity: 'B2B email automation',
  },
  {
    toolName: 'ActiveCampaign',
    category: 'Marketing',
    check: (html) => {
      if (/activecampaign\.com|activecampaign/i.test(html)) return { detected: true, evidence: 'ActiveCampaign reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Email + CRM', possiblePain: 'Limited workflow automation', nativelyOpportunity: 'Advanced automation',
  },
  {
    toolName: 'Pipedrive',
    category: 'CRM',
    check: (html) => {
      if (/pipedrive\.com|pipedrive/i.test(html)) return { detected: true, evidence: 'Pipedrive reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Sales', possibleWorkflow: 'Pipeline management', possiblePain: 'Limited automation', nativelyOpportunity: 'Custom pipeline automation',
  },
  {
    toolName: 'Zoho',
    category: 'CRM',
    check: (html) => {
      if (/zoho\.com|zohocrm|zoho/i.test(html) && /zoho\.com/i.test(html)) return { detected: true, evidence: 'Zoho CRM reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Sales', possibleWorkflow: 'CRM', possiblePain: 'Complex setup, limited AI', nativelyOpportunity: 'Simpler AI-powered CRM',
  },

  // ─── Support / Chat ─────────────────────────────────────────
  {
    toolName: 'Intercom',
    category: 'Support',
    check: (html) => {
      if (/intercom\.io|intercom/i.test(html) && /widget\.intercom/i.test(html)) return { detected: true, evidence: 'Intercom widget detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Support', possibleWorkflow: 'Live chat / support', possiblePain: 'High cost at scale', nativelyOpportunity: 'Custom AI chat + knowledge base',
  },
  {
    toolName: 'Zendesk',
    category: 'Support',
    check: (html) => {
      if (/zendesk\.com|zopim|zendesk/i.test(html)) return { detected: true, evidence: 'Zendesk reference detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Support', possibleWorkflow: 'Support ticketing', possiblePain: 'Complex setup, costly', nativelyOpportunity: 'Simpler custom support system',
  },
  {
    toolName: 'Drift',
    category: 'Support',
    check: (html) => {
      if (/drift\.com|drift/i.test(html) && /js\.drift\.com/i.test(html)) return { detected: true, evidence: 'Drift script detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Sales/Support', possibleWorkflow: 'Conversational marketing', possiblePain: 'Limited automation', nativelyOpportunity: 'AI sales chat',
  },
  {
    toolName: 'Tawk.to',
    category: 'Support',
    check: (html) => {
      if (/tawk\.to|tawk/i.test(html)) return { detected: true, evidence: 'Tawk.to widget detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Support', possibleWorkflow: 'Free live chat', possiblePain: 'No AI, manual responses', nativelyOpportunity: 'AI chat upgrade',
  },
  {
    toolName: 'Crisp',
    category: 'Support',
    check: (html) => {
      if (/crisp\.chat|crisp/i.test(html)) return { detected: true, evidence: 'Crisp chat detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Support', possibleWorkflow: 'Live chat', possiblePain: 'Limited features on free plan', nativelyOpportunity: 'Full support automation',
  },
  {
    toolName: 'Freshdesk',
    category: 'Support',
    check: (html) => {
      if (/freshdesk\.com|freshdesk/i.test(html)) return { detected: true, evidence: 'Freshdesk reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Support', possibleWorkflow: 'Support ticketing', possiblePain: 'Limited automation', nativelyOpportunity: 'Custom support + AI',
  },
  {
    toolName: 'Help Scout',
    category: 'Support',
    check: (html) => {
      if (/helpscout\.net|helpscout/i.test(html)) return { detected: true, evidence: 'Help Scout reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Support', possibleWorkflow: 'Support email', possiblePain: 'No live chat on basic plan', nativelyOpportunity: 'Full support platform',
  },

  // ─── Scheduling / Forms ─────────────────────────────────────
  {
    toolName: 'Calendly',
    category: 'Scheduling',
    check: (html) => {
      if (/calendly\.com|calendly/i.test(html)) return { detected: true, evidence: 'Calendly embed / link detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Sales', possibleWorkflow: 'Meeting scheduling', possiblePain: 'No CRM sync on basic plan', nativelyOpportunity: 'Branded scheduling + CRM sync',
  },
  {
    toolName: 'Typeform',
    category: 'Forms',
    check: (html) => {
      if (/typeform\.com|typeform/i.test(html) && /form\.typeform/i.test(html)) return { detected: true, evidence: 'Typeform embed detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Lead capture forms', possiblePain: 'Data silo — responses not auto-routed', nativelyOpportunity: 'Form + CRM routing',
  },
  {
    toolName: 'Jotform',
    category: 'Forms',
    check: (html) => {
      if (/jotform\.com|jotform/i.test(html)) return { detected: true, evidence: 'Jotform embed detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Form builder', possiblePain: 'Basic automation', nativelyOpportunity: 'Smart form routing',
  },
  {
    toolName: 'Google Forms',
    category: 'Forms',
    check: (html) => {
      if (/docs\.google\.com\/forms/i.test(html)) return { detected: true, evidence: 'Google Forms link detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'All', possibleWorkflow: 'Data collection', possiblePain: 'No routing, manual processing', nativelyOpportunity: 'Automated form intake',
  },
  {
    toolName: 'Tally',
    category: 'Forms',
    check: (html) => {
      if (/tally\.so|tally/i.test(html) && /tally\.so/i.test(html)) return { detected: true, evidence: 'Tally form detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Marketing', possibleWorkflow: 'Form building', possiblePain: 'No native CRM routing', nativelyOpportunity: 'Form + workflow',
  },

  // ─── Payments / E-commerce ──────────────────────────────────
  {
    toolName: 'Stripe',
    category: 'Payments',
    check: (html) => {
      if (/stripe\.com|stripe/i.test(html) && /js\.stripe\.com|stripe\.js/i.test(html)) return { detected: true, evidence: 'Stripe.js detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Finance', possibleWorkflow: 'Payment processing', possiblePain: 'Manual reconciliation', nativelyOpportunity: 'Automated invoicing + reconciliation',
  },
  {
    toolName: 'PayPal',
    category: 'Payments',
    check: (html) => {
      if (/paypal\.com|paypal/i.test(html) && /paypalobjects\.com|paypal\.com/i.test(html)) return { detected: true, evidence: 'PayPal button / reference detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Finance', possibleWorkflow: 'Payment processing', possiblePain: 'Limited automation', nativelyOpportunity: 'Payment automation',
  },
  {
    toolName: 'WooCommerce',
    category: 'E-commerce',
    check: (html) => {
      if (/woocommerce|woo/i.test(html) && /woocommerce\.com|wc-/i.test(html)) return { detected: true, evidence: 'WooCommerce reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Sales', possibleWorkflow: 'E-commerce', possiblePain: 'Manual order management', nativelyOpportunity: 'Order automation',
  },
  {
    toolName: 'Square',
    category: 'Payments',
    check: (html) => {
      if (/square\.com|square/i.test(html) && /squareup\.com|square\.com/i.test(html)) return { detected: true, evidence: 'Square reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Finance', possibleWorkflow: 'Payment processing', possiblePain: 'Limited online automation', nativelyOpportunity: 'Online payment automation',
  },

  // ─── Product / Dev / Infra ──────────────────────────────────
  {
    toolName: 'GitHub',
    category: 'Dev',
    check: (html) => {
      if (/github\.com/i.test(html) && /github\.com\/(?!.*\.com)/i.test(html)) return { detected: true, evidence: 'GitHub link detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Technology', possibleWorkflow: 'Code / version control', possiblePain: 'Manual deployment', nativelyOpportunity: 'CI/CD automation',
  },
  {
    toolName: 'Jira',
    category: 'Dev',
    check: (html) => {
      if (/atlassian\.net|jira|atlassian\.com/i.test(html)) return { detected: true, evidence: 'Atlassian/Jira reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Technology', possibleWorkflow: 'Project / issue tracking', possiblePain: 'Complex workflows', nativelyOpportunity: 'Simplified project automation',
  },
  {
    toolName: 'Notion',
    category: 'Productivity',
    check: (html) => {
      if (/notion\.so|notion/i.test(html) && /notion\.so/i.test(html)) return { detected: true, evidence: 'Notion reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'All', possibleWorkflow: 'Knowledge / docs', possiblePain: 'No native automation', nativelyOpportunity: 'Connected knowledge automation',
  },
  {
    toolName: 'Airtable',
    category: 'Productivity',
    check: (html) => {
      if (/airtable\.com|airtable/i.test(html)) return { detected: true, evidence: 'Airtable reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Operations', possibleWorkflow: 'Database / spreadsheets', possiblePain: 'Manual data entry', nativelyOpportunity: 'Automated database',
  },
  {
    toolName: 'Cloudflare',
    category: 'Infrastructure',
    check: (html) => {
      if (/cloudflare\.com|cloudflare/i.test(html) && /cdn-cgi\/|cloudflare-nginx|__cfduid/i.test(html)) return { detected: true, evidence: 'Cloudflare detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Technology', possibleWorkflow: 'CDN / security', possiblePain: 'Limited config visibility', nativelyOpportunity: 'Security monitoring',
  },
  {
    toolName: 'Vercel',
    category: 'Infrastructure',
    check: (html) => {
      if (/vercel\.com|vercel/i.test(html) && /vercel\.com/i.test(html)) return { detected: true, evidence: 'Vercel reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Technology', possibleWorkflow: 'Deployment', possiblePain: 'Limited backend', nativelyOpportunity: 'Full-stack automation',
  },
  {
    toolName: 'Netlify',
    category: 'Infrastructure',
    check: (html) => {
      if (/netlify\.com|netlify/i.test(html)) return { detected: true, evidence: 'Netlify reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Technology', possibleWorkflow: 'Static hosting', possiblePain: 'Limited backend', nativelyOpportunity: 'Add backend capabilities',
  },
  {
    toolName: 'AWS',
    category: 'Cloud',
    check: (html) => {
      if (/amazonaws\.com|aws\.amazon|amazon-web-services|aws/i.test(html)) return { detected: true, evidence: 'AWS reference detected' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'Technology', possibleWorkflow: 'Cloud infrastructure', possiblePain: 'Complex management', nativelyOpportunity: 'Simplified cloud automation',
  },

  // ─── HR / Careers ───────────────────────────────────────────
  {
    toolName: 'Greenhouse',
    category: 'HR',
    check: (html) => {
      if (/greenhouse\.io|greenhouse/i.test(html)) return { detected: true, evidence: 'Greenhouse ATS reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'HR', possibleWorkflow: 'Applicant tracking', possiblePain: 'Manual screening', nativelyOpportunity: 'AI resume screening',
  },
  {
    toolName: 'Lever',
    category: 'HR',
    check: (html) => {
      if (/lever\.co|lever/i.test(html)) return { detected: true, evidence: 'Lever ATS reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'HR', possibleWorkflow: 'Applicant tracking', possiblePain: 'Manual screening', nativelyOpportunity: 'Automated candidate scoring',
  },
  {
    toolName: 'Workable',
    category: 'HR',
    check: (html) => {
      if (/workable\.com|workable/i.test(html)) return { detected: true, evidence: 'Workable ATS reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'HR', possibleWorkflow: 'Applicant tracking', possiblePain: 'Manual screening', nativelyOpportunity: 'Automated candidate matching',
  },
  {
    toolName: 'BambooHR',
    category: 'HR',
    check: (html) => {
      if (/bamboohr\.com|bamboohr/i.test(html)) return { detected: true, evidence: 'BambooHR reference' };
      return { detected: false, evidence: '' };
    },
    likelyDepartment: 'HR', possibleWorkflow: 'HR management', possiblePain: 'Manual HR processes', nativelyOpportunity: 'HR process automation',
  },
];

// ─── Detection Functions ───────────────────────────────────────

function extractScripts(html: string): string[] {
  const scripts: string[] = [];
  const regex = /<script[^>]*src=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  return scripts;
}

function extractLinks(html: string): string[] {
  const links: string[] = [];
  const regex = /<link[^>]*href=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }
  return links;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Main Engine ───────────────────────────────────────────────

export interface ToolFingerprintResult {
  detected: DetectedTool[];
  inferred: DetectedTool[];
  sourceUrl: string;
}

/**
 * Scan HTML from a single page for tool fingerprints.
 */
export function fingerprintPage(html: string, sourceUrl: string): ToolFingerprintResult {
  const scripts = extractScripts(html);
  const links = extractLinks(html);
  const text = stripHtml(html);

  const detected: DetectedTool[] = [];
  const inferred: DetectedTool[] = [];

  for (const fp of fingerprints) {
    const result = fp.check(html, scripts, links, text);
    if (result.detected) {
      detected.push({
        toolName: fp.toolName,
        category: fp.category,
        evidence: result.evidence,
        sourceUrl,
        detectionMethod: 'Detected',
        confidence: 'High',
        likelyDepartment: fp.likelyDepartment,
        possibleWorkflow: fp.possibleWorkflow,
        possiblePain: fp.possiblePain,
        nativelyOpportunity: fp.nativelyOpportunity,
      });
    }
  }

  return { detected, inferred, sourceUrl };
}

/**
 * Scan a full set of page texts and aggregate detected tools.
 */
export function fingerprintAllPages(
  pages: { html: string; url: string }[]
): { tools: DetectedTool[] } {
  const toolMap = new Map<string, DetectedTool>();

  for (const page of pages) {
    const result = fingerprintPage(page.html, page.url);
    for (const tool of [...result.detected, ...result.inferred]) {
      const existing = toolMap.get(tool.toolName);
      if (!existing) {
        toolMap.set(tool.toolName, tool);
      } else if (tool.detectionMethod === 'Detected' && existing.detectionMethod === 'Inferred') {
        toolMap.set(tool.toolName, tool);
      }
    }
  }

  return { tools: Array.from(toolMap.values()) };
}

/**
 * Infer tools from visible text (lower confidence).
 */
export function inferToolsFromText(text: string, sourceUrl: string): DetectedTool[] {
  const inferred: DetectedTool[] = [];
  const lower = text.toLowerCase();

  const textSignals: { keywords: string[]; toolName: string; category: string; dept: string }[] = [
    { keywords: ['powered by wordpress', 'built with wordpress'], toolName: 'WordPress', category: 'CMS', dept: 'Marketing' },
    { keywords: ['built with webflow', 'made with webflow'], toolName: 'Webflow', category: 'CMS', dept: 'Marketing' },
    { keywords: ['powered by shopify', 'shopify store'], toolName: 'Shopify', category: 'E-commerce', dept: 'Sales' },
    { keywords: ['powered by square', 'square payments'], toolName: 'Square', category: 'Payments', dept: 'Finance' },
    { keywords: ['book a demo', 'schedule demo', 'request demo'], toolName: 'Demo Scheduling', category: 'Scheduling', dept: 'Sales' },
    { keywords: ['customer portal', 'client login', 'account login'], toolName: 'Customer Portal', category: 'Portal', dept: 'Support' },
    { keywords: ['knowledge base', 'help center', 'faq'], toolName: 'Knowledge Base', category: 'Support', dept: 'Support' },
    { keywords: ['live chat', 'chat with us', 'chat now'], toolName: 'Live Chat', category: 'Support', dept: 'Support' },
    { keywords: ['careers at', 'jobs at', 'join our team', 'work with us'], toolName: 'Careers Page', category: 'HR', dept: 'HR' },
  ];

  for (const signal of textSignals) {
    if (signal.keywords.some(k => lower.includes(k))) {
      inferred.push({
        toolName: signal.toolName,
        category: signal.category,
        evidence: `Text mention: "${signal.keywords.find(k => lower.includes(k))}"`,
        sourceUrl,
        detectionMethod: 'Inferred',
        confidence: 'Medium' as ConfidenceLevel,
        likelyDepartment: signal.dept,
        possibleWorkflow: `${signal.toolName} related workflow`,
        possiblePain: 'Manual process without this tool',
        nativelyOpportunity: `Automate ${signal.category} with Natively`,
      });
    }
  }

  return inferred;
}
