import { jsPDF } from 'jspdf'
import type { MeetingSummary } from './api'

export function downloadSummaryPdf(
  title: string,
  code: string,
  summary: MeetingSummary,
) {
  const doc = new jsPDF()
  const margin = 14
  let y = 20

  const line = (text: string, size = 11, bold = false) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(text, 180)
    for (const l of lines) {
      if (y > 275) { doc.addPage(); y = 20 }
      doc.text(l, margin, y)
      y += size * 0.45 + 2
    }
  }

  line('MeetDNA — Meeting Summary', 16, true)
  line(`${title} · ${code}`, 10)
  y += 4
  line('Executive Summary', 13, true)
  line(summary.executive_summary || '—')
  y += 4

  if (summary.key_outcomes?.length) {
    line('Key Outcomes', 13, true)
    summary.key_outcomes.forEach(o => line(`• ${o}`))
    y += 2
  }
  if (summary.decisions?.length) {
    line('Decisions', 13, true)
    summary.decisions.forEach(d => line(`• ${d.decision} (${d.impact}) — ${d.made_by}`))
    y += 2
  }
  if (summary.action_items?.length) {
    line('Action Items', 13, true)
    summary.action_items.forEach(a => line(`• ${a.task} → ${a.owner} [${a.priority}]`))
    y += 2
  }
  if (summary.risks_identified?.length) {
    line('Risks', 13, true)
    summary.risks_identified.forEach(r => line(`• ${r.risk} (${r.severity})`))
    y += 2
  }
  if (summary.key_insights?.length) {
    line('Key Insights', 13, true)
    summary.key_insights.forEach(i => line(`• ${i}`))
  }

  line('', 10)
  line(`Effectiveness Score: ${summary.meeting_effectiveness_score ?? '—'}/100`, 10, true)
  doc.save(`MeetDNA-${code}-summary.pdf`)
}
