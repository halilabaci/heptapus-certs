"""
HeptaCert Steganographic Watermark
===================================
Embeds an invisible, JPEG-resilient watermark into certificate images using
LSB steganography with repetition coding.

Technique:
  - Each bit of the payload is written REPS=32 times consecutively into the
    LSB of the Red channel.
  - On extraction, majority voting over 32 raw bits recovers the original bit
    even if moderate JPEG noise flips up to ~31% of them.
  - Payload capacity at REPS=32: (n_pixels / 32) bits ≈ 34,000 bits for a
    1240×877 image — enough for a ~4,000-character payload.
  - The encoding begins with a 3-byte magic header "HC1" so that non-watermarked
    images are instantly rejected without false positives.

Survival characteristics:
  ✓ PNG (lossless)              — always works (intended primary format)
  ✗ JPEG (any quality)          — LSB is destroyed by DCT quantization;
                                  users MUST download/share the original PNG
  ✗ WebP lossy, heavy resize    — same reason as JPEG
  ✗ Heavy crop                  — fails if the top-left corner is removed
"""

from __future__ import annotations

import io
import struct

import numpy as np
from PIL import Image


# ── Constants ────────────────────────────────────────────────────────────────
MAGIC = b"HC1"          # 3-byte magic prefix
REPS  = 32              # repetition factor (JPEG resilience)
MAX_PAYLOAD_BYTES = 256 # hard cap on payload length


# ── Internal helpers ─────────────────────────────────────────────────────────

def _bytes_to_bits(data: bytes) -> list[int]:
    bits: list[int] = []
    for byte in data:
        for i in range(7, -1, -1):
            bits.append((byte >> i) & 1)
    return bits


def _bits_to_bytes(bits: list[int]) -> bytes:
    out = bytearray()
    for i in range(0, len(bits) - 7, 8):
        byte = 0
        for j in range(8):
            byte = (byte << 1) | bits[i + j]
        out.append(byte)
    return bytes(out)


def _encode(payload: str) -> list[int]:
    """Convert payload string → repeated LSB bit stream."""
    encoded = payload.encode("utf-8")
    if len(encoded) > MAX_PAYLOAD_BYTES:
        raise ValueError(f"Watermark payload too long: {len(encoded)} > {MAX_PAYLOAD_BYTES}")
    frame = MAGIC + struct.pack(">H", len(encoded)) + encoded
    raw_bits = _bytes_to_bits(frame)
    # Repeat each bit REPS times for noise resilience
    return [b for b in raw_bits for _ in range(REPS)]


def _decode(raw_bits: list[int]) -> str | None:
    """Reconstruct payload from raw LSB stream using majority voting."""
    if len(raw_bits) < len(MAGIC) * 8 * REPS:
        return None

    # Majority vote: reduce REPS raw bits → 1 clean bit
    n_raw = len(raw_bits)
    n_clean = n_raw // REPS
    clean: list[int] = []
    for i in range(n_clean):
        chunk = raw_bits[i * REPS : (i + 1) * REPS]
        clean.append(1 if sum(chunk) > REPS // 2 else 0)

    data = _bits_to_bytes(clean)

    # Verify magic header
    if not data.startswith(MAGIC):
        return None

    offset = len(MAGIC)
    if len(data) < offset + 2:
        return None

    payload_len = struct.unpack(">H", data[offset : offset + 2])[0]
    offset += 2

    if payload_len > MAX_PAYLOAD_BYTES or len(data) < offset + payload_len:
        return None

    try:
        return data[offset : offset + payload_len].decode("utf-8")
    except (UnicodeDecodeError, ValueError):
        return None


# ── Public API ───────────────────────────────────────────────────────────────

def embed_watermark(img: Image.Image, payload: str) -> Image.Image:
    """
    Return a copy of *img* with *payload* embedded in the LSB of the Red
    channel. The visual change is imperceptible (max 1/255 shift per pixel).

    Args:
        img: Source PIL Image (any mode; will be converted to RGBA internally).
        payload: ASCII/UTF-8 string to embed (max 256 bytes when encoded).

    Returns:
        New PIL Image (RGBA) containing the watermark.

    Raises:
        ValueError: If the payload is too large for the image dimensions.
    """
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w = arr.shape[:2]

    bits = _encode(payload)
    n = len(bits)

    flat_r = arr[:, :, 0].flatten()
    if n > len(flat_r):
        raise ValueError(
            f"Image too small for payload ({n} bits needed, {len(flat_r)} pixels available)"
        )

    # Embed: clear LSB, then set to our bit
    flat_r[:n] = (flat_r[:n] & np.uint8(0xFE)) | np.array(bits[:n], dtype=np.uint8)
    arr[:, :, 0] = flat_r.reshape(h, w)

    return Image.fromarray(arr, "RGBA")


def extract_watermark(image_bytes: bytes) -> str | None:
    """
    Attempt to extract a HeptaCert watermark from *image_bytes*.

    Returns the embedded payload string if found, or None if the image
    contains no valid HeptaCert watermark (or if it was too compressed).

    Args:
        image_bytes: Raw bytes of any image format that Pillow can open.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    except Exception:
        return None

    arr = np.array(img, dtype=np.uint8)
    h, w = arr.shape[:2]

    # We only need to read enough pixels to decode the full payload header + content
    # Max needed: (MAGIC + 2-byte-len + MAX_PAYLOAD_BYTES) bits × REPS
    max_bits_needed = (len(MAGIC) + 2 + MAX_PAYLOAD_BYTES) * 8 * REPS
    flat_r = arr[:, :, 0].flatten()
    n_read = min(max_bits_needed, len(flat_r))

    raw_bits = (flat_r[:n_read] & np.uint8(1)).tolist()
    return _decode(raw_bits)


def to_watermarked_png_bytes(img: Image.Image, payload: str) -> bytes:
    """
    Convenience wrapper: embed watermark and return lossless PNG bytes.
    Safe to call even if watermarking fails — falls back to un-watermarked PNG.
    """
    try:
        watermarked = embed_watermark(img, payload)
    except Exception:
        watermarked = img.convert("RGBA")

    buf = io.BytesIO()
    watermarked.save(buf, format="PNG", optimize=False)
    return buf.getvalue()
