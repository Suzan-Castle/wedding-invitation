"""32x48 도트 캐릭터 생성기 (종이인형 방식: 몸 + 얼굴 + 헤어 + 옷 레이어)"""
from PIL import Image

W, H = 32, 48
T = (0, 0, 0, 0)

def hexc(h, a=255):
    h = h.lstrip('#'); return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), a)

def shade(c, f):
    return tuple(max(0, min(255, int(v*f))) for v in c[:3]) + (c[3],)

class Canvas:
    def __init__(s): s.px = [[T]*W for _ in range(H)]
    def set(s, x, y, c):
        if 0 <= x < W and 0 <= y < H and c: s.px[y][x] = c
    def get(s, x, y): return s.px[y][x] if 0 <= x < W and 0 <= y < H else T
    def rect(s, x0, y0, x1, y1, c):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1): s.set(x, y, c)
    def ellipse(s, cx, cy, rx, ry, c, ymax=99, ymin=-99):
        for y in range(H):
            for x in range(W):
                if ymin <= y <= ymax and ((x+.5-cx)/rx)**2 + ((y+.5-cy)/ry)**2 <= 1: s.set(x, y, c)
    def trap(s, y0, y1, xl0, xr0, xl1, xr1, c):
        for y in range(y0, y1+1):
            t = (y-y0)/max(1, y1-y0)
            s.rect(round(xl0+(xl1-xl0)*t), y, round(xr0+(xr1-xr0)*t), y, c)
    def shade_right(s, mask_col, dark, from_x, depth=2):
        """오른쪽 가장자리 depth칸만 어둡게 (빛이 왼쪽 위에서 온다고 가정)"""
        src = [row[:] for row in s.px]
        for y in range(H):
            for x in range(W):
                if src[y][x] != mask_col: continue
                edge = any(src[y][x+k][3] == 0 or src[y][x+k] not in (mask_col,) and x+k < W and src[y][x+k] != dark
                           for k in range(1, depth+1) if x+k < W) or x+depth >= W
                if edge and x >= from_x - 6: s.px[y][x] = dark

def outline(cv, style):
    """불투명 픽셀 바깥쪽에 테두리. style A: 진한 플럼 단색, B: 원래 색을 어둡게"""
    out = Canvas(); out.px = [row[:] for row in cv.px]
    for y in range(H):
        for x in range(W):
            if cv.px[y][x][3] == 0:
                nb = [cv.get(x+dx, y+dy) for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))]
                solid = [n for n in nb if n[3]]
                if solid:
                    out.px[y][x] = hexc('#2a1d2e') if style == 'A' else shade(solid[0], 0.55)
    return out

SKIN = [hexc('#f7dccb'), hexc('#efc6ad'), hexc('#d9a787')]
INK = hexc('#2a1d2e')

