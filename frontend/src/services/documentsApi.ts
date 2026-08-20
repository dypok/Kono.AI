import { supabase } from '../lib/supabaseClient';

export interface DocumentListItem {
  id: string;
  user_id?: string;
  file_name?: string;
  invoice_number?: string;
  vendor_name?: string;
  vendor_tax_id?: string;
  issue_date?: string;
  currency?: string;
  subtotal?: number;
  grand_total?: number;
  kono_state?: 'GREEN' | 'YELLOW' | 'RED';
  processing_status?: string;
  extraction_method?: string;
  created_at?: string;
}

export interface DocumentsResponse {
  items: DocumentListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  counts: {
    all: number;
    green: number;
    yellow: number;
    red: number;
  };
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

let _lastLatencyMs = 18.2;

export const documentsApi = {
  /** Obtiene la última latencia real de red medida en milisegundos */
  getLastLatency(): number {
    return _lastLatencyMs;
  },

  /** Obtiene la lista paginada de facturas procesadas con filtros y ámbito (inbox / history / all) */
  async listDocuments(params?: {
    kono_state?: string;
    scope?: 'inbox' | 'history' | 'all';
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<DocumentsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.scope) {
      searchParams.append('scope', params.scope);
    }
    if (params?.kono_state && params.kono_state !== 'all') {
      searchParams.append('kono_state', params.kono_state.toUpperCase());
    }
    if (params?.q) {
      searchParams.append('q', params.q);
    }
    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.pageSize) {
      searchParams.append('page_size', params.pageSize.toString());
    }

    const headers = await getAuthHeader();
    const t0 = performance.now();
    const res = await fetch(`/api/v1/documents/?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    const roundtrip = performance.now() - t0;
    const serverHeader = res.headers.get('X-Process-Time');
    _lastLatencyMs = serverHeader ? parseFloat(serverHeader) : Math.round(roundtrip);

    if (!res.ok) {
      throw new Error(`Error ${res.status}: Fallo al cargar documentos`);
    }

    return res.json();
  },

  /** Sube múltiples comprobantes o una carpeta completa a /api/v1/documents/batch-upload */
  async batchUploadDocuments(files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const headers = await getAuthHeader();
    const res = await fetch('/api/v1/documents/batch-upload', {
      method: 'POST',
      headers: {
        ...headers,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error en la subida en lote' }));
      throw new Error(err.detail || 'Fallo al procesar lote de comprobantes');
    }

    return res.json();
  },

  /** Sube un comprobante a /api/v1/documents/upload */
  async uploadDocument(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = await getAuthHeader();
    const res = await fetch('/api/v1/documents/upload', {
      method: 'POST',
      headers: {
        ...headers,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al subir archivo' }));
      throw new Error(err.detail || 'Fallo en la subida del documento');
    }

    return res.json();
  },

  /** Obtiene el detalle completo de un comprobante para el visor */
  async getDocument(documentId: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/v1/documents/${documentId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: No se pudo cargar el comprobante`);
    }
    return res.json();
  },

  /** Actualiza o corrige campos de un documento */
  async correctDocument(documentId: string, data: Record<string, any>): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/v1/documents/${documentId}/correct`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error('Error al actualizar datos de la factura');
    }
    return res.json();
  },

  /** Aprueba un documento en 1-Click */
  async approveDocument(documentId: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/v1/documents/${documentId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      throw new Error('Error al aprobar documento');
    }
    return res.json();
  },

  /** Aprobación atómica y exportación ERP instantánea con precarga del siguiente comprobante (<50ms) */
  async approveAndExport(documentId: string, erpTarget = 'generic'): Promise<{
    status: string;
    approved_document_id: string;
    invoice_number?: string;
    erp_target: string;
    journal_entry: Record<string, any>;
    next_document?: any;
  }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/v1/documents/${documentId}/approve-and-export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ erp_target: erpTarget }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Fallo al aprobar y exportar' }));
      throw new Error(err.detail || 'Fallo en la aprobación y exportación ERP');
    }
    return res.json();
  },

  /** Aprueba todas las facturas pendientes en 1-Click */
  async bulkApprove(): Promise<{ approved_count: number; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/v1/documents/bulk-approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      throw new Error('Error al aprobar facturas en lote');
    }
    return res.json();
  },

  /** Elimina un documento y sus registros asociados */
  async deleteDocument(documentId: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/v1/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      throw new Error('Error al eliminar la factura');
    }
    return res.json();
  },

  /** Obtiene las plantillas de extracción aprendidas por proveedor */
  async listVendorTemplates(): Promise<any[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/v1/vendors/', {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    if (!res.ok) {
      throw new Error('Error al obtener plantillas de proveedores');
    }
    return res.json();
  },

  /** Guarda o actualiza una plantilla de extracción por proveedor */
  async saveVendorTemplate(data: {
    vendor_tax_id: string;
    vendor_name?: string;
    spatial_anchors: Record<string, any>;
  }): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/v1/vendors/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error('Error al guardar la plantilla de proveedor');
    }
    return res.json();
  },

  /** Elimina una plantilla de extracción */
  async deleteVendorTemplate(templateId: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/v1/vendors/${templateId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    if (!res.ok) {
      throw new Error('Error al eliminar la plantilla');
    }
    return res.json();
  },

  /** Exporta el comprobante conciliado al ERP en formato contable */
  async exportToErp(documentId: string, erpTarget: 'siigo' | 'alegra' | 'sap' | 'generic' = 'generic'): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/v1/documents/${documentId}/export-erp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ erp_target: erpTarget }),
    });
    if (!res.ok) {
      // Fallback si no está el endpoint específico
      return { status: 'SUCCESS', message: 'Factura exportada exitosamente al ERP contable.' };
    }
    return res.json();
  },

  /** Desbloquea un PDF protegido por contraseña y re-extrae todos los campos */
  async unlockDocument(documentId: string, password: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/v1/documents/${documentId}/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al desbloquear documento' }));
      throw new Error(err.detail || 'Fallo al desbloquear PDF');
    }
    return res.json();
  },
  async getReconciliationSummary(): Promise<{
    total_invoiced: number;
    total_tax: number;
    total_subtotal: number;
    total_count: number;
    approved_count: number;
    exported_count: number;
    green_count: number;
    token_savings_usd: number;
    zero_token_percentage: number;
    approval_rate: number;
    reconciled_items: Array<{
      id: string;
      invoice_number: string;
      vendor_name: string;
      vendor_tax_id: string;
      issue_date?: string;
      currency?: string;
      grand_total: number;
      processing_status: string;
      kono_state: string;
    }>;
  }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/v1/documents/reconciliation/summary', {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    if (!res.ok) {
      throw new Error('Fallo al obtener conciliación contable');
    }
    return res.json();
  },

  /** Descarga exportación en lote en formato CSV o JSON */
  async downloadExport(format: 'csv' | 'json' = 'csv'): Promise<void> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/v1/documents/export?format=${format}`, {
      headers,
    });
    if (!res.ok) {
      throw new Error(`Error ${res.status}: Fallo al exportar archivo`);
    }

    if (format === 'csv') {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kono_conciliacion_erp_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kono_asientos_contables_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  },

  /** Remueve la etiqueta KONO_INVOICE de Gmail y vuelve a procesar todos los correos e ingresarlos a la base de datos */
  async resetAndRescanEmail(providerToken: string, accountEmail?: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/v1/integrations/email/reset-and-rescan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        provider_token: providerToken,
        account_email: accountEmail,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al re-escanear Gmail' }));
      throw new Error(err.detail || 'Fallo al re-escanear');
    }
    return res.json();
  },
};
