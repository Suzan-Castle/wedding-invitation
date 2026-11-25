import sys, math, random
sys.path.insert(0,'/home/claude/wedding-invitation/tools')
from sprites import *
from PIL import Image, ImageDraw, ImageFont
DW, DH = 195, 422          # 화면을 도트 단위로 (1도트 = 2 CSS px)
S = 4                      # 최종 이미지 배율 (2x 레티나)
FONT = '/tmp/NanumOrMaru.ttf'

def scene(style):
    random.seed(5)
    im = Image.new('RGBA', (DW, DH)); d = ImageDraw.Draw(im)
    # 벽
    for y in range(DH):
        t = y / DH
        d.line([(0,y),(DW,y)], fill=(int(36-14*t), int(26-10*t), int(42-16*t)))
    # 아치 창 (뒷벽)
    for ax in (18, 78, 138):
        d.rectangle([ax, 120, ax+38, 250], fill=(48,36,56)); d.ellipse([ax, 100, ax+38, 140], fill=(48,36,56))
        d.rectangle([ax+3, 123, ax+35, 250], fill=(30,22,36)); d.ellipse([ax+3, 103, ax+35, 143], fill=(30,22,36))
        for k in range(14):
            x = ax+5+random.randint(0,28); y = 108+random.randint(0,130)
            d.point((x,y), fill=(216,189,138))
    # 샹들리에
    cx = DW//2
    d.line([(cx,0),(cx,30)], fill=(160,130,90))
    for k,(r,y0,n) in enumerate(((14,30,8),(26,42,12),(38,56,16),(30,72,12),(16,86,8))):
        for i in range(n):
            a = i/n*math.pi*2
            x = cx + round(math.cos(a)*r); yy = y0 + round(math.sin(a)*r*0.18)
            front = math.sin(a) > -0.2
            for b in range(3):
                col = (255,240,205) if front else (170,150,140)
                if b == 2: col = (220,205,255) if front else (120,110,140)
                d.point((x, yy+b*3), fill=col)
            d.point((x, yy+9), fill=(255,250,235) if front else (150,140,130))
    for _ in range(18):
        x = cx + random.randint(-46,46); y = 20+random.randint(0,80)
        d.point((x,y), fill=(255,255,255))
        d.point((x+1,y), fill=(255,236,200)); d.point((x-1,y), fill=(255,236,200)); d.point((x,y+1), fill=(255,236,200)); d.point((x,y-1), fill=(255,236,200))
    # 꽃 화단 (뒷벽 아래)
    fy = 250
    for x in range(0, DW, 2):
        h = 6 + int(3*math.sin(x/5)) + random.randint(0,2)
        for y in range(fy-h, fy+8):
            if random.random() < 0.85:
                d.point((x,y), fill=random.choice([(185,166,224),(246,217,223),(239,230,214),(123,106,168),(233,183,195),(255,255,255),(127,143,120)]))
                d.point((x+1,y), fill=random.choice([(185,166,224),(246,217,223),(239,230,214),(127,143,120)]))
    # 대리석 바닥
    d.rectangle([0, fy+8, DW, DH], fill=(232,226,236))
    for y in range(fy+8, DH):
        t = (y-fy)/(DH-fy)
        d.line([(0,y),(DW,y)], fill=(int(222-30*t), int(214-30*t), int(228-30*t)))
    for x0 in range(-200, DW+200, 26):
        d.line([(x0, fy+8), (cx + (x0-cx)*2.2, DH)], fill=(205,196,214))
    for y in (fy+30, fy+64, fy+110):
        d.line([(0,y),(DW,y)], fill=(205,196,214))
    for _ in range(6):
        x = random.randint(0, DW); y = random.randint(fy+12, DH-10)
        d.line([(x,y),(x+random.randint(8,20), y+random.randint(-3,6))], fill=(196,186,206))
    # 버진로드
    d.polygon([(cx-14, fy+8), (cx+14, fy+8), (cx+40, DH), (cx-40, DH)], fill=(246,242,248))
    d.line([(cx-14, fy+8), (cx-40, DH)], fill=(216,189,138)); d.line([(cx+14, fy+8), (cx+40, DH)], fill=(216,189,138))
    return im

