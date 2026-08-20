import os
import io
import uuid
import random
from datetime import datetime, timedelta
from faker import Faker
import reportlab
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

fake = Faker('es_CO')

EMPRESAS_REALES = [
    ("Éxito S.A.", "890900608-9", "Calle 80 # 65-10, Medellín"),
    ("Empresas Públicas de Medellín E.S.P.", "890904996-1", "Carrera 58 # 42-125, Medellín"),
    ("Bancolombia S.A.", "890903938-8", "Carrera 48 # 26-85, Medellín"),
    ("Claro Soluciones Móviles S.A.", "800153993-7", "Carrera 68A # 24B-10, Bogotá"),
    ("Terpel S.A.", "860002010-2", "Carrera 7 # 75-51, Bogotá"),
    ("Falabella de Colombia S.A.", "900017447-6", "Calle 99 # 10-57, Bogotá"),
    ("Carulla Supermercados S.A.S.", "860000452-1", "Carrera 11 # 86-32, Bogotá"),
    ("Homecenter Sodimac Corona S.A.", "800242106-2", "Avenida Carrera 68 # 80-77, Bogotá"),
    ("Avianca S.A.", "890100577-0", "Avenida Calle 26 # 59-15, Bogotá"),
    ("Sura Seguros Generales S.A.", "890903407-9", "Carrera 64B # 49A-30, Medellín"),
]

def generate_invoice_pdf(output_path: str, folio_num: int):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    styles = getSampleStyleSheet()
    
    # Select company
    company_name, company_nit, company_addr = EMPRESAS_REALES[(folio_num - 1) % len(EMPRESAS_REALES)]
    
    issue_dt = datetime.now() - timedelta(days=random.randint(1, 45))
    due_dt = issue_dt + timedelta(days=30)
    
    invoice_num = f"FAC-{folio_num:05d}"
    
    story = []
    
    # Header Table: Company info & Invoice Details
    header_data = [
        [
            Paragraph(f"<b><font size=14 color='#1e293b'>{company_name}</font></b><br/><font size=9 color='#64748b'>NIT: {company_nit}<br/>{company_addr}<br/>Email: facturacion@{company_name.lower().replace(' ', '').replace('.', '')[:12]}.com.co</font>", styles['Normal']),
            Paragraph(f"<b><font size=14 color='#0f766e'>FACTURA ELECTRÓNICA DE VENTA</font></b><br/><font size=10 color='#334155'><b>N°:</b> {invoice_num}<br/><b>Fecha Emisión:</b> {issue_dt.strftime('%d/%m/%Y')}<br/><b>Fecha Vencimiento:</b> {due_dt.strftime('%d/%m/%Y')}</font>", styles['Normal'])
        ]
    ]
    t_header = Table(header_data, colWidths=[300, 240])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 10))
    
    # Customer Details
    cust_data = [
        [
            Paragraph("<b>CLIENTE / ADQUIRIENTE:</b>", styles['Normal']),
            Paragraph("<b>DATOS DE PAGO:</b>", styles['Normal'])
        ],
        [
            Paragraph("KONO AI TECHNOLOGIES S.A.S.<br/>NIT: 901.458.789-2<br/>Dirección: Cra 43A # 1-50, Medellín", styles['Normal']),
            Paragraph("Forma de Pago: Contado / Transferencia<br/>Medio: Transferencia Electrónica ACH<br/>Moneda: COP - Peso Colombiano", styles['Normal'])
        ]
    ]
    t_cust = Table(cust_data, colWidths=[300, 240])
    t_cust.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
    ]))
    story.append(t_cust)
    story.append(Spacer(1, 15))
    
    # Line Items Table
    item_rows = [
        [
            Paragraph("<b>#</b>", styles['Normal']),
            Paragraph("<b>DESCRIPCIÓN</b>", styles['Normal']),
            Paragraph("<b>CANTIDAD</b>", styles['Normal']),
            Paragraph("<b>PRECIO UNIT.</b>", styles['Normal']),
            Paragraph("<b>TOTAL</b>", styles['Normal'])
        ]
    ]
    
    subtotal = 0.0
    num_items = random.randint(2, 5)
    catalog = [
        ("Suscripción Servicio Cloud / Infraestructura", 150000, 450000),
        ("Licenciamiento Mensual Software & API", 85000, 320000),
        ("Servicios Profesionales de Consultoría Contable", 200000, 800000),
        ("Mantenimiento Servidores y Seguridad", 120000, 350000),
        ("Suministros de Oficina y Papelería Corporativa", 35000, 120000),
        ("Alquiler Equipos de Cómputo y Red", 95000, 280000),
    ]
    
    for i in range(1, num_items + 1):
        desc, min_p, max_p = random.choice(catalog)
        qty = random.randint(1, 4)
        u_price = float(random.randint(min_p // 1000, max_p // 1000) * 1000)
        line_total = qty * u_price
        subtotal += line_total
        item_rows.append([
            Paragraph(str(i), styles['Normal']),
            Paragraph(desc, styles['Normal']),
            Paragraph(f"{qty:.2f}", styles['Normal']),
            Paragraph(f"${u_price:,.2f}", styles['Normal']),
            Paragraph(f"${line_total:,.2f}", styles['Normal']),
        ])
        
    tax_rate = 0.19
    tax_total = round(subtotal * tax_rate, 2)
    grand_total = subtotal + tax_total
    
    t_items = Table(item_rows, colWidths=[30, 250, 60, 100, 100])
    t_items.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f766e')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_items)
    story.append(Spacer(1, 15))
    
    # Totals Summary Table
    totals_data = [
        [Paragraph("<b>SUBTOTAL:</b>", styles['Normal']), Paragraph(f"<b>${subtotal:,.2f}</b>", styles['Normal'])],
        [Paragraph("<b>IVA (19%):</b>", styles['Normal']), Paragraph(f"<b>${tax_total:,.2f}</b>", styles['Normal'])],
        [Paragraph("<b>TOTAL A PAGAR:</b>", styles['Normal']), Paragraph(f"<b><font size=11 color='#0f766e'>${grand_total:,.2f}</font></b>", styles['Normal'])],
    ]
    t_totals = Table(totals_data, colWidths=[120, 120])
    t_totals.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    
    # Wrap in layout table to push totals to right
    summary_wrap = Table([[Paragraph("<font size=8 color='#64748b'>Factura generada electrónicamente conforme a la resolución DIAN 000042.<br/>Cufe: e8a91f4c7b2d5e6a8f0c1e3b5d7a9f2c4e6a8b0d1e3f5a7b9c1d3e5f7a9b1c3d</font>", styles['Normal']), t_totals]], colWidths=[300, 240])
    summary_wrap.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(summary_wrap)
    
    doc.build(story)
    return {
        "invoice_num": invoice_num,
        "vendor_name": company_name,
        "vendor_nit": company_nit,
        "subtotal": subtotal,
        "tax_total": tax_total,
        "grand_total": grand_total
    }

if __name__ == "__main__":
    out_dir = "/tmp/facturas_nuevas"
    os.makedirs(out_dir, exist_ok=True)
    print(f"--- Generando 10 Facturas PDF Colombianas con ReportLab en {out_dir} ---")
    start_num = random.randint(2001, 8000)
    for i in range(10):
        fnum = start_num + i
        fpath = os.path.join(out_dir, f"factura_col_{fnum}.pdf")
        info = generate_invoice_pdf(fpath, fnum)
        print(f"[{i+1:02d}/10] Creada {info['invoice_num']} | {info['vendor_name']} | Total: ${info['grand_total']:,.2f}")
    print("\n¡10 Facturas generadas exitosamente!")
