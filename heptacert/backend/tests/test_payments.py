"""
Unit tests for payment provider abstraction.
Tests factory pattern, signature verification, and data models.
"""
import hashlib
import hmac
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from src.payments import (
    PaymentRequest,
    PaymentResult,
    IyzicoProvider,
    PayTRProvider,
    StripeProvider,
    get_provider,
)


# ── Data models ──────────────────────────────────────────────────────────────

class TestPaymentModels:
    def test_payment_request_defaults(self):
        req = PaymentRequest(
            order_id="ORD-001",
            amount_cents=9900,
            description="Test",
            customer_email="test@test.com",
            customer_name="Test User",
            customer_ip="1.2.3.4",
            success_url="https://ok",
            cancel_url="https://cancel",
            webhook_url="https://hook",
        )
        assert req.currency == "TRY"
        assert req.amount_cents == 9900

    def test_payment_result_success(self):
        r = PaymentResult(success=True, checkout_url="https://pay.example.com")
        assert r.success is True
        assert r.error is None

    def test_payment_result_failure(self):
        r = PaymentResult(success=False, error="Card declined")
        assert r.success is False
        assert r.error == "Card declined"


# ── Provider factory ─────────────────────────────────────────────────────────

class TestGetProvider:
    def test_returns_none_when_disabled(self):
        settings = SimpleNamespace(payment_enabled=False)
        assert get_provider(settings) is None

    def test_returns_iyzico(self):
        settings = SimpleNamespace(
            payment_enabled=True,
            active_payment_provider="iyzico",
            iyzico_api_key="key",
            iyzico_secret_key="secret",
            iyzico_base_url="https://sandbox-api.iyzipay.com",
        )
        p = get_provider(settings)
        assert isinstance(p, IyzicoProvider)
        assert p.name == "iyzico"

    def test_returns_paytr(self):
        settings = SimpleNamespace(
            payment_enabled=True,
            active_payment_provider="paytr",
            paytr_merchant_id="mid",
            paytr_merchant_key="mkey",
            paytr_merchant_salt="msalt",
        )
        p = get_provider(settings)
        assert isinstance(p, PayTRProvider)
        assert p.name == "paytr"

    def test_returns_stripe(self):
        settings = SimpleNamespace(
            payment_enabled=True,
            active_payment_provider="stripe",
            stripe_secret_key="sk_test_xxx",
            stripe_webhook_secret="whsec_xxx",
        )
        p = get_provider(settings)
        assert isinstance(p, StripeProvider)
        assert p.name == "stripe"

    def test_unknown_provider_raises(self):
        settings = SimpleNamespace(
            payment_enabled=True,
            active_payment_provider="unknown",
        )
        with pytest.raises(ValueError, match="Unknown payment provider"):
            get_provider(settings)

    def test_case_insensitive(self):
        settings = SimpleNamespace(
            payment_enabled=True,
            active_payment_provider="STRIPE",
            stripe_secret_key="sk",
            stripe_webhook_secret="wh",
        )
        p = get_provider(settings)
        assert isinstance(p, StripeProvider)


# ── iyzico signature ─────────────────────────────────────────────────────────

class TestIyzicoProvider:
    def test_sign_method(self):
        p = IyzicoProvider(api_key="api_key", secret_key="secret_key", base_url="https://sandbox")
        sig = p._sign("random123", '{"test":"body"}')
        raw = "api_key" + "random123" + "secret_key" + '{"test":"body"}'
        expected = hashlib.sha1(raw.encode("utf-8")).hexdigest()
        assert sig == expected


# ── Stripe webhook verification ──────────────────────────────────────────────

class TestStripeWebhook:
    def test_valid_signature(self):
        webhook_secret = "whsec_test123"
        p = StripeProvider(secret_key="sk_test", webhook_secret=webhook_secret)

        payload = json.dumps({
            "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_123", "client_reference_id": "ORD-001"}},
        }).encode()

        timestamp = "1234567890"
        signed = f"{timestamp}.{payload.decode('utf-8')}"
        v1 = hmac.new(
            webhook_secret.encode("utf-8"),
            signed.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        headers = {"stripe-signature": f"t={timestamp},v1={v1}"}
        result = p.verify_webhook(payload, headers)
        assert result["status"] == "paid"
        assert result["order_id"] == "ORD-001"
        assert result["provider_ref"] == "cs_123"

    def test_invalid_signature_raises(self):
        p = StripeProvider(secret_key="sk_test", webhook_secret="whsec_real")
        payload = b'{"type":"checkout.session.completed"}'
        headers = {"stripe-signature": "t=123,v1=fakesignature"}
        with pytest.raises(ValueError, match="signature mismatch"):
            p.verify_webhook(payload, headers)


# ── PayTR webhook verification ───────────────────────────────────────────────

class TestPayTRWebhook:
    def test_valid_hash(self):
        p = PayTRProvider(merchant_id="mid", merchant_key="mkey", merchant_salt="msalt")

        order_id = "ORD-001"
        status = "success"
        total = "9900"
        msg = (order_id + "msalt" + status + total).encode("utf-8")
        expected_hash = hmac.new("mkey".encode("utf-8"), msg, hashlib.sha256).digest().hex()

        payload = f"merchant_oid={order_id}&status={status}&total_amount={total}&hash={expected_hash}".encode()
        result = p.verify_webhook(payload, {})
        assert result["status"] == "paid"
        assert result["order_id"] == order_id

    def test_invalid_hash_raises(self):
        p = PayTRProvider(merchant_id="mid", merchant_key="mkey", merchant_salt="msalt")
        payload = b"merchant_oid=ORD-001&status=success&total_amount=100&hash=fakehash"
        with pytest.raises(ValueError, match="signature mismatch"):
            p.verify_webhook(payload, {})
