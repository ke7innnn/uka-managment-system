import os
from PIL import Image

logo_path = "/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/public/NEW LOGO UPDATE/UKA LOGO NEW.png"
public_dir = "/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/public"

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

    # 1. icon.png (512x512)
    icon_png = square_im.resize((512, 512), Image.Resampling.LANCZOS)
    icon_png.save(os.path.join(public_dir, "icon.png"), "PNG")
    print("Saved icon.png (512x512)")

    # 2. icon-512.png (512x512)
    icon_png.save(os.path.join(public_dir, "icon-512.png"), "PNG")
    print("Saved icon-512.png (512x512)")

    # 3. icon-192.png (192x192)
    icon_192 = square_im.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save(os.path.join(public_dir, "icon-192.png"), "PNG")
    print("Saved icon-192.png (192x192)")

    # 4. apple-touch-icon.png (180x180)
    icon_180 = square_im.resize((180, 180), Image.Resampling.LANCZOS)
    icon_180.save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
    print("Saved apple-touch-icon.png (180x180)")

    # 5. favicon.ico (Multiple sizes: 16x16, 32x32, 48x48)
    # Convert to RGBA and save as ICO
    square_im.save(
        os.path.join(public_dir, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("Saved favicon.ico (16x16, 32x32, 48x48)")

print("All icons successfully generated!")
