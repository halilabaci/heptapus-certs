from __future__ import annotations

import io
import math
import re
import uuid as uuid_lib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageFilter


HEX_RE = re.compile(r"^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")

# Bundled HeptaCert logo shipped alongside this module
_LOGO_PATH = Path(__file__).with_name("heptacert_logo.png")


@dataclass(frozen=True)
class TemplateConfig:
    # Name + QR
    isim_x: int
    isim_y: int
    qr_x: int
    qr_y: int
    font_size: int = 48
    font_color: str = "#FFFFFF"

    # Certificate ID text (public_id)
    cert_id_x: int = 60
    cert_id_y: int = 60
    cert_id_font_size: int = 18
    cert_id_color: str = "#94A3B8"

    # HeptaCert hologram stamp (bottom-right corner)
    show_hologram: bool = True


def new_certificate_uuid() -> str:
    return str(uuid_lib.uuid4())


def _load_font(font_size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, font_size)
        except Exception:
            continue
    return ImageFont.load_default()


def _hex_to_rgba(hex_color: str) -> tuple[int, int, int, int]:
    """
    #RRGGBB or #RRGGBBAA
    """
    c = (hex_color or "").strip()
    if not HEX_RE.match(c):
        # fallback white-ish
        return (255, 255, 255, 255)

    h = c[1:]
    if len(h) == 6:
        r = int(h[0:2], 16)
        g = int(h[2:4], 16)
        b = int(h[4:6], 16)
        return (r, g, b, 255)

    r = int(h[0:2], 16)
    g = int(h[2:4], 16)
    b = int(h[4:6], 16)
    a = int(h[6:8], 16)
    return (r, g, b, a)


def _make_qr_png(
    data: str,
    box_size: int = 10,
    border: int = 1,
    logo_bytes: Optional[bytes] = None,
) -> Image.Image:
    # Use HIGH error correction when embedding a logo (logo covers ~20% of QR)
    error_level = qrcode.constants.ERROR_CORRECT_H if logo_bytes else qrcode.constants.ERROR_CORRECT_M
    qr = qrcode.QRCode(
        version=None,
        error_correction=error_level,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")

    if logo_bytes:
        try:
            logo = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
            qr_w, qr_h = qr_img.size
            logo_size = int(min(qr_w, qr_h) * 0.22)  # 22% of QR size
            logo = logo.resize((logo_size, logo_size), resample=Image.LANCZOS)
            # Circular crop mask
            mask = Image.new("L", (logo_size, logo_size), 0)
            ImageDraw.Draw(mask).ellipse([0, 0, logo_size - 1, logo_size - 1], fill=255)
            logo_circle = Image.new("RGBA", (logo_size, logo_size), (255, 255, 255, 255))
            logo_circle.paste(logo, (0, 0), mask)
            # White padding around logo
            pad = int(logo_size * 0.15)
            padded_size = logo_size + pad * 2
            padded = Image.new("RGBA", (padded_size, padded_size), (255, 255, 255, 255))
            padded.alpha_composite(logo_circle, (pad, pad))
            # Center on QR
            pos_x = (qr_w - padded_size) // 2
            pos_y = (qr_h - padded_size) // 2
            qr_img.alpha_composite(padded, (pos_x, pos_y))
        except Exception:
            pass  # Logo overlay is non-fatal

    return qr_img


def _build_hologram(canvas_w: int, canvas_h: int) -> Optional[Image.Image]:
    """
    Builds a semi-transparent HeptaCert hologram stamp.
    Returns an RGBA Image of the same size as the canvas, with the
    stamp composited in the bottom-right corner (transparent elsewhere).
    Returns None if the logo file is missing.
    """
    if not _LOGO_PATH.exists():
        return None

    # ── Logo ──────────────────────────────────────────────────────────────────
    LOGO_DIAM = max(90, min(int(canvas_w * 0.09), 160))   # 9% of canvas width, 90-160px
    MARGIN    = max(20, int(canvas_w * 0.025))
    OPACITY   = 90   # out of 255 — looks like a hologram watermark

    logo_raw = Image.open(_LOGO_PATH).convert("RGBA")
    logo_raw = logo_raw.resize((LOGO_DIAM, LOGO_DIAM), resample=Image.LANCZOS)

    # Circular crop mask
    mask = Image.new("L", (LOGO_DIAM, LOGO_DIAM), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, LOGO_DIAM - 1, LOGO_DIAM - 1], fill=255)
    # Soft edge — slight blur on mask
    mask = mask.filter(ImageFilter.GaussianBlur(radius=2))

    logo_circle = Image.new("RGBA", (LOGO_DIAM, LOGO_DIAM), (0, 0, 0, 0))
    logo_circle.paste(logo_raw, (0, 0), mask)

    # Apply hologram opacity to whole logo stamp
    r, g, b, a = logo_circle.split()
    a = a.point(lambda x: int(x * OPACITY / 255))
    logo_circle = Image.merge("RGBA", (r, g, b, a))

    # ── Text ──────────────────────────────────────────────────────────────────
    FONT_SIZE = max(11, int(LOGO_DIAM * 0.15))
    LABEL     = "Verified by HeptaCert™"
    try:
        fnt = _load_font(FONT_SIZE)
    except Exception:
        fnt = ImageFont.load_default()

    # Measure text
    tmp_draw = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    bbox = tmp_draw.textbbox((0, 0), LABEL, font=fnt)
    txt_w = bbox[2] - bbox[0]
    txt_h = bbox[3] - bbox[1]

    # ── Stamp canvas ──────────────────────────────────────────────────────────
    PADDING   = 8
    stamp_w   = max(LOGO_DIAM, txt_w) + PADDING * 2
    stamp_h   = LOGO_DIAM + txt_h + PADDING * 3

    stamp = Image.new("RGBA", (stamp_w, stamp_h), (0, 0, 0, 0))

    # Faint rounded-rect background (very subtle)
    bg_rect = Image.new("RGBA", (stamp_w, stamp_h), (255, 255, 255, 0))
    ImageDraw.Draw(bg_rect).rounded_rectangle(
        [0, 0, stamp_w - 1, stamp_h - 1],
        radius=12,
        fill=(220, 230, 255, 30),
    )
    stamp.alpha_composite(bg_rect)

    # Logo centered in top area
    logo_x = (stamp_w - LOGO_DIAM) // 2
    stamp.alpha_composite(logo_circle, (logo_x, PADDING))

    # Text centered below logo
    txt_x = (stamp_w - txt_w) // 2
    txt_y = PADDING + LOGO_DIAM + PADDING
    draw = ImageDraw.Draw(stamp)
    draw.text(
        (txt_x, txt_y), LABEL,
        font=fnt,
        fill=(80, 80, 130, OPACITY),
    )

    # ── Composite onto full-size transparent canvas ────────────────────────────
    full = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    paste_x = canvas_w - stamp_w - MARGIN
    paste_y = canvas_h - stamp_h - MARGIN
    full.alpha_composite(stamp, (paste_x, paste_y))
    return full


