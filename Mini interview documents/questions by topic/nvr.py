"""Original 11+ Non-Verbal Reasoning bank. Each item is an SVG-based puzzle.
Options are SVG tiles labelled A-D. Answers are determined by the construction logic,
so they are correct by design (verified in build.py)."""
import math

Q = []

# ---------- SVG drawing helpers ----------
def svg_wrap(inner, size=120):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
            f'width="{size}" height="{size}"><rect x="1" y="1" width="{size-2}" height="{size-2}" '
            f'fill="white" stroke="#bbb" stroke-width="1"/>{inner}</svg>')

def poly(cx, cy, r, n, rot=0, fill="none", stroke="#222", sw=3):
    pts = []
    for i in range(n):
        a = rot + i * 2*math.pi/n - math.pi/2
        pts.append(f"{cx + r*math.cos(a):.1f},{cy + r*math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'

def circle(cx, cy, r, fill="none", stroke="#222", sw=3):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'

def rect(x, y, w, h, fill="none", stroke="#222", sw=3):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'

def arrow(cx, cy, length, angle_deg, stroke="#222", sw=4):
    a = math.radians(angle_deg)
    x2 = cx + length*math.cos(a); y2 = cy + length*math.sin(a)
    x1 = cx - length*math.cos(a); y1 = cy - length*math.sin(a)
    # arrowhead at (x2,y2)
    ha = math.radians(angle_deg)
    h = 12
    left = (x2 - h*math.cos(ha-math.radians(25)), y2 - h*math.sin(ha-math.radians(25)))
    right = (x2 - h*math.cos(ha+math.radians(25)), y2 - h*math.sin(ha+math.radians(25)))
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{sw}"/>'
            f'<polyline points="{left[0]:.1f},{left[1]:.1f} {x2:.1f},{y2:.1f} {right[0]:.1f},{right[1]:.1f}" '
            f'fill="none" stroke="{stroke}" stroke-width="{sw}"/>')

def dots(n, fill="#222"):
    # arrange up to 4 dots in a small square inside a 120 tile
    coords = {1:[(60,60)],2:[(45,60),(75,60)],3:[(60,45),(45,75),(75,75)],
              4:[(45,45),(75,45),(45,75),(75,75)],5:[(45,45),(75,45),(60,60),(45,75),(75,75)]}
    return "".join(circle(x,y,7,fill=fill,stroke=fill,sw=1) for x,y in coords[n])

def add(topic, question, stimulus_svg, option_svgs, answer_label, explanation):
    labels = ["A","B","C","D"]
    assert answer_label in labels[:len(option_svgs)]
    Q.append({
        "subject":"Non-verbal reasoning","topic":topic,"difficulty":"Standard",
        "question":question,"stimulus_svg":stimulus_svg,
        "option_labels":labels[:len(option_svgs)],"option_svgs":list(option_svgs),
        "answer":answer_label,"explanation":explanation,
    })

# =========================================================
# TYPE 1: ODD ONE OUT  (rule: four shapes share a property; one breaks it)
# =========================================================
quad = {  # four-sided shapes, drawn distinctly
    "square": lambda: rect(35,35,50,50),
    "rectangle": lambda: rect(25,42,70,36),
    "diamond": lambda: poly(60,60,38,4),
    "trapezium": lambda: '<polygon points="35,80 85,80 75,45 45,45" fill="none" stroke="#222" stroke-width="3"/>',
}
nonquad = {
    "triangle": lambda: poly(60,62,40,3),
    "pentagon": lambda: poly(60,60,38,5),
    "hexagon": lambda: poly(60,60,38,6),
    "circle": lambda: circle(60,60,38),
}
import itertools
quad_keys = list(quad.keys()); nonq_keys = list(nonquad.keys())
# Build 8 odd-one-out (sides) questions
sides_sets = [
    (["square","rectangle","diamond"], "triangle", "B"),
    (["square","diamond","trapezium"], "pentagon", "C"),
    (["rectangle","diamond","trapezium"], "hexagon", "A"),
    (["square","rectangle","trapezium"], "circle", "D"),
    (["diamond","trapezium","rectangle"], "triangle", "B"),
    (["square","trapezium","diamond"], "hexagon", "D"),
]
for quads3, odd, ans_pos in sides_sets:
    tiles_src = []
    drawers = [quad[k] for k in quads3] + [nonquad[odd]]
    # place odd at position given by ans_pos
    pos = {"A":0,"B":1,"C":2,"D":3}[ans_pos]
    order = quads3[:]  # three quads
    # construct 4 tiles, inserting odd at pos
    seq = order[:]
    seq.insert(pos, "ODD")
    opts = []
    for name in seq:
        if name == "ODD":
            opts.append(svg_wrap(nonquad[odd]()))
        else:
            opts.append(svg_wrap(quad[name]()))
    add("Odd one out",
        "Four of these shapes share a feature. Which shape is the ODD ONE OUT?",
        "",  # no separate stimulus; the four options ARE the figures
        opts, ans_pos,
        f"Three shapes have four straight sides; the {odd} does not, so it is the odd one out.")

