#!/usr/bin/env python3
"""Generate icons/icon.svg and the PNG icons from one shape list (no dependencies)."""
import struct, zlib, os

BG, AMBER, TRACK, TICK, INK = "#14110d", "#ffb000", "#3b3427", "#b0a68e", "#efe6d2"

def shapes(s, ox, oy):
    """s = content scale, (ox, oy) = offset; coordinates in the unit square."""
    f = lambda v, o: o + v * s
    out = []
    rect = lambda x0, y0, x1, y1, c: out.append(("rect", f(x0, ox), f(y0, oy), f(x1, ox), f(y1, oy), c))
    rect(.16, .52, .84, .60, TRACK)
    rect(.30, .52, .66, .60, AMBER)
    for i in range(7):
        x = .16 + i * .68 / 6
        rect(x - .007, .62, x + .007, .70, TICK)
    rect(.66 - .016, .32, .66 + .016, .72, AMBER)
    out.append(("tri", f(.30, ox), f(.50, oy), f(.255, ox), f(.39, oy), f(.345, ox), f(.39, oy), INK))
    return out

def svg(maskable=False):
    s, o = (0.66, 0.17) if maskable else (1, 0)
    r = 0 if maskable else 0.18
    p = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
         f'<rect width="512" height="512" rx="{r*512:.0f}" fill="{BG}"/>']
    for sh in shapes(s, o, o):
        if sh[0] == "rect":
            _, x0, y0, x1, y1, c = sh
            p.append(f'<rect x="{x0*512:.1f}" y="{y0*512:.1f}" width="{(x1-x0)*512:.1f}" height="{(y1-y0)*512:.1f}" fill="{c}"/>')
        else:
            _, ax, ay, bx, by, cx, cy, c = sh
            p.append(f'<polygon points="{ax*512:.1f},{ay*512:.1f} {bx*512:.1f},{by*512:.1f} {cx*512:.1f},{cy*512:.1f}" fill="{c}"/>')
    p.append("</svg>")
    return "\n".join(p) + "\n"

def hexrgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))

def png(size, maskable=False, ss=3):
    s, o = (0.66, 0.17) if maskable else (1, 0)
    sh = shapes(s, o, o); rr = 0 if maskable else 0.18
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    x = (px + (sx + .5) / ss) / size; y = (py + (sy + .5) / ss) / size
                    col = None
                    # rounded-rect background
                    cx = min(max(x, rr), 1 - rr); cy = min(max(y, rr), 1 - rr)
                    if (x - cx) ** 2 + (y - cy) ** 2 <= rr * rr + 1e-12:
                        col = hexrgb(BG) + (255,)
                    for e in sh:
                        if e[0] == "rect":
                            _, x0, y0, x1, y1, c = e
                            if x0 <= x <= x1 and y0 <= y <= y1: col = hexrgb(c) + (255,)
                        else:
                            _, ax, ay, bx, by, cx2, cy2, c = e
                            d = lambda x1, y1, x2, y2: (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2)
                            d1, d2, d3 = d(ax, ay, bx, by), d(bx, by, cx2, cy2), d(cx2, cy2, ax, ay)
                            if not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0)): col = hexrgb(c) + (255,)
                    if col:
                        for i in range(4): acc[i] += col[i]
            n = ss * ss
            a = acc[3] // n
            row += bytes([acc[0] // n if a else 0, acc[1] // n if a else 0, acc[2] // n if a else 0, a])
        rows.append(b"\x00" + bytes(row))
    raw = b"".join(rows)
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
os.makedirs(root, exist_ok=True)
open(os.path.join(root, "icon.svg"), "w").write(svg())
open(os.path.join(root, "icon-maskable.svg"), "w").write(svg(True))
open(os.path.join(root, "icon-192.png"), "wb").write(png(192))
open(os.path.join(root, "icon-512.png"), "wb").write(png(512))
open(os.path.join(root, "icon-maskable-512.png"), "wb").write(png(512, True))
print("icons written")
