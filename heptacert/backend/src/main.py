from __future__ import annotations

import csv
import hashlib
import hmac
import io
import math
import os
import secrets
import logging
import time
import zipfile
import asyncio
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional, List
import aiosmtplib
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
import pandas as pd
import pyotp
from fastapi import FastAPI, Body, Depends, HTTPException, UploadFile, File, Query, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
try:
    from PIL import Image as PILImage
except ImportError:
    PILImage = None  # type: ignore
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pydantic_settings import BaseSettings
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import (
    Boolean, String, Integer, BigInteger, DateTime, ForeignKey, Text,
    Enum as SAEnum, UniqueConstraint, Index, select, func, update
)
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from .generator import TemplateConfig, render_certificate_pdf, new_certificate_uuid

logger = logging.getLogger("heptacert")


class Settings(BaseSettings):
    database_url: str = Field(alias="DATABASE_URL")
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_expires_minutes: int = Field(default=1440, alias="JWT_EXPIRES_MINUTES")

    bootstrap_superadmin_email: EmailStr = Field(alias="BOOTSTRAP_SUPERADMIN_EMAIL")
    bootstrap_superadmin_password: str = Field(alias="BOOTSTRAP_SUPERADMIN_PASSWORD")

    public_base_url: str = Field(default="http://localhost:8000", alias="PUBLIC_BASE_URL")
    frontend_base_url: str = Field(default="http://localhost:3000", alias="FRONTEND_BASE_URL")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")

    storage_mode: str = Field(default="local", alias="STORAGE_MODE")
    local_storage_dir: str = Field(default="/data", alias="LOCAL_STORAGE_DIR")

    # SMTP (optional — if not set, verification tokens are printed to logs)
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="noreply@heptapus.com", alias="SMTP_FROM")

    email_token_secret: str = Field(alias="EMAIL_TOKEN_SECRET")

    # ── Payment (feature-flagged — off by default until vergi levhası) ────────
    payment_enabled: bool = Field(default=False, alias="PAYMENT_ENABLED")
    active_payment_provider: str = Field(default="iyzico", alias="ACTIVE_PAYMENT_PROVIDER")
    # iyzico
    iyzico_api_key: str = Field(default="", alias="IYZICO_API_KEY")
    iyzico_secret_key: str = Field(default="", alias="IYZICO_SECRET_KEY")
    iyzico_base_url: str = Field(default="https://sandbox-api.iyzipay.com", alias="IYZICO_BASE_URL")
    # PayTR
    paytr_merchant_id: str = Field(default="", alias="PAYTR_MERCHANT_ID")
    paytr_merchant_key: str = Field(default="", alias="PAYTR_MERCHANT_KEY")
    paytr_merchant_salt: str = Field(default="", alias="PAYTR_MERCHANT_SALT")
    # Stripe
    stripe_secret_key: str = Field(default="", alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(default="", alias="STRIPE_WEBHOOK_SECRET")
    stripe_publishable_key: str = Field(default="", alias="STRIPE_PUBLISHABLE_KEY")


settings = Settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_startup_time: float = time.time()

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Role(str, Enum):
    superadmin = "superadmin"
    admin = "admin"


class CertStatus(str, Enum):
    active = "active"
    revoked = "revoked"
    expired = "expired"


class TxType(str, Enum):
    credit = "credit"
    spend = "spend"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SAEnum(Role, name="role_enum"), index=True)
    heptacoin_balance: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    password_reset_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    magic_link_token: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    events: Mapped[List["Event"]] = relationship(back_populates="admin")
    transactions: Mapped[List["Transaction"]] = relationship(back_populates="user")


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    template_image_url: Mapped[str] = mapped_column(Text)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    cert_seq: Mapped[int] = mapped_column(Integer, default=0)
    admin: Mapped["User"] = relationship(back_populates="events")
    certificates: Mapped[List["Certificate"]] = relationship(back_populates="event")

    __table_args__ = (Index("ix_events_admin_id_created", "admin_id", "created_at"),)