# Odd one out by SHADING (one filled among outlines, vary shape)
shade_sets = [("circle","A"),("square","C"),("pentagon","D"),("hexagon","B")]
for shp, ans_pos in shade_sets:
    def draw(filled):
        if shp=="circle": return circle(60,60,36, fill="#3b6" if filled else "none")
        if shp=="square": return rect(30,30,60,60, fill="#3b6" if filled else "none")
        if shp=="pentagon": return poly(60,60,38,5, fill="#3b6" if filled else "none")
        if shp=="hexagon": return poly(60,60,38,6, fill="#3b6" if filled else "none")
    pos = {"A":0,"B":1,"C":2,"D":3}[ans_pos]
    opts=[]
    for i in range(4):
        opts.append(svg_wrap(draw(i==pos)))
    add("Odd one out",
        "Which shape is the ODD ONE OUT?",
        "", opts, ans_pos,
        "Three shapes are unshaded outlines; one is shaded (filled in), so the shaded one is the odd one out.")

# Odd one out by NUMBER OF DOTS matching... simpler: count of sides differs across all-but-one
dotmix = [(3,"A"),(2,"B"),(4,"C"),(1,"D")]
for common, ans_pos in dotmix:
    odd_count = common+1 if common<4 else 2
    pos = {"A":0,"B":1,"C":2,"D":3}[ans_pos]
    opts=[]
    for i in range(4):
        n = odd_count if i==pos else common
        opts.append(svg_wrap(rect(20,20,80,80,fill="none")+dots(n)))
    add("Odd one out",
        "Each box contains some dots. Which box is the ODD ONE OUT?",
        "", opts, ans_pos,
        f"Three boxes contain {common} dot(s); one box contains a different number, so it is the odd one out.")

# =========================================================
# TYPE 2: SERIES - what comes next (rotation of an arrow by 90 clockwise)
# =========================================================
def rotating_arrow_series(start, ans_pos, topic_note):
    # stimulus: 4 tiles with arrow at start, start+90, +180, +270 ; next would be start+360=start
    stim_tiles = []
    for k in range(4):
        ang = (start + 90*k) % 360
        stim_tiles.append(svg_wrap(arrow(60,60,32,ang)))
    stimulus = ('<div style="display:flex;gap:6px;align-items:center">'
                + "".join(stim_tiles) + '<span style="font-size:28px">?</span></div>')
    next_ang = (start + 90*4) % 360  # correct
    # options: correct at ans_pos, others are wrong rotations
    wrong = [(next_ang+90)%360,(next_ang+180)%360,(next_ang+270)%360]
    pos = {"A":0,"B":1,"C":2,"D":3}[ans_pos]
    angs=[]; wi=0
    for i in range(4):
        if i==pos: angs.append(next_ang)
        else: angs.append(wrong[wi]); wi+=1
    opts=[svg_wrap(arrow(60,60,32,a)) for a in angs]
    add("Series (rotation)",
        "The arrow turns the same way each step. Which option comes NEXT in the series?",
        stimulus, opts, ans_pos,
        "The arrow rotates 90 degrees clockwise each step, so the next arrow points the same way as the first one in the series.")

for start, ans_pos in [(0,"A"),(90,"C"),(180,"B"),(270,"D"),(0,"B"),(90,"D")]:
    rotating_arrow_series(start, ans_pos, "")

# SERIES - increasing dots
def dot_series(start_n, ans_pos):
    stim_tiles=[svg_wrap(rect(20,20,80,80)+dots(start_n+k)) for k in range(4)]
    stimulus=('<div style="display:flex;gap:6px;align-items:center">'
              + "".join(stim_tiles)+'<span style="font-size:28px">?</span></div>')
    correct = start_n+4
    if correct>5: correct=5
    pool=[c for c in [1,2,3,4,5] if c!=correct]
    pos={"A":0,"B":1,"C":2,"D":3}[ans_pos]
    counts=[]; pi=0
    for i in range(4):
        if i==pos: counts.append(correct)
        else: counts.append(pool[pi]); pi+=1
    opts=[svg_wrap(rect(20,20,80,80)+dots(c)) for c in counts]
    add("Series (counting)",
        "The number of dots changes by the same amount each step. Which option comes NEXT?",
        stimulus, opts, ans_pos,
        "Each box gains one more dot than the last, so the next box has one extra dot again.")

