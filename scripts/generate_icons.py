import os
from PIL import Image

logo_path = "/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/public/NEW LOGO UPDATE/UKA LOGO NEW.png"
public_dir = "/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/public"
app_dir = "/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/src/app"

print("Generating app icons...")

with Image.open(logo_path) as im:
    width, height = im.size
    print(f"Original Logo dimensions: {width}x{height}")
    
    # Make it a perfect square by padding
    size = max(width, height)
    square_im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    # Calculate offset to paste in center
    offset_x = (size - width) // 2
    offset_y = (size - height) // 2
    square_im.paste(im, (offset_x, offset_y))
    print(f"Padded to perfect square: {size}x{size}")

    # Generate standard resizes
    icon_png_512 = square_im.resize((512, 512), Image.Resampling.LANCZOS)
    icon_png_192 = square_im.resize((192, 192), Image.Resampling.LANCZOS)
    icon_png_180 = square_im.resize((180, 180), Image.Resampling.LANCZOS)

    # 1. Save to public/
    icon_png_512.save(os.path.join(public_dir, "icon.png"), "PNG")
    icon_png_512.save(os.path.join(public_dir, "icon-512.png"), "PNG")
    icon_png_192.save(os.path.join(public_dir, "icon-192.png"), "PNG")
    icon_png_180.save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
    square_im.save(
        os.path.join(public_dir, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("Saved all icons to public/ folder.")

    # 2. Save to src/app/
    icon_png_512.save(os.path.join(app_dir, "icon.png"), "PNG")
    icon_png_180.save(os.path.join(app_dir, "apple-icon.png"), "PNG")
    square_im.save(
        os.path.join(app_dir, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("Saved all icons to src/app/ folder.")

print("All icons successfully generated in both public/ and src/app/ directories!")