def render_certificate_pdf(
    template_image_bytes: bytes,
    student_name: str,
    verify_url: str,
    config: TemplateConfig,
    *,
    public_id: Optional[str] = None,
    qr_size_px: int = 260,
    brand_logo_bytes: Optional[bytes] = None,
) -> bytes:
    """
    Renders:
      - student_name at (isim_x, isim_y)
      - QR pointing to verify_url at (qr_x, qr_y)
      - optional public_id at (cert_id_x, cert_id_y)
      - HeptaCert hologram stamp at bottom-right (if config.show_hologram)
    """
    if not student_name or not student_name.strip():
        raise ValueError("student_name is empty")

    base = Image.open(io.BytesIO(template_image_bytes)).convert("RGBA")
    draw = ImageDraw.Draw(base)

    # Name
    name_font = _load_font(int(config.font_size))
    name_fill = _hex_to_rgba(config.font_color)
    draw.text(
        (int(config.isim_x), int(config.isim_y)),
        student_name.strip(),
        font=name_font,
        fill=name_fill,
    )

    # Certificate ID
    if public_id:
        id_font = _load_font(int(config.cert_id_font_size))
        id_fill = _hex_to_rgba(config.cert_id_color)
        draw.text(
            (int(config.cert_id_x), int(config.cert_id_y)),
            str(public_id),
            font=id_font,
            fill=id_fill,
        )

    # QR
    qr_img = _make_qr_png(verify_url, logo_bytes=brand_logo_bytes).resize((qr_size_px, qr_size_px), resample=Image.LANCZOS)
    base.alpha_composite(qr_img, (int(config.qr_x), int(config.qr_y)))

    # HeptaCert hologram stamp
    if getattr(config, "show_hologram", True):
        hologram = _build_hologram(base.width, base.height)
        if hologram is not None:
            base.alpha_composite(hologram)

    # Save PDF
    pdf_img = base.convert("RGB")
    out = io.BytesIO()
    pdf_img.save(out, format="PDF", resolution=300.0)
    raw_pdf = out.getvalue()

    # Apply cryptographic signature (invisible, Adobe-verifiable)
    try:
        from .signing import sign_pdf
        return sign_pdf(raw_pdf)
    except Exception:
        return raw_pdf