def draw(hair='short', hair_col='#3b2a2a', outfit='suit', skin=0, style='A'):
    cv = Canvas()
    sk = SKIN[skin]; skd = shade(sk, .88)
    hc = hexc(hair_col); hcd = shade(hc, .75); hch = shade(hc, 1.35)

    # 뒷머리 (긴 머리류)
    if hair == 'long':
        cv.ellipse(16, 15, 11, 11, hc); cv.rect(6, 15, 25, 31, hc); cv.shade_right(hc, hcd, 18)
    if hair == 'wave':
        cv.ellipse(16, 15, 11, 11, hc)
        for y in range(15, 30):
            off = 1 if (y//3) % 2 else 0
            cv.rect(5+off, y, 26-off, y, hc)
        cv.shade_right(hc, hcd, 18)
    if hair == 'bun':
        cv.ellipse(16, 4, 4.5, 3.6, hc)

    # 다리 / 신발
    legs_col = {'suit': '#262b45', 'dress': None, 'twopiece': None, 'hanbok': None, 'knit': '#4a4048', 'tweed': None}[outfit]
    if legs_col:
        lc = hexc(legs_col)
        cv.rect(12, 38, 15, 44, lc); cv.rect(17, 38, 20, 44, shade(lc, .85))
        cv.rect(11, 45, 15, 46, INK); cv.rect(17, 45, 21, 46, INK)
    else:
        cv.rect(13, 40, 14, 45, sk); cv.rect(18, 40, 19, 45, skd)
        shoe = hexc('#d8bd8a') if outfit in ('dress', 'tweed') else hexc('#3a2a33')
        cv.rect(12, 45, 15, 46, shoe); cv.rect(17, 45, 20, 46, shoe)

    # 몸통 + 팔
    if outfit == 'suit':
        j = hexc('#2f365a'); jd = shade(j, .8)
        cv.rect(10, 26, 21, 38, j); cv.rect(8, 27, 9, 36, j); cv.rect(22, 27, 23, 36, jd)
        cv.trap(26, 32, 14, 17, 15, 16, hexc('#fbf8f2'))       # 셔츠
        cv.rect(15, 27, 16, 33, hexc('#a593d1'))                # 보라 넥타이
        cv.set(15, 34, hexc('#a593d1'))
        cv.shade_right(j, jd, 18)
        cv.rect(8, 37, 9, 38, sk); cv.rect(22, 37, 23, 38, skd)
    elif outfit == 'dress':
        d = hexc('#b9a6e0'); dd = shade(d, .82)
        cv.rect(11, 26, 20, 32, d); cv.trap(33, 41, 11, 20, 8, 23, d)
        cv.rect(12, 32, 19, 32, hexc('#f3e2bd'))               # 리본 벨트
        cv.rect(9, 27, 10, 33, sk); cv.rect(21, 27, 22, 33, skd)
        cv.shade_right(d, dd, 17)
    elif outfit == 'twopiece':
        t = hexc('#1f1a22'); td = shade(t, 1.6)
        cv.rect(10, 26, 21, 33, t); cv.rect(8, 27, 9, 35, t); cv.rect(22, 27, 23, 35, t)
        cv.rect(15, 26, 16, 29, hexc('#f7f1e6'))               # 진주 목걸이 자리
        cv.trap(34, 40, 11, 20, 10, 21, hexc('#2c2530'))
        for x in (12, 14, 16, 18): cv.set(x, 34, td)
        cv.rect(8, 36, 9, 37, sk); cv.rect(22, 36, 23, 37, skd)
    elif outfit == 'hanbok':
        jg = hexc('#f6d9df'); ch = hexc('#7b6aa8'); chd = shade(ch, .8)
        cv.trap(34, 43, 10, 21, 7, 24, ch); cv.shade_right(ch, chd, 18)
        cv.rect(10, 26, 21, 31, jg); cv.rect(7, 27, 9, 32, jg); cv.rect(22, 27, 24, 32, shade(jg, .9))
        cv.rect(10, 32, 21, 33, ch)
        cv.rect(15, 28, 16, 31, hexc('#c9566e')); cv.set(14, 31, hexc('#c9566e')); cv.set(17, 32, hexc('#c9566e'))  # 고름
        cv.rect(7, 33, 8, 33, sk); cv.rect(23, 33, 24, 33, skd)
    elif outfit == 'knit':
        k = hexc('#e9d8bf'); kd = shade(k, .85)
        cv.rect(10, 26, 21, 37, k); cv.rect(8, 27, 9, 36, k); cv.rect(22, 27, 23, 36, kd)
        for y in range(28, 37, 2):
            for x in range(11, 21, 3): cv.set(x, y, kd)
        cv.shade_right(k, kd, 19)
        cv.rect(8, 37, 9, 37, sk); cv.rect(22, 37, 23, 37, skd)
    elif outfit == 'tweed':
        tw = hexc('#efe6d6'); twd = shade(tw, .86); gold = hexc('#c79e5d')
        cv.rect(10, 26, 21, 34, tw); cv.rect(8, 27, 9, 34, tw); cv.rect(22, 27, 23, 34, twd)
        cv.trap(35, 40, 11, 20, 11, 20, tw)
        for y in range(27, 41, 2):
            for x in range(11 + (y % 4)//2, 21, 2): cv.set(x, y, twd)
        cv.rect(10, 26, 10, 34, hexc('#1f1a22')); cv.rect(21, 26, 21, 34, hexc('#1f1a22'))  # 블랙 트림
        cv.set(13, 29, gold); cv.set(13, 32, gold); cv.set(18, 29, gold); cv.set(18, 32, gold)
        cv.rect(8, 35, 9, 35, sk); cv.rect(22, 35, 23, 35, skd)

    # 목, 머리
    cv.rect(15, 24, 16, 26, skd)
    cv.ellipse(16, 15, 9.6, 9.8, sk)
    cv.ellipse(19, 16, 6.6, 8.4, sk)  # 볼 살짝
    cv.shade_right(sk, sk, 99)

    # 얼굴
    eye = INK
    for ex in (11, 19):
        if style == 'B':
            cv.rect(ex, 15, ex+1, 18, eye)
            cv.set(ex, 15, hexc('#ffffff')); cv.set(ex+1, 18, hexc('#a593d1')); cv.set(ex, 18, hexc('#5b4a7a'))
            cv.set(ex-1 if ex == 11 else ex+2, 15, eye)  # 속눈썹
        else:
            cv.rect(ex, 16, ex+1, 18, eye)
            cv.set(ex, 16, hexc('#ffffff'))
    blush = hexc('#f2a7b2')
    cv.rect(9, 20, 10, 20, blush); cv.rect(21, 20, 22, 20, blush)
    cv.set(15, 21, hexc('#c9566e')); cv.set(16, 21, hexc('#c9566e'))

    # 앞머리
    if hair in ('short', 'twoblock'):
        cv.ellipse(16, 13, 10.4, 8.6, hc, ymax=12)
        cv.rect(6, 9, 8, 15, hc); cv.rect(23, 9, 25, 15, hc)
        cv.trap(10, 13, 8, 23, 9, 22, hc)
        if hair == 'twoblock':
            cv.rect(7, 13, 8, 17, hcd); cv.rect(23, 13, 24, 17, hcd)
            cv.rect(10, 13, 14, 14, hc)
        else:
            cv.set(13, 14, hc); cv.set(18, 14, hc); cv.set(19, 14, hc)
    elif hair in ('long', 'wave', 'bun', 'bob', 'pony'):
        cv.ellipse(16, 13, 10.4, 8.8, hc, ymax=12)
        cv.rect(6, 10, 8, 20, hc); cv.rect(23, 10, 25, 20, hc)
        cv.trap(10, 14, 8, 23, 10, 21, hc)
        for x in (12, 15, 19): cv.set(x, 15, hc)
        if hair == 'bob':
            cv.rect(5, 12, 8, 23, hc); cv.rect(23, 12, 26, 23, hc)
        if hair == 'pony':
            cv.rect(25, 10, 27, 13, hc); cv.trap(13, 27, 26, 28, 26, 27, hc)
            cv.set(25, 11, hexc('#a593d1'))
        if hair == 'bun':
            cv.rect(6, 10, 8, 16, hc); cv.rect(23, 10, 25, 16, hc)
    cv.shade_right(hc, hcd, 20)
    for (x, y) in ((12, 10), (13, 11), (17, 9), (18, 10), (21, 11)):
        if cv.get(x, y) == hc: cv.set(x, y, hcd)
    # 머리 하이라이트 (천사링)
    for x in range(10, 17): 
        if cv.get(x, 7) == hc: cv.set(x, 7, hch)
    for x in range(9, 13):
        if cv.get(x, 8) == hc: cv.set(x, 8, hch)

    return outline(cv, style)

def to_image(cv, scale=1):
    im = Image.new('RGBA', (W, H))
    im.putdata([c for row in cv.px for c in row])
    return im.resize((W*scale, H*scale), Image.NEAREST) if scale != 1 else im

GUESTS = [
    dict(hair='twoblock', hair_col='#2e2424', outfit='suit', skin=0),
    dict(hair='long', hair_col='#5a3b2e', outfit='dress', skin=0),
    dict(hair='bun', hair_col='#2a2226', outfit='hanbok', skin=1),
    dict(hair='short', hair_col='#6b4a3a', outfit='knit', skin=1),
    dict(hair='bob', hair_col='#2b2328', outfit='twopiece', skin=0),
    dict(hair='wave', hair_col='#8a6248', outfit='tweed', skin=0),
    dict(hair='pony', hair_col='#3a2a2a', outfit='dress', skin=2),
]
