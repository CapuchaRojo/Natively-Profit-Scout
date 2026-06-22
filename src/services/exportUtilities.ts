// ============================================================
// Export Utilities — JSON, CSV, Markdown, Plain Text
// ============================================================
import type { Company } from '../types';

export function exportToJSON(company: Company): string {
  return JSON.stringify({
    company: company.basic.name,
    analysis: {
      summary: company.profile?.summary,
      painPoints: company.painPoints.map(p => ({
        name: p.name,
        department: p.department,
        severity: p.severity,
        frequency: p.frequency,
        score: p.severity + p.frequency + p.revenueImpactScore,
      })),
      stakeholders: company.stakeholders.map(s => ({
        name: s.name || 'Unknown',
        role: s.role,
        influence: s.buyingInfluence,
        category: s.category,
      })),
      opportunities: company.opportunities.map(o => ({
        title: o.title,
        complexity: o.estimatedComplexity,
        value: o.estimatedBusinessValue,
      })),
      salesPlan: company.salesPlan ? {
        recommendedPackage: company.salesPlan.price.recommendedPackage,
        budgetRange: company.salesPlan.price.budgetRange,
      } : null,
    },
  }, null, 2);
}

export function exportToCSV(company: Company): string {
  const lines: string[] = [];

  // Header
  lines.push('Natively Profit Scout — CRM Export');
  lines.push(`Company,${csvEscape(company.basic.name)}`);
  lines.push(`Website,${csvEscape(company.basic.website)}`);
  lines.push(`Industry,${csvEscape(company.basic.industry)}`);
  lines.push(`Location,${csvEscape(company.basic.location)}`);
  lines.push(`Employees,${company.basic.employeeCount}`);
  lines.push(`Revenue Estimate,${csvEscape(company.basic.revenueEstimate)}`);
  lines.push('');
  lines.push('Pain Points');
  lines.push('Name,Department,Severity,Frequency,Revenue Impact,Total Score,Confidence');
  for (const p of company.painPoints) {
    const total = p.severity + p.frequency + p.revenueImpactScore;
    lines.push(`${csvEscape(p.name)},${p.department},${p.severity},${p.frequency},${p.revenueImpactScore},${total},${p.confidence}`);
  }
  lines.push('');
  lines.push('Stakeholders');
  lines.push('Name,Role,Department,Category,Influence (1-5),Access Status,Confidence');
  for (const s of company.stakeholders) {
    lines.push(`${csvEscape(s.name || 'Unknown')},${csvEscape(s.role)},${s.department},${s.category},${s.buyingInfluence},${s.accessStatus},${s.confidence}`);
  }
  lines.push('');
  lines.push('Opportunities');
  lines.push('Title,Type,Complexity,Business Value,Demo Angle');
  for (const o of company.opportunities) {
    lines.push(`${csvEscape(o.title)},${o.opportunityType},${o.estimatedComplexity},${o.estimatedBusinessValue},${csvEscape(o.suggestedDemoAngle)}`);
  }

  return lines.join('\n');
}

