import os
import fitz  # PyMuPDF
from pathlib import Path

def create_invoice_pdf(filename: str, invoice_num: str, vendor: str, nit: str, total_cop: float):
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4
    
    subtotal = round(total_cop / 1.19, 2)
    iva = round(total_cop - subtotal, 2)
    
    # Draw header and metadata
    page.insert_text((50, 60), f"FACTURA ELECTRÓNICA DE VENTA: {invoice_num}", fontsize=14, fontname="helv", fonttype=1)
    page.insert_text((50, 90), f"Emisor: {vendor}", fontsize=11, fontname="helv")
    page.insert_text((50, 110), f"NIT: {nit}", fontsize=10, fontname="helv")
    page.insert_text((50, 130), "Fecha de Emisión: 2026-08-20", fontsize=10, fontname="helv")
    page.insert_text((50, 150), "Fecha de Vencimiento: 2026-09-20", fontsize=10, fontname="helv")
    
    page.insert_text((50, 180), "Adquiriente: Dylan Gamero", fontsize=10, fontname="helv")
    page.insert_text((50, 200), "NIT Cliente: 1042456789-1", fontsize=10, fontname="helv")
    
    # Table headers
    page.insert_text((50, 240), "Descripción", fontsize=10, fontname="helv", fonttype=1)
    page.insert_text((300, 240), "Cantidad", fontsize=10, fontname="helv", fonttype=1)
    page.insert_text((380, 240), "Precio Unitario", fontsize=10, fontname="helv", fonttype=1)
    page.insert_text((480, 240), "Total", fontsize=10, fontname="helv", fonttype=1)
    page.draw_line((50, 248), (545, 248))
    
    # Item line
    page.insert_text((50, 270), "Servicios de Auditoría Financiera Kono", fontsize=9, fontname="helv")
    page.insert_text((315, 270), "1.0", fontsize=9, fontname="helv")
    page.insert_text((380, 270), f"${subtotal:,.2f}", fontsize=9, fontname="helv")
    page.insert_text((480, 270), f"${subtotal:,.2f}", fontsize=9, fontname="helv")
    
    # Totals
    page.draw_line((350, 310), (545, 310))
    page.insert_text((350, 330), "SUBTOTAL:", fontsize=10, fontname="helv", fonttype=1)
    page.insert_text((470, 330), f"${subtotal:,.2f} COP", fontsize=10, fontname="helv")
    
    page.insert_text((350, 350), "IVA (19%):", fontsize=10, fontname="helv", fonttype=1)
    page.insert_text((470, 350), f"${iva:,.2f} COP", fontsize=10, fontname="helv")
    
    page.insert_text((350, 375), "TOTAL A PAGAR:", fontsize=11, fontname="helv", fonttype=1)
    page.insert_text((470, 375), f"${total_cop:,.2f} COP", fontsize=11, fontname="helv", fonttype=1)
    
    out_dir = Path("scripts/facturas_pdf")
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / filename
    doc.save(str(target))
    doc.close()
    print(f"Generated seed invoice: {target}")

if __name__ == "__main__":
    invoices = [
        ("factura_FAC-9001.pdf", "FAC-9001", "Bancolombia S.A.", "890.903.938-8", 1500000.0),
        ("factura_FAC-9002.pdf", "FAC-9002", "Claro Telecomunicaciones", "800.153.993-7", 320000.0),
        ("factura_FAC-9003.pdf", "FAC-9003", "EPM Empresas Públicas", "890.904.996-1", 580000.0),
    ]
    for fn, num, vend, nit, tot in invoices:
        create_invoice_pdf(fn, num, vend, nit, tot)