class Certificate(Base):
    __tablename__ = "certificates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    student_name: Mapped[str] = mapped_column(String(200))
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    pdf_url: Mapped[str] = mapped_column(Text)
    status: Mapped[CertStatus] = mapped_column(SAEnum(CertStatus, name="cert_status_enum"), default=CertStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    public_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    hosting_term: Mapped[str] = mapped_column(String(16), default="yearly")
    hosting_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    asset_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


    event: Mapped["Event"] = relationship(back_populates="certificates")

    __table_args__ = (
        UniqueConstraint("event_id", "student_name", "uuid", name="uq_cert_event_student_uuid"),
        Index("ix_cert_event_status", "event_id", "status"),
    )


class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    type: Mapped[TxType] = mapped_column(SAEnum(TxType, name="tx_type_enum"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="transactions")

    __table_args__ = (Index("ix_tx_user_time", "user_id", "timestamp"),)


class SystemConfig(Base):
    __tablename__ = "system_configs"
    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ── Payment DB models (created by migration 002) ─────────────────────────────

class OrderStatus(str, Enum):
    pending  = "pending"
    paid     = "paid"
    failed   = "failed"
    refunded = "refunded"


class Order(Base):
    __tablename__ = "orders"
    id:           Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:      Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    plan_id:      Mapped[str]      = mapped_column(String(64))
    amount_cents: Mapped[int]      = mapped_column(Integer)
    currency:     Mapped[str]      = mapped_column(String(8), default="TRY")
    provider:     Mapped[str]      = mapped_column(String(32))   # iyzico | paytr | stripe
    provider_ref: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    status:       Mapped[str]      = mapped_column(String(32), default=OrderStatus.pending)
    created_at:   Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paid_at:      Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    meta:         Mapped[dict]     = mapped_column(JSONB, default=dict)  # extra info

    __table_args__ = (Index("ix_order_user", "user_id"), Index("ix_order_status", "status"))


class Subscription(Base):
    __tablename__ = "subscriptions"
    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:    Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    plan_id:    Mapped[str]      = mapped_column(String(64))
    order_id:   Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active:  Mapped[bool]     = mapped_column(Boolean, default=True)

    __table_args__ = (Index("ix_sub_user", "user_id"),)


# ── Enterprise DB models (created by migration 003) ──────────────────────────

class ApiKey(Base):
    __tablename__ = "api_keys"
    id:           Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:      Mapped[int]           = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name:         Mapped[str]           = mapped_column(String(200))
    key_prefix:   Mapped[str]           = mapped_column(String(8))
    key_hash:     Mapped[str]           = mapped_column(String(128), unique=True)
    scopes:       Mapped[list]          = mapped_column(JSONB, default=list)
    is_active:    Mapped[bool]          = mapped_column(Boolean, default=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at:   Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at:   Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class TotpSecret(Base):
    __tablename__ = "totp_secrets"
    user_id:    Mapped[int]     = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    secret:     Mapped[str]     = mapped_column(String(64))
    enabled:    Mapped[bool]    = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id:            Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id:       Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action:        Mapped[str]           = mapped_column(String(128))
    resource_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    resource_id:   Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    ip_address:    Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra:         Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class WebhookEndpoint(Base):
    __tablename__ = "webhook_endpoints"
    id:           Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:      Mapped[int]           = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    url:          Mapped[str]           = mapped_column(Text)
    events:       Mapped[list]          = mapped_column(JSONB, default=list)
    secret:       Mapped[str]           = mapped_column(String(64))
    is_active:    Mapped[bool]          = mapped_column(Boolean, default=True)
    created_at:   Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_fired_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"
    id:           Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    endpoint_id:  Mapped[int]           = mapped_column(Integer, ForeignKey("webhook_endpoints.id", ondelete="CASCADE"))
    event_type:   Mapped[str]           = mapped_column(String(64))
    payload:      Mapped[dict]          = mapped_column(JSONB, default=dict)
    status:       Mapped[str]           = mapped_column(String(16), default="pending")
    http_status:  Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attempt:      Mapped[int]           = mapped_column(Integer, default=1)
    delivered_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class Organization(Base):
    __tablename__ = "organizations"
    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:       Mapped[int]           = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    org_name:      Mapped[str]           = mapped_column(String(200))
    custom_domain: Mapped[Optional[str]] = mapped_column(String(253), unique=True, nullable=True)
    brand_logo:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand_color:   Mapped[str]           = mapped_column(String(7), default="#6366f1")
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class VerificationHit(Base):
    __tablename__ = "verification_hits"
    id:         Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cert_uuid:  Mapped[str]           = mapped_column(String(36))
    viewed_at:  Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    referer:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class EventTemplateSnapshot(Base):
    __tablename__ = "event_template_snapshots"
    id:                 Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id:           Mapped[int]           = mapped_column(Integer, ForeignKey("events.id", ondelete="CASCADE"), index=True)
    template_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    config:             Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_by:         Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at:         Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ChangeEmailIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_email: EmailStr


class CreateAdminIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class EventRenameIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)


class CreditCoinsIn(BaseModel):
    admin_user_id: int
    amount: int = Field(gt=0, le=1_000_000)


class EventCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    template_image_url: str = Field(min_length=1, max_length=2000)
    config: Dict[str, Any] = Field(default_factory=dict)


class EventConfigIn(BaseModel):
    isim_x: int = Field(ge=0, le=20000)
    isim_y: int = Field(ge=0, le=20000)
    qr_x: int = Field(ge=0, le=20000)
    qr_y: int = Field(ge=0, le=20000)
    font_size: int = Field(ge=8, le=200)
    font_color: str = Field(default="#FFFFFF", min_length=4, max_length=16)

    @field_validator("font_color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("#"):
            raise ValueError("font_color must be hex like #FFFFFF")
        return v
    
    cert_id_x: int = Field(ge=0, le=20000, default=60)
    cert_id_y: int = Field(ge=0, le=20000, default=60)
    cert_id_font_size: int = Field(ge=8, le=200, default=18)
    cert_id_color: str = Field(default="#94A3B8", min_length=4, max_length=16)
    show_hologram: bool = Field(default=True)

    @field_validator("cert_id_color")
    @classmethod
    def validate_cert_color(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("#"):
            raise ValueError("cert_id_color must be hex like #94A3B8")
        return v


class EventOut(BaseModel):
    id: int
    name: str
    template_image_url: str
    config: Dict[str, Any]


class BulkGenerateOut(BaseModel):
    event_id: int
    created: int
    spent_heptacoin: int
    certificates: List[Dict[str, Any]]


class CertificateOut(BaseModel):
    id: int
    uuid: str
    public_id: Optional[str] = None
    student_name: str
    event_id: int
    status: CertStatus
    issued_at: Optional[datetime] = None
    hosting_term: Optional[str] = None
    hosting_ends_at: Optional[datetime] = None
    pdf_url: Optional[str] = None

class CertificateListOut(BaseModel):
    items: List[CertificateOut]
    total: int
    page: int
    limit: int

class IssueCertificateIn(BaseModel):
    student_name: str = Field(min_length=2, max_length=200)
    hosting_term: str = Field(default="yearly", pattern="^(monthly|yearly)$")

class UpdateCertificateStatusIn(BaseModel):
    status: CertStatus


class BulkActionIn(BaseModel):
    cert_ids: List[int] = Field(min_length=1, max_length=500)
    action: str = Field(pattern="^(revoke|expire|delete)$")


class MagicLinkIn(BaseModel):
    email: EmailStr


class TemplateSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    template_image_url: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    created_by: Optional[int] = None
    created_at: datetime


class DashboardStatsOut(BaseModel):
    total_events: int
    total_certs: int
    active_certs: int
    revoked_certs: int
    expired_certs: int
    total_spent_hc: int
    events_with_stats: List[Dict[str, Any]]


class VerifyOut(BaseModel):
    uuid: str
    public_id: Optional[str] = None
    student_name: str
    event_name: str
    status: CertStatus
    pdf_url: Optional[str] = None
    issued_at: Optional[datetime] = None
    hosting_ends_at: Optional[datetime] = None
    view_count: int = 0
    linkedin_url: Optional[str] = None
    branding: Optional[Dict[str, Any]] = None


# ── Enterprise Pydantic models ────────────────────────────────────────────────

class ApiKeyCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    expires_days: Optional[int] = Field(default=None, ge=1, le=3650)


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    key_prefix: str
    is_active: bool
    scopes: List[str]
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime


class ApiKeyCreateOut(ApiKeyOut):
    full_key: str  # only returned once at creation


class TotpSetupOut(BaseModel):
    otpauth_url: str
    secret: str  # for manual entry; show once


class TotpConfirmIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class TotpValidateIn(BaseModel):
    partial_token: str
    code: str = Field(min_length=6, max_length=6)


class LoginWith2FAOut(BaseModel):
    requires_2fa: bool
    partial_token: Optional[str] = None
    access_token: Optional[str] = None
    token_type: str = "bearer"


class WebhookEndpointIn(BaseModel):
    url: str = Field(min_length=10, max_length=2000)
    events: List[str] = Field(default=["cert.issued"])


class WebhookEndpointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    url: str
    events: List[str]
    secret: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_fired_at: Optional[datetime] = None


class WebhookDeliveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_type: str
    status: str
    http_status: Optional[int] = None
    attempt: int
    delivered_at: datetime


class OrgIn(BaseModel):
    user_id: Optional[int] = None
    org_name: str = Field(min_length=2, max_length=200)
    custom_domain: Optional[str] = Field(default=None, max_length=253)
    brand_logo: Optional[str] = None
    brand_color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")


class OrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    org_name: str
    custom_domain: Optional[str] = None
    brand_logo: Optional[str] = None
    brand_color: str
    created_at: datetime


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime


class PricingTier(BaseModel):
    id: str
    name_tr: str
    name_en: str
    price_monthly: Optional[int] = None  # None = custom/contact
    price_annual: Optional[int] = None
    hc_quota: Optional[int] = None
    features_tr: List[str] = []
    features_en: List[str] = []
    is_free: bool = False
    is_enterprise: bool = False


class PricingConfigOut(BaseModel):
    tiers: List[PricingTier]


DEFAULT_PRICING: List[dict] = [
    {
        "id": "starter",
        "name_tr": "Başlangıç",
        "name_en": "Starter",
        "price_monthly": 0,
        "price_annual": 0,
        "hc_quota": 50,
        "features_tr": [
            "50 HC hoş geldin bonusu",
            "QR kod doğrulama",
            "Sertifika arşivi (1 yıl)",
            "Temel şablon editörü",
        ],
        "features_en": [
            "50 HC welcome bonus",
            "QR code verification",
            "Certificate archive (1 year)",
            "Basic template editor",
        ],
        "is_free": True,
        "is_enterprise": False,
    },
    {
        "id": "pro",
        "name_tr": "Profesyonel",
        "name_en": "Professional",
        "price_monthly": 599,
        "price_annual": 499,
        "hc_quota": 500,
        "features_tr": [
            "Aylık 500 HC",
            "Sınırsız etkinlik",
            "Excel toplu basım",
            "Sertifika arşivi (3 yıl)",
            "Öncelikli destek",
        ],
        "features_en": [
            "500 HC per month",
            "Unlimited events",
            "Excel bulk generation",
            "Certificate archive (3 years)",
            "Priority support",
        ],
        "is_free": False,
        "is_enterprise": False,
    },
    {
        "id": "enterprise",
        "name_tr": "Kurumsal",
        "name_en": "Enterprise",
        "price_monthly": None,
        "price_annual": None,
        "hc_quota": None,
        "features_tr": [
            "Sınırsız HC kotası",
            "Özel SLA anlaşması",
            "API entegrasyonu",
            "Özel alan adı desteği",
            "7/24 kurumsal destek",
        ],
        "features_en": [
            "Unlimited HC quota",
            "Custom SLA agreement",
            "API integration",
            "Custom domain support",
            "24/7 enterprise support",
        ],
        "is_free": False,
        "is_enterprise": True,
    },
]



#helpers
# 1 coin = 10 unit (0.1 coin)
COIN_UNIT = 10
MB_PER_COIN_MONTH = 100.0
MIN_MONTHLY_UNITS = 2   # 0.2 coin
STEP_UNITS = 1          # 0.1 coin

def monthly_hosting_units(asset_size_bytes: int) -> int:
    mb = asset_size_bytes / (1024 * 1024)
    units_mult = max(1, math.ceil(mb / MB_PER_COIN_MONTH))
    raw = units_mult * STEP_UNITS
    return max(MIN_MONTHLY_UNITS, raw)

def hosting_units(term: str, asset_size_bytes: int) -> int:
    m = monthly_hosting_units(asset_size_bytes)
    if term == "monthly":
        return m
    return m * 10  # yearly: 10 ay ücret

def compute_hosting_ends(term: str) -> datetime:
    now = datetime.now(timezone.utc)
    if term == "monthly":
        return now + timedelta(days=30)
    return now + timedelta(days=365)

#helpers

def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)


def verify_password(pw: str, pw_hash: str) -> bool:
    return pwd_context.verify(pw, pw_hash)


# ── Email token helpers ────────────────────────────────────────────────────────
_email_signer: Optional[URLSafeTimedSerializer] = None

def get_signer() -> URLSafeTimedSerializer:
    global _email_signer
    if _email_signer is None:
        _email_signer = URLSafeTimedSerializer(settings.email_token_secret)
    return _email_signer


def make_email_token(payload: dict) -> str:
    return get_signer().dumps(payload)


def verify_email_token(token: str, max_age: int = 86400) -> dict:
    """Raises on expired / invalid."""
    return get_signer().loads(token, max_age=max_age)


async def send_email_async(to: str, subject: str, html_body: str) -> None:
    if not settings.smtp_host:
        logger.warning(
            "[EMAIL — no SMTP configured] To: %s | Subject: %s\nBody: %s",
            to, subject, html_body
        )
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=True,
        )
    except Exception as exc:
        logger.error("SMTP send failed: %s", exc)
# ──────────────────────────────────────────────────────────────────────────────


def create_access_token(*, user_id: int, role: Role) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user_id), "role": role.value, "iat": int(now.timestamp()), "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_partial_token(*, user_id: int) -> str:
    """Short-lived token issued after password check when 2FA is required."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=120)
    payload = {"sub": str(user_id), "partial": True, "iat": int(now.timestamp()), "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


class CurrentUser(BaseModel):
    id: int
    role: Role
    email: EmailStr


from fastapi import Header


def _hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


async def get_current_user(db: AsyncSession = Depends(get_db), Authorization: Optional[str] = Header(default=None)) -> CurrentUser:
    if not Authorization or not Authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = Authorization.split(" ", 1)[1].strip()

    # API key path: tokens start with "hc_live_"
    if token.startswith("hc_live_"):
        key_hash = _hash_api_key(token)
        res = await db.execute(
            select(ApiKey).where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_active.is_(True),
            )
        )
        api_key = res.scalar_one_or_none()
        if not api_key:
            raise HTTPException(status_code=401, detail="Invalid API key")
        if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="API key expired")
        # Update last_used_at (fire-and-forget style)
        api_key.last_used_at = datetime.now(timezone.utc)
        await db.commit()
        # Load user
        user_res = await db.execute(select(User).where(User.id == api_key.user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return CurrentUser(id=user.id, role=user.role, email=user.email)

    # JWT path
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
        role = Role(payload.get("role"))
        # Reject partial tokens (2FA pending)
        if payload.get("partial"):
            raise HTTPException(status_code=401, detail="2FA verification required")
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return CurrentUser(id=user.id, role=user.role, email=user.email)


def require_role(*allowed: Role):
    async def _guard(u: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if u.role not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return u
    return _guard


def ensure_dirs():
    base = Path(settings.local_storage_dir)
    (base / "templates").mkdir(parents=True, exist_ok=True)
    (base / "pdfs").mkdir(parents=True, exist_ok=True)


def local_path_from_url(url_or_path: str) -> Path:
    """Convert a stored URL or relative path → absolute local filesystem path."""
    if url_or_path.startswith(("http://", "https://")):
        # Extract relative part after /api/files/
        marker = "/api/files/"
        idx = url_or_path.find(marker)
        if idx != -1:
            rel = url_or_path[idx + len(marker):]
            return Path(settings.local_storage_dir) / rel
        # fallback: use everything after last /
        return Path(settings.local_storage_dir) / url_or_path.rsplit("/", 1)[-1]
    p = Path(url_or_path)
    if p.is_absolute():
        return p
    return Path(settings.local_storage_dir) / p


def build_public_pdf_url(rel_path: str) -> str:
    return f"{settings.public_base_url}/api/files/{rel_path}"


app = FastAPI(title="HeptaCert API", version="2.0.0")

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [o.strip() for o in settings.cors_origins.split(",")] if settings.cors_origins else ["*"]
# When wildcard, allow_credentials must be False (browser blocks credentials+wildcard per CORS spec).
# JWT auth uses Authorization header — no cookies — so credentials=False is fine.
if origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ── Audit log middleware ──────────────────────────────────────────────────────
_AUDIT_SKIP_PREFIXES = (
    "/api/auth/", "/api/billing/webhook/", "/api/files/",
    "/api/verify/", "/api/pricing/", "/api/stats", "/api/billing/status",
    "/docs", "/openapi", "/redoc",
)

@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    response = await call_next(request)
    method = request.method
    path = request.url.path

    if method in ("POST", "PATCH", "PUT", "DELETE") and not any(
        path.startswith(p) for p in _AUDIT_SKIP_PREFIXES
    ):
        # Extract user from JWT without raising
        user_id: Optional[int] = None
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1]
            try:
                if not token.startswith("hc_live_"):
                    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
                    user_id = int(payload.get("sub", 0)) or None
            except Exception:
                pass

        # Determine resource type/id from path
        parts = [p for p in path.split("/") if p]
        resource_type: Optional[str] = None
        resource_id: Optional[str] = None
        if len(parts) >= 3:
            resource_type = parts[2]  # e.g. "events", "certificates"
        if len(parts) >= 4:
            resource_id = parts[3]

        ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else None)
        if ip and "," in ip:
            ip = ip.split(",")[0].strip()

        async with SessionLocal() as db:
            db.add(AuditLog(
                user_id=user_id,
                action=f"{method} {path}",
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip,
                user_agent=request.headers.get("User-Agent", "")[:512],
                extra={"status_code": response.status_code},
            ))
            await db.commit()

    return response


@app.on_event("startup")
async def startup():
    ensure_dirs()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.email == str(settings.bootstrap_superadmin_email)))
        exists = res.scalar_one_or_none()
        if not exists:
            u = User(
                email=str(settings.bootstrap_superadmin_email),
                password_hash=hash_password(settings.bootstrap_superadmin_password),
                role=Role.superadmin,
                heptacoin_balance=0,
                is_verified=True,
            )
            db.add(u)
            await db.commit()

    # Fix any stored URLs that still reference old ports/hosts
    # (e.g. localhost:8000 from before port change to 8765)
    old_prefixes = ["http://localhost:8000", "http://localhost:3000"]
    new_base = settings.public_base_url  # e.g. http://localhost:8765
    async with SessionLocal() as db:
        from sqlalchemy import text as sa_text
        for old in old_prefixes:
            if old != new_base:
                await db.execute(sa_text(
                    "UPDATE events SET template_image_url = replace(template_image_url, :old, :new) "
                    "WHERE template_image_url LIKE :pattern"
                ), {"old": old, "new": new_base, "pattern": f"{old}%"})
                await db.execute(sa_text(
                    "UPDATE certificates SET pdf_url = replace(pdf_url, :old, :new) "
                    "WHERE pdf_url LIKE :pattern"
                ), {"old": old, "new": new_base, "pattern": f"{old}%"})
        await db.commit()
        logger.info("Startup URL migration complete.")

    # Start background scheduler for expiring cert notifications
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        scheduler = AsyncIOScheduler(timezone="UTC")

        async def _notify_expiring_certs():
            """Email admins about certs expiring in 7 days or 1 day."""
            now = datetime.now(timezone.utc)
            thresholds = [now + timedelta(days=7), now + timedelta(days=1)]
            async with SessionLocal() as db:
                for threshold in thresholds:
                    window_start = threshold - timedelta(hours=1)
                    window_end   = threshold + timedelta(hours=1)
                    res = await db.execute(
                        select(Certificate, Event, User)
                        .join(Event, Certificate.event_id == Event.id)
                        .join(User, Event.admin_id == User.id)
                        .where(
                            Certificate.status == CertStatus.active,
                            Certificate.deleted_at.is_(None),
                            Certificate.hosting_ends_at >= window_start,
                            Certificate.hosting_ends_at <= window_end,
                        )
                    )
                    rows = res.all()
                    # Group by admin
                    by_admin: Dict[int, list] = {}
                    for cert, ev, admin in rows:
                        by_admin.setdefault(admin.id, {"email": admin.email, "certs": []})
                        by_admin[admin.id]["certs"].append({
                            "name": cert.student_name,
                            "event": ev.name,
                            "ends": cert.hosting_ends_at.strftime("%d.%m.%Y"),
                        })
                    for _, data in by_admin.items():
                        days_left = int((threshold - now).total_seconds() / 86400)
                        rows_html = "".join(
                            f"<tr><td>{c['name']}</td><td>{c['event']}</td><td>{c['ends']}</td></tr>"
                            for c in data["certs"]
                        )
                        html = f"""
                        <h2>⚠️ Barındırma Süresi Doluyor — {days_left} Gün</h2>
                        <p>Aşağıdaki sertifikaların barındırma süresi yakında dolacak. Yenilemek için panele giriş yapın.</p>
                        <table border="1" cellpadding="6" style="border-collapse:collapse">
                        <tr><th>Katılımcı</th><th>Etkinlik</th><th>Bitiş Tarihi</th></tr>
                        {rows_html}
                        </table>
                        <p><a href="{settings.frontend_base_url}/admin/events">Panele Git →</a></p>
                        """
                        await send_email_async(
                            data["email"],
                            f"⚠️ HeptaCert: {len(data['certs'])} sertifikanın barındırma süresi {days_left} günde doluyor",
                            html,
                        )

        scheduler.add_job(_notify_expiring_certs, "cron", hour=2, minute=0)
        scheduler.start()
        logger.info("APScheduler started — expiring cert notifications active")
    except Exception as e:
        logger.warning("APScheduler init failed (non-fatal): %s", e)


def bad_request(msg: str) -> HTTPException:
    return HTTPException(status_code=400, detail=msg)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


def editor_config_to_template_config(raw: dict) -> "TemplateConfig":
    """Translate nested EditorConfig or flat legacy format → TemplateConfig."""
    if "name" in raw and isinstance(raw.get("name"), dict):
        name = raw["name"]
        cert_id = raw.get("cert_id") or {}
        qr = raw.get("qr") or {}
        return TemplateConfig(
            isim_x=int(name.get("x", 620)),
            isim_y=int(name.get("y", 438)),
            font_size=int(name.get("font_size", 48)),
            font_color=str(name.get("font_color", "#FFFFFF")),
            qr_x=int(qr.get("x", 80)),
            qr_y=int(qr.get("y", 700)),
            cert_id_x=int(cert_id.get("x", 60)),
            cert_id_y=int(cert_id.get("y", 60)),
            cert_id_font_size=int(cert_id.get("font_size", 18)),
            cert_id_color=str(cert_id.get("font_color", "#94A3B8")),
            show_hologram=bool(raw.get("show_hologram", True)),
        )
    else:
        return TemplateConfig(
            isim_x=int(raw.get("isim_x", 620)),
            isim_y=int(raw.get("isim_y", 438)),
            qr_x=int(raw.get("qr_x", 80)),
            qr_y=int(raw.get("qr_y", 700)),
            font_size=int(raw.get("font_size", 48)),
            font_color=str(raw.get("font_color", "#FFFFFF")),
            cert_id_x=int(raw.get("cert_id_x", 60)),
            cert_id_y=int(raw.get("cert_id_y", 60)),
            cert_id_font_size=int(raw.get("cert_id_font_size", 18)),
            cert_id_color=str(raw.get("cert_id_color", "#94A3B8")),
            show_hologram=bool(raw.get("show_hologram", True)),
        )


@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, data: LoginIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == str(data.email)))
    user = res.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Geçersiz e-posta veya şifre.")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="E-posta adresinizi doğrulamanız gerekiyor. Lütfen gelen kutunuzu kontrol edin.")

    # Check if 2FA is enabled for this user
    totp_res = await db.execute(select(TotpSecret).where(TotpSecret.user_id == user.id, TotpSecret.enabled.is_(True)))
    totp = totp_res.scalar_one_or_none()
    if totp:
        partial = create_partial_token(user_id=user.id)
        return LoginWith2FAOut(requires_2fa=True, partial_token=partial)

    return LoginWith2FAOut(
        requires_2fa=False,
        access_token=create_access_token(user_id=user.id, role=user.role),
    )


@app.post("/api/auth/register", status_code=201)
@limiter.limit("3/minute")
async def register(request: Request, data: RegisterIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == str(data.email)))
    if res.scalar_one_or_none():
        raise bad_request("Bu e-posta adresi zaten kayıtlı.")

    token = make_email_token({"email": str(data.email), "action": "verify"})
    user = User(
        email=str(data.email),
        password_hash=hash_password(data.password),
        role=Role.admin,
        heptacoin_balance=100,  # 100 HC hoş geldin hediyesi
        is_verified=False,
        verification_token=token,
    )
    db.add(user)
    await db.commit()

    verify_link = f"{settings.frontend_base_url}/verify-email?token={token}"
    await send_email_async(
        to=str(data.email),
        subject="HeptaCert — E-posta Adresinizi Doğrulayın",
        html_body=f"""
        <p>Merhaba,</p>
        <p>HeptaCert'e hoş geldiniz! Hesabınızı aktif etmek için aşağıdaki bağlantıya tıklayın:</p>
        <p><a href="{verify_link}">{verify_link}</a></p>
        <p>Bu bağlantı 24 saat geçerlidir.</p>
        """,
    )
    return {"detail": "Kayıt başarılı. Aktivasyon e-postası gönderildi."}


@app.get("/api/auth/verify-email")
async def verify_email_endpoint(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    try:
        payload = verify_email_token(token, max_age=86400)
    except SignatureExpired:
        raise bad_request("Doğrulama bağlantısının süresi dolmuş. Lütfen yeniden kayıt olun.")
    except (BadSignature, Exception):
        raise bad_request("Geçersiz doğrulama bağlantısı.")

    if payload.get("action") != "verify":
        raise bad_request("Geçersiz token türü.")

    email = payload.get("email")
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if user.is_verified:
        return {"detail": "Hesabınız zaten doğrulanmış."}

    user.is_verified = True
    user.verification_token = None
    await db.commit()
    return {"detail": "E-posta başarıyla doğrulandı. Giriş yapabilirsiniz."}


@app.post("/api/auth/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: ForgotPasswordIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == str(data.email)))
    user = res.scalar_one_or_none()
    # Always return 200 to avoid email enumeration
    if user and user.is_verified:
        token = make_email_token({"email": str(data.email), "action": "reset"})
        user.password_reset_token = token
        await db.commit()

        reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"
        await send_email_async(
            to=str(data.email),
            subject="HeptaCert — Şifre Sıfırlama",
            html_body=f"""
            <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
            <p><a href="{reset_link}">{reset_link}</a></p>
            <p>Bu bağlantı 1 saat geçerlidir.</p>
            """,
        )
    return {"detail": "Şifre sıfırlama talimatları e-posta adresinize gönderildi."}


@app.post("/api/auth/reset-password")
async def reset_password(data: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    try:
        payload = verify_email_token(data.token, max_age=3600)
    except SignatureExpired:
        raise bad_request("Şifre sıfırlama bağlantısının süresi dolmuş.")
    except (BadSignature, Exception):
        raise bad_request("Geçersiz sıfırlama bağlantısı.")

    if payload.get("action") != "reset":
        raise bad_request("Geçersiz token türü.")

    email = payload.get("email")
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    user.password_hash = hash_password(data.new_password)
    user.password_reset_token = None
    await db.commit()
    return {"detail": "Şifreniz başarıyla güncellendi."}


class AdminListItem(BaseModel):
    id: int
    email: EmailStr
    heptacoin_balance: int
    created_at: datetime

class TxListItem(BaseModel):
    id: int
    user_id: int
    amount: int
    type: TxType
    timestamp: datetime

class TxListOut(BaseModel):
    items: List[TxListItem]
    total: int
    page: int
    limit: int


class AdminRowOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    heptacoin_balance: int

@app.get("/api/superadmin/admins", response_model=list[AdminRowOut], dependencies=[Depends(require_role(Role.superadmin))])
async def list_admins(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.role.in_([Role.admin, Role.superadmin])).order_by(User.id.asc()))
    users = res.scalars().all()
    return [
        AdminRowOut(
            id=u.id,
            email=u.email,
            role=u.role,                  # <-- kritik
            heptacoin_balance=u.heptacoin_balance
        )
        for u in users
    ]


@app.get("/api/superadmin/transactions", response_model=TxListOut, dependencies=[Depends(require_role(Role.superadmin))])
async def list_transactions(
    user_id: Optional[int] = None,
    page: int = 1,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
):
    if page < 1 or limit < 1 or limit > 200:
        raise bad_request("Invalid page/limit")

    q = select(Transaction)
    if user_id:
        q = q.where(Transaction.user_id == user_id)

    res_total = await db.execute(select(func.count()).select_from(q.subquery()))
    total = int(res_total.scalar_one())

    q = q.order_by(Transaction.timestamp.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    items = res.scalars().all()

    return TxListOut(
        items=[
            TxListItem(
                id=t.id,
                user_id=t.user_id,
                amount=t.amount,
                type=t.type,
                timestamp=t.timestamp,
            )
            for t in items
        ],
        total=total,
        page=page,
        limit=limit,
    )


@app.post("/api/superadmin/admins", dependencies=[Depends(require_role(Role.superadmin))])
async def create_admin(payload: CreateAdminIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == str(payload.email)))
    if res.scalar_one_or_none():
        raise bad_request("Email already exists")

    admin = User(
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        role=Role.admin,
        heptacoin_balance=0,
        is_verified=True,  # superadmin tarafından oluşturulan hesaplar otomatik doğrulanır
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return {"id": admin.id, "email": admin.email, "role": admin.role, "heptacoin_balance": admin.heptacoin_balance}


class AdminRoleIn(BaseModel):
    role: str = Field(pattern="^(admin|superadmin)$")


@app.delete("/api/superadmin/admins/{admin_id}", dependencies=[Depends(require_role(Role.superadmin))])
async def delete_admin(
    admin_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if admin_id == me.id:
        raise bad_request("Kendi hesabınızı silemezsiniz.")
    res = await db.execute(select(User).where(User.id == admin_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found")
    await db.delete(user)
    await db.commit()
    return {"ok": True}


@app.patch("/api/superadmin/admins/{admin_id}/role", dependencies=[Depends(require_role(Role.superadmin))])
async def change_admin_role(
    admin_id: int,
    payload: AdminRoleIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if admin_id == me.id:
        raise bad_request("Kendi rolünüzü değiştiremezsiniz.")
    res = await db.execute(select(User).where(User.id == admin_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found")
    user.role = Role(payload.role)
    await db.commit()
    return {"ok": True, "new_role": payload.role}


@app.get("/api/admin/transactions", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def my_transactions(
    limit: int = Query(default=50, le=200),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == me.id)
        .order_by(Transaction.timestamp.desc())
        .limit(limit)
    )
    txs = res.scalars().all()
    return [{"id": t.id, "amount": t.amount, "type": t.type, "timestamp": t.timestamp} for t in txs]


@app.post("/api/superadmin/coins/credit", dependencies=[Depends(require_role(Role.superadmin))])
async def credit_coins(payload: CreditCoinsIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.id == payload.admin_user_id))
    user = res.scalar_one_or_none()
    if not user or user.role != Role.admin:
        raise bad_request("Admin user not found")

    user.heptacoin_balance += payload.amount
    db.add(Transaction(user_id=user.id, amount=payload.amount, type=TxType.credit))
    await db.commit()
    return {"admin_user_id": user.id, "new_balance": user.heptacoin_balance}


# ── Pricing Config (public GET + superadmin PATCH) ────────────────────────────

@app.get("/api/pricing/config", response_model=PricingConfigOut)
async def get_pricing_config(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "pricing"))
    cfg = res.scalar_one_or_none()
    if cfg is None or not cfg.value.get("tiers"):
        return PricingConfigOut(tiers=[PricingTier(**t) for t in DEFAULT_PRICING])
    return PricingConfigOut(tiers=[PricingTier(**t) for t in cfg.value["tiers"]])


@app.get("/api/superadmin/pricing", response_model=PricingConfigOut, dependencies=[Depends(require_role(Role.superadmin))])
async def get_pricing_config_admin(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "pricing"))
    cfg = res.scalar_one_or_none()
    if cfg is None or not cfg.value.get("tiers"):
        return PricingConfigOut(tiers=[PricingTier(**t) for t in DEFAULT_PRICING])
    return PricingConfigOut(tiers=[PricingTier(**t) for t in cfg.value["tiers"]])


@app.patch("/api/superadmin/pricing", response_model=PricingConfigOut, dependencies=[Depends(require_role(Role.superadmin))])
async def update_pricing_config(payload: PricingConfigOut, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "pricing"))
    cfg = res.scalar_one_or_none()
    data = {"tiers": [t.model_dump() for t in payload.tiers]}
    if cfg is None:
        cfg = SystemConfig(key="pricing", value=data)
        db.add(cfg)
    else:
        cfg.value = data
    await db.commit()
    return payload


# ── Public Stats ──────────────────────────────────────────────────────────────

DEFAULT_STATS = {
    "active_orgs": "500+",
    "certs_issued": "50.000+",
    "uptime_pct": "%100",
    "availability": "7/24",
}


class StatsOut(BaseModel):
    active_orgs: str
    certs_issued: str
    uptime_pct: str
    availability: str


class StatsIn(BaseModel):
    active_orgs: Optional[str] = None
    certs_issued: Optional[str] = None
    uptime_pct: Optional[str] = None
    availability: Optional[str] = None
    use_real_counts: bool = True


@app.get("/api/stats", response_model=StatsOut)
async def get_public_stats(db: AsyncSession = Depends(get_db)):
    """Public stats endpoint — returns display values (overridden by superadmin or real DB counts)."""
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "stats"))
    cfg = res.scalar_one_or_none()
    overrides: dict = cfg.value if cfg else {}

    if overrides.get("use_real_counts", True):
        # Real DB counts
        org_count_res = await db.execute(
            select(func.count(func.distinct(Event.admin_id)))
        )
        org_count = org_count_res.scalar_one() or 0
        cert_count_res = await db.execute(
            select(func.count()).select_from(Certificate).where(Certificate.deleted_at.is_(None))
        )
        cert_count = cert_count_res.scalar_one() or 0

        return StatsOut(
            active_orgs=overrides.get("active_orgs") or f"{org_count:,}".replace(",", "."),
            certs_issued=overrides.get("certs_issued") or f"{cert_count:,}".replace(",", "."),
            uptime_pct=overrides.get("uptime_pct") or DEFAULT_STATS["uptime_pct"],
            availability=overrides.get("availability") or DEFAULT_STATS["availability"],
        )

    return StatsOut(
        active_orgs=overrides.get("active_orgs", DEFAULT_STATS["active_orgs"]),
        certs_issued=overrides.get("certs_issued", DEFAULT_STATS["certs_issued"]),
        uptime_pct=overrides.get("uptime_pct", DEFAULT_STATS["uptime_pct"]),
        availability=overrides.get("availability", DEFAULT_STATS["availability"]),
    )


@app.get("/api/superadmin/stats", response_model=dict, dependencies=[Depends(require_role(Role.superadmin))])
async def get_stats_config(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "stats"))
    cfg = res.scalar_one_or_none()
    return cfg.value if cfg else {**DEFAULT_STATS, "use_real_counts": True}


@app.patch("/api/superadmin/stats", response_model=dict, dependencies=[Depends(require_role(Role.superadmin))])
async def update_stats_config(payload: StatsIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "stats"))
    cfg = res.scalar_one_or_none()
    data = payload.model_dump(exclude_none=False)
    if cfg is None:
        cfg = SystemConfig(key="stats", value=data)
        db.add(cfg)
    else:
        cfg.value = data
    await db.commit()
    return data


# ── Billing / Payment endpoints ───────────────────────────────────────────────

from .payments import get_provider, PaymentRequest  # noqa: E402


class CreatePaymentIn(BaseModel):
    plan_id: str
    billing_period: str = "monthly"   # "monthly" | "annual"


class OrderOut(BaseModel):
    id: int
    plan_id: str
    amount_cents: int
    currency: str
    provider: str
    status: str
    created_at: datetime
    paid_at: Optional[datetime]


@app.get("/api/billing/status")
async def billing_status():
    """Returns whether payment is enabled and which provider is active."""
    return {
        "enabled": settings.payment_enabled,
        "provider": settings.active_payment_provider if settings.payment_enabled else None,
        "stripe_publishable_key": settings.stripe_publishable_key if settings.payment_enabled and settings.active_payment_provider == "stripe" else None,
    }


@app.post("/api/billing/create-payment")
async def create_payment(
    payload: CreatePaymentIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.payment_enabled:
        raise HTTPException(status_code=503, detail="Payment system is not yet enabled.")

    provider = get_provider(settings)
    if provider is None:
        raise HTTPException(status_code=503, detail="No payment provider configured.")

    # Lookup pricing tier for amount
    cfg_res = await db.execute(select(SystemConfig).where(SystemConfig.key == "pricing"))
    pricing_cfg = cfg_res.scalar_one_or_none()
    tiers = pricing_cfg.value.get("tiers", []) if pricing_cfg else []

    tier = next((t for t in tiers if t.get("id") == payload.plan_id), None)
    if tier is None:
        raise HTTPException(status_code=404, detail="Plan not found.")

    if payload.billing_period == "annual":
        price = tier.get("price_annual")
    else:
        price = tier.get("price_monthly")

    if price is None:
        raise HTTPException(status_code=400, detail="This plan requires custom pricing. Contact sales.")

    amount_cents = int(float(price) * 100)

    # Create Order record
    order = Order(
        user_id=me.id,
        plan_id=payload.plan_id,
        amount_cents=amount_cents,
        currency="TRY",
        provider=provider.name,
        status=OrderStatus.pending,
        meta={"billing_period": payload.billing_period},
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    client_ip = request.client.host if request.client else "127.0.0.1"
    frontend = settings.frontend_base_url.rstrip("/")

    pay_req = PaymentRequest(
        order_id=str(order.id),
        amount_cents=amount_cents,
        currency="TRY",
        description=f"HeptaCert {tier.get('name_tr', payload.plan_id)} - {payload.billing_period}",
        customer_email=me.email,
        customer_name=me.email.split("@")[0],
        customer_ip=client_ip,
        success_url=f"{frontend}/checkout/success?order_id={order.id}",
        cancel_url=f"{frontend}/checkout/cancel?order_id={order.id}",
        webhook_url=f"{settings.public_base_url}/api/billing/webhook/{provider.name}",
    )

    result = await provider.create_payment(pay_req)

    if not result.success:
        order.status = OrderStatus.failed
        await db.commit()
        raise HTTPException(status_code=502, detail=result.error or "Payment initiation failed.")

    order.provider_ref = result.provider_ref
    await db.commit()

    return {
        "order_id": order.id,
        "checkout_url": result.checkout_url,
        "checkout_html": result.checkout_html,
        "provider": provider.name,
    }


@app.post("/api/billing/webhook/{provider_name}")
async def payment_webhook(
    provider_name: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Server-to-server payment notification from provider."""
    if not settings.payment_enabled:
        return {"ok": True}

    provider = get_provider(settings)
    if provider is None or provider.name != provider_name:
        raise HTTPException(status_code=400, detail="Unknown provider")

    raw_body = await request.body()
    headers = dict(request.headers)

    try:
        notification = provider.verify_webhook(raw_body, headers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    order_id_raw = notification.get("order_id")
    if not order_id_raw:
        return {"ok": True}

    try:
        order_id = int(order_id_raw)
    except (ValueError, TypeError):
        return {"ok": True}

    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalar_one_or_none()
    if order is None:
        return {"ok": True}

    status = notification.get("status", "failed")
    order.provider_ref = notification.get("provider_ref", order.provider_ref)

    if status == "paid" and order.status != OrderStatus.paid:
        order.status = OrderStatus.paid
        order.paid_at = datetime.now(timezone.utc)
        # Create or extend subscription
        sub_res = await db.execute(
            select(Subscription).where(Subscription.user_id == order.user_id, Subscription.plan_id == order.plan_id, Subscription.is_active == True)
        )
        existing_sub = sub_res.scalar_one_or_none()
        period = (order.meta or {}).get("billing_period", "monthly")
        delta = timedelta(days=365 if period == "annual" else 31)
        if existing_sub:
            now = datetime.now(timezone.utc)
            base = max(existing_sub.expires_at or now, now)
            existing_sub.expires_at = base + delta
        else:
            db.add(Subscription(
                user_id=order.user_id,
                plan_id=order.plan_id,
                order_id=order.id,
                expires_at=datetime.now(timezone.utc) + delta,
                is_active=True,
            ))
    elif status == "failed":
        order.status = OrderStatus.failed
    elif status == "refunded":
        order.status = OrderStatus.refunded

    await db.commit()
    return {"ok": True}


@app.get("/api/billing/orders", response_model=List[OrderOut])
async def list_orders(me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Order).where(Order.user_id == me.id).order_by(Order.created_at.desc()).limit(50)
    )
    orders = res.scalars().all()
    return [OrderOut(
        id=o.id, plan_id=o.plan_id, amount_cents=o.amount_cents, currency=o.currency,
        provider=o.provider, status=o.status, created_at=o.created_at, paid_at=o.paid_at,
    ) for o in orders]


@app.get("/api/billing/subscription")
async def my_subscription(me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Subscription).where(Subscription.user_id == me.id, Subscription.is_active == True)
        .order_by(Subscription.expires_at.desc()).limit(1)
    )
    sub = res.scalar_one_or_none()
    if sub is None:
        return {"active": False, "plan_id": None, "expires_at": None}
    now = datetime.now(timezone.utc)
    is_valid = sub.expires_at is None or sub.expires_at > now
    return {
        "active": is_valid,
        "plan_id": sub.plan_id,
        "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
    }


