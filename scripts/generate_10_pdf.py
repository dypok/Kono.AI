import os
import random
from datetime import datetime, timedelta
from faker import Faker
from jinja2 import Environment
from weasyprint import HTML

fake = Faker('es_ES')

def generar_datos_factura() -> dict:
    """Genera datos de factura compatibles con la plantilla index.html."""
    fecha_emision = fake.date_between(start_date='-60d', end_date='today')
    fecha_vencimiento = fecha_emision + timedelta(days=random.choice([15, 30, 45]))
    
    proveedor = {
        "nombre": fake.company(),
        "cif": fake.vat_id(),
        "direccion": fake.address().replace('\n', ', '),
        "email": fake.company_email(),
        "telefono": fake.phone_number()
    }
    
    cliente = {
        "nombre": fake.name() if random.choice([True, False]) else fake.company(),
        "cif": fake.vat_id(),
        "direccion": fake.address().replace('\n', ', '),
        "email": fake.email()
    }
    
    items = []
    subtotal = 0.0
    for _ in range(random.randint(2, 6)):
        cantidad = random.randint(1, 8)
        precio_unitario = round(random.uniform(25.0, 750.0), 2)
        total_item = round(cantidad * precio_unitario, 2)
        subtotal += total_item
        items.append({
            "descripcion": fake.catch_phrase(),
            "cantidad": cantidad,
            "precio_unitario": precio_unitario,
            "total": total_item
        })
    
    porcentaje_impuesto = random.choice([0.16, 0.19, 0.21])
    subtotal = round(subtotal, 2)
    monto_impuesto = round(subtotal * porcentaje_impuesto, 2)
    total_general = round(subtotal + monto_impuesto, 2)
    
    folio = random.randint(100000, 999999)
    
    return {
        "numero_factura": f"FAC-{folio}",
        "fecha_emision": fecha_emision.strftime("%d/%m/%Y"),
        "fecha_vencimiento": fecha_vencimiento.strftime("%d/%m/%Y"),
        "metodo_pago": random.choice(["Transferencia Bancaria", "Tarjeta de Crédito", "PayPal", "Efectivo"]),
        "proveedor": proveedor,
        "cliente": cliente,
        "items": items,
        "subtotal": subtotal,
        "porcentaje_impuesto": int(porcentaje_impuesto * 100),
        "monto_impuesto": monto_impuesto,
        "total_general": total_general
    }

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "facturas_pdf")
    os.makedirs(output_dir, exist_ok=True)
    
    with open('/tmp/index_utf8.html', 'r', encoding='utf-8') as f:
        template_str = f.read()
        
    env = Environment()
    template = env.from_string(template_str)
    
    print(f"--- Generando 10 Facturas PDF en '{output_dir}' ---")
    
    for i in range(1, 11):
        datos = generar_datos_factura()
        html_rendered = template.render(datos)
        
        pdf_filename = f"factura_{datos['numero_factura']}.pdf"
        pdf_path = os.path.join(output_dir, pdf_filename)
        HTML(string=html_rendered).write_pdf(pdf_path)
        print(f" [{i:02d}/10] Creada exitosamente: {pdf_filename} | Emisor: {datos['proveedor']['nombre']} | Total: ${datos['total_general']:.2f}")

    print(f"\n¡10 Facturas PDF generadas con éxito en: {output_dir}!")

if __name__ == "__main__":
    main()
