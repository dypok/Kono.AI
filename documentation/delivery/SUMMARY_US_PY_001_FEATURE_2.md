# 📋 Resumen de Implementación: US-PY-001 (Feature 2: Extractor Tabular Determinista de Ítems)
**Historia de Usuario:** `US-PY-001` — Motor Determinista Espacial  
**Feature 2:** Extractor Tabular de Líneas de Detalle & Parseo Numérico  
**Responsable:** Dylan  
**Rama:** `feature/py-spatial-engine-vendor-templates`  
**Estado:** ✅ Feature 2 Completado  

---

## 🎯 ¿Qué se construyó en este Feature?
Se implementó el algoritmo de extracción determinista de tablas de ítems en Python, capaz de identificar la cabecera de la tabla, agrupar las filas intermedias por proximidad de coordenada horizontal $Y$, extraer Descripciones, Cantidades, Precios Unitarios y Totales de Línea, y calcular el subtotal sin invocar LLMs ($0 tokens).

---

## ⚙️ Componentes y Archivos Creados:

| Archivo | Función Principal |
| :--- | :--- |
| [backend/python-api/app/schemas/items.py](file:///home/dypok/Projects/Kono.AI/backend/python-api/app/schemas/items.py) | Modelos Pydantic `ExtractedInvoiceItem` (con validación matemática de línea) y `ExtractedTable`. |
| [backend/python-api/app/engine/table_parser.py](file:///home/dypok/Projects/Kono.AI/backend/python-api/app/engine/table_parser.py) | 1. `parse_financial_number()`: Normaliza formatos numéricos internacionales y LatAm ($1.500,00$ vs $1,500.00$).<br>2. `find_header_top_and_bottom()`: Detecta límites de la cabecera.<br>3. `find_totals_section_top()`: Detecta inicio del footer de totales.<br>4. `parse_items()`: Agrupa palabras por franjas de altura ($\Delta Y \le 8\text{ px}$) y segrega columnas. |
| [backend/python-api/tests/test_table_parser.py](file:///home/dypok/Projects/Kono.AI/backend/python-api/tests/test_table_parser.py) | Tests unitarios verificando extracción exacta de filas, cantidades, precios unitarios y subtotal. |

---

## 🔄 ¿Cómo Funciona la Segmentación de Tablas?

```
 ┌─────────────────────────────────────────────────────────────────┐
 │ Cabecera Detectada: [Descripción] [Cantidad] [Precio] [Total]   │ (Y: 200 - 215)
 ├─────────────────────────────────────────────────────────────────┤
 │ Fila 1: "Servidor Cloud" | 1 | $500.00 | $500.00  (Y ≈ 240)     │
 │ Fila 2: "Almacenamiento NVMe" | 2 | $100.00 | $200.00 (Y ≈ 270) │
 ├─────────────────────────────────────────────────────────────────┤
 │ Footer Detectado: Subtotal / Total a Pagar                      │ (Y: 320+)
 └─────────────────────────────────────────────────────────────────┘
        │
        ▼
 Resultado: 2 Ítems Extraídos + Bounding Boxes + Subtotal = $700.00 (< 5 ms)
```