# Superadmin: payment config management
class PaymentConfigOut(BaseModel):
    enabled: bool
    active_provider: str
    iyzico_api_key: str
    iyzico_secret_key: str
    iyzico_base_url: str
    paytr_merchant_id: str
    paytr_merchant_key: str
    paytr_merchant_salt: str
    stripe_secret_key: str
    stripe_webhook_secret: str
    stripe_publishable_key: str


@app.get("/api/superadmin/payment-config", dependencies=[Depends(require_role(Role.superadmin))])
async def get_payment_config(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "payment_config"))
    cfg = res.scalar_one_or_none()
    data = cfg.value if cfg else {}
    # Merge DB overrides with current env settings
    return {
        "enabled": data.get("enabled", settings.payment_enabled),
        "active_provider": data.get("active_provider", settings.active_payment_provider),
        "iyzico_api_key": data.get("iyzico_api_key", settings.iyzico_api_key),
        "iyzico_secret_key": data.get("iyzico_secret_key", settings.iyzico_secret_key),
        "iyzico_base_url": data.get("iyzico_base_url", settings.iyzico_base_url),
        "paytr_merchant_id": data.get("paytr_merchant_id", settings.paytr_merchant_id),
        "paytr_merchant_key": data.get("paytr_merchant_key", settings.paytr_merchant_key),
        "paytr_merchant_salt": data.get("paytr_merchant_salt", settings.paytr_merchant_salt),
        "stripe_secret_key": data.get("stripe_secret_key", settings.stripe_secret_key),
        "stripe_webhook_secret": data.get("stripe_webhook_secret", settings.stripe_webhook_secret),
        "stripe_publishable_key": data.get("stripe_publishable_key", settings.stripe_publishable_key),
    }


