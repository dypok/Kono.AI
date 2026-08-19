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

export const documentsApi = {
  /** Obtiene la lista paginada de facturas procesadas con filtros */
  async listDocuments(params?: {
    kono_state?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<DocumentsResponse> {
    const searchParams = new URLSearchParams();
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
    const res = await fetch(`/api/v1/documents/?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: Fallo al cargar documentos`);
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
};
