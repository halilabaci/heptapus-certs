"""
Unit tests for certificate generator (generator.py).
Tests color parsing, QR generation, TemplateConfig, and font loading.
"""
import io
import uuid

import pytest
from PIL import Image


# ── TemplateConfig ───────────────────────────────────────────────────────────

class TestTemplateConfig:
    def test_default_values(self):
        from src.generator import TemplateConfig
        tc = TemplateConfig(isim_x=500, isim_y=300)
        assert tc.font_size == 48
        assert tc.font_color == "#FFFFFF"
        assert tc.qr_x == 80
        assert tc.qr_y == 700
        assert tc.qr_size == 260
        assert tc.show_qr is True
        assert tc.cert_id_x == 60
        assert tc.cert_id_y == 60
        assert tc.cert_id_font_size == 22
        assert tc.cert_id_color == "#334155"
        assert tc.show_cert_id is True
        assert tc.show_hologram is True
        assert tc.name_text_align == "center"

    def test_frozen(self):
        from src.generator import TemplateConfig
        tc = TemplateConfig(isim_x=100, isim_y=200)
        with pytest.raises(AttributeError):
            tc.isim_x = 999

    def test_custom_values(self):
        from src.generator import TemplateConfig
        tc = TemplateConfig(
            isim_x=300, isim_y=400,
            font_size=72, font_color="#FF0000",
            qr_x=50, qr_y=50, qr_size=150,
            show_qr=False,
            cert_id_font_size=14,
            cert_id_color="#AABBCC",
            show_cert_id=False,
            show_hologram=False,
        )
        assert tc.font_size == 72
        assert tc.show_qr is False
        assert tc.show_cert_id is False
        assert tc.show_hologram is False


# ── Color parsing ────────────────────────────────────────────────────────────

class TestHexToRGBA:
    def test_6_digit_hex(self):
        from src.generator import _hex_to_rgba
        assert _hex_to_rgba("#FF0000") == (255, 0, 0, 255)
        assert _hex_to_rgba("#00FF00") == (0, 255, 0, 255)
        assert _hex_to_rgba("#0000FF") == (0, 0, 255, 255)

    def test_8_digit_hex_with_alpha(self):
        from src.generator import _hex_to_rgba
        assert _hex_to_rgba("#FF000080") == (255, 0, 0, 128)
        assert _hex_to_rgba("#00FF00FF") == (0, 255, 0, 255)

    def test_white(self):
        from src.generator import _hex_to_rgba
        assert _hex_to_rgba("#FFFFFF") == (255, 255, 255, 255)

    def test_black(self):
        from src.generator import _hex_to_rgba
        assert _hex_to_rgba("#000000") == (0, 0, 0, 255)

    def test_case_insensitive(self):
        from src.generator import _hex_to_rgba
        assert _hex_to_rgba("#ff0000") == (255, 0, 0, 255)
        assert _hex_to_rgba("#Ff0000") == (255, 0, 0, 255)

    def test_invalid_hex_returns_fallback(self):
        from src.generator import _hex_to_rgba
        assert _hex_to_rgba("invalid") == (255, 255, 255, 255)
        assert _hex_to_rgba("") == (255, 255, 255, 255)
        assert _hex_to_rgba("#GGG") == (255, 255, 255, 255)

    def test_none_returns_fallback(self):
        from src.generator import _hex_to_rgba
        assert _hex_to_rgba(None) == (255, 255, 255, 255)


# ── UUID generation ──────────────────────────────────────────────────────────

class TestCertificateUUID:
    def test_new_certificate_uuid_format(self):
        from src.generator import new_certificate_uuid
        u = new_certificate_uuid()
        # Should be valid UUID4
        parsed = uuid.UUID(u)
        assert parsed.version == 4
        assert len(u) == 36

    def test_new_certificate_uuid_unique(self):
        from src.generator import new_certificate_uuid
        uuids = {new_certificate_uuid() for _ in range(100)}
        assert len(uuids) == 100  # all unique


# ── QR code generation ───────────────────────────────────────────────────────

