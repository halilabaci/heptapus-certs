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
    # Name
    isim_x: int
    isim_y: int
    font_size: int = 48
    font_color: str = "#FFFFFF"
    name_text_align: str = "center"   # left | center | right
    name_font_weight: str = "normal"  # normal | bold
    name_font_style: str = "normal"   # normal | italic

    # QR code
    qr_x: int = 80
    qr_y: int = 700
    qr_size: int = 260
    show_qr: bool = True

    # Certificate ID text (public_id)
    cert_id_x: int = 60
    cert_id_y: int = 60
    cert_id_font_size: int = 22
    cert_id_color: str = "#334155"
    cert_id_text_align: str = "left"   # left | center | right
    cert_id_font_weight: str = "normal"
    cert_id_font_style: str = "normal"
    show_cert_id: bool = True

    # HeptaCert hologram stamp (bottom-right corner)
    show_hologram: bool = True


def new_certificate_uuid() -> str:
    return str(uuid_lib.uuid4())


def _load_font(
    font_size: int,
    bold: bool = False,
    italic: bool = False,
) -> ImageFont.FreeTypeFont:
    """
    Load a TrueType font of the requested size.
    Tries bold/italic variants first when requested, falls back to regular.
    """
    dejavu_bold_italic = "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf"
    dejavu_bold        = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    dejavu_italic      = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf"
    dejavu_regular     = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

    liberation_bold_italic = "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf"
    liberation_bold        = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    liberation_italic      = "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf"
    liberation_regular     = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

    if bold and italic:
        candidates = [dejavu_bold_italic, dejavu_bold, liberation_bold_italic, liberation_bold, dejavu_regular, liberation_regular]
    elif bold:
        candidates = [dejavu_bold, liberation_bold, dejavu_regular, liberation_regular]
    elif italic:
        candidates = [dejavu_italic, liberation_italic, dejavu_regular, liberation_regular]
    else:
        candidates = [dejavu_regular, liberation_regular, "/usr/share/fonts/truetype/freefont/FreeSans.ttf"]

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
    Builds a premium HeptaCert security-badge hologram stamp.
    Returns an RGBA Image of the same size as the canvas, with the
    badge composited in the bottom-right corner (transparent elsewhere).
    Returns None if the logo file is missing.
    """
    if not _LOGO_PATH.exists():
        return None

    # ── Palette (Navy · Indigo · Gold) ────────────────────────────────────────
    NAVY   = (23,  45, 110)
    INDIGO = (62,  95, 210)
    GOLD   = (200, 170, 80)

    BADGE_D  = max(160, min(int(canvas_w * 0.16), 300))   # total badge diameter (~2× previous)
    MARGIN   = max(28, int(canvas_w * 0.03))
    OPACITY  = 160   # hologram watermark opacity (out of 255, ~63%)
    CX = CY  = BADGE_D // 2                               # badge centre

    badge = Image.new("RGBA", (BADGE_D, BADGE_D), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(badge)

    # ── Subtle inner fill (navy ghost) ────────────────────────────────────────
    R_OUTER = CX - 2
    draw.ellipse(
        [CX - R_OUTER, CY - R_OUTER, CX + R_OUTER, CY + R_OUTER],
        fill=(*NAVY, 22),
    )

    # ── Outer ring (indigo) ───────────────────────────────────────────────────
    R_RING_O = R_OUTER
    draw.ellipse(
        [CX - R_RING_O, CY - R_RING_O, CX + R_RING_O, CY + R_RING_O],
        outline=(*INDIGO, OPACITY), width=2,
    )

    # ── Inner ring (navy) ─────────────────────────────────────────────────────
    R_RING_I = R_RING_O - 7
    draw.ellipse(
        [CX - R_RING_I, CY - R_RING_I, CX + R_RING_I, CY + R_RING_I],
        outline=(*NAVY, int(OPACITY * 0.65)), width=1,
    )

    # ── Tick marks around outer ring ──────────────────────────────────────────
    N_TICKS = 36
    for i in range(N_TICKS):
        angle_rad = math.radians(i * (360 / N_TICKS))
        is_major  = (i % 6 == 0)           # every 6th tick is a major (gold)
        tick_len  = 7 if is_major else 4
        tick_w    = 2 if is_major else 1
        color     = (*GOLD, OPACITY) if is_major else (*INDIGO, int(OPACITY * 0.75))
        r_start   = R_RING_O + 2
        r_end     = r_start + tick_len
        x1 = CX + r_start * math.cos(angle_rad)
        y1 = CY + r_start * math.sin(angle_rad)
        x2 = CX + r_end   * math.cos(angle_rad)
        y2 = CY + r_end   * math.sin(angle_rad)
        draw.line([(x1, y1), (x2, y2)], fill=color, width=tick_w)

    # ── Four gold diamond accents at cardinal points ───────────────────────────
    DIAM_R = R_RING_O + 12   # distance from centre to diamond centre
    DIAM_S = 4               # half-size of diamond
    for ang_deg in (0, 90, 180, 270):
        rad = math.radians(ang_deg)
        dx  = CX + DIAM_R * math.cos(rad)
        dy  = CY + DIAM_R * math.sin(rad)
        poly = [
            (dx,          dy - DIAM_S),
            (dx + DIAM_S, dy),
            (dx,          dy + DIAM_S),
            (dx - DIAM_S, dy),
        ]
        draw.polygon(poly, fill=(*GOLD, OPACITY))

    # ── Logo centred inside inner ring ────────────────────────────────────────
    R_FILL     = R_RING_I - 10
    LOGO_SIZE  = int(R_FILL * 1.35)
    logo_raw   = Image.open(_LOGO_PATH).convert("RGBA")
    logo_raw   = logo_raw.resize((LOGO_SIZE, LOGO_SIZE), resample=Image.LANCZOS)

    lmask = Image.new("L", (LOGO_SIZE, LOGO_SIZE), 0)
    ImageDraw.Draw(lmask).ellipse([0, 0, LOGO_SIZE - 1, LOGO_SIZE - 1], fill=255)
    lmask = lmask.filter(ImageFilter.GaussianBlur(radius=1.5))

    logo_circle = Image.new("RGBA", (LOGO_SIZE, LOGO_SIZE), (0, 0, 0, 0))
    logo_circle.paste(logo_raw, (0, 0), lmask)

    # Apply hologram opacity
    lr, lg_ch, lb, la = logo_circle.split()
    la = la.point(lambda x: int(x * OPACITY / 255))
    logo_circle = Image.merge("RGBA", (lr, lg_ch, lb, la))

    logo_off = CX - LOGO_SIZE // 2
    badge.alpha_composite(logo_circle, (logo_off, logo_off))

    # ── "VERIFIED BY HEPTACERT™" strip ────────────────────────────────────────
    LABEL     = "VERIFIED BY HEPTACERT™"
    FONT_SIZE = max(9, int(BADGE_D * 0.09))
    try:
        fnt = _load_font(FONT_SIZE)
    except Exception:
        fnt = ImageFont.load_default()

    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    bbox  = tmp.textbbox((0, 0), LABEL, font=fnt)
    txt_w = bbox[2] - bbox[0]
    txt_h = bbox[3] - bbox[1]

    strip_pad_x = 10
    strip_pad_y = 4
    strip_w     = txt_w + strip_pad_x * 2
    strip_h     = txt_h + strip_pad_y * 2
    strip_x     = CX - strip_w // 2
    strip_y     = BADGE_D - 6 - strip_h

    # navy bg strip
    draw.rounded_rectangle(
        [strip_x, strip_y, strip_x + strip_w, strip_y + strip_h],
        radius=4,
        fill=(*NAVY, 38),
    )
    draw.text(
        (strip_x + strip_pad_x, strip_y + strip_pad_y),
        LABEL,
        font=fnt,
        fill=(*INDIGO, OPACITY),
    )

    # Apply overall badge opacity
    br, bg_ch, bb, ba = badge.split()
    ba = ba.point(lambda x: min(255, int(x * OPACITY / 255)))
    badge = Image.merge("RGBA", (br, bg_ch, bb, ba))

    # ── Composite onto full-size transparent canvas ────────────────────────────
    full    = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    paste_x = canvas_w - BADGE_D - MARGIN
    paste_y = canvas_h - BADGE_D - MARGIN
    full.alpha_composite(badge, (paste_x, paste_y))
    return full


def _render_certificate_base_image(
    template_image_bytes: bytes,
    student_name: str,
    verify_url: str,
    config: TemplateConfig,
    *,
    public_id: Optional[str] = None,
    qr_size_px: int = 260,
    brand_logo_bytes: Optional[bytes] = None,
) -> Image.Image:
    """
    Core rendering logic — returns a PIL RGBA Image with all certificate
    elements drawn (name, cert-id, QR, hologram). Does NOT convert to PDF.
    Call render_certificate_pdf() or render_certificate_png_watermarked()
    to get the final output format.
    """
    if not student_name or not student_name.strip():
        raise ValueError("student_name is empty")

    base = Image.open(io.BytesIO(template_image_bytes)).convert("RGBA")
    draw = ImageDraw.Draw(base)
    canvas_w, canvas_h = base.size

    # ── Name ──────────────────────────────────────────────────────────────────
    name_bold   = getattr(config, "name_font_weight", "normal") == "bold"
    name_italic = getattr(config, "name_font_style",  "normal") == "italic"
    name_font   = _load_font(int(config.font_size), bold=name_bold, italic=name_italic)
    name_fill   = _hex_to_rgba(config.font_color)
    name_align  = getattr(config, "name_text_align", "center")  # left | center | right

    _anchor_map = {"left": "lt", "center": "mt", "right": "rt"}
    name_anchor = _anchor_map.get(name_align, "lt")

    name_x = max(0, min(int(config.isim_x), canvas_w - 1))
    name_y = max(0, min(int(config.isim_y), canvas_h - 1))

    draw.text(
        (name_x, name_y),
        student_name.strip(),
        font=name_font,
        fill=name_fill,
        anchor=name_anchor,
    )

    # ── Certificate ID ────────────────────────────────────────────────────────
    if public_id and getattr(config, "show_cert_id", True):
        cid_bold   = getattr(config, "cert_id_font_weight", "normal") == "bold"
        cid_italic = getattr(config, "cert_id_font_style",  "normal") == "italic"
        id_font    = _load_font(int(config.cert_id_font_size), bold=cid_bold, italic=cid_italic)
        id_fill    = _hex_to_rgba(config.cert_id_color)
        cid_align  = getattr(config, "cert_id_text_align", "left")
        cid_anchor = _anchor_map.get(cid_align, "lt")
        cid_x = max(0, min(int(config.cert_id_x), canvas_w - 1))
        cid_y = max(0, min(int(config.cert_id_y), canvas_h - 1))
        draw.text(
            (cid_x, cid_y),
            str(public_id),
            font=id_font,
            fill=id_fill,
            anchor=cid_anchor,
        )

    # ── QR code ───────────────────────────────────────────────────────────────
    if getattr(config, "show_qr", True):
        effective_qr_size = int(getattr(config, "qr_size", qr_size_px) or qr_size_px)
        qr_img = _make_qr_png(verify_url, logo_bytes=brand_logo_bytes).resize(
            (effective_qr_size, effective_qr_size), resample=Image.LANCZOS
        )
        base.alpha_composite(qr_img, (int(config.qr_x), int(config.qr_y)))

    # ── HeptaCert hologram stamp ──────────────────────────────────────────────
    if getattr(config, "show_hologram", True):
        hologram = _build_hologram(base.width, base.height)
        if hologram is not None:
            base.alpha_composite(hologram)

    return base


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
    Renders the certificate and returns signed PDF bytes.
    Backward-compatible wrapper around _render_certificate_base_image().
    """
    base = _render_certificate_base_image(
        template_image_bytes, student_name, verify_url, config,
        public_id=public_id, qr_size_px=qr_size_px, brand_logo_bytes=brand_logo_bytes,
    )

    pdf_img = base.convert("RGB")
    out = io.BytesIO()
    pdf_img.save(out, format="PDF", resolution=300.0)
    raw_pdf = out.getvalue()

    try:
        from .signing import sign_pdf
        return sign_pdf(raw_pdf)
    except Exception:
        return raw_pdf


def render_certificate_png_watermarked(
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
    Renders the certificate and returns lossless PNG bytes with an invisible
    steganographic watermark embedded (payload = public_id).

    The watermark can later be extracted by watermark.extract_watermark()
    to prove the image's authenticity without any external database lookup.
    Falls back to un-watermarked PNG if watermarking fails.
    """
    base = _render_certificate_base_image(
        template_image_bytes, student_name, verify_url, config,
        public_id=public_id, qr_size_px=qr_size_px, brand_logo_bytes=brand_logo_bytes,
    )

    watermark_payload = public_id or ""
    if watermark_payload:
        try:
            from .watermark import to_watermarked_png_bytes
            return to_watermarked_png_bytes(base, watermark_payload)
        except Exception:
            pass  # never fail certificate generation due to watermark

    # Fallback: plain PNG without watermark
    buf = io.BytesIO()
    base.convert("RGBA").save(buf, format="PNG")
    return buf.getvalue()