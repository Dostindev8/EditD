from collections import deque
from pathlib import Path

from PIL import Image

src = Path(
    r"C:\Users\UserGPC\.cursor\projects\c-Users-UserGPC-OneDrive-Desktop-DS-Projects-Projects-EditD"
    r"\assets\c__Users_UserGPC_AppData_Roaming_Cursor_User_workspaceStorage_d97f4c5892412ca10dc82ac0e024fb6b_images_LCS-2d3b0399-245c-4aa9-af40-c7187c4ab913.png"
)
out_dir = Path(r"c:\Users\UserGPC\OneDrive\Desktop\DS Projects\Projects\EditD\apps\web\public\brand")
out_dir.mkdir(parents=True, exist_ok=True)

im = Image.open(src).convert("RGBA")
w, h = im.size
px = im.load()


def is_bg(r: int, g: int, b: int, a: int) -> bool:
    if a < 40:
        return True
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    blue_bias = b - max(r, g)
    if lum < 28 and blue_bias < 18 and (g - r) < 20:
        return True
    return lum < 18


visited = [[False] * w for _ in range(h)]
q: deque[tuple[int, int]] = deque()
for x in range(w):
    for y in (0, h - 1):
        r, g, b, a = px[x, y]
        if is_bg(r, g, b, a):
            q.append((x, y))
            visited[y][x] = True
for y in range(h):
    for x in (0, w - 1):
        if visited[y][x]:
            continue
        r, g, b, a = px[x, y]
        if is_bg(r, g, b, a):
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
            if is_bg(r, g, b, a):
                visited[ny][nx] = True
                q.append((nx, ny))

out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
op = out.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if bg[y][x]:
            op[x, y] = (0, 0, 0, 0)
        else:
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            if lum < 10 and a < 180:
                op[x, y] = (0, 0, 0, 0)
            else:
                op[x, y] = (r, g, b, a)

feather = Image.new("RGBA", (w, h), (0, 0, 0, 0))
fp = feather.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = op[x, y]
        if a == 0:
            continue
        if 0 < x < w - 1 and 0 < y < h - 1:
            nbg = 0
            for dx, dy in dirs:
                _nr, _ng, _nb, na = op[x + dx, y + dy]
                if na == 0:
                    nbg += 1
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            if nbg >= 3 and lum < 45:
                fp[x, y] = (r, g, b, max(0, a - nbg * 28))
            else:
                fp[x, y] = (r, g, b, a)
        else:
            fp[x, y] = (r, g, b, a)

bbox = feather.getbbox()
if bbox:
    pad = 12
    l, t, rgt, btm = bbox
    cropped = feather.crop((max(0, l - pad), max(0, t - pad), min(w, rgt + pad), min(h, btm + pad)))
else:
    cropped = feather

cw, ch = cropped.size
side = max(cw, ch)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(cropped, ((side - cw) // 2, (side - ch) // 2), cropped)
hi = square.resize((1024, 1024), Image.Resampling.LANCZOS)
hi.save(out_dir / "logo-d.png", "PNG", optimize=True)
hi.save(out_dir / "logo-app.png", "PNG", optimize=True)
print("saved", out_dir / "logo-d.png", hi.size)
print("bbox", bbox, "square", side)