class TestQRCode:
    def test_make_qr_png_returns_image(self):
        from src.generator import _make_qr_png
        img = _make_qr_png("https://example.com/verify/abc")
        assert isinstance(img, Image.Image)
        assert img.mode == "RGBA"
        assert img.width > 0
        assert img.height > 0

    def test_make_qr_png_with_logo(self):
        from src.generator import _make_qr_png
        # Create a small test logo
        logo = Image.new("RGBA", (50, 50), (255, 0, 0, 255))
        buf = io.BytesIO()
        logo.save(buf, format="PNG")
        logo_bytes = buf.getvalue()

        img = _make_qr_png("https://example.com", logo_bytes=logo_bytes)
        assert isinstance(img, Image.Image)
        assert img.width > 0


# ── Certificate rendering ─────────────────────────────────────────────────────

class TestRenderCertificate:
    def _make_template(self, width=1240, height=874):
        """Create a minimal test template image."""
        img = Image.new("RGB", (width, height), (255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    def test_render_returns_pdf_bytes(self):
        from src.generator import render_certificate_pdf, TemplateConfig
        tc = TemplateConfig(isim_x=620, isim_y=400, show_hologram=False)
        template_bytes = self._make_template()
        result = render_certificate_pdf(
            template_image_bytes=template_bytes,
            student_name="Test Student",
            verify_url="https://example.com/verify/abc",
            config=tc,
        )
        assert isinstance(result, bytes)
        assert len(result) > 100
        # PDF files start with %PDF
        assert result[:5] == b"%PDF-"

    def test_render_with_public_id(self):
        from src.generator import render_certificate_pdf, TemplateConfig
        tc = TemplateConfig(isim_x=620, isim_y=400, show_hologram=False)
        template_bytes = self._make_template()
        result = render_certificate_pdf(
            template_image_bytes=template_bytes,
            student_name="Jane Doe",
            verify_url="https://example.com/verify/xyz",
            config=tc,
            public_id="EV1-000001",
        )
        assert result[:5] == b"%PDF-"

    def test_render_empty_name_raises(self):
        from src.generator import render_certificate_pdf, TemplateConfig
        tc = TemplateConfig(isim_x=620, isim_y=400, show_hologram=False)
        template_bytes = self._make_template()
        with pytest.raises(ValueError, match="student_name is empty"):
            render_certificate_pdf(
                template_image_bytes=template_bytes,
                student_name="   ",
                verify_url="https://example.com/verify/abc",
                config=tc,
            )

    def test_render_no_qr(self):
        from src.generator import render_certificate_pdf, TemplateConfig
        tc = TemplateConfig(isim_x=620, isim_y=400, show_qr=False, show_hologram=False)
        template_bytes = self._make_template()
        result = render_certificate_pdf(
            template_image_bytes=template_bytes,
            student_name="QR Hidden",
            verify_url="https://example.com",
            config=tc,
        )
        assert result[:5] == b"%PDF-"

    def test_render_with_brand_logo(self):
        from src.generator import render_certificate_pdf, TemplateConfig
        tc = TemplateConfig(isim_x=620, isim_y=400, show_hologram=False)
        template_bytes = self._make_template()
        logo = Image.new("RGBA", (80, 80), (0, 0, 255, 255))
        buf = io.BytesIO()
        logo.save(buf, format="PNG")
        result = render_certificate_pdf(
            template_image_bytes=template_bytes,
            student_name="Logo Test",
            verify_url="https://example.com",
            config=tc,
            brand_logo_bytes=buf.getvalue(),
        )
        assert result[:5] == b"%PDF-"

    def test_render_respects_alignment(self):
        from src.generator import render_certificate_pdf, TemplateConfig
        for align in ("left", "center", "right"):
            tc = TemplateConfig(
                isim_x=620, isim_y=400,
                name_text_align=align,
                show_hologram=False, show_qr=False,
            )
            template_bytes = self._make_template()
            result = render_certificate_pdf(
                template_image_bytes=template_bytes,
                student_name=f"Align {align}",
                verify_url="https://example.com",
                config=tc,
            )
            assert result[:5] == b"%PDF-"

    def test_render_boundary_clamping(self):
        """Positions larger than canvas should be clamped, not crash."""
        from src.generator import render_certificate_pdf, TemplateConfig
        tc = TemplateConfig(
            isim_x=99999, isim_y=99999,
            cert_id_x=99999, cert_id_y=99999,
            show_hologram=False,
        )
        template_bytes = self._make_template(800, 600)
        result = render_certificate_pdf(
            template_image_bytes=template_bytes,
            student_name="Boundary Test",
            verify_url="https://example.com",
            config=tc,
            public_id="EV1-000001",
        )
        assert result[:5] == b"%PDF-"