@app.patch("/api/superadmin/payment-config", dependencies=[Depends(require_role(Role.superadmin))])
async def update_payment_config(payload: PaymentConfigOut, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemConfig).where(SystemConfig.key == "payment_config"))
    cfg = res.scalar_one_or_none()
    data = payload.model_dump()
    if cfg is None:
        cfg = SystemConfig(key="payment_config", value=data)
        db.add(cfg)
    else:
        cfg.value = data
    await db.commit()
    return data


# ───────────────────────────────────────────────────────────────────────────── dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_event(payload: EventCreateIn, me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ev = Event(
        admin_id=me.id,
        name=payload.name,
        template_image_url=payload.template_image_url,
        config=payload.config or {},
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    return EventOut(id=ev.id, name=ev.name, template_image_url=ev.template_image_url, config=ev.config or {})


class MeOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    heptacoin_balance: int

@app.get("/api/me", response_model=MeOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def me(me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.id == me.id))
    u = res.scalar_one()
    return MeOut(id=u.id, email=u.email, role=u.role, heptacoin_balance=u.heptacoin_balance)


@app.patch("/api/me/password", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def change_password(
    data: ChangePasswordIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == me.id))
    user = res.scalar_one()
    if not verify_password(data.current_password, user.password_hash):
        raise bad_request("Mevcut şifre yanlış.")
    user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"detail": "Şifre başarıyla güncellendi."}


