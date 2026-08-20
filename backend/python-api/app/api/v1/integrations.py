import os
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from app.core.supabase_auth import get_current_user, SupabaseUser
from app.services.gmail_sync_service import gmail_sync_service
from app.services.gmail_oauth_service import gmail_oauth_service

router = APIRouter(prefix="/integrations", tags=["User Email Integrations"])

class ConnectEmailRequest(BaseModel):
    provider: str = "gmail"  # 'gmail', 'outlook', 'custom_imap'
    account_email: str
    app_password: Optional[str] = "••••••••••••"
    auto_sync: bool = True

class OAuthSyncRequest(BaseModel):
    provider_token: str  # Google OAuth Access Token from Supabase session
    account_email: Optional[str] = None

class SyncResponse(BaseModel):
    status: str
    message: str
    emails_scanned: int
    invoices_found: int
    files_extracted: List[Dict[str, Any]]
    account_email: str

from app.services.inbox_scheduler import inbox_scheduler

@router.post("/email/oauth-sync", summary="Sync invoices via official Google OAuth 2.0 REST API")
async def sync_with_google_oauth(
    req: OAuthSyncRequest,
    current_user: SupabaseUser = Depends(get_current_user),
):
    """
    Directly fetches invoices using the Google OAuth Access Token retrieved from Supabase session,
    and registers the inbox for automatic 60s background monitoring.
    """
    # 1. Register inbox for periodic 60s background checks
    inbox_scheduler.register_inbox_session(
        user_id=current_user.id,
        email=req.account_email or current_user.email,
        provider_token=req.provider_token,
    )

    # 2. Perform initial instant scan
    scan_result = await gmail_oauth_service.scan_and_fetch_invoices(
        access_token=req.provider_token,
        user_id=current_user.id,
    )

    return {
        "status": scan_result.get("status", "COMPLETED"),
        "message": f"Escaneo con Google OAuth completado: {scan_result.get('invoices_found', 0)} facturas procesadas. Monitoreo continuo cada 60s activo.",
        "details": scan_result,
    }

@router.post("/email/reset-and-rescan", summary="Remove KONO_INVOICE label from Gmail and re-process all messages into PostgreSQL")
async def reset_and_rescan_email(
    req: OAuthSyncRequest,
    current_user: SupabaseUser = Depends(get_current_user),
):
    """
    Clears KONO_INVOICE labels in Gmail and performs a fresh deterministic extraction cycle.
    """
    scan_result = await gmail_oauth_service.reset_and_rescan_invoices(
        access_token=req.provider_token,
        user_id=current_user.id,
    )

    return {
        "status": scan_result.get("status", "COMPLETED"),
        "message": f"Etiquetas removidas ({scan_result.get('messages_untagged', 0)} correos). {scan_result.get('invoices_found', 0)} facturas re-procesadas e ingresadas a la base de datos.",
        "details": scan_result,
    }

@router.post("/email/connect", summary="Connect and save a user Gmail/IMAP account")
async def connect_email_account(
    req: ConnectEmailRequest,
    current_user: SupabaseUser = Depends(get_current_user),
):
    """
    Connects a new user inbox and triggers an initial scan for historical invoices.
    """
    # Trigger initial scan
    scan_result = await gmail_sync_service.scan_and_sync_inbox(
        email_user=req.account_email,
        password=req.app_password or "",
        user_id=current_user.id,
        scan_all=True,
    )

    return {
        "status": "CONNECTED",
        "message": f"Cuenta {req.account_email} vinculada exitosamente. Se encontraron {scan_result['invoices_found']} facturas.",
        "details": scan_result,
    }

@router.post("/email/sync", response_model=SyncResponse, summary="Trigger manual or session-based email sync")
async def sync_user_email(
    account_email: str,
    app_password: Optional[str] = "••••••••••••",
    current_user: SupabaseUser = Depends(get_current_user),
):
    """
    Scans the user's connected inbox for recent invoices, deposits them for triage and tags them as KONO_INVOICE.
    """
    scan_result = await gmail_sync_service.scan_and_sync_inbox(
        email_user=account_email,
        password=app_password or "",
        user_id=current_user.id,
        scan_all=False,
    )

    return SyncResponse(
        status=scan_result.get("status", "COMPLETED"),
        message=f"Escaneo finalizado: {scan_result.get('invoices_found', 0)} comprobantes detectados y etiquetados como KONO_INVOICE.",
        emails_scanned=scan_result.get("emails_scanned", 0),
        invoices_found=scan_result.get("invoices_found", 0),
        files_extracted=scan_result.get("files_extracted", []),
        account_email=account_email,
    )
