"""
Générateur d'image Open Graph pour Akông Online
Crée une image 1200x630 pour les partages sur réseaux sociaux
"""

from PIL import Image, ImageDraw, ImageFont
import math

# Dimensions Open Graph standard
WIDTH = 1200
HEIGHT = 630

# Palette de couleurs du site
COLOR_BLACK = (0, 0, 0)
COLOR_DARK_BG = (10, 10, 10)
COLOR_GOLD = (255, 215, 0)
COLOR_AMBER = (255, 191, 0)
COLOR_DARK_GOLD = (180, 150, 0)
COLOR_WHITE = (255, 255, 255)
COLOR_GRAY = (160, 160, 160)

def create_gradient_background(width, height):
    """Crée un fond avec dégradé élégant"""
    img = Image.new('RGB', (width, height), COLOR_BLACK)
    draw = ImageDraw.Draw(img)

    # Dégradé radial subtil
    center_x, center_y = width // 2, height // 2
    max_radius = math.sqrt(center_x**2 + center_y**2)

    for y in range(height):
        for x in range(width):
            # Distance du centre
            dist = math.sqrt((x - center_x)**2 + (y - center_y)**2)
            ratio = dist / max_radius

            # Interpolation de couleur
            r = int(10 + ratio * 5)
            g = int(10 + ratio * 5)
            b = int(10 + ratio * 5)

            img.putpixel((x, y), (r, g, b))

    return img

def draw_board_representation(draw, center_x, center_y):
    """Dessine une représentation stylisée du plateau de Songo"""

    # Dimensions du plateau
    pit_radius = 25
    pit_spacing = 70
    board_width = 7 * pit_spacing

    # Position de départ
    start_x = center_x - board_width // 2

    # Dessiner les puits (rangée du haut - Joueur 2)
    y_top = center_y - 60
    for i in range(7):
        x = start_x + i * pit_spacing
        # Ombre
        draw.ellipse([x-pit_radius+3, y_top-pit_radius+3,
                     x+pit_radius+3, y_top+pit_radius+3],
                     fill=(30, 30, 30))
        # Puits
        draw.ellipse([x-pit_radius, y_top-pit_radius,
                     x+pit_radius, y_top+pit_radius],
                     fill=COLOR_DARK_GOLD, outline=COLOR_GOLD, width=2)

        # Quelques graines (petits cercles dorés)
        if i % 2 == 0:
            for seed in range(3):
                sx = x - 10 + seed * 10
                sy = y_top - 5 + (seed % 2) * 8
                draw.ellipse([sx-3, sy-3, sx+3, sy+3], fill=COLOR_AMBER)

    # Dessiner les puits (rangée du bas - Joueur 1)
    y_bottom = center_y + 60
    for i in range(7):
        x = start_x + i * pit_spacing
        # Ombre
        draw.ellipse([x-pit_radius+3, y_bottom-pit_radius+3,
                     x+pit_radius+3, y_bottom+pit_radius+3],
                     fill=(30, 30, 30))
        # Puits
        draw.ellipse([x-pit_radius, y_bottom-pit_radius,
                     x+pit_radius, y_bottom+pit_radius],
                     fill=COLOR_DARK_GOLD, outline=COLOR_GOLD, width=2)

        # Quelques graines
        if i % 2 == 1:
            for seed in range(2):
                sx = x - 5 + seed * 10
                sy = y_bottom - 3 + seed * 6
                draw.ellipse([sx-3, sy-3, sx+3, sy+3], fill=COLOR_AMBER)

    # Dessiner le contour du plateau
    board_left = start_x - 50
    board_right = start_x + board_width + 20
    board_top = y_top - 50
    board_bottom = y_bottom + 50

    # Rectangle avec coins arrondis (simulé)
    draw.rounded_rectangle(
        [board_left, board_top, board_right, board_bottom],
        radius=20,
        outline=COLOR_GOLD,
        width=3
    )

def main():
    # Créer l'image avec dégradé
    img = create_gradient_background(WIDTH, HEIGHT)
    draw = ImageDraw.Draw(img)

    # Dessiner le plateau au centre-bas
    draw_board_representation(draw, WIDTH // 2, HEIGHT - 200)

    # Essayer de charger une police, sinon utiliser la police par défaut
    try:
        # Essayer plusieurs chemins de polices possibles
        font_paths = [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/calibri.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc"
        ]

        font_title = None
        font_subtitle = None
        font_tagline = None

        for path in font_paths:
            try:
                font_title = ImageFont.truetype(path, 120)
                font_subtitle = ImageFont.truetype(path, 42)
                font_tagline = ImageFont.truetype(path, 32)
                break
            except:
                continue

        if font_title is None:
            font_title = ImageFont.load_default()
            font_subtitle = ImageFont.load_default()
            font_tagline = ImageFont.load_default()

    except Exception as e:
        print(f"Utilisation de la police par défaut: {e}")
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_tagline = ImageFont.load_default()

    # Titre principal "AKÔNG" avec effet d'ombre
    title = "AKÔNG"

    # Calculer la position centrée
    title_bbox = draw.textbbox((0, 0), title, font=font_title)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (WIDTH - title_width) // 2
    title_y = 80

    # Ombre du titre
    draw.text((title_x + 4, title_y + 4), title,
              font=font_title, fill=(50, 50, 50))

    # Titre en dégradé or
    draw.text((title_x, title_y), title,
              font=font_title, fill=COLOR_GOLD)

    # Sous-titre
    subtitle = "Jeu de Songo Traditionnel Africain"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=font_subtitle)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (WIDTH - subtitle_width) // 2
    subtitle_y = title_y + 140

    draw.text((subtitle_x, subtitle_y), subtitle,
              font=font_subtitle, fill=COLOR_AMBER)

    # Ligne décorative
    line_y = subtitle_y + 60
    line_left = WIDTH // 2 - 200
    line_right = WIDTH // 2 + 200
    draw.line([(line_left, line_y), (line_right, line_y)],
              fill=COLOR_DARK_GOLD, width=2)

    # Tagline
    tagline = "Stratégie • Multijoueur • En Ligne"
    tagline_bbox = draw.textbbox((0, 0), tagline, font=font_tagline)
    tagline_width = tagline_bbox[2] - tagline_bbox[0]
    tagline_x = (WIDTH - tagline_width) // 2
    tagline_y = line_y + 20

    draw.text((tagline_x, tagline_y), tagline,
              font=font_tagline, fill=COLOR_GRAY)

    # URL en bas
    url = "akong-online.com"
    url_bbox = draw.textbbox((0, 0), url, font=font_tagline)
    url_width = url_bbox[2] - url_bbox[0]
    url_x = (WIDTH - url_width) // 2
    url_y = HEIGHT - 50

    draw.text((url_x, url_y), url,
              font=font_tagline, fill=COLOR_GOLD)

    # Sauvegarder l'image
    output_path = "public/og-image.png"
    img.save(output_path, "PNG", optimize=True)
    print(f"[OK] Image Open Graph creee avec succes : {output_path}")
    print(f"[OK] Dimensions : {WIDTH}x{HEIGHT} pixels")
    print(f"[OK] Pret pour les partages sur Facebook, LinkedIn, Twitter !")

    return output_path

if __name__ == "__main__":
    main()
