#!/usr/bin/env python3
"""Build Dude McGee press PDFs and the downloadable asset package."""

from __future__ import annotations

from pathlib import Path
import shutil
import zipfile

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "site"
OUTPUT = ROOT / "output" / "pdf"
DOWNLOADS = ROOT / "press" / "downloads"
EPK_PDF = OUTPUT / "DudeMcGee_EPK.pdf"
SHEET_PDF = OUTPUT / "DudeMcGee_Media_Sheet.pdf"

PAGE_W, PAGE_H = letter
INK = HexColor("#030605")
PAPER = HexColor("#e9f4eb")
CYAN = HexColor("#5cf7ed")
PINK = HexColor("#ff4caa")
ACID = HexColor("#c7ff58")
MUTED = HexColor("#9baca3")
LINE = Color(0.36, 0.97, 0.93, alpha=0.22)


def image_cover(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float, opacity: float = 1.0) -> None:
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, y, w, h)
    c.clipPath(clip, stroke=0, fill=0)
    if opacity != 1:
        c.setFillAlpha(opacity)
    c.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, mask="auto")
    c.restoreState()


def background(c: canvas.Canvas, accent: str = "cyan") -> None:
    c.setFillAlpha(1)
    c.setStrokeAlpha(1)
    c.setFillColor(INK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    color = CYAN if accent == "cyan" else PINK
    c.setStrokeColor(Color(color.red, color.green, color.blue, alpha=0.08))
    c.setLineWidth(0.35)
    for x in range(0, int(PAGE_W), 42):
        c.line(x, 0, x, PAGE_H)
    for y in range(0, int(PAGE_H), 42):
        c.line(0, y, PAGE_W, y)


def footer(c: canvas.Canvas, page: int, label: str = "OFFICIAL PRESS MATERIALS") -> None:
    c.setFillAlpha(1)
    c.setStrokeAlpha(1)
    c.setFillColor(INK)
    c.rect(0, 0, PAGE_W, 36, fill=1, stroke=0)
    c.setStrokeColor(LINE)
    c.line(42, 36, PAGE_W - 42, 36)
    c.setFillColor(PAPER)
    c.setFont("Helvetica", 8)
    c.drawString(42, 22, label)
    c.drawRightString(PAGE_W - 42, 22, f"DUDE MCGEE // {page:02d}")


def eyebrow(c: canvas.Canvas, text: str, x: float, y: float, color=CYAN) -> None:
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(x, y, text.upper())


def title(c: canvas.Canvas, lines: list[tuple[str, object]], x: float, y: float, size: float = 50, leading: float = 44) -> float:
    current_y = y
    for text, color in lines:
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", size)
        c.drawString(x, current_y, text.upper())
        current_y -= leading
    return current_y


def para(c: canvas.Canvas, text: str, x: float, y_top: float, w: float, size: float = 10.5, leading: float = 16, color=PAPER, bold_first: bool = False) -> float:
    style = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=size,
        leading=leading,
        textColor=color,
        alignment=TA_LEFT,
        spaceAfter=0,
    )
    if bold_first:
        style.fontName = "Helvetica-Bold"
    p = Paragraph(text, style)
    _, h = p.wrap(w, PAGE_H)
    p.drawOn(c, x, y_top - h)
    return y_top - h


def pill(c: canvas.Canvas, text: str, x: float, y: float, color=CYAN) -> float:
    width = stringWidth(text.upper(), "Helvetica-Bold", 7) + 20
    c.setStrokeColor(color)
    c.roundRect(x, y, width, 22, 11, fill=0, stroke=1)
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(x + width / 2, y + 7.5, text.upper())
    return width