function csvEscape(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToMarkdown(company: Company): string {
  const lines: string[] = [];
  lines.push(`# ${company.basic.name} — Sales Intelligence Brief`);
  lines.push('');
  lines.push('## Company Overview');
  lines.push(`- **Industry**: ${company.basic.industry}`);
  lines.push(`- **Location**: ${company.basic.location}`);
  lines.push(`- **Employees**: ${company.basic.employeeCount}`);
  lines.push(`- **Revenue**: ${company.basic.revenueEstimate}`);
  lines.push(`- **Website**: ${company.basic.website}`);
  lines.push('');

  if (company.profile) {
    lines.push('## Profile Summary');
    lines.push(company.profile.summary);
    lines.push('');
    lines.push('### Maturity Assessment');
    lines.push(`- **Operational**: ${company.profile.operationalMaturity.level} (${company.profile.operationalMaturity.confidence})`);
    lines.push(`- **Digital**: ${company.profile.digitalMaturity.level} (${company.profile.digitalMaturity.confidence})`);
    lines.push(`- **AI Readiness**: ${company.profile.aiReadiness.level} (${company.profile.aiReadiness.confidence})`);
    lines.push(`- **Budget**: ${company.profile.budgetLikelihood.level}`);
    lines.push('');
  }

  if (company.painPoints.length > 0) {
    lines.push('## Top Pain Points');
    lines.push('| Pain Point | Department | Severity | Frequency | Total Score |');
    lines.push('|---|---|---|---|---|');
    for (const p of company.painPoints.slice(0, 5)) {
      const total = p.severity + p.frequency + p.revenueImpactScore;
      lines.push(`| ${p.name} | ${p.department} | ${p.severity}/5 | ${p.frequency}/5 | ${total}/15 |`);
    }
    lines.push('');
  }

  if (company.opportunities.length > 0) {
    lines.push('## Top Opportunities');
    lines.push(`1. **${company.opportunities[0]?.title}**`);
    lines.push(`   - Complexity: ${company.opportunities[0]?.estimatedComplexity}`);
    lines.push(`   - Business Value: ${company.opportunities[0]?.estimatedBusinessValue}`);
    lines.push(`   - Demo Angle: ${company.opportunities[0]?.suggestedDemoAngle}`);
    lines.push('');
  }

  if (company.salesPlan) {
    lines.push('## Sales Plan');
    lines.push(`- **Recommended Package**: ${company.salesPlan.price.recommendedPackage}`);
    lines.push(`- **Budget Range**: ${company.salesPlan.price.budgetRange}`);
    lines.push(`- **Best Next Step**: ${company.salesPlan.price.bestNextStep}`);
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Generated by Natively Profit Scout on ${new Date().toISOString().split('T')[0]}*`);
  return lines.join('\n');
}

export function exportToPlainText(company: Company): string {
  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push(`${company.basic.name} — Sales Intelligence Brief`);
  lines.push('='.repeat(60));
  lines.push('');
  lines.push('COMPANY OVERVIEW');
  lines.push(`Industry: ${company.basic.industry}`);
  lines.push(`Location: ${company.basic.location}`);
  lines.push(`Employees: ${company.basic.employeeCount}`);
  lines.push(`Revenue: ${company.basic.revenueEstimate}`);
  lines.push(`Website: ${company.basic.website}`);
  lines.push('');
  if (company.profile) {
    lines.push('PROFILE');
    lines.push(company.profile.summary);
    lines.push('');
  }
  if (company.painPoints.length > 0) {
    lines.push('TOP PAIN POINTS');
    for (const p of company.painPoints.slice(0, 5)) {
      const total = p.severity + p.frequency + p.revenueImpactScore;
      lines.push(`  [${p.confidence}] ${p.name} (${p.department}) — Score: ${total}/15`);
    }
    lines.push('');
  }
  if (company.opportunities.length > 0) {
    lines.push('TOP OPPORTUNITY');
    lines.push(`  ${company.opportunities[0].title} [${company.opportunities[0].estimatedBusinessValue} Value, ${company.opportunities[0].estimatedComplexity} Complexity]`);
    lines.push('');
  }
  if (company.salesPlan) {
    lines.push('NEXT STEP');
    lines.push(`  ${company.salesPlan.price.bestNextStep}`);
    lines.push(`  Package: ${company.salesPlan.price.recommendedPackage}`);
    lines.push('');
  }
  lines.push('-'.repeat(60));
  lines.push(`Generated by Natively Profit Scout — ${new Date().toISOString().split('T')[0]}`);
  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

export function generateOnePageBrief(company: Company): string {
  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push(`${company.basic.name} — One-Page Brief`);
  lines.push('='.repeat(60));
  lines.push('');
  lines.push('THE COMPANY');
  lines.push(`${company.basic.name} | ${company.basic.industry} | ${company.basic.location} | ${company.basic.employeeCount} employees`);
  lines.push('');
  lines.push('THE PAIN');
  if (company.painPoints.length > 0) {
    lines.push(company.painPoints.slice(0, 3).map((p, i) =>
      `${i+1}. ${p.name} (${p.department}) — ${p.symptoms.slice(0, 80)}...`
    ).join('\n'));
  }
  lines.push('');
  lines.push('THE OPPORTUNITY');
  if (company.opportunities.length > 0) {
    lines.push(company.opportunities[0].title);
    lines.push(company.opportunities[0].proposedSolution);
  }
  lines.push('');
  lines.push('THE PLAN');
  if (company.salesPlan) {
    lines.push(`Package: ${company.salesPlan.price.recommendedPackage}`);
    lines.push(`Next Step: ${company.salesPlan.price.bestNextStep}`);
    lines.push(`Budget Range: ${company.salesPlan.price.budgetRange}`);
  }
  lines.push('');
  lines.push('KEY PEOPLE');
  if (company.stakeholders.length > 0) {
    const key = company.stakeholders.filter(s => s.buyingInfluence >= 4).slice(0, 3);
    lines.push(key.map(s => `  ${s.name || 'Unknown'} — ${s.role} (Influence: ${s.buyingInfluence}/5)`).join('\n'));
  }
  lines.push('');
  lines.push('-'.repeat(60));
  lines.push(`Score: ${company.crmExport?.opportunityScore || 'N/A'}/100 | Generated ${new Date().toISOString().split('T')[0]}`);
  return lines.join('\n');
}