def phone(style, tag):
    base = scene(style)
    # 캐릭터 배치 (발 위치 기준)
    placed = [(GUESTS[0], 14, 300), (GUESTS[1], 50, 296), (GUESTS[2], 112, 302), (GUESTS[3], 150, 296),
              (GUESTS[4], 30, 360), (GUESTS[5], 82, 366), (GUESTS[6], 138, 358)]
    for g, x, foot in sorted(placed, key=lambda p: p[2]):
        sp = to_image(draw(style=style, **g))
        # 그림자
        sh = Image.new('RGBA', base.size); ImageDraw.Draw(sh).ellipse([x+8, foot-2, x+24, foot+2], fill=(40,30,50,70))
        base.alpha_composite(sh)
        base.alpha_composite(sp, (x, foot-47))
    big = base.resize((DW*S, DH*S), Image.NEAREST)
    d = ImageDraw.Draw(big)
    f = lambda sz: ImageFont.truetype(FONT, sz)
    names = ['태용친구', '원선친구', '고모', '회사동기', '대학선배', '사촌언니', '후배']
    for (g, x, foot), nm in zip(placed, names):
        tw = d.textlength(nm, font=f(20))
        nx = (x+16)*S - tw/2; ny = (foot-46)*S - 36
        d.rounded_rectangle([nx-10, ny-4, nx+tw+10, ny+26], 8, fill=(18,13,22,190))
        d.text((nx, ny-1), nm, font=f(20), fill=(239,230,214))
    # 말풍선
    def bubble(txt, x, foot):
        tw = d.textlength(txt, font=f(24))
        bx = (x+16)*S - tw/2 - 16; by = (foot-46)*S - 104
        d.rounded_rectangle([bx, by, bx+tw+32, by+50], 14, fill=(252,249,243))
        cxp = (x+16)*S
        d.polygon([(cxp-10, by+50), (cxp+10, by+50), (cxp, by+64)], fill=(252,249,243))
        d.text((bx+16, by+9), txt, font=f(24), fill=(42,29,46))
    bubble('결혼 축하해!!', 50, 296)
    bubble('부케 내꺼야', 138, 358)
    # 상단 바
    W2 = DW*S
    d.rectangle([0, 0, W2, 96], fill=(18,13,22,200))
    d.text((40, 30), '스타티스홀', font=f(30), fill=(216,189,138))
    d.text((W2-210, 34), '23명 함께하는 중', font=f(22), fill=(239,230,214))
    # 하단 채팅 입력
    d.rounded_rectangle([30, DH*S-130, W2-150, DH*S-50], 40, fill=(255,255,255,235))
    d.text((70, DH*S-106), '축하 메시지 보내기', font=f(24), fill=(150,140,160))
    d.ellipse([W2-130, DH*S-130, W2-50, DH*S-50], fill=(216,189,138))
    d.text((W2-112, DH*S-105), '꾸미기', font=f(18), fill=(18,13,22))
    # 라벨
    d.rounded_rectangle([20, 116, 300, 166], 10, fill=(0,0,0,150))
    d.text((36, 124), tag, font=f(24), fill=(255,255,255))
    return big

a = phone('A', 'A. 진한 테두리 (또렷한 게임풍)')
b = phone('B', 'B. 부드러운 테두리 (동화풍)')
out = Image.new('RGBA', (a.width*2+60, a.height), (220,214,226,255))
out.alpha_composite(a, (0,0)); out.alpha_composite(b, (a.width+60, 0))
out.convert('RGB').save('/tmp/dot-style.png')
print(out.size)
