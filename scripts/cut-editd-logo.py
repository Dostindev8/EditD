from collections import deque
from pathlib import Path

from PIL import Image

src = Path(r"c:\Users\UserGPC\OneDrive\Desktop\DS Projects\Projects\EditD\logo-source.png")
out = Path(r"c:\Users\UserGPC\OneDrive\Desktop\DS Projects\Projects\EditD\apps\web\public\brand\logo-d.png")

im = Image.open(src).convert("RGBA")
w, h = im.size
px = im.load()


def is_matte(r: int, g: int, b: int, a: int) -> bool:
    if a < 20:
        return True
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    # Keep emerald glow (g-dominant). Only cut true black canvas.
    return lum < 9 and (g - r) < 8


visited = [[False] * w for _ in range(h)]
q: deque[tuple[int, int]] = deque()
for x in range(w):
    for y in (0, h - 1):
        r, g, b, a = px[x, y]
        if is_matte(r, g, b, a):
            q.append((x, y))
            visited[y][x] = True
for y in range(h):
    for x in (0, w - 1):
        if visited[y][x]:
            continue
        r, g, b, a = px[x, y]
        if is_matte(r, g, b, a):
            q.append((x, y))
            visited[y][x] = True

dirs = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1))
bg = [[False] * w for _ in range(h)]
while q:
    x, y = q.popleft()
    bg[y][x] = True
    for dx, dy in dirs:
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
            r, g, b, a = px[nx, ny]
            if is_matte(r, g, b, a):
                visited[ny][nx] = True
                q.append((nx, ny))

dst = Image.new("RGBA", (w, h), (0, 0, 0, 0))
dp = dst.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if bg[y][x]:
            dp[x, y] = (0, 0, 0, 0)
        else:
            dp[x, y] = (r, g, b, a)

bbox = dst.getbbox()
if bbox:
    pad = 8
    l, t, rgt, btm = bbox
    cropped = dst.crop((max(0, l - pad), max(0, t - pad), min(w, rgt + pad), min(h, btm + pad)))
else:
    cropped = dst

cw, ch = cropped.size
side = max(cw, ch)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(cropped, ((side - cw) // 2, (side - ch) // 2), cropped)
square.save(out, "PNG", optimize=True)
print("saved", out, square.size, "corners", square.getpixel((0, 0)))