def build_epk() -> None:
    c = canvas.Canvas(str(EPK_PDF), pagesize=letter, pageCompression=1)
    c.setTitle("Dude McGee Electronic Press Kit")
    c.setAuthor("Dude McGee")

    # 1 - Cover
    image_cover(c, ASSETS / "digital-dream-art.webp", 0, 0, PAGE_W, PAGE_H)
    c.setFillColor(Color(0.01, 0.02, 0.02, alpha=0.65))
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(Color(0.01, 0.02, 0.02, alpha=0.84))
    c.rect(0, 0, PAGE_W * 0.68, PAGE_H, fill=1, stroke=0)
    eyebrow(c, "Electronic press kit // 2026", 48, 706)
    title(c, [("Dude", PAPER), ("McGee", PINK)], 46, 635, 76, 64)
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 474, "INDEPENDENT RECORDING ARTIST")
    c.setFont("Helvetica", 10)
    c.setFillColor(MUTED)
    c.drawString(50, 452, "MULTI-INSTRUMENTALIST  /  PRODUCER  /  SONGWRITER")
    c.setStrokeColor(CYAN)
    c.line(50, 421, 255, 421)
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 25)
    c.drawString(50, 383, "DIGITAL DREAM")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(50, 356, "North Central Arkansas // The Ozarks")
    c.drawString(50, 338, "Released through Dirt Cat Records")
    c.setFillColor(CYAN)
    c.drawString(50, 84, "DUDEMCGEE.COM/PRESS/")
    c.drawString(50, 66, "870JOSHMCLEAN@GMAIL.COM")
    c.showPage()

    # 2 - About
    background(c)
    eyebrow(c, "01 / About", 44, 738)
    title(c, [("Built for", PAPER), ("the whole", PINK), ("signal.", PINK)], 42, 690, 40, 36)
    y = para(c, "<b>Dude McGee</b> is an independent recording artist, songwriter, producer, multi-instrumentalist, and lifelong live performer from North Central Arkansas in the Ozarks. His catalog moves across electronic music, rock, pop, country, blues, and whatever language best serves the song.", 44, 545, 330, 10.5, 16)
    y = para(c, "He writes, performs, records, produces, mixes, and masters every release. He also creates the artwork, videos, and supporting media.", 44, y - 18, 330, 10.5, 16)
    image_cover(c, ASSETS / "digital-fauna-profile.webp", 408, 302, 160, 365)
    c.setStrokeColor(CYAN)
    c.rect(408, 302, 160, 365, fill=0, stroke=1)
    eyebrow(c, "Quick facts", 44, 275, ACID)
    facts = [
        ("BASED IN", "North Central Arkansas, the Ozarks"),
        ("APPROACH", "Multi-genre / song first / no fixed lane"),
        ("INSTRUMENTS", "Voice, keys, guitars, bass, strings, horns, drums"),
        ("CURRENT RELEASE", "Digital Dream"),
        ("LABEL", "Dirt Cat Records"),
        ("CREATIVE CONTROL", "Writing through final master and visual media"),
    ]
    fy = 245
    for key, value in facts:
        c.setStrokeColor(LINE)
        c.line(44, fy - 8, 568, fy - 8)
        c.setFillColor(CYAN)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawString(44, fy, key)
        c.setFillColor(PAPER)
        c.setFont("Helvetica", 9)
        c.drawString(165, fy, value)
        fy -= 32
    footer(c, 2)
    c.showPage()

    # 3 - Live history
    background(c, "pink")
    eyebrow(c, "02 / Live history", 44, 738, PINK)
    title(c, [("Not a first", PAPER), ("time onstage.", CYAN)], 42, 690, 43, 39)
    timeline = [
        ("CHILDHOOD", "Began performing live several days each week in church, later serving as a youth music minister."),
        ("TULSA", "Moved to Tulsa, Oklahoma and fronted a working Top 40 rock band as lead singer and guitarist, often performing three to five shows per week."),
        ("SKITZOFRENZY", "Developed a live electronic project combining keyboards, vocals, and dance-music mixing for rave-style shows."),
        ("DUDE MCGEE", "Brings those years of stage experience into a self-produced, multi-genre artist project and is open to the right live opportunities."),
    ]
    y = 555
    for i, (label, copy) in enumerate(timeline, 1):
        c.setFillColor(PINK if i % 2 else CYAN)
        c.circle(62, y + 8, 5, fill=1, stroke=0)
        if i < len(timeline):
            c.setStrokeColor(LINE)
            c.line(62, y + 3, 62, y - 93)
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(88, y + 3, label)
        para(c, copy, 88, y - 16, 420, 10, 15, MUTED)
        y -= 112
    c.setFillColor(ACID)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(88, 88, "ARCHIVE: SOUNDCLOUD.COM/SKITZOFRENZY")
    footer(c, 3)
    c.showPage()

    # 4 - Release
    c.setFillColor(INK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.drawImage(ImageReader(str(ASSETS / "digital-dream-video.jpg")), 0, 448, PAGE_W, 344.25, mask="auto")
    c.setFillColor(Color(0.01, 0.02, 0.02, alpha=0.28))
    c.rect(0, 448, PAGE_W, 344.25, fill=1, stroke=0)
    c.setFillAlpha(1)
    c.setStrokeAlpha(1)
    c.setFillColor(INK)
    c.rect(0, 0, PAGE_W, 448, fill=1, stroke=0)
    eyebrow(c, "03 / Current release", 44, 314)
    title(c, [("Digital", PAPER), ("Dream", PINK)], 42, 266, 48, 42)
    para(c, "The electronic opening chapter of a wider catalog, chosen because its lyrics capture the tension between the human world we have always known and the strange digital world now surrounding it.", 323, 273, 245, 10.5, 16, PAPER)
    x = 323
    x += pill(c, "Official lyric video", x, 171, CYAN) + 8
    pill(c, "3:32", x, 171, PINK)
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(323, 132, "WATCH: YOUTUBE.COM/WATCH?V=R-SWPSL2K8W")
    footer(c, 4)
    c.showPage()

    # 5 - Availability / contact
    background(c)
    eyebrow(c, "04 / Opportunities", 44, 738, ACID)
    title(c, [("Open to the", PAPER), ("right conversation.", PINK)], 42, 690, 42, 38)
    opportunities = ["INTERVIEWS", "COLLABORATIONS", "LIVE BOOKINGS", "LICENSING + SYNC", "SELECT LABEL CONVERSATIONS"]
    y = 550
    for index, item in enumerate(opportunities, 1):
        c.setStrokeColor(LINE)
        c.line(44, y - 14, 568, y - 14)
        c.setFillColor(CYAN)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(44, y, f"{index:02d}")
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(90, y - 3, item)
        y -= 65
    c.setFillColor(ACID)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(44, 185, "PRESS / BOOKING / COLLABORATION / LICENSING")
    c.setStrokeColor(CYAN)
    c.line(44, 160, 568, 160)
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(44, 125, "870JOSHMCLEAN@GMAIL.COM")
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(44, 90, "DUDEMCGEE.COM/PRESS/")
    footer(c, 5)
    c.save()


def build_media_sheet() -> None:
    c = canvas.Canvas(str(SHEET_PDF), pagesize=letter, pageCompression=1)
    c.setTitle("Dude McGee One-Page Media Sheet")
    c.setAuthor("Dude McGee")
    background(c)
    image_cover(c, ASSETS / "digital-dream-art.webp", 375, 355, 193, 390)
    c.setStrokeColor(CYAN)
    c.rect(375, 355, 193, 390, fill=0, stroke=1)
    eyebrow(c, "One-page media sheet // 2026", 42, 738)
    title(c, [("Dude", PAPER), ("McGee", PINK)], 40, 676, 58, 50)
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(44, 550, "RECORDING ARTIST / MULTI-INSTRUMENTALIST / PRODUCER")
    para(c, "Dude McGee is an independent recording artist and lifelong live performer from North Central Arkansas in the Ozarks. He sings and plays keys, guitars, bass, strings, horns, drums, and percussion, while carrying each release from writing through final master and visual media.", 44, 520, 290, 9.5, 14.5, PAPER)
    eyebrow(c, "Current release", 44, 391, ACID)
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(44, 356, "DIGITAL DREAM")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.5)
    c.drawString(44, 335, "Official lyric video available on YouTube")
    facts = [
        ("BASED IN", "North Central Arkansas / The Ozarks"),
        ("RELEASED THROUGH", "Dirt Cat Records"),
        ("APPROACH", "Multi-genre / the song determines the style"),
        ("INSTRUMENTS", "Voice / keys / guitars / bass / strings / horns / drums"),
        ("LIVE EXPERIENCE", "Rock frontman + live electronic performance"),
        ("AVAILABLE FOR", "Press / booking / collaboration / licensing"),
    ]
    y = 282
    for key, value in facts:
        c.setStrokeColor(LINE)
        c.line(44, y - 10, 568, y - 10)
        c.setFillColor(CYAN)
        c.setFont("Helvetica-Bold", 6)
        c.drawString(44, y, key)
        c.setFillColor(PAPER)
        c.setFont("Helvetica", 8.5)
        c.drawString(160, y, value)
        y -= 27
    c.setFillColor(ACID)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(44, 113, "CONTACT")
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(44, 90, "870JOSHMCLEAN@GMAIL.COM")
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(44, 61, "DUDEMCGEE.COM/PRESS/")
    c.drawRightString(568, 61, "YOUTUBE.COM/WATCH?V=R-SWPSL2K8W")
    footer(c, 1, "ONE-PAGE MEDIA SHEET")
    c.save()