for start_n, ans_pos in [(1,"C"),(1,"A")]:
    dot_series(start_n, ans_pos)

# =========================================================
# TYPE 3: ANALOGY  A is to B as C is to ?  (size transform: small -> big)
# =========================================================
def size_analogy(shape_fn_small, shape_fn_big, ans_pos, name):
    stimulus=('<div style="display:flex;gap:6px;align-items:center">'
              + svg_wrap(shape_fn_small()) + '<span style="font-size:24px">&#8594;</span>'
              + svg_wrap(shape_fn_big()) + '<span style="font-size:20px">&nbsp;|&nbsp;</span>'
              + svg_wrap(shape_fn_small(alt=True)) + '<span style="font-size:24px">&#8594;</span>'
              + '<span style="font-size:28px">?</span></div>')
    correct = svg_wrap(shape_fn_big(alt=True))
    pos={"A":0,"B":1,"C":2,"D":3}[ans_pos]
    return stimulus, correct, pos

# circle small->big, then square small->? big
def circ_sq_analogy(ans_pos):
    def first_small(alt=False): return circle(60,60,18)
    def first_big(alt=False): return circle(60,60,40)
    def sec_small(): return rect(48,48,24,24)
    def sec_big(): return rect(25,25,70,70)
    stimulus=('<div style="display:flex;gap:6px;align-items:center">'
              + svg_wrap(first_small()) + '<span style="font-size:24px">&#8594;</span>'
              + svg_wrap(first_big()) + '<span style="font-size:22px">&nbsp;::&nbsp;</span>'
              + svg_wrap(sec_small()) + '<span style="font-size:24px">&#8594;</span>'
              + '<span style="font-size:28px">?</span></div>')
    correct = svg_wrap(sec_big())
    wrong = [svg_wrap(rect(48,48,24,24)),    # same small square (no change)
             svg_wrap(circle(60,60,40)),     # big circle (wrong shape)
             svg_wrap(poly(60,60,40,3))]     # big triangle (wrong shape)
    pos={"A":0,"B":1,"C":2,"D":3}[ans_pos]
    opts=[]; wi=0
    for i in range(4):
        if i==pos: opts.append(correct)
        else: opts.append(wrong[wi]); wi+=1
    add("Analogy",
        "The first shape changes into the second in a certain way. Apply the SAME change to the third shape. Which option is correct?",
        stimulus, opts, ans_pos,
        "The small shape becomes a large version of the SAME shape, so the small square should become a large square.")

for ans_pos in ["A","C","D","B"]:
    circ_sq_analogy(ans_pos)

# Analogy: outline -> shaded (apply shading)
def shade_analogy(ans_pos):
    stimulus=('<div style="display:flex;gap:6px;align-items:center">'
              + svg_wrap(circle(60,60,34)) + '<span style="font-size:24px">&#8594;</span>'
              + svg_wrap(circle(60,60,34,fill="#3b6")) + '<span style="font-size:22px">&nbsp;::&nbsp;</span>'
              + svg_wrap(poly(60,60,38,5)) + '<span style="font-size:24px">&#8594;</span>'
              + '<span style="font-size:28px">?</span></div>')
    correct=svg_wrap(poly(60,60,38,5,fill="#3b6"))
    wrong=[svg_wrap(poly(60,60,38,5)),          # unchanged
           svg_wrap(circle(60,60,34,fill="#3b6")), # wrong shape
           svg_wrap(poly(60,60,38,6,fill="#3b6"))] # wrong shape (hexagon)
    pos={"A":0,"B":1,"C":2,"D":3}[ans_pos]
    opts=[]; wi=0
    for i in range(4):
        if i==pos: opts.append(correct)
        else: opts.append(wrong[wi]); wi+=1
    add("Analogy",
        "The first shape changes into the second. Apply the SAME change to the third shape. Which option is correct?",
        stimulus, opts, ans_pos,
        "The outline shape becomes shaded (filled in), so the unshaded pentagon should become a shaded pentagon.")

for ans_pos in ["A","D","C"]:
    shade_analogy(ans_pos)

# =========================================================
# TYPE 4: COMPLETE THE SQUARE / matrix-lite (most like the others by sides)
# =========================================================
def most_alike(ans_pos):
    # Given a key shape (a hexagon), choose the option that is also a hexagon (different size/shade)
    stimulus=('<div style="display:flex;gap:6px;align-items:center">'
              '<span style="font-size:15px">Key shape:&nbsp;</span>'
              + svg_wrap(poly(60,60,40,6)) + '</div>')
    correct=svg_wrap(poly(60,60,30,6,fill="#3b6"))  # hexagon, smaller & shaded
    wrong=[svg_wrap(poly(60,60,38,5)),  # pentagon
           svg_wrap(poly(60,60,38,3)),  # triangle
           svg_wrap(circle(60,60,36))]  # circle
    pos={"A":0,"B":1,"C":2,"D":3}[ans_pos]
    opts=[]; wi=0
    for i in range(4):
        if i==pos: opts.append(correct)
        else: opts.append(wrong[wi]); wi+=1
    add("Most alike",
        "Which option is the SAME type of shape as the key shape (it may be a different size or shading)?",
        stimulus, opts, ans_pos,
        "The key shape is a six-sided hexagon. The correct option is also a hexagon, even though its size and shading differ.")

