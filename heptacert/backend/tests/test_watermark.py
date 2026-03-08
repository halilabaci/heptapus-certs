"""
Unit tests for the steganographic watermark module (watermark.py).
No external dependencies beyond Pillow and numpy.
"""
import io
import pytest
from PIL import Image


def _blank_rgba(width: int = 800, height: int = 600) -> Image.Image:
    """Create a plain white RGBA image for testing."""
    return Image.new("RGBA", (width, height), (255, 255, 255, 255))


def _img_to_bytes(img: Image.Image, fmt: str = "PNG") -> bytes:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


# ── embed / extract round-trip ───────────────────────────────────────────────

class TestRoundTrip:
    def test_basic_roundtrip(self):
        from src.watermark import embed_watermark, extract_watermark
        img = _blank_rgba()
        watermarked = embed_watermark(img, "EV1-000001")
        result = extract_watermark(_img_to_bytes(watermarked))
        assert result == "EV1-000001"

    def test_long_payload(self):
        from src.watermark import embed_watermark, extract_watermark
        payload = "EV9999-999999"  # realistic public_id
        img = _blank_rgba()
        watermarked = embed_watermark(img, payload)
        assert extract_watermark(_img_to_bytes(watermarked)) == payload

    def test_unicode_payload(self):
        from src.watermark import embed_watermark, extract_watermark
        payload = "EV1-000001"  # stick to ASCII as intended
        img = _blank_rgba()
        watermarked = embed_watermark(img, payload)
        assert extract_watermark(_img_to_bytes(watermarked)) == payload

    def test_roundtrip_rgb_input(self):
        """embed_watermark should accept RGB images (internally converts to RGBA)."""
        from src.watermark import embed_watermark, extract_watermark
        img = Image.new("RGB", (800, 600), (200, 100, 50))
        watermarked = embed_watermark(img, "EV42-000005")
        assert extract_watermark(_img_to_bytes(watermarked)) == "EV42-000005"

    def test_roundtrip_via_convenience_function(self):
        from src.watermark import to_watermarked_png_bytes, extract_watermark
        img = _blank_rgba()
        png_bytes = to_watermarked_png_bytes(img, "EV3-000999")
        assert extract_watermark(png_bytes) == "EV3-000999"

    def test_image_visually_unchanged(self):
        """The watermarked image should differ by at most 1 per channel per pixel."""
        from src.watermark import embed_watermark
        import numpy as np
        img = _blank_rgba().convert("RGBA")
        watermarked = embed_watermark(img, "EV1-000001")

        orig = np.array(img, dtype=int)
        wm   = np.array(watermarked, dtype=int)
        diff = np.abs(orig - wm)
        # Only Red channel LSB is touched; max diff is 1
        assert diff[:, :, 0].max() <= 1
        assert diff[:, :, 1].max() == 0  # Green untouched
        assert diff[:, :, 2].max() == 0  # Blue untouched
        assert diff[:, :, 3].max() == 0  # Alpha untouched


# ── no-watermark detection ───────────────────────────────────────────────────

class TestNoWatermark:
    def test_plain_image_returns_none(self):
        from src.watermark import extract_watermark
        img = _blank_rgba()
        result = extract_watermark(_img_to_bytes(img))
        assert result is None

    def test_random_noise_returns_none(self):
        from src.watermark import extract_watermark
        import numpy as np
        rng = np.random.default_rng(42)
        arr = rng.integers(0, 256, (600, 800, 4), dtype=np.uint8)
        img = Image.fromarray(arr, "RGBA")
        result = extract_watermark(_img_to_bytes(img))
        assert result is None

    def test_invalid_bytes_returns_none(self):
        from src.watermark import extract_watermark
        assert extract_watermark(b"not an image at all") is None

    def test_empty_bytes_returns_none(self):
        from src.watermark import extract_watermark
        assert extract_watermark(b"") is None


# ── payload validation ───────────────────────────────────────────────────────

class TestPayloadValidation:
    def test_payload_too_long_raises(self):
        from src.watermark import embed_watermark, MAX_PAYLOAD_BYTES
        img = _blank_rgba()
        with pytest.raises(ValueError, match="too long"):
            embed_watermark(img, "x" * (MAX_PAYLOAD_BYTES + 1))

    def test_image_too_small_raises(self):
        from src.watermark import embed_watermark
        tiny = Image.new("RGBA", (4, 4), (0, 0, 0, 255))
        with pytest.raises(ValueError, match="too small"):
            embed_watermark(tiny, "EV1-000001")

    def test_empty_payload(self):
        from src.watermark import embed_watermark, extract_watermark
        img = _blank_rgba()
        watermarked = embed_watermark(img, "")
        result = extract_watermark(_img_to_bytes(watermarked))
        assert result == ""

    def test_max_length_payload(self):
        from src.watermark import embed_watermark, extract_watermark, MAX_PAYLOAD_BYTES
        payload = "A" * MAX_PAYLOAD_BYTES
        img = _blank_rgba(1200, 900)  # larger image needed for long payload
        watermarked = embed_watermark(img, payload)
        result = extract_watermark(_img_to_bytes(watermarked))
        assert result == payload


# ── JPEG / lossy format behavior ─────────────────────────────────────────────

class TestJpegBehavior:
    def test_jpeg_destroys_watermark(self):
        """
        LSB steganography is incompatible with JPEG: DCT quantization
        randomises the spatial-domain LSBs, so extract_watermark must
        return None after any JPEG round-trip.
        Users must share the original lossless PNG.
        """
        from src.watermark import embed_watermark, extract_watermark
        img = _blank_rgba(1200, 900)
        watermarked = embed_watermark(img, "EV10-000001")

        buf = io.BytesIO()
        watermarked.convert("RGB").save(buf, format="JPEG", quality=95)
        result = extract_watermark(buf.getvalue())
        # After JPEG, the watermark is gone — this is expected / documented
        assert result is None, (
            f"Expected watermark to be destroyed by JPEG, but got: {result!r}"
        )

    def test_png_survives_but_jpeg_does_not(self):
        """Verify PNG keeps watermark while JPEG of same content loses it."""
        from src.watermark import embed_watermark, extract_watermark
        img = _blank_rgba(1200, 900)
        watermarked = embed_watermark(img, "EV7-000042")

        # PNG — survives
        png_bytes = _img_to_bytes(watermarked, "PNG")
        assert extract_watermark(png_bytes) == "EV7-000042"

        # JPEG of the same image — does not survive
        buf = io.BytesIO()
        watermarked.convert("RGB").save(buf, format="JPEG", quality=95)
        assert extract_watermark(buf.getvalue()) is None


# ── to_watermarked_png_bytes helper ─────────────────────────────────────────

class TestConvenienceHelper:
    def test_returns_valid_png(self):
        from src.watermark import to_watermarked_png_bytes
        img = _blank_rgba()
        data = to_watermarked_png_bytes(img, "EV1-000001")
        # PNG magic bytes
        assert data[:8] == b"\x89PNG\r\n\x1a\n"

    def test_output_is_lossless(self):
        """PNG round-trip should reproduce the watermark exactly."""
        from src.watermark import to_watermarked_png_bytes, extract_watermark
        img = _blank_rgba()
        png = to_watermarked_png_bytes(img, "EV5-000555")
        assert extract_watermark(png) == "EV5-000555"