@app.patch("/api/me/email", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def change_email(
    data: ChangeEmailIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == me.id))
    user = res.scalar_one()
    if not verify_password(data.current_password, user.password_hash):
        raise bad_request("Mevcut şifre yanlış.")
    exists = await db.execute(select(User).where(User.email == str(data.new_email)))
    if exists.scalar_one_or_none():
        raise bad_request("Bu e-posta adresi zaten kullanımda.")
    user.email = str(data.new_email)
    await db.commit()
    return {"detail": "E-posta başarıyla güncellendi."}


@app.get("/api/admin/events", response_model=list[EventOut], dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_events(me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Event).where(Event.admin_id == me.id).order_by(Event.created_at.desc())
    )
    items = res.scalars().all()
    return [EventOut(id=e.id, name=e.name, template_image_url=e.template_image_url, config=e.config or {}) for e in items]


@app.post("/api/admin/events", response_model=EventOut, status_code=201, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_event(
    payload: EventCreateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = Event(
        admin_id=me.id,
        name=payload.name,
        template_image_url=payload.template_image_url or "placeholder",
        config=payload.config or {},
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    return EventOut(id=ev.id, name=ev.name, template_image_url=ev.template_image_url, config=ev.config or {})


@app.get("/api/admin/events/{event_id}", response_model=EventOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def get_event(event_id: int, me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventOut(id=ev.id, name=ev.name, template_image_url=ev.template_image_url, config=ev.config or {})


@app.patch("/api/admin/events/{event_id}", response_model=EventOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def rename_event(
    event_id: int,
    payload: EventRenameIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    ev.name = payload.name
    await db.commit()
    return EventOut(id=ev.id, name=ev.name, template_image_url=ev.template_image_url, config=ev.config or {})


@app.delete("/api/admin/events/{event_id}", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def delete_event(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Superadmin can delete any event; admin can only delete their own
    if me.role == Role.superadmin:
        res = await db.execute(select(Event).where(Event.id == event_id))
    else:
        res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(ev)
    await db.commit()
    return {"ok": True}


@app.post("/api/admin/events/{event_id}/template-upload", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def upload_template(
    event_id: int,
    file: UploadFile = File(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise bad_request("Only image uploads allowed")

    ext = Path(file.filename or "template.png").suffix.lower() or ".png"
    safe_name = f"templates/event_{event_id}_{secrets.token_hex(8)}{ext}"
    dest = Path(settings.local_storage_dir) / safe_name

    data = await file.read()
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Remove old template file from disk before overwriting
    if ev.template_image_url and ev.template_image_url not in ("placeholder", ""):
        try:
            old_path = local_path_from_url(ev.template_image_url)
            if old_path.exists() and "templates/" in str(old_path):
                old_path.unlink(missing_ok=True)
        except Exception as exc:
            logger.warning("Old template cleanup failed for event %s: %s", event_id, exc)

    dest.write_bytes(data)

    # Get image dimensions for the editor
    img_w, img_h = 1240, 877
    if PILImage is not None:
        try:
            img_obj = PILImage.open(io.BytesIO(data))
            img_w, img_h = img_obj.size
        except Exception:
            pass

    # Save template snapshot before overwriting
    snap = EventTemplateSnapshot(
        event_id=event_id,
        template_image_url=ev.template_image_url,
        config=ev.config,
        created_by=me.id,
    )
    db.add(snap)

    ev.template_image_url = safe_name
    await db.commit()
    pub_url = f"{settings.public_base_url}/api/files/{safe_name}"
    return {"template_image_url": safe_name, "url": pub_url, "width": img_w, "height": img_h}


@app.put("/api/admin/events/{event_id}/config", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def save_event_config(
    event_id: int,
    payload: Dict[str, Any] = Body(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    # Save config snapshot before overwriting
    snap = EventTemplateSnapshot(
        event_id=event_id,
        template_image_url=ev.template_image_url,
        config=ev.config,
        created_by=me.id,
    )
    db.add(snap)

    ev.config = payload
    await db.commit()
    return {"event_id": ev.id, "config": ev.config}


#
@app.post("/api/admin/events/{event_id}/bulk-generate", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def bulk_generate(
    event_id: int,
    request: Request,
    excel: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Event (admin kontrol)
    res = await db.execute(select(Event).where(Event.id == event_id, Event.admin_id == me.id))
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    if not ev.config:
        raise bad_request("Event config missing. Save coordinates in editor first.")
    try:
        cfg = editor_config_to_template_config(ev.config)
    except Exception as e:
        raise bad_request(f"Invalid event config: {e}")

    # File size limit: 5MB
    MAX_EXCEL_SIZE = 5 * 1024 * 1024
    raw = await excel.read()
    if len(raw) > MAX_EXCEL_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Excel dosyası çok büyük. Maksimum {MAX_EXCEL_SIZE // (1024*1024)} MB.",
        )
    try:
        df = pd.read_excel(io.BytesIO(raw))
    except Exception:
        raise bad_request("Excel parse failed. Ensure .xlsx and readable sheet.")

    if df.empty:
        raise bad_request("Excel is empty")

    col = None
    for c in df.columns:
        lc = str(c).strip().lower()
        if lc in ("name", "student_name", "isim", "ad soyad", "fullname", "full_name"):
            col = c
            break
    if col is None:
        col = df.columns[0]

    names = [str(x).strip() for x in df[col].tolist() if str(x).strip() and str(x).strip().lower() != "nan"]
    if not names:
        raise bad_request("No names found in Excel")
    if len(names) > 1000:
        raise bad_request("Excel'de en fazla 1000 isim işlenebilir. Dosyayı bölerek tekrar deneyin.")

    # User
    res_u = await db.execute(select(User).where(User.id == me.id))
    user = res_u.scalar_one()

    # Template bytes
    template_path = local_path_from_url(ev.template_image_url)
    if not template_path.exists():
        raise bad_request("Template image not found on server. Upload template or fix template_image_url.")
    template_bytes = template_path.read_bytes()

    # Brand logo for QR overlay (from user's organization)
    org_res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = org_res.scalar_one_or_none()
    brand_logo_bytes: Optional[bytes] = None
    if org and org.brand_logo:
        try:
            logo_path = local_path_from_url(org.brand_logo)
            if logo_path.exists():
                brand_logo_bytes = logo_path.read_bytes()
        except Exception:
            pass

    # Event lock (cert_seq atomic)
    res_lock = await db.execute(
        select(Event).where(Event.id == ev.id, Event.admin_id == me.id).with_for_update()
    )
    ev = res_lock.scalar_one()

    ISSUE_UNITS_PER_CERT = 10
    HOSTING_ESTIMATE_UNITS = 20  # estimate per cert for early balance check
    term = "yearly"

    # ── Early balance check (before any file I/O) ──────────────────────────────
    estimated_total = len(names) * (ISSUE_UNITS_PER_CERT + HOSTING_ESTIMATE_UNITS)
    if user.heptacoin_balance < estimated_total:
        raise HTTPException(
            status_code=402,
            detail=f"Yetersiz HeptaCoin. TahminiGereksinim={estimated_total}, Bakiye={user.heptacoin_balance}",
        )
    # ──────────────────────────────────────────────────────────────────────────

    created_items: List[Dict[str, Any]] = []
    total_spend_units = 0

    for student_name in names:
        cert_uuid = new_certificate_uuid()

        ev.cert_seq += 1
        public_id = f"EV{ev.id}-{ev.cert_seq:06d}"
        verify_url = f"{settings.public_base_url}/verify/{cert_uuid}"

        # NOTE: generator.py'yı public_id alacak şekilde güncellemen şart
        pdf_bytes = render_certificate_pdf(
            template_image_bytes=template_bytes,
            student_name=student_name,
            verify_url=verify_url,
            config=cfg,
            public_id=public_id,
            brand_logo_bytes=brand_logo_bytes,
        )

        rel_pdf_path = f"pdfs/event_{ev.id}/{cert_uuid}.pdf"
        abs_pdf_path = Path(settings.local_storage_dir) / rel_pdf_path
        abs_pdf_path.parent.mkdir(parents=True, exist_ok=True)
        abs_pdf_path.write_bytes(pdf_bytes)

        asset_size_bytes = abs_pdf_path.stat().st_size
        hosting_spend = hosting_units(term, asset_size_bytes)

        spend_units = ISSUE_UNITS_PER_CERT + hosting_spend
        total_spend_units += spend_units

        pdf_url = build_public_pdf_url(rel_pdf_path)
        hosting_ends_at = compute_hosting_ends(term)

        cert = Certificate(
            uuid=cert_uuid,
            public_id=public_id,
            student_name=student_name,
            event_id=ev.id,
            pdf_url=pdf_url,
            status=CertStatus.active,
            hosting_term=term,
            hosting_ends_at=hosting_ends_at,
            asset_size_bytes=asset_size_bytes,
        )
        db.add(cert)

        created_items.append({
            "uuid": cert_uuid,
            "public_id": public_id,
            "student_name": student_name,
            "status": CertStatus.active,
            "hosting_term": term,
            "hosting_ends_at": hosting_ends_at,
            "pdf_url": pdf_url,
            "spend_units": spend_units,
        })

    # Final precise balance check
    if user.heptacoin_balance < total_spend_units:
        raise HTTPException(
            status_code=402,
            detail=f"Yetersiz HeptaCoin. Gereksinim={total_spend_units}, Bakiye={user.heptacoin_balance}",
        )

    user.heptacoin_balance -= total_spend_units
    db.add(Transaction(user_id=user.id, amount=total_spend_units, type=TxType.spend))

    await db.commit()

    # ── Fire webhook ──────────────────────────────────────────────────────────
    if background_tasks:
        from .webhooks import deliver_webhook, WebhookEvent
        background_tasks.add_task(
            deliver_webhook, db, me.id, WebhookEvent.cert_bulk_completed.value,
            {"event_id": ev.id, "created": len(created_items), "spent_heptacoin": total_spend_units},
        )

    # ── Build ZIP with all PDFs ───────────────────────────────────────────────
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in created_items:
            rel_pdf_path = f"pdfs/event_{ev.id}/{item['uuid']}.pdf"
            abs_pdf_path = Path(settings.local_storage_dir) / rel_pdf_path
            if abs_pdf_path.exists():
                safe_fname = "".join(
                    c if c.isalnum() or c in " _-." else "_"
                    for c in f"{item['student_name']}_{item['public_id']}.pdf"
                )
                zf.write(abs_pdf_path, safe_fname)
    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=certificates-event-{ev.id}.zip",
            "X-Heptacert-Created": str(len(created_items)),
            "X-Heptacert-Spent-HC": str(total_spend_units),
        },
    )



@app.get("/api/verify/{uuid}", response_model=VerifyOut)
async def verify(uuid: str, request: Request, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Certificate, Event)
        .join(Event, Certificate.event_id == Event.id)
        .where(Certificate.uuid == uuid, Certificate.deleted_at.is_(None))
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert, ev = row

    now = datetime.now(timezone.utc)
    if cert.hosting_ends_at and cert.hosting_ends_at < now and cert.status == CertStatus.active:
        cert.status = CertStatus.expired
        await db.commit()

    pdf_url = cert.pdf_url if cert.status == CertStatus.active else None

    # ── Record verification hit ───────────────────────────────────────────────
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    referer = request.headers.get("referer", "")
    db.add(VerificationHit(
        cert_uuid=uuid,
        ip_address=client_ip,
        user_agent=user_agent[:512],
        referer=referer[:512],
    ))

    # ── View count ────────────────────────────────────────────────────────────
    count_res = await db.execute(
        select(func.count()).select_from(
            select(VerificationHit).where(VerificationHit.cert_uuid == uuid).subquery()
        )
    )
    view_count = int(count_res.scalar_one() or 0) + 1  # +1 for current hit

    # ── Organization branding (match Host header to custom_domain) ────────────
    branding: Optional[Dict[str, Any]] = None
    host = request.headers.get("host", "")
    if host:
        domain = host.split(":")[0]
        org_res = await db.execute(
            select(Organization).where(Organization.custom_domain == domain)
        )
        org = org_res.scalar_one_or_none()
        if org:
            branding = {
                "org_name": org.org_name,
                "brand_logo": org.brand_logo,
                "brand_color": org.brand_color,
            }

    # ── LinkedIn URL ──────────────────────────────────────────────────────────
    linkedin_url: Optional[str] = None
    if cert.status == CertStatus.active:
        from urllib.parse import urlencode
        params = urlencode({
            "startTask": "CERTIFICATION_NAME",
            "name": ev.name,
            "certUrl": f"{settings.public_base_url}/verify/{uuid}",
        })
        linkedin_url = f"https://www.linkedin.com/profile/add?{params}"

    await db.commit()

    return VerifyOut(
        uuid=cert.uuid,
        public_id=cert.public_id,
        student_name=cert.student_name,
        event_name=ev.name,
        status=cert.status,
        pdf_url=pdf_url,
        issued_at=getattr(cert, "issued_at", None),
        hosting_ends_at=cert.hosting_ends_at,
        view_count=view_count,
        linkedin_url=linkedin_url,
        branding=branding,
    )


@app.get("/api/files/{path:path}")
async def serve_file(path: str):
    path = path.lstrip("/").replace("..", "")
    abs_path = Path(settings.local_storage_dir) / path
    if not abs_path.exists() or not abs_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(abs_path)




@app.get(
    "/api/admin/events/{event_id}/certificates",
    response_model=CertificateListOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_certificates(
    event_id: int,
    search: str = "",
    status: Optional[CertStatus] = None,
    page: int = 1,
    limit: int = 20,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if page < 1 or limit < 1 or limit > 200:
        raise bad_request("Invalid page/limit")

    # Event erişim kontrolü (superadmin her event'e bakabilsin diye esnetiyoruz)
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res_ev = await db.execute(q_event)
    ev = res_ev.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    q = select(Certificate).where(
        Certificate.event_id == event_id,
        Certificate.deleted_at.is_(None),
    )

    if search:
        s = search.strip()
        from sqlalchemy import or_
        if len(s) >= 2:
            # Use PostgreSQL full-text as primary (prefix match) + ILIKE as fallback
            tsq_str = " & ".join([w + ":*" for w in s.split() if w])
            try:
                q = q.where(
                    or_(
                        Certificate.student_name.ilike(f"%{s}%"),
                        func.to_tsvector("simple", Certificate.student_name).op("@@")(
                            func.to_tsquery("simple", tsq_str)
                        ),
                    )
                )
            except Exception:
                q = q.where(Certificate.student_name.ilike(f"%{s}%"))
        else:
            q = q.where(Certificate.student_name.ilike(f"%{s}%"))

    if status:
        q = q.where(Certificate.status == status)

    # total
    res_total = await db.execute(select(func.count()).select_from(q.subquery()))
    total = int(res_total.scalar_one())

    q = q.order_by(Certificate.created_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    items = res.scalars().all()

    def to_out(c: Certificate) -> CertificateOut:
        # expired/revoked -> pdf kapalı (X)
        pdf_url = c.pdf_url if c.status == CertStatus.active else None
        return CertificateOut(
            id=c.id,
            uuid=c.uuid,
            public_id=c.public_id,
            student_name=c.student_name,
            event_id=c.event_id,
            status=c.status,
            issued_at=getattr(c, "issued_at", None),
            hosting_term=getattr(c, "hosting_term", None),
            hosting_ends_at=getattr(c, "hosting_ends_at", None),
            pdf_url=pdf_url,
        )

    return CertificateListOut(
        items=[to_out(x) for x in items],
        total=total,
        page=page,
        limit=limit,
    )





@app.post(
    "/api/admin/events/{event_id}/certificates",
    response_model=CertificateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def issue_certificate(
    event_id: int,
    payload: IssueCertificateIn,
    background_tasks: BackgroundTasks,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Event erişim kontrolü
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res = await db.execute(q_event)
    ev = res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    if not ev.config:
        raise bad_request("Event config missing. Save coordinates in editor first.")
    try:
        cfg = editor_config_to_template_config(ev.config)
    except Exception as e:
        raise bad_request(f"Invalid event config: {e}")

    # User
    res_u = await db.execute(select(User).where(User.id == me.id))
    user = res_u.scalar_one()

    # Template bytes
    template_path = local_path_from_url(ev.template_image_url)
    if not template_path.exists():
        raise bad_request("Template image not found on server. Upload template or fix template_image_url.")
    template_bytes = template_path.read_bytes()

    # Brand logo for QR overlay (from user's organization)
    org_res2 = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org2 = org_res2.scalar_one_or_none()
    single_brand_logo_bytes: Optional[bytes] = None
    if org2 and org2.brand_logo:
        try:
            logo_path2 = local_path_from_url(org2.brand_logo)
            if logo_path2.exists():
                single_brand_logo_bytes = logo_path2.read_bytes()
        except Exception:
            pass

    # Event lock (cert_seq atomic)
    res_lock = await db.execute(select(Event).where(Event.id == ev.id).with_for_update())
    ev = res_lock.scalar_one()

    ISSUE_UNITS_PER_CERT = 10
    term = payload.hosting_term

    cert_uuid = new_certificate_uuid()
    ev.cert_seq += 1
    public_id = f"EV{ev.id}-{ev.cert_seq:06d}"
    verify_url = f"{settings.public_base_url}/verify/{cert_uuid}"

    # generator.py: public_id param zorunlu olmalı
    pdf_bytes = render_certificate_pdf(
        template_image_bytes=template_bytes,
        student_name=payload.student_name,
        verify_url=verify_url,
        config=cfg,
        public_id=public_id,
        brand_logo_bytes=single_brand_logo_bytes,
    )

    rel_pdf_path = f"pdfs/event_{ev.id}/{cert_uuid}.pdf"
    abs_pdf_path = Path(settings.local_storage_dir) / rel_pdf_path
    abs_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    abs_pdf_path.write_bytes(pdf_bytes)
    asset_size_bytes = abs_pdf_path.stat().st_size

    # hosting units
    hosting_spend = hosting_units(term, asset_size_bytes)
    spend_units = ISSUE_UNITS_PER_CERT + hosting_spend

    if user.heptacoin_balance < spend_units:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient HeptaCoin. NeededUnits={spend_units}, balanceUnits={user.heptacoin_balance}",
        )

    pdf_url = build_public_pdf_url(rel_pdf_path)
    hosting_ends_at = compute_hosting_ends(term)

    cert = Certificate(
        uuid=cert_uuid,
        public_id=public_id,
        student_name=payload.student_name,
        event_id=ev.id,
        pdf_url=pdf_url,
        status=CertStatus.active,
        hosting_term=term,
        hosting_ends_at=hosting_ends_at,
        asset_size_bytes=asset_size_bytes,
    )
    db.add(cert)

    user.heptacoin_balance -= spend_units
    db.add(Transaction(user_id=user.id, amount=spend_units, type=TxType.spend))

    await db.commit()
    await db.refresh(cert)

    # ── Fire webhook ──────────────────────────────────────────────────────────
    from .webhooks import deliver_webhook, WebhookEvent
    background_tasks.add_task(
        deliver_webhook, db, me.id, WebhookEvent.cert_issued.value,
        {"uuid": cert.uuid, "public_id": cert.public_id, "student_name": cert.student_name, "event_id": ev.id},
    )

    return CertificateOut(
        id=cert.id,
        uuid=cert.uuid,
        public_id=cert.public_id,
        student_name=cert.student_name,
        event_id=cert.event_id,
        status=cert.status,
        issued_at=getattr(cert, "issued_at", None),
        hosting_term=cert.hosting_term,
        hosting_ends_at=cert.hosting_ends_at,
        pdf_url=cert.pdf_url,
    )




@app.patch(
    "/api/admin/certificates/{cert_id}",
    response_model=CertificateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_certificate_status(
    cert_id: int,
    payload: UpdateCertificateStatusIn,
    background_tasks: BackgroundTasks,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # cert + event join (yetki kontrolü için)
    q = (
        select(Certificate, Event)
        .join(Event, Certificate.event_id == Event.id)
        .where(Certificate.id == cert_id, Certificate.deleted_at.is_(None))
    )
    if me.role != Role.superadmin:
        q = q.where(Event.admin_id == me.id)

    res = await db.execute(q)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert, ev = row
    cert.status = payload.status
    await db.commit()
    await db.refresh(cert)

    # Remove PDF file from disk on revoke/expire
    if payload.status in (CertStatus.revoked, CertStatus.expired) and cert.pdf_url:
        try:
            pdf_path = local_path_from_url(cert.pdf_url)
            if pdf_path.exists():
                pdf_path.unlink(missing_ok=True)
        except Exception as exc:
            logger.warning("PDF file cleanup failed for cert %s: %s", cert.id, exc)

    if payload.status == CertStatus.revoked:
        from .webhooks import deliver_webhook, WebhookEvent
        background_tasks.add_task(
            deliver_webhook, db, me.id, WebhookEvent.cert_revoked.value,
            {"uuid": cert.uuid, "public_id": cert.public_id, "student_name": cert.student_name},
        )

    pdf_url = cert.pdf_url if cert.status == CertStatus.active else None

    return CertificateOut(
        id=cert.id,
        uuid=cert.uuid,
        public_id=cert.public_id,
        student_name=cert.student_name,
        event_id=cert.event_id,
        status=cert.status,
        issued_at=getattr(cert, "issued_at", None),
        hosting_term=getattr(cert, "hosting_term", None),
        hosting_ends_at=getattr(cert, "hosting_ends_at", None),
        pdf_url=pdf_url,
    )




@app.delete(
    "/api/admin/certificates/{cert_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def soft_delete_certificate(
    cert_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Certificate, Event)
        .join(Event, Certificate.event_id == Event.id)
        .where(Certificate.id == cert_id, Certificate.deleted_at.is_(None))
    )
    if me.role != Role.superadmin:
        q = q.where(Event.admin_id == me.id)

    res = await db.execute(q)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert, ev = row
    cert.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    # Remove PDF file from disk
    if cert.pdf_url:
        try:
            pdf_path = local_path_from_url(cert.pdf_url)
            if pdf_path.exists():
                pdf_path.unlink(missing_ok=True)
        except Exception as exc:
            logger.warning("PDF file cleanup failed for cert %s: %s", cert.id, exc)
    return {"ok": True}

#certificates.heptapusgroup.com {

#    encode zstd gzip

#    @api path /api/*
#    handle @api {
#        reverse_proxy heptacert-backend:8000
#    }

#    handle {
#        reverse_proxy heptacert-frontend:3000
#    }
#}

# ═══════════════════════════════════════════════════════════════════════════════
# 2FA – TOTP endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/2fa/setup", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def setup_2fa(
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    secret = pyotp.random_base32()
    res = await db.execute(select(TotpSecret).where(TotpSecret.user_id == cu.id))
    existing = res.scalar_one_or_none()
    if existing:
        existing.secret = secret
        existing.enabled = False
        db.add(existing)
    else:
        db.add(TotpSecret(user_id=cu.id, secret=secret, enabled=False))
    await db.commit()
    otp_uri = pyotp.totp.TOTP(secret).provisioning_uri(cu.email, issuer_name="HeptaCert")
    return TotpSetupOut(otpauth_url=otp_uri, secret=secret)


@app.post("/api/auth/2fa/confirm", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def confirm_2fa(
    data: TotpConfirmIn,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(select(TotpSecret).where(TotpSecret.user_id == cu.id))
    totp_row = res.scalar_one_or_none()
    if not totp_row:
        raise HTTPException(status_code=400, detail="2FA kurulumu başlatılmamış")
    if not pyotp.TOTP(totp_row.secret).verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Geçersiz kod")
    totp_row.enabled = True
    await db.commit()
    return {"ok": True}


@app.post("/api/auth/2fa/validate")
@limiter.limit("10/minute")
async def validate_2fa(
    request: Request,
    data: TotpValidateIn,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(data.partial_token, settings.jwt_secret, algorithms=["HS256"])
        if not payload.get("partial"):
            raise HTTPException(status_code=400, detail="Invalid token type")
        user_id = int(payload["sub"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    totp_res = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == user_id, TotpSecret.enabled.is_(True))
    )
    totp_row = totp_res.scalar_one_or_none()
    if not totp_row or not pyotp.TOTP(totp_row.secret).verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Geçersiz kod")
    return TokenOut(access_token=create_access_token(user_id=user.id, role=user.role), token_type="bearer")


@app.patch("/api/auth/2fa/disable", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def disable_2fa(
    data: TotpConfirmIn,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == cu.id, TotpSecret.enabled.is_(True))
    )
    totp_row = res.scalar_one_or_none()
    if not totp_row:
        raise HTTPException(status_code=400, detail="2FA zaten pasif")
    if not pyotp.TOTP(totp_row.secret).verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Geçersiz kod")
    await db.delete(totp_row)
    await db.commit()
    return {"ok": True}


@app.get("/api/auth/2fa/status", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def get_2fa_status(
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == cu.id, TotpSecret.enabled.is_(True))
    )
    totp = res.scalar_one_or_none()
    return {"enabled": totp is not None}


# ═══════════════════════════════════════════════════════════════════════════════
# API Keys
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/admin/api-keys",
    response_model=ApiKeyCreateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_api_key(
    data: ApiKeyCreateIn,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    raw_key = "hc_live_" + secrets.token_urlsafe(32)
    key_prefix = raw_key[:14]  # "hc_live_" + first 6 chars
    key_hash = _hash_api_key(raw_key)
    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=data.expires_days)
        if data.expires_days
        else None
    )
    ak = ApiKey(
        user_id=cu.id,
        name=data.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        scopes=["read", "write"],
        is_active=True,
        expires_at=expires_at,
    )
    db.add(ak)
    await db.commit()
    await db.refresh(ak)
    return ApiKeyCreateOut(
        id=ak.id,
        name=ak.name,
        key_prefix=ak.key_prefix,
        scopes=ak.scopes,
        is_active=ak.is_active,
        expires_at=ak.expires_at,
        created_at=ak.created_at,
        full_key=raw_key,
    )


@app.get(
    "/api/admin/api-keys",
    response_model=List[ApiKeyOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(select(ApiKey).where(ApiKey.user_id == cu.id).order_by(ApiKey.created_at.desc()))
    return res.scalars().all()


@app.delete(
    "/api/admin/api-keys/{key_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def revoke_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == cu.id))
    ak = res.scalar_one_or_none()
    if not ak:
        raise HTTPException(status_code=404, detail="API key bulunamadı")
    ak.is_active = False
    await db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# Webhooks
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/admin/webhooks",
    response_model=WebhookEndpointOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_webhook(
    data: WebhookEndpointIn,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    wh_secret = "whsec_" + secrets.token_hex(24)
    wh = WebhookEndpoint(
        user_id=cu.id,
        url=str(data.url),
        events=data.events,
        secret=wh_secret,
        is_active=True,
    )
    db.add(wh)
    await db.commit()
    await db.refresh(wh)
    return WebhookEndpointOut(
        id=wh.id,
        url=wh.url,
        events=wh.events,
        secret=wh.secret,
        is_active=wh.is_active,
        created_at=wh.created_at,
        last_fired_at=wh.last_fired_at,
    )


@app.get(
    "/api/admin/webhooks",
    response_model=List[WebhookEndpointOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_webhooks(
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(
        select(WebhookEndpoint).where(WebhookEndpoint.user_id == cu.id).order_by(WebhookEndpoint.created_at.desc())
    )
    return res.scalars().all()


@app.delete(
    "/api/admin/webhooks/{wh_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_webhook(
    wh_id: int,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    res = await db.execute(
        select(WebhookEndpoint).where(WebhookEndpoint.id == wh_id, WebhookEndpoint.user_id == cu.id)
    )
    wh = res.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook bulunamadı")
    await db.delete(wh)
    await db.commit()
    return {"ok": True}


@app.get(
    "/api/admin/webhooks/{wh_id}/deliveries",
    response_model=List[WebhookDeliveryOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def webhook_deliveries(
    wh_id: int,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    # ownership check
    res_wh = await db.execute(
        select(WebhookEndpoint).where(WebhookEndpoint.id == wh_id, WebhookEndpoint.user_id == cu.id)
    )
    if not res_wh.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Webhook bulunamadı")
    res = await db.execute(
        select(WebhookDelivery)
        .where(WebhookDelivery.endpoint_id == wh_id)
        .order_by(WebhookDelivery.delivered_at.desc())
        .limit(50)
    )
    return res.scalars().all()


# ═══════════════════════════════════════════════════════════════════════════════
# Organizations (white-label) – superadmin only
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/superadmin/organizations",
    response_model=OrgOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def create_org(
    data: OrgIn,
    db: AsyncSession = Depends(get_db),
    cu: CurrentUser = Depends(get_current_user),
):
    # Lookup target user by id provided in data, or use cu.id if not provided
    target_user_id = data.user_id if hasattr(data, "user_id") and data.user_id else cu.id
    org = Organization(
        user_id=target_user_id,
        org_name=data.org_name,
        custom_domain=data.custom_domain,
        brand_logo=data.brand_logo,
        brand_color=data.brand_color,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@app.get(
    "/api/superadmin/organizations",
    response_model=List[OrgOut],
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def list_orgs(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Organization).order_by(Organization.created_at.desc()))
    return res.scalars().all()


@app.patch(
    "/api/superadmin/organizations/{org_id}",
    response_model=OrgOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def update_org(
    org_id: int,
    data: OrgIn,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadı")
    if data.org_name is not None:
        org.org_name = data.org_name
    if data.custom_domain is not None:
        org.custom_domain = data.custom_domain
    if data.brand_logo is not None:
        org.brand_logo = data.brand_logo
    if data.brand_color is not None:
        org.brand_color = data.brand_color
    await db.commit()
    await db.refresh(org)
    return org


@app.delete(
    "/api/superadmin/organizations/{org_id}",
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def delete_org(org_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadı")
    await db.delete(org)
    await db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# Audit Logs – superadmin only
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/superadmin/audit-logs",
    response_model=List[AuditLogOut],
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    if page < 1 or limit < 1 or limit > 200:
        raise bad_request("Invalid page/limit")
    q = select(AuditLog)
    if user_id:
        q = q.where(AuditLog.user_id == user_id)
    if action:
        q = q.where(AuditLog.action.ilike(f"%{action}%"))
    if from_date:
        q = q.where(AuditLog.created_at >= from_date)
    if to_date:
        q = q.where(AuditLog.created_at <= to_date)
    q = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    return res.scalars().all()


# ═══════════════════════════════════════════════════════════════════════════════
# Bulk Certificate Action
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/admin/events/{event_id}/certificates/bulk-action",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def bulk_certificate_action(
    event_id: int,
    payload: BulkActionIn,
    background_tasks: BackgroundTasks,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify event ownership
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res_ev = await db.execute(q_event)
    ev = res_ev.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    # Load certs that belong to this event
    res_certs = await db.execute(
        select(Certificate).where(
            Certificate.id.in_(payload.cert_ids),
            Certificate.event_id == event_id,
            Certificate.deleted_at.is_(None),
        )
    )
    certs = res_certs.scalars().all()
    if not certs:
        raise HTTPException(status_code=404, detail="No certificates found")

    processed = 0
    for cert in certs:
        if payload.action == "delete":
            cert.deleted_at = datetime.now(timezone.utc)
            # Cleanup PDF
            if cert.pdf_url:
                try:
                    pdf_path = local_path_from_url(cert.pdf_url)
                    if pdf_path.exists():
                        pdf_path.unlink(missing_ok=True)
                except Exception as exc:
                    logger.warning("Bulk delete PDF cleanup failed for cert %s: %s", cert.id, exc)
        elif payload.action == "revoke":
            cert.status = CertStatus.revoked
            if cert.pdf_url:
                try:
                    pdf_path = local_path_from_url(cert.pdf_url)
                    if pdf_path.exists():
                        pdf_path.unlink(missing_ok=True)
                except Exception as exc:
                    logger.warning("Bulk revoke PDF cleanup failed for cert %s: %s", cert.id, exc)
        elif payload.action == "expire":
            cert.status = CertStatus.expired
        processed += 1

    await db.commit()

    if payload.action == "revoke" and background_tasks:
        from .webhooks import deliver_webhook, WebhookEvent
        background_tasks.add_task(
            deliver_webhook, db, me.id, WebhookEvent.cert_bulk_completed.value,
            {"event_id": event_id, "action": "revoke", "count": processed},
        )

    return {"ok": True, "processed": processed, "action": payload.action}


# ═══════════════════════════════════════════════════════════════════════════════
# Certificate Export (CSV / XLSX)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/admin/events/{event_id}/certificates/export",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def export_certificates(
    event_id: int,
    format: str = Query(default="csv", pattern="^(csv|xlsx)$"),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res_ev = await db.execute(q_event)
    ev = res_ev.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    res = await db.execute(
        select(Certificate)
        .where(Certificate.event_id == event_id, Certificate.deleted_at.is_(None))
        .order_by(Certificate.created_at.asc())
    )
    certs = res.scalars().all()

    columns = ["public_id", "student_name", "status", "hosting_term", "issued_at", "hosting_ends_at", "uuid"]

    if format == "xlsx":
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Certificates"
        ws.append(columns)
        for c in certs:
            ws.append([
                c.public_id or "",
                c.student_name,
                c.status.value if c.status else "",
                getattr(c, "hosting_term", "") or "",
                getattr(c, "issued_at", None).isoformat() if getattr(c, "issued_at", None) else "",
                getattr(c, "hosting_ends_at", None).isoformat() if getattr(c, "hosting_ends_at", None) else "",
                c.uuid,
            ])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=certificates-event-{event_id}.xlsx"},
        )
    else:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(columns)
        for c in certs:
            writer.writerow([
                c.public_id or "",
                c.student_name,
                c.status.value if c.status else "",
                getattr(c, "hosting_term", "") or "",
                getattr(c, "issued_at", None).isoformat() if getattr(c, "issued_at", None) else "",
                getattr(c, "hosting_ends_at", None).isoformat() if getattr(c, "hosting_ends_at", None) else "",
                c.uuid,
            ])
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=certificates-event-{event_id}.csv"},
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Dashboard Analytics
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/admin/dashboard/stats",
    response_model=DashboardStatsOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def dashboard_stats(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get events for this user
    res_events = await db.execute(
        select(Event).where(Event.admin_id == me.id).order_by(Event.created_at.desc())
    )
    events = res_events.scalars().all()
    event_ids = [e.id for e in events]

    if not event_ids:
        return DashboardStatsOut(
            total_events=0, total_certs=0, active_certs=0, revoked_certs=0,
            expired_certs=0, total_spent_hc=0, events_with_stats=[],
        )

    # Aggregate cert counts by status per event
    from sqlalchemy import case as sa_case
    agg_res = await db.execute(
        select(
            Certificate.event_id,
            func.count(Certificate.id).label("total"),
            func.sum(sa_case((Certificate.status == CertStatus.active, 1), else_=0)).label("active"),
            func.sum(sa_case((Certificate.status == CertStatus.revoked, 1), else_=0)).label("revoked"),
            func.sum(sa_case((Certificate.status == CertStatus.expired, 1), else_=0)).label("expired"),
        )
        .where(Certificate.event_id.in_(event_ids), Certificate.deleted_at.is_(None))
        .group_by(Certificate.event_id)
    )
    agg_rows = agg_res.all()
    event_stats_map: Dict[int, Dict] = {r.event_id: r._asdict() for r in agg_rows}

    # Total HC spent
    tx_res = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.user_id == me.id, Transaction.type == TxType.spend)
    )
    total_spent = int(tx_res.scalar_one() or 0)

    total_certs = sum(r["total"] for r in event_stats_map.values())
    active_certs = sum(int(r["active"] or 0) for r in event_stats_map.values())
    revoked_certs = sum(int(r["revoked"] or 0) for r in event_stats_map.values())
    expired_certs = sum(int(r["expired"] or 0) for r in event_stats_map.values())

    event_name_map = {e.id: e.name for e in events}
    events_with_stats = [
        {
            "event_id": ev_id,
            "name": event_name_map.get(ev_id, ""),
            "cert_count": stats["total"],
            "active_count": int(stats["active"] or 0),
            "revoked_count": int(stats["revoked"] or 0),
            "expired_count": int(stats["expired"] or 0),
        }
        for ev_id, stats in event_stats_map.items()
    ]

    return DashboardStatsOut(
        total_events=len(events),
        total_certs=total_certs,
        active_certs=active_certs,
        revoked_certs=revoked_certs,
        expired_certs=expired_certs,
        total_spent_hc=total_spent,
        events_with_stats=events_with_stats,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Superadmin System Health
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/superadmin/system-health",
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def system_health(db: AsyncSession = Depends(get_db)):
    import shutil
    from sqlalchemy import text as sa_text

    # Disk usage
    try:
        disk = shutil.disk_usage(settings.local_storage_dir)
        disk_info = {
            "total_bytes": disk.total,
            "used_bytes": disk.used,
            "free_bytes": disk.free,
            "used_pct": round(disk.used / disk.total * 100, 1) if disk.total else 0,
        }
    except Exception:
        disk_info = {}

    # DB size
    try:
        db_size_res = await db.execute(sa_text("SELECT pg_database_size(current_database())"))
        db_size_bytes = int(db_size_res.scalar_one() or 0)
    except Exception:
        db_size_bytes = 0

    # Active DB connections
    try:
        conn_res = await db.execute(sa_text("SELECT count(*) FROM pg_stat_activity"))
        active_connections = int(conn_res.scalar_one() or 0)
    except Exception:
        active_connections = 0

    # Recent activity (last 24h audit log count)
    try:
        activity_res = await db.execute(
            select(func.count()).select_from(AuditLog)
            .where(AuditLog.created_at >= datetime.now(timezone.utc) - timedelta(hours=24))
        )
        recent_actions = int(activity_res.scalar_one() or 0)
    except Exception:
        recent_actions = 0

    # Totals
    try:
        user_res = await db.execute(select(func.count()).select_from(User))
        total_users = int(user_res.scalar_one() or 0)
        cert_res = await db.execute(
            select(func.count()).select_from(Certificate).where(Certificate.deleted_at.is_(None))
        )
        total_certs = int(cert_res.scalar_one() or 0)
    except Exception:
        total_users = 0
        total_certs = 0

    return {
        "uptime_seconds": round(time.time() - _startup_time),
        "disk": disk_info,
        "db_size_bytes": db_size_bytes,
        "active_db_connections": active_connections,
        "recent_actions_24h": recent_actions,
        "total_users": total_users,
        "total_certs": total_certs,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Magic Link Authentication
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/magic-link")
@limiter.limit("3/minute")
async def request_magic_link(
    request: Request,
    data: MagicLinkIn,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.email == str(data.email)))
    user = res.scalar_one_or_none()
    # Always 200 to avoid enumeration
    if user and user.is_verified:
        token = make_email_token({"email": str(data.email), "action": "magic_link"})
        user.magic_link_token = token
        await db.commit()

        verify_link = f"{settings.frontend_base_url}/admin/magic-verify?token={token}"
        await send_email_async(
            to=str(data.email),
            subject="HeptaCert — Giriş Bağlantısı",
            html_body=f"""
            <p>Merhaba,</p>
            <p>HeptaCert'e giriş yapmak için aşağıdaki bağlantıya tıklayın:</p>
            <p><a href="{verify_link}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Giriş Yap →</a></p>
            <p>Bu bağlantı 15 dakika geçerlidir.</p>
            <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
            """,
        )
    return {"detail": "Giriş bağlantısı e-posta adresinize gönderildi."}


@app.get("/api/auth/magic-link/verify")
async def verify_magic_link(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = verify_email_token(token, max_age=900)  # 15 minutes
    except SignatureExpired:
        raise bad_request("Giriş bağlantısının süresi dolmuş. Lütfen yeni bir bağlantı isteyin.")
    except (BadSignature, Exception):
        raise bad_request("Geçersiz giriş bağlantısı.")

    if payload.get("action") != "magic_link":
        raise bad_request("Geçersiz token türü.")

    email = payload.get("email")
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if not user.is_verified:
        raise bad_request("Hesabınız henüz doğrulanmamış.")

    # Invalidate token after use
    user.magic_link_token = None
    await db.commit()

    return TokenOut(
        access_token=create_access_token(user_id=user.id, role=user.role),
        token_type="bearer",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Template History
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/admin/events/{event_id}/template-history",
    response_model=List[TemplateSnapshotOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_template_history(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res_ev = await db.execute(q_event)
    if not res_ev.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    res = await db.execute(
        select(EventTemplateSnapshot)
        .where(EventTemplateSnapshot.event_id == event_id)
        .order_by(EventTemplateSnapshot.created_at.desc())
        .limit(10)
    )
    return res.scalars().all()


@app.post(
    "/api/admin/events/{event_id}/template-history/{snap_id}/restore",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def restore_template_snapshot(
    event_id: int,
    snap_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q_event = select(Event).where(Event.id == event_id)
    if me.role != Role.superadmin:
        q_event = q_event.where(Event.admin_id == me.id)
    res_ev = await db.execute(q_event)
    ev = res_ev.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    res_snap = await db.execute(
        select(EventTemplateSnapshot).where(
            EventTemplateSnapshot.id == snap_id,
            EventTemplateSnapshot.event_id == event_id,
        )
    )
    snap = res_snap.scalar_one_or_none()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    # Save current state as new snapshot before restoring
    current_snap = EventTemplateSnapshot(
        event_id=event_id,
        template_image_url=ev.template_image_url,
        config=ev.config,
        created_by=me.id,
    )
    db.add(current_snap)

    if snap.template_image_url:
        ev.template_image_url = snap.template_image_url
    if snap.config:
        ev.config = snap.config
    await db.commit()
    return {"ok": True, "restored_snapshot_id": snap_id}


# ═══════════════════════════════════════════════════════════════════════════════
# Admin: Transaction list (paginated)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/admin/transactions/list",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_my_transactions_paginated(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Transaction).where(Transaction.user_id == me.id)
    total_res = await db.execute(select(func.count()).select_from(q.subquery()))
    total = int(total_res.scalar_one() or 0)

    q = q.order_by(Transaction.timestamp.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    txs = res.scalars().all()
    return {
        "items": [
            {"id": t.id, "amount": t.amount, "type": t.type, "timestamp": t.timestamp.isoformat()}
            for t in txs
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }
