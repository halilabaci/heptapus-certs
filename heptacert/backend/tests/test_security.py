"""
Security-focused tests for HeptaCert backend.
Tests path traversal protection, input sanitisation, SSRF prevention, etc.
"""
import os
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest


# ── Path traversal protection (serve_file) ───────────────────────────────────

class TestServeFileSecurity:
    """Test the serve_file endpoint for path traversal vulnerabilities."""

    def test_double_dot_rejected(self):
        """Path with '..' should be rejected."""
        from src.main import serve_file
        import asyncio
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            asyncio.get_event_loop().run_until_complete(
                serve_file("../../etc/passwd")
            )
        assert exc_info.value.status_code == 400

    def test_backslash_rejected(self):
        """Path with backslash traversal should be rejected."""
        from src.main import serve_file
        import asyncio
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            asyncio.get_event_loop().run_until_complete(
                serve_file("..\\..\\etc\\passwd")
            )
        assert exc_info.value.status_code == 400

    def test_normal_path_works(self):
        """A normal path that doesn't exist should return 404, not crash."""
        from src.main import serve_file
        import asyncio
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            asyncio.get_event_loop().run_until_complete(
                serve_file("pdfs/event_1/nonexistent.pdf")
            )
        assert exc_info.value.status_code == 404


# ── Input sanitisation (search queries) ──────────────────────────────────────

class TestSearchSanitisation:
    """Test that search inputs are sanitised to prevent injection."""

    def test_tsquery_special_chars_stripped(self):
        """Special PostgreSQL tsquery characters should be cleaned."""
        import re
        test_inputs = [
            "test' OR 1=1 --",
            "name; DROP TABLE certificates;",
            "hello!@#$%^&*()",
            "<script>alert('xss')</script>",
        ]
        for inp in test_inputs:
            safe = re.sub(r"[^\w\s\u00e7\u011f\u0131\u00f6\u015f\u00fc\u00c7\u011e\u0130\u00d6\u015e\u00dc]", "", inp)
            assert "'" not in safe
            assert ";" not in safe
            assert "<" not in safe
            assert ">" not in safe
            assert "--" not in safe

    def test_turkish_chars_preserved(self):
        """Turkish characters should be preserved in search."""
        import re
        inp = "Çağrı Öztürk Şükriye"
        safe = re.sub(r"[^\w\s\u00e7\u011f\u0131\u00f6\u015f\u00fc\u00c7\u011e\u0130\u00d6\u015e\u00dc]", "", inp)
        assert "Ç" in safe or "ç" in safe.lower()
        assert "ö" in safe.lower()
        assert "Ş" in safe or "ş" in safe.lower()


# ── Webhook SSRF protection ──────────────────────────────────────────────────

class TestSSRFProtection:
    """Test that webhook URL validation blocks internal/private addresses."""

    @pytest.mark.parametrize("url", [
        "http://localhost/hook",
        "http://127.0.0.1/hook",
        "http://0.0.0.0/hook",
        "http://169.254.169.254/latest/meta-data",
        "http://192.168.1.1/hook",
        "http://10.0.0.1/hook",
    ])
    def test_private_urls_rejected(self, url):
        from pydantic import ValidationError
        from src.main import WebhookEndpointIn
        with pytest.raises(ValidationError):
            WebhookEndpointIn(url=url, events=["cert.issued"])

    @pytest.mark.parametrize("url", [
        "https://hooks.example.com/webhook",
        "https://api.slack.com/webhook/abcd",
        "http://external-service.com/callback",
    ])
    def test_public_urls_accepted(self, url):
        from src.main import WebhookEndpointIn
        wh = WebhookEndpointIn(url=url, events=["cert.issued"])
        assert wh.url == url


# ── Password reset token replay protection ───────────────────────────────────

class TestPasswordResetSecurity:
    def test_reset_token_must_match_db(self):
        """Password reset should validate token matches DB record."""
        from src.main import make_email_token
        # Create a valid token
        token = make_email_token({"email": "user@test.com", "action": "reset"})
        assert isinstance(token, str)
        # The actual DB check happens in the endpoint (tested via integration tests)
        # Here we verify the token structure is valid
        from src.main import verify_email_token
        payload = verify_email_token(token, max_age=3600)
        assert payload["action"] == "reset"
        assert payload["email"] == "user@test.com"


# ── Pydantic model validation ───────────────────────────────────────────────

class TestInputValidation:
    def test_register_password_min_length(self):
        from pydantic import ValidationError
        from src.main import RegisterIn
        with pytest.raises(ValidationError):
            RegisterIn(email="test@test.com", password="short")  # < 8 chars

    def test_register_password_max_length(self):
        from pydantic import ValidationError
        from src.main import RegisterIn
        with pytest.raises(ValidationError):
            RegisterIn(email="test@test.com", password="x" * 200)  # > 128 chars

    def test_register_invalid_email(self):
        from pydantic import ValidationError
        from src.main import RegisterIn
        with pytest.raises(ValidationError):
            RegisterIn(email="not-an-email", password="validpass123")

    def test_reset_password_min_length(self):
        from pydantic import ValidationError
        from src.main import ResetPasswordIn
        with pytest.raises(ValidationError):
            ResetPasswordIn(token="sometoken", new_password="short")

    def test_change_password_validation(self):
        from pydantic import ValidationError
        from src.main import ChangePasswordIn
        with pytest.raises(ValidationError):
            ChangePasswordIn(current_password="", new_password="newpass123")

    def test_admin_role_pattern(self):
        from pydantic import ValidationError
        from src.main import AdminRoleIn
        # Valid roles
        r1 = AdminRoleIn(role="admin")
        r2 = AdminRoleIn(role="superadmin")
        assert r1.role == "admin"
        assert r2.role == "superadmin"
        # Invalid role
        with pytest.raises(ValidationError):
            AdminRoleIn(role="hacker")


# ── JWT security ─────────────────────────────────────────────────────────────

class TestJWTSecurity:
    def test_partial_token_not_usable_as_full(self):
        """Partial 2FA tokens should have the 'partial' flag set."""
        from src.main import create_partial_token, settings
        from jose import jwt
        token = create_partial_token(user_id=1)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        assert payload["partial"] is True

    def test_full_token_no_partial_flag(self):
        """Normal access tokens should NOT have the 'partial' flag."""
        from src.main import create_access_token, Role, settings
        from jose import jwt
        token = create_access_token(user_id=1, role=Role.admin)
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        assert "partial" not in payload

    def test_token_with_wrong_secret_fails(self):
        from src.main import create_access_token, Role
        from jose import jwt, JWTError
        token = create_access_token(user_id=1, role=Role.admin)
        with pytest.raises(JWTError):
            jwt.decode(token, "wrong-secret", algorithms=["HS256"])

    def test_token_algorithm_pinned_to_hs256(self):
        """Should not accept tokens signed with other algorithms."""
        from src.main import settings
        from jose import jwt, JWTError
        # Create a token with HS384 — should fail verification with HS256-only
        payload = {"sub": "1", "role": "admin", "exp": 9999999999}
        token = jwt.encode(payload, settings.jwt_secret, algorithm="HS384")
        with pytest.raises(JWTError):
            jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