for ans_pos in ["A","B","C","D"]:
    most_alike(ans_pos)

# Reflection / mirror: an L-shape and its mirror image
def mirror_q(ans_pos):
    Lshape = '<polyline points="40,35 40,85 80,85" fill="none" stroke="#222" stroke-width="6"/>'
    mirror = '<polyline points="80,35 80,85 40,85" fill="none" stroke="#222" stroke-width="6"/>'
    up     = '<polyline points="40,85 40,35 80,35" fill="none" stroke="#222" stroke-width="6"/>'
    rot    = '<polyline points="80,85 80,35 40,35" fill="none" stroke="#222" stroke-width="6"/>'
    stimulus=('<div style="display:flex;gap:6px;align-items:center">'
              '<span style="font-size:15px">Mirror this shape (flip left-to-right):&nbsp;</span>'
              + svg_wrap(Lshape) + '</div>')
    correct=svg_wrap(mirror)
    wrong=[svg_wrap(Lshape), svg_wrap(up), svg_wrap(rot)]
    pos={"A":0,"B":1,"C":2,"D":3}[ans_pos]
    opts=[]; wi=0
    for i in range(4):
        if i==pos: opts.append(correct)
        else: opts.append(wrong[wi]); wi+=1
    add("Reflection",
        "Which option shows the shape reflected in a vertical mirror (flipped left to right)?",
        stimulus, opts, ans_pos,
        "A left-to-right reflection swaps left and right, so the foot of the L points the opposite way while the upright stays at the bottom.")

for ans_pos in ["A","B","C","D"]:
    mirror_q(ans_pos)

# =========================================================
# EXTRA: more series, size odd-one-out, analogies to reach ~50
# =========================================================
# More rotating-arrow series
for start, ans_pos in [(45,"A"),(135,"C"),(225,"B"),(315,"D")]:
    rotating_arrow_series(start, ans_pos, "")

# More dot series
for start_n, ans_pos in [(1,"B"),(1,"D")]:
    dot_series(start_n, ans_pos)

# Odd-one-out by SIZE (three large same shape, one small) -- rule: size
def size_odd(shape, ans_pos):
    def draw(big):
        r = 40 if big else 20
        if shape=="circle": return circle(60,60,r)
        if shape=="square": return rect(60-r,60-r,2*r,2*r)
        if shape=="triangle": return poly(60,62,r,3)
        if shape=="pentagon": return poly(60,60,r,5)
    pos={"A":0,"B":1,"C":2,"D":3}[ans_pos]
    opts=[svg_wrap(draw(i!=pos)) for i in range(4)]
    add("Odd one out",
        "Which shape is the ODD ONE OUT?",
        "", opts, ans_pos,
        "Three shapes are large and one is much smaller, so the small one is the odd one out.")
for shape, ans_pos in [("circle","B"),("square","D"),("triangle","A"),("pentagon","C")]:
    size_odd(shape, ans_pos)

# More 'most alike' with different key shapes
def most_alike2(key_n, ans_pos, key_name):
    stimulus=('<div style="display:flex;gap:6px;align-items:center">'
              '<span style="font-size:15px">Key shape:&nbsp;</span>'
              + svg_wrap(poly(60,60,40,key_n)) + '</div>')
    correct=svg_wrap(poly(60,60,30,key_n,fill="#39c"))
    others=[poly(60,60,38,n) for n in (3,4,5,6) if n!=key_n][:3]
    wrong=[svg_wrap(o) for o in others]
    pos={"A":0,"B":1,"C":2,"D":3}[ans_pos]
    opts=[]; wi=0
    for i in range(4):
        if i==pos: opts.append(correct)
        else: opts.append(wrong[wi]); wi+=1
    add("Most alike",
        "Which option is the SAME type of shape as the key shape (it may be a different size or shading)?",
        stimulus, opts, ans_pos,
        f"The key shape has {key_n} sides. The correct option has the same number of sides, just a different size and shading.")
for key_n, ans_pos, nm in [(3,"C","triangle"),(4,"A","square"),(5,"D","pentagon")]:
    most_alike2(key_n, ans_pos, nm)

if __name__ == "__main__":
    import json, sys
    json.dump(Q, sys.stdout, ensure_ascii=False)