def build_zip() -> None:
    package = DOWNLOADS / "DudeMcGee_PressKit.zip"
    readme = (
        "DUDE MCGEE - OFFICIAL PRESS KIT\n\n"
        "Press / booking / collaboration / licensing:\n"
        "870joshmclean@gmail.com\n\n"
        "Official press page: https://www.dudemcgee.com/press/\n"
        "YouTube: https://www.youtube.com/channel/UChkXhEVitGopkXbgdpUxeBA\n"
        "Skitzofrenzy archive: https://soundcloud.com/skitzofrenzy\n\n"
        "Current artwork may be used in editorial coverage of Dude McGee.\n"
        "Approved artist portraits and live-performance photographs will be added in a future update.\n"
    )
    with zipfile.ZipFile(package, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.write(EPK_PDF, "DudeMcGee_PressKit/DudeMcGee_EPK.pdf")
        archive.write(SHEET_PDF, "DudeMcGee_PressKit/DudeMcGee_Media_Sheet.pdf")
        archive.writestr("DudeMcGee_PressKit/README.txt", readme)
        for source, target in [
            ("digital-dream-art.webp", "04_Artwork/DigitalDream_Artwork.webp"),
            ("digital-dream-video.jpg", "04_Artwork/DigitalDream_Video_Still.jpg"),
            ("dude-mcgee-social-card.png", "04_Artwork/DudeMcGee_Social_Card.png"),
            ("digital-fauna-profile.webp", "02_Press_Photos/ARTWORK_PLACEHOLDER_DigitalFauna.webp"),
        ]:
            archive.write(ASSETS / source, f"DudeMcGee_PressKit/{target}")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    build_epk()
    build_media_sheet()
    shutil.copy2(EPK_PDF, DOWNLOADS / EPK_PDF.name)
    shutil.copy2(SHEET_PDF, DOWNLOADS / SHEET_PDF.name)
    build_zip()
    print(EPK_PDF)
    print(SHEET_PDF)
    print(DOWNLOADS / "DudeMcGee_PressKit.zip")


if __name__ == "__main__":
    main()
