import os
import asyncio
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.app.core.config import settings

class PDFReportGenerator:
    """
    Executive & Technical PDF Report Generator for NEXORA.
    Produces professional compliance audit reports with branding, metrics,
    findings breakdown, and blockchain verification certificates.
    """

    @classmethod
    def generate_report(cls, audit_data: dict, findings: list, blockchain_status: dict) -> str:
        timestamp_str = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"NEXORA_Audit_Report_Audit_{audit_data['id']}_{timestamp_str}.pdf"
        file_path = os.path.join(settings.REPORTS_DIR, filename)

        doc = SimpleDocTemplate(
            file_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#475569'),
            spaceAfter=14
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=14,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155')
        )
        table_cell = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#1E293B')
        )
        badge_crit = ParagraphStyle('BadgeCrit', parent=table_cell, textColor=colors.HexColor('#E11D48'), fontName="Helvetica-Bold")
        badge_high = ParagraphStyle('BadgeHigh', parent=table_cell, textColor=colors.HexColor('#EA580C'), fontName="Helvetica-Bold")
        badge_med = ParagraphStyle('BadgeMed', parent=table_cell, textColor=colors.HexColor('#D97706'), fontName="Helvetica-Bold")

        story = []

        # 1. Header & Branding
        story.append(Paragraph("NEXORA", title_style))
        story.append(Paragraph("AI-Driven Multi-Vendor Network Security Compliance Auditor | Smart India Hackathon 2026 (SIH26155)", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#38BDF8'), spaceAfter=14))

        # 2. Audit Metadata Summary Table
        risk_score = audit_data.get('risk_score', 0) or 0
        risk_color = '#E11D48' if risk_score >= 70 else '#D97706' if risk_score >= 45 else '#10B981'
        meta_data = [
            [
                Paragraph("<b>Audit ID:</b>", table_cell), Paragraph(str(audit_data.get('id', 'N/A')), table_cell),
                Paragraph("<b>Vendor Platform:</b>", table_cell), Paragraph(str(audit_data.get('vendor', 'N/A')), table_cell)
            ],
            [
                Paragraph("<b>Audit Date:</b>", table_cell), Paragraph(datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"), table_cell),
                Paragraph("<b>Risk Score:</b>", table_cell), Paragraph(f"<font color='{risk_color}'><b>{risk_score}/100</b></font>", table_cell)
            ],
            [
                Paragraph("<b>Compliance Score:</b>", table_cell), Paragraph(f"<b>{audit_data.get('compliance_score', 0.0) or 0.0}%</b>", table_cell),
                Paragraph("<b>Total Findings:</b>", table_cell), Paragraph(f"<b>{len(findings)}</b>", table_cell)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[110, 160, 110, 160])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 14))

        # 3. Severity Summary
        story.append(Paragraph("Finding Severity Distribution", section_heading))
        severity_counts = {}
        for f in findings:
            sev = f.get('severity', 'INFO') or 'INFO'
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        sev_data = [
            [Paragraph("<b>Severity</b>", table_cell), Paragraph("<b>Count</b>", table_cell), Paragraph("<b>% of Total</b>", table_cell)]
        ]
        for sev_level in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']:
            count = severity_counts.get(sev_level, 0)
            if count > 0:
                pct = round((count / len(findings)) * 100) if findings else 0
                style = badge_crit if sev_level == 'CRITICAL' else badge_high if sev_level == 'HIGH' else badge_med
                sev_data.append([
                    Paragraph(sev_level, style),
                    Paragraph(str(count), table_cell),
                    Paragraph(f"{pct}%", table_cell)
                ])

        if len(sev_data) > 1:
            sev_table = Table(sev_data, colWidths=[140, 80, 80])
            sev_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('PADDING', (0,0), (-1,-1), 5),
            ]))
            story.append(sev_table)
            story.append(Spacer(1, 14))

        # 4. Security Findings
        story.append(Paragraph("Identified Security Vulnerabilities & Evidence", section_heading))
        findings_table_data = [
            [
                Paragraph("<b>Severity</b>", table_cell),
                Paragraph("<b>Rule ID & Title</b>", table_cell),
                Paragraph("<b>Line #</b>", table_cell),
                Paragraph("<b>Evidence & Impact</b>", table_cell),
                Paragraph("<b>Status</b>", table_cell)
            ]
        ]

        for f in findings:
            sev = f.get('severity') or 'INFO'
            s_style = badge_crit if sev == "CRITICAL" else badge_high if sev == "HIGH" else badge_med
            lines_str = ", ".join(map(str, f.get('line_numbers') or [])) or "N/A"
            
            # Safely get and sanitize evidence and impact — guard against None
            evidence_raw = (f.get('evidence') or 'N/A')
            # Strip characters that conflict with ReportLab XML markup
            evidence_safe = evidence_raw.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')[:200]
            
            impact_raw = (f.get('impact') or 'No impact description available.')
            impact_safe = impact_raw.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')[:150]
            
            rule_id_safe = (f.get('rule_id') or 'N/A').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            title_safe = (f.get('title') or 'Untitled').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            status_safe = (f.get('status') or 'OPEN').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

            # Use font name="Courier" for monospace — <code> is NOT valid ReportLab markup
            evidence_cell = f'<font name="Courier" size="7">{evidence_safe}</font><br/><font color="#64748B" size="7">{impact_safe}...</font>'

            findings_table_data.append([
                Paragraph(sev, s_style),
                Paragraph(f"<b>{rule_id_safe}</b><br/>{title_safe}", table_cell),
                Paragraph(lines_str, table_cell),
                Paragraph(evidence_cell, table_cell),
                Paragraph(f"<b>{status_safe}</b>", table_cell)
            ])

        findings_table = Table(findings_table_data, colWidths=[55, 145, 45, 235, 60])
        findings_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(findings_table)
        story.append(Spacer(1, 14))

        # 5. Blockchain Audit Verification Certificate
        story.append(Paragraph("Tamper-Evident SHA-256 Blockchain Certificate", section_heading))
        chain_valid = blockchain_status.get('is_valid', True)
        status_text = "<b><font color='#10B981'>CHAIN VALID (INTEGRITY VERIFIED)</font></b>" if chain_valid else "<b><font color='#E11D48'>TAMPERING DETECTED</font></b>"

        chain_data = [
            [Paragraph("<b>Cryptographic Verification:</b>", table_cell), Paragraph(status_text, table_cell)],
            [Paragraph("<b>Total Blocks Recorded:</b>", table_cell), Paragraph(str(blockchain_status.get('total_blocks', 0)), table_cell)],
            [Paragraph("<b>Hashing Standard:</b>", table_cell), Paragraph("SHA-256 Hash-Chained Audit Ledger", table_cell)],
            [Paragraph("<b>Certificate Note:</b>", table_cell), Paragraph("All audit steps from configuration upload to verification are immutably anchored.", table_cell)],
        ]
        chain_table = Table(chain_data, colWidths=[150, 390])
        chain_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(chain_table)

        doc.build(story)
        return file_path

    @classmethod
    async def generate_report_async(cls, audit_data: dict, findings: list, blockchain_status: dict) -> str:
        """Run the synchronous PDF generation off the event loop thread."""
        return await asyncio.to_thread(cls.generate_report, audit_data, findings, blockchain_status)
