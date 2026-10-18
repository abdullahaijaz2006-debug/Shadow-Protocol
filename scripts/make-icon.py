# Draws the Shadow Protocol app icon as 32x32 pixel art and writes it scaled (nearest neighbour)
# to a 1024x1024 PNG, using only the standard library.
import struct, sys, zlib

N = 32
BG, EDGE, RIM = (16, 19, 31, 255), (43, 48, 71, 255), (26, 30, 46, 255)
TEAL, TEAL_D = (79, 209, 197, 255), (44, 122, 123, 255)
WHITE, GREY = (226, 232, 240, 255), (160, 174, 192, 255)
RED, RED_D, CLEAR = (229, 62, 62, 255), (155, 44, 44, 255), (0, 0, 0, 0)

img = [[CLEAR] * N for _ in range(N)]
c = (N - 1) / 2
for y in range(N):
    for x in range(N):
        # Rounded square (corner radius 6), with a 1-px edge and a lighter top rim.
        dx = max(0, abs(x - c) - (c - 6)); dy = max(0, abs(y - c) - (c - 6))
        d = (dx * dx + dy * dy) ** 0.5
        if d > 6.2: continue
        img[y][x] = EDGE if d > 5.2 else (RIM if y < 3 else BG)
        r = ((x - c) ** 2 + (y - c) ** 2) ** 0.5
        # Double ring: the accepting-state symbol.
        if 11.6 <= r < 13.0: img[y][x] = TEAL
        elif 9.4 <= r < 10.6: img[y][x] = TEAL_D
        # The guard's eye: an almond shape with a red iris and dark pupil.
        ex, ey = (x - c) / 7.6, (y - c) / 4.2
        if abs(ex) < 1 and abs(ey) < (1 - ex * ex):
            img[y][x] = WHITE if ey < 0.35 * (1 - ex * ex) else GREY
            ir = ((x - c) ** 2 + (y - c) ** 2) ** 0.5
            if ir < 3.3: img[y][x] = RED if (x - c) + (y - c) > -2.5 else RED_D
            if ir < 1.5: img[y][x] = BG
            if round(x - c) == -1 and round(y - c) == -2: img[y][x] = WHITE  # glint
        elif abs(ex) < 1.08 and abs(ey) < (1.12 - ex * ex) and abs(ey) > 0:
            img[y][x] = TEAL  # outline of the eye

scale = 1024 // N
rows = b"".join(b"\x00" + b"".join(bytes(img[y][x]) * scale for x in range(N)) for y in range(N) for _ in range(scale))
def chunk(tag, data): return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1024, 1024, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")
open(sys.argv[1], "wb").write(png)
