import os
import random
from datetime import datetime, timedelta
from faker import Faker
from jinja2 import Environment, FileSystemLoader

fake = Faker('es_ES')

def generar_datos_factura() -> dict:
    """Genera una estructura de datos rica y heterogénea para una factura."""
    fecha_emision = fake.date_between(start_date='-60d', end_date='today')
    fecha_vencimiento = fecha_emision + timedelta(days=random.choice([15, 30, 45]))
    
    # Proveedor aleatorio
    proveedor = {
        "nombre": fake.company(),
        "cif": fake.vat_id(),
        "direccion": fake.address().replace('\n', ', '),
        "email": fake.company_email(),
        "telefono": fake.phone_number()
    }
    
    # Cliente aleatorio
    cliente = {
        "nombre": fake.name() if random.choice([True, False]) else fake.company(),
        "cif": fake.dni() if random.choice([True, False]) else fake.vat_id(),
        "direccion": fake.address().replace('\n', ', '),
        "email": fake.email()
    }
    
    # Ítems variables (entre 1 y 6 productos/servicios)
    items = []
    subtotal = 0.0
    
    for _ in range(random.randint(1, 6)):
        cantidad = random.randint(1, 10)
        precio_unitario = round(random.uniform(15.0, 500.0), 2)
        total_item = round(cantidad * precio_unitario, 2)
        subtotal += total_item
        
        items.append({
            "descripcion": fake.catch_phrase(),
            "cantidad": cantidad,
            "precio_unitario": precio_unitario,
            "total": total_item
        })
    
    # Cálculos de impuestos y totales
    porcentaje_impuesto = random.choice([0.16, 0.21])  # 16% o 21%
    subtotal = round(subtotal, 2)
    monto_impuesto = round(subtotal * porcentaje_impuesto, 2)
    total_general = round(subtotal + monto_impuesto, 2)
    
    return {
        "numero_factura": f"FAC-{fake.unique.numeric_number(digits=6)}",
        "fecha_emision": fecha_emision.strftime("%d/%m/%Y"),
        "fecha_vencimiento": fecha_vencimiento.strftime("%d/%m/%Y"),
        "metodo_pago": random.choice(["Transferencia Bancaria", "Tarjeta de Crédito", "PayPal", "Efectivo"]),
        "proveedor": proveedor,
        "cliente": cliente,
        "items": items,
        "subtotal": subtotal,
        "porcentaje_impuesto": porcentaje_impuesto,
        "monto_impuesto": monto_impuesto,
        "total_general": total_general
    }

def generar_facturas(cantidad: int, output_dir: str = "facturas_generadas"):
    """Renderiza y guarda la cantidad especificada de facturas en archivos HTML."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    env = Environment(loader=FileSystemLoader('.'))
    template = env.get_template('plantilla_factura.html')
    
    print(f"Generando {cantidad} facturas en la carpeta '{output_dir}'...")
    
    for i in range(1, cantidad + 1):
        datos = generar_datos_factura()
        html_content = template.render(datos)
        
        filename = f"{output_dir}/factura_{datos['numero_factura']}.html"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)
            
        print(f" [{i}/{cantidad}] Generada: {filename}")

    print("\n¡Proceso completado con éxito!")

if __name__ == "__main__":
    try:
        num = int(input("¿Cuántas facturas deseas generar?: "))
        if num <= 0:
            print("Por favor, ingresa un número mayor a 0.")
        else:
            generar_facturas(num)
    except ValueError:
        print("Error: Ingresa un número entero válido.")