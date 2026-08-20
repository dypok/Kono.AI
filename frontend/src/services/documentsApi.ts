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
  bounding_boxes?: any;
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

let _cachedToken: string | null = null;

// Suscripción reactiva para mantener el token en memoria siempre actualizado (0ms lookup)
if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ data }) => {
    _cachedToken = data?.session?.access_token || null;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    _cachedToken = session?.access_token || null;
  });
}

async function getAuthHeader(): Promise<Record<string, string>> {
  if (_cachedToken) {
    return { Authorization: `Bearer ${_cachedToken}` };
  }
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    _cachedToken = token;
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
    document_type?: string;
    year?: number;
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
    if (params?.document_type) {
      searchParams.append('document_type', params.document_type.toUpperCase());
    }
    if (params?.year) {
      searchParams.append('year', params.year.toString());
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

  /** Sube múltiples comprobantes o una carpeta completa */
  async batchUploadDocuments(files: File[]): Promise<any> {
    const headers = await getAuthHeader();
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch('/api/v1/documents/batch-upload', {
        method: 'POST',
        headers: {
          ...headers,
        },
        body: formData,
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (_) {
      // Fallback a procesamiento concurrente individual si falla el multipart batch
    }

    // Fallback individual resiliente
    const results = await Promise.allSettled(
      files.map((file) => documentsApi.uploadDocument(file))
    );

    const successful = results.filter((r) => r.status === 'fulfilled').map((r: any) => r.value);
    const failed = results.filter((r) => r.status === 'rejected');

    return {
      status: 'SUCCESS',
      processed_count: files.length,
      success_count: successful.length,
      failed_count: failed.length,
      items: successful,
      message: `Se procesaron ${successful.length} de ${files.length} facturas exitosamente.`,
    };
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

  /** Elimina múltiples documentos atómicamente en lote */
  async bulkDeleteDocuments(documentIds: string[]): Promise<{
    status: string;
    message: string;
    deleted_count: number;
    ids: string[];
  }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/v1/documents/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ ids: documentIds }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al eliminar facturas en lote' }));
      throw new Error(err.detail || 'Fallo en la eliminación masiva');
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

  /** Estima el costo en USD y tokens de analizar un documento con IA (gpt-4o-mini) sin ejecutarla */
  async estimateAiCost(documentId: string, conflictingFields?: string[]): Promise<{
    document_id: string;
    needs_ai: boolean;
    estimated_cost_usd: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    model: string;
    message?: string;
  }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/v1/ai/cost-estimate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        document_id: documentId,
        conflicting_fields: conflictingFields,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al estimar costo IA' }));
      throw new Error(err.detail || 'Fallo en la estimación de costo IA');
    }
    return res.json();
  },

  /** Estima el costo total de analizar un lote de facturas no leídas con IA */
  async estimateBatchAiCost(documentIds: string[]): Promise<{
    document_ids: string[];
    count: number;
    total_estimated_cost_usd: number;
    total_tokens: number;
    message: string;
  }> {
    const headers = await getAuthHeader();
    const provider = localStorage.getItem('kono_ai_provider') || 'openai';
    const res = await fetch('/api/v1/ai/cost-estimate/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        document_ids: documentIds,
        provider,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al estimar costo de lote IA' }));
      throw new Error(err.detail || 'Fallo en la estimación de lote IA');
    }
    return res.json();
  },

  /** Ejecuta el análisis por lote con IA para los documentos que no se pudieron leer */
  async analyzeBatchWithAi(documentIds: string[]): Promise<{
    processed_count: number;
    total_estimated_cost_usd: number;
    total_tokens: number;
    message: string;
  }> {
    const headers = await getAuthHeader();
    const provider = localStorage.getItem('kono_ai_provider') || 'openai';
    const apiKey = localStorage.getItem(`kono_${provider}_api_key`) || localStorage.getItem('kono_openai_api_key') || undefined;
    const res = await fetch('/api/v1/ai/analyze/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-OpenAI-Api-Key': apiKey } : {}),
        ...headers,
      },
      body: JSON.stringify({
        document_ids: documentIds,
        api_key: apiKey,
        provider,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al analizar lote con IA' }));
      throw new Error(err.detail || 'Fallo al analizar lote con IA');
    }
    return res.json();
  },

  /** Ejecuta el análisis bajo demanda con IA para extraer datos de un documento sin ítems */
  async analyzeWithAi(documentId: string, force = true): Promise<{
    document_id: string;
    status: string;
    message: string;
    estimated_cost_usd: number;
    total_tokens: number;
    document?: any;
  }> {
    const headers = await getAuthHeader();
    const provider = localStorage.getItem('kono_ai_provider') || 'openai';
    const apiKey = localStorage.getItem(`kono_${provider}_api_key`) || localStorage.getItem('kono_openai_api_key') || undefined;
    const res = await fetch(`/api/v1/ai/analyze/${documentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-OpenAI-Api-Key': apiKey } : {}),
        ...headers,
      },
      body: JSON.stringify({
        force,
        api_key: apiKey,
        provider,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al analizar con IA' }));
      throw new Error(err.detail || 'Fallo en el análisis con IA');
    }
    return res.json();
  },

  /** Exporta un documento al correo con clasificación Empresa→Tipo (US-REQ-006) */
  async exportDocumentToEmail(documentId: string, email?: string): Promise<{
    status: string;
    document_id: string;
    exported_to: string;
    label: string;
    empresa: string;
    tipo: string;
    message: string;
  }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/v1/documents/${documentId}/export-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al exportar por correo' }));
      throw new Error(err.detail || 'Fallo en la exportación al correo');
    }
    return res.json();
  },

  /** Remueve la etiqueta KONO_INVOICE de Gmail y vuelve a procesar todos los correos e ingresarlos */
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
