"""Genera las variantes del logo para web y Android a partir de jumptrack.png.

Uso: python3 scripts/make-icons.py   (requiere Pillow: pip install pillow)
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
src = Image.open(root / 'jumptrack.png').convert('RGBA')
size = src.width
LIME = (193, 243, 68, 255)
SS = 4  # supersampling para bordes suaves


def rounded_mask(px: int, radius_ratio: float) -> Image.Image:
    big = Image.new('L', (px * SS, px * SS), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, px * SS - 1, px * SS - 1), radius=int(px * SS * radius_ratio), fill=255)
    return big.resize((px, px), Image.LANCZOS)


def circle_mask(px: int) -> Image.Image:
    big = Image.new('L', (px * SS, px * SS), 0)
    ImageDraw.Draw(big).ellipse((0, 0, px * SS - 1, px * SS - 1), fill=255)
    return big.resize((px, px), Image.LANCZOS)


# Logo con esquinas transparentes (las esquinas originales son negras).
rounded = src.copy()
# Encoge la máscara 6 px para no dejar halo negro en el borde.
inset = Image.new('L', (size, size), 0)
inner = rounded_mask(size - 12, 0.235)
inset.paste(inner, (6, 6))
rounded.putalpha(inset)

# Versión a sangre (fondo lime en las esquinas) para iconos que el sistema recorta.
full = Image.new('RGBA', (size, size), LIME)
full.alpha_composite(rounded)


def scaled_on_lime(px: int, scale: float) -> Image.Image:
    canvas = Image.new('RGBA', (px, px), LIME)
    inner_px = int(px * scale)
    logo = full.resize((inner_px, inner_px), Image.LANCZOS)
    canvas.alpha_composite(logo, ((px - inner_px) // 2, (px - inner_px) // 2))
    return canvas


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


# Web
save(rounded.resize((512, 512), Image.LANCZOS), root / 'public/logo.png')
save(rounded.resize((64, 64), Image.LANCZOS), root / 'public/favicon.png')
save(full.resize((180, 180), Image.LANCZOS).convert('RGB'), root / 'public/apple-touch-icon.png')

# Android
res = root / 'android/app/src/main/res'
densities = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, factor in densities.items():
    legacy = int(48 * factor)
    save(rounded.resize((legacy, legacy), Image.LANCZOS), res / f'mipmap-{name}/ic_launcher.png')
    round_icon = scaled_on_lime(legacy, 0.85)
    round_icon.putalpha(circle_mask(legacy))
    save(round_icon, res / f'mipmap-{name}/ic_launcher_round.png')
    # Adaptativo: el launcher solo muestra el centro (~66 de 108 dp), así que la cuerda va al 70 %.
    save(scaled_on_lime(int(108 * factor), 0.7), res / f'mipmap-{name}/ic_launcher_foreground.png')

# Splash (Android 12+ recorta un círculo de 2/3 del lienzo).
save(scaled_on_lime(432, 0.7), res / 'drawable-nodpi/splash_icon.png')
