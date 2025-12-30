"""
Redimensionne akong.png en image Open Graph 1200x630
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# Dimensions Open Graph
OG_WIDTH = 1200
OG_HEIGHT = 630

def create_og_from_akong(add_text_overlay=True):
    """Crée l'image OG à partir de akong.png"""

    # Charger l'image source
    source_path = "public/akong.png"
    if not os.path.exists(source_path):
        print(f"[ERROR] Fichier non trouve: {source_path}")
        return

    img = Image.open(source_path)
    print(f"[OK] Image chargee: {img.size[0]}x{img.size[1]} pixels")

    # Calculer le ratio pour garder les proportions
    source_ratio = img.width / img.height
    target_ratio = OG_WIDTH / OG_HEIGHT

    if source_ratio > target_ratio:
        # Image plus large que necessaire - recadrer les cotes
        new_height = OG_HEIGHT
        new_width = int(new_height * source_ratio)
        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Recadrage centre
        left = (new_width - OG_WIDTH) // 2
        img_cropped = img_resized.crop((left, 0, left + OG_WIDTH, OG_HEIGHT))
    else:
        # Image plus haute que necessaire - recadrer haut/bas
        new_width = OG_WIDTH
        new_height = int(new_width / source_ratio)
        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Recadrage centre
        top = (new_height - OG_HEIGHT) // 2
        img_cropped = img_resized.crop((0, top, OG_WIDTH, top + OG_HEIGHT))

    print(f"[OK] Image redimensionnee a {OG_WIDTH}x{OG_HEIGHT}")

    # Ajouter un overlay de texte si demande
    if add_text_overlay:
        # Creer un overlay semi-transparent
        overlay = Image.new('RGBA', (OG_WIDTH, OG_HEIGHT), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Bande semi-transparente en bas
        draw.rectangle(
            [(0, OG_HEIGHT - 100), (OG_WIDTH, OG_HEIGHT)],
            fill=(0, 0, 0, 160)  # Noir avec 160/255 d'opacite
        )

        # Bande semi-transparente en haut
        draw.rectangle(
            [(0, 0), (OG_WIDTH, 120)],
            fill=(0, 0, 0, 140)
        )

        # Charger une police
        try:
            font_paths = [
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/calibri.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            ]

            font_title = None
            font_url = None

            for path in font_paths:
                try:
                    font_title = ImageFont.truetype(path, 80)
                    font_url = ImageFont.truetype(path, 32)
                    break
                except:
                    continue

            if font_title is None:
                font_title = ImageFont.load_default()
                font_url = ImageFont.load_default()
        except:
            font_title = ImageFont.load_default()
            font_url = ImageFont.load_default()

        # Titre "AKONG"
        title = "AKONG"
        title_bbox = draw.textbbox((0, 0), title, font=font_title)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (OG_WIDTH - title_width) // 2
        title_y = 25

        # Ombre du titre
        draw.text((title_x + 3, title_y + 3), title,
                 font=font_title, fill=(0, 0, 0, 200))
        # Titre
        draw.text((title_x, title_y), title,
                 font=font_title, fill=(255, 215, 0, 255))  # Or

        # URL en bas
        url = "akong-online.com"
        url_bbox = draw.textbbox((0, 0), url, font=font_url)
        url_width = url_bbox[2] - url_bbox[0]
        url_x = (OG_WIDTH - url_width) // 2
        url_y = OG_HEIGHT - 65

        draw.text((url_x, url_y), url,
                 font=font_url, fill=(255, 215, 0, 255))

        # Convertir l'image en RGBA pour la fusion
        img_rgba = img_cropped.convert('RGBA')

        # Fusionner l'overlay avec l'image
        img_final = Image.alpha_composite(img_rgba, overlay)

        # Convertir en RGB pour la sauvegarde PNG
        img_final = img_final.convert('RGB')
    else:
        img_final = img_cropped

    # Sauvegarder
    output_path = "public/og-image.png"
    img_final.save(output_path, "PNG", optimize=True)
    print(f"[OK] Image Open Graph creee: {output_path}")
    print(f"[OK] Dimensions finales: {OG_WIDTH}x{OG_HEIGHT} pixels")

    return output_path

if __name__ == "__main__":
    # Avec texte overlay par defaut
    create_og_from_akong(add_text_overlay=True)
