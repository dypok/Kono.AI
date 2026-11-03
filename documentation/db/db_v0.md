# Especificación de Esquema de Base de Datos: Kono.ai (v0)

**Motor:** SQLite (Desarrollo / Local) / PostgreSQL 15+ (Producción)  
**ORM:** SQLAlchemy 2.0 (Async) + Alembic para migraciones.

---

## 1. Diagrama Entidad-Relación (ERD)

```mermaid
erDiagram
    DOCUMENTS ||--o{ INVOICE_ITEMS : "contiene"
    DOCUMENTS ||--o{ AUDIT_LOGS : "registra"
    DOCUMENTS ||--o{ DISCREPANCIES : "alerta"
    ISSUERS ||--o{ DOCUMENTS : "emite"
    ISSUERS ||--o{ VENDOR_TEMPLATES : "posee"
    CUSTOMERS ||--o{ DOCUMENTS : "recibe"

    DOCUMENTS {
        uuid id PK
        string file_name
        string file_path
        string file_hash_sha256 UK
        string mime_type
        int file_size_bytes
        string invoice_number
        date issue_date
        date due_date
        string currency
        numeric subtotal
        numeric tax_total
        numeric withholding_total
        numeric grand_total
        string extraction_method "DETERMINISTIC | TEMPLATE | OCR_LOCAL | AI_FALLBACK"
        string kono_state "GREEN | YELLOW | RED"
        string processing_status "PENDING | PROCESSING | AUDITED | APPROVED | REJECTED"
        float processing_time_ms
        jsonb bounding_boxes
        timestamp created_at
        timestamp updated_at
    }

    ISSUERS {
        uuid id PK
        string tax_id UK "NIT / RUT / RFC / NIF"
        string name
        string address
        string email
        string phone
        timestamp created_at
    }

    CUSTOMERS {
        uuid id PK
        string tax_id UK
        string name
        timestamp created_at
    }

    INVOICE_ITEMS {
        uuid id PK
        uuid document_id FK
        int line_number
        string description
        numeric quantity
        numeric unit_price
        numeric tax_rate
        numeric total_price
        boolean is_math_valid
        jsonb bbox_coordinates
    }

    VENDOR_TEMPLATES {
        uuid id PK
        uuid issuer_id FK
        string template_name
        jsonb spatial_anchors "Coordenadas X,Y y anclas aprendidas"
        int total_matched_count
        timestamp created_at
        timestamp updated_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid document_id FK
        string user_id
        string action "UPLOAD | AUTO_AUDIT | MANUAL_CORRECTION | 1CLICK_APPROVE"
        jsonb previous_state
        jsonb new_state
        timestamp timestamp
    }

    DISCREPANCIES {
        uuid id PK
        uuid document_id FK
        string field_name "subtotal | tax | grand_total | duplicate | tax_id"
        string alert_type "ARITHMETIC_ERROR | MISSING_FIELD | DUPLICATE | INVALID_TAX_ID"
        numeric expected_value
        numeric extracted_value
        numeric delta_amount
        string description
    }
```

---

## 2. Definición DDL (SQLAlchemy Core / PostgreSQL / SQLite)

### 2.1 Tabla: `documents`
Almacena el registro maestro de cada comprobante o factura procesada.
- `id` (UUID): Identificador único global.
- `file_hash_sha256` (VARCHAR(64), UNIQUE, INDEX): Clave de deduplicación instantánea (< 1 ms).
- `extraction_method` (VARCHAR(20)): Registra si el documento costó $0 (`DETERMINISTIC`, `TEMPLATE`, `OCR_LOCAL`) o si usó fallback (`AI_FALLBACK`).
- `kono_state` (VARCHAR(10)): `GREEN`, `YELLOW`, `RED`.
- `bounding_boxes` (JSON / JSONB): Almacena las coordenadas exactas `[x0, y0, x1, y1]` de cada campo para el visor split-screen.

### 2.2 Tabla: `vendor_templates`
Almacena la memoria espacial de Kono.ai para proveedores recurrentes.
```json
{
  "invoice_number": { "anchor": "Factura N°", "direction": "right", "offset_x": 10, "offset_y": 0, "regex": "([A-Z0-9-]+)" },
  "issue_date": { "anchor": "Fecha Emisión", "direction": "right", "format": "DD/MM/YYYY" },
  "subtotal": { "anchor": "Subtotal", "direction": "right", "is_currency": true },
  "tax_total": { "anchor": "IVA (19%)", "direction": "right", "is_currency": true },
  "grand_total": { "anchor": "TOTAL A PAGAR", "direction": "right", "is_currency": true }
}
```

### 2.3 Índices para Alta Velocidad
- `CREATE UNIQUE INDEX idx_documents_file_hash ON documents(file_hash_sha256);`
- `CREATE INDEX idx_documents_kono_state ON documents(kono_state, processing_status);`
- `CREATE INDEX idx_documents_issuer_invoice ON documents(issuer_id, invoice_number);`
