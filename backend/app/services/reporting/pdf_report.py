from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


def safe(value, fallback="N/A"):
    if value is None or value == "":
        return fallback
    return str(value)


def generate_case_pdf(case, trace_result, analysis):
    """
    Generate ShadowTrace investigation PDF in memory.
    Returns BytesIO.
    """

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"ShadowTrace Investigation Report - {case.case_id}",
        author="ShadowTrace",
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ShadowTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=20,
        leading=24,
        spaceAfter=5 * mm,
    )

    subtitle_style = ParagraphStyle(
        "ShadowSubtitle",
        parent=styles["Normal"],
        alignment=TA_CENTER,
        fontSize=9,
        textColor=colors.HexColor("#607D8B"),
        spaceAfter=8 * mm,
    )

    heading_style = ParagraphStyle(
        "ShadowHeading",
        parent=styles["Heading2"],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#174A5B"),
        spaceBefore=5 * mm,
        spaceAfter=3 * mm,
    )

    body_style = ParagraphStyle(
        "ShadowBody",
        parent=styles["BodyText"],
        fontSize=9,
        leading=13,
    )

    small_style = ParagraphStyle(
        "ShadowSmall",
        parent=styles["BodyText"],
        fontSize=7.5,
        leading=10,
    )

    story = []

    story.append(
        Paragraph(
            "SHADOWTRACE",
            title_style
        )
    )

    story.append(
        Paragraph(
            "Blockchain Intelligence & Cryptocurrency Fraud Investigation Report",
            subtitle_style,
        )
    )

    story.append(
        Paragraph(
            f"<b>Report Generated:</b> "
            f"{datetime.now().strftime('%d %B %Y, %I:%M %p')}",
            body_style,
        )
    )

    story.append(Spacer(1, 5 * mm))

    # -------------------------
    # CASE INFORMATION
    # -------------------------

    story.append(
        Paragraph(
            "1. Case Information",
            heading_style
        )
    )

    case_data = [
        ["Case ID", safe(case.case_id)],
        ["Complaint ID", safe(case.complaint_id)],
        ["Suspect Wallet", safe(case.wallet_address)],
        ["Blockchain", safe(case.chain)],
        ["Fraud Type", safe(case.fraud_type)],
        ["Reported Amount", safe(case.amount)],
        ["Currency", safe(case.currency)],
        ["Investigation Status", safe(case.status)],
        ["Stored Risk Level", safe(case.risk_level)],
    ]

    case_table = Table(
        case_data,
        colWidths=[45 * mm, 115 * mm],
    )

    case_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF5F7")),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#274D5A")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CCDDE3")),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )

    story.append(case_table)

    # -------------------------
    # TRACE SUMMARY
    # -------------------------

    story.append(
        Paragraph(
            "2. Blockchain Trace Summary",
            heading_style
        )
    )

    wallets_analyzed = trace_result.get(
        "wallets_analyzed",
        0
    )

    max_hops = trace_result.get(
        "max_hops",
        0
    )

    graph = trace_result.get(
        "graph",
        {}
    )

    connection_count = sum(
        len(info.get("connected_wallets", []))
        for info in graph.values()
    )

    trace_data = [
        ["Maximum Trace Depth", safe(max_hops)],
        ["Wallets Analyzed", safe(wallets_analyzed)],
        ["Graph Wallets", safe(len(graph))],
        ["Observed Connections", safe(connection_count)],
    ]

    trace_table = Table(
        trace_data,
        colWidths=[60 * mm, 100 * mm],
    )

    trace_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F5F8F9")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8E3E7")),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )

    story.append(trace_table)

    # -------------------------
    # RISK ASSESSMENT
    # -------------------------

    risk = analysis.get(
        "risk",
        {}
    )

    story.append(
        Paragraph(
            "3. Risk Assessment",
            heading_style
        )
    )

    risk_data = [
        ["Risk Level", safe(risk.get("risk_level"))],
        ["Risk Score", f"{risk.get('risk_score', 0)}/100"],
    ]

    risk_table = Table(
        risk_data,
        colWidths=[60 * mm, 100 * mm],
    )

    risk_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#FFF6E5")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E4D5B8")),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ])
    )

    story.append(risk_table)

    reasons = risk.get(
        "reasons",
        []
    )

    story.append(Spacer(1, 3 * mm))

    story.append(
        Paragraph(
            "<b>Risk Indicators:</b>",
            body_style
        )
    )

    if reasons:
        for reason in reasons:
            story.append(
                Paragraph(
                    f"• {safe(reason)}",
                    body_style
                )
            )
    else:
        story.append(
            Paragraph(
                "No additional risk indicators were generated.",
                body_style,
            )
        )

    # -------------------------
    # PATTERN FINDINGS
    # -------------------------

    story.append(
        Paragraph(
            "4. Detected Transaction Patterns",
            heading_style
        )
    )

    findings = analysis.get(
        "pattern_findings",
        []
    )

    if findings:
        pattern_rows = [
            ["#", "Pattern", "Wallet / Details"]
        ]

        for index, finding in enumerate(
            findings,
            start=1
        ):
            details = []

            if finding.get("wallet"):
                details.append(
                    finding["wallet"]
                )

            if finding.get("unique_destinations") is not None:
                details.append(
                    f"Destinations: {finding['unique_destinations']}"
                )

            if finding.get("unique_sources") is not None:
                details.append(
                    f"Sources: {finding['unique_sources']}"
                )

            pattern_rows.append([
                str(index),
                safe(
                    finding.get("pattern")
                ),
                Paragraph(
                    safe(
                        " | ".join(details),
                        "Pattern detected"
                    ),
                    small_style,
                ),
            ])

        pattern_table = Table(
            pattern_rows,
            colWidths=[
                10 * mm,
                45 * mm,
                105 * mm,
            ],
            repeatRows=1,
        )

        pattern_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#244B5A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CEDCE1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ])
        )

        story.append(pattern_table)

    else:
        story.append(
            Paragraph(
                "No suspicious transaction patterns were detected by the current analysis rules.",
                body_style,
            )
        )

    # -------------------------
    # EXCHANGE MATCHING
    # -------------------------

    story.append(
        Paragraph(
            "5. Exchange / VASP Attribution",
            heading_style
        )
    )

    exchanges = analysis.get(
        "exchange_matches",
        []
    )

    if exchanges:
        exchange_rows = [
            [
                "Exchange",
                "Type",
                "Chain",
                "Matched Address"
            ]
        ]

        for match in exchanges:
            exchange_rows.append([
                safe(match.get("exchange")),
                safe(match.get("type")),
                safe(match.get("chain")),
                Paragraph(
                    safe(
                        match.get("matched_address")
                    ),
                    small_style,
                ),
            ])

        exchange_table = Table(
            exchange_rows,
            colWidths=[
                35 * mm,
                25 * mm,
                25 * mm,
                75 * mm,
            ],
            repeatRows=1,
        )

        exchange_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#244B5A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CEDCE1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ])
        )

        story.append(
            exchange_table
        )

    else:
        story.append(
            Paragraph(
                "No known Exchange/VASP address match was detected.",
                body_style,
            )
        )

    # -------------------------
    # ALERT
    # -------------------------

    story.append(
        Paragraph(
            "6. Investigator Alert",
            heading_style
        )
    )

    alert = analysis.get(
        "alert",
        {}
    )

    if alert:
        alert_data = [
            ["Alert Type", safe(alert.get("alert_type"))],
            ["Severity", safe(alert.get("severity"))],
            ["Risk Level", safe(alert.get("risk_level"))],
            ["Risk Score", safe(alert.get("risk_score"))],
            ["Generated At", safe(alert.get("generated_at"))],
        ]

        alert_table = Table(
            alert_data,
            colWidths=[
                50 * mm,
                110 * mm,
            ],
        )

        alert_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#FCEFEF")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#E2CCCC")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ])
        )

        story.append(
            alert_table
        )

    # -------------------------
    # DISCLAIMER
    # -------------------------

    story.append(
        Spacer(1, 8 * mm)
    )

    story.append(
        Paragraph(
            "<b>Investigation Note</b>",
            heading_style
        )
    )

    story.append(
        Paragraph(
            "This report contains automated blockchain analytics and heuristic risk indicators generated by ShadowTrace. "
            "Exchange/VASP attribution depends on the available address-label dataset. Pattern detections and risk scores "
            "should be treated as investigative leads and should be independently verified before legal or enforcement action.",
            small_style,
        )
    )

    doc.build(story)

    buffer.seek(0)

    return buffer
