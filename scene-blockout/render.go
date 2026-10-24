package main

import (
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"runtime"
	"sort"
	"sync"
)

// ---------- vector math ----------

type V struct{ X, Y, Z float64 }

func (a V) Add(b V) V           { return V{a.X + b.X, a.Y + b.Y, a.Z + b.Z} }
func (a V) Sub(b V) V           { return V{a.X - b.X, a.Y - b.Y, a.Z - b.Z} }
func (a V) S(s float64) V       { return V{a.X * s, a.Y * s, a.Z * s} }
func (a V) M(b V) V             { return V{a.X * b.X, a.Y * b.Y, a.Z * b.Z} }
func (a V) Dot(b V) float64     { return a.X*b.X + a.Y*b.Y + a.Z*b.Z }
func (a V) Cross(b V) V         { return V{a.Y*b.Z - a.Z*b.Y, a.Z*b.X - a.X*b.Z, a.X*b.Y - a.Y*b.X} }
func (a V) Len() float64        { return math.Sqrt(a.Dot(a)) }
func (a V) N() V                { l := a.Len(); if l == 0 { return a }; return a.S(1 / l) }
func (a V) Get(i int) float64 {
	switch i {
	case 0:
		return a.X
	case 1:
		return a.Y
	}
	return a.Z
}
func lerpV(a, b V, t float64) V { return a.S(1 - t).Add(b.S(t)) }
func clamp(x, lo, hi float64) float64 {
	if x < lo {
		return lo
	}
	if x > hi {
		return hi
	}
	return x
}
func smooth(e0, e1, x float64) float64 {
	t := clamp((x-e0)/(e1-e0), 0, 1)
	return t * t * (3 - 2*t)
}
func fr(x float64) float64 { return x - math.Floor(x) }

type Ray struct{ O, D, Inv V }

func newRay(o, d V) Ray { return Ray{o, d, V{1 / d.X, 1 / d.Y, 1 / d.Z}} }

// ---------- bounds ----------

type AABB struct{ Min, Max V }

func (b AABB) hit(r *Ray, tmin, tmax float64) bool {
	t0, t1 := tmin, tmax
	for i := 0; i < 3; i++ {
		inv := r.Inv.Get(i)
		o := r.O.Get(i)
		tn := (b.Min.Get(i) - o) * inv
		tf := (b.Max.Get(i) - o) * inv
		if tn > tf {
			tn, tf = tf, tn
		}
		if tn > t0 {
			t0 = tn
		}
		if tf < t1 {
			t1 = tf
		}
		if t0 > t1 {
			return false
		}
	}
	return true
}

func union(a, b AABB) AABB {
	return AABB{
		V{math.Min(a.Min.X, b.Min.X), math.Min(a.Min.Y, b.Min.Y), math.Min(a.Min.Z, b.Min.Z)},
		V{math.Max(a.Max.X, b.Max.X), math.Max(a.Max.Y, b.Max.Y), math.Max(a.Max.Z, b.Max.Z)},
	}
}

// ---------- materials ----------

const (
	TexNone = iota
	TexNoise
	TexBrick
	TexHouseWall
	TexWorkWall
	TexGround
	TexShutter
	TexRibs
	TexMud
	TexMat
	TexCurtain
	TexRoof
	TexLeaves
)

type Mat struct {
	Albedo   V
	Emit     V
	Tex      int
	K        float64
	NoShadow bool
}

func mc(r, g, b float64) *Mat                     { return &Mat{Albedo: V{r, g, b}} }
func mt(r, g, b float64, tex int, k float64) *Mat { return &Mat{Albedo: V{r, g, b}, Tex: tex, K: k} }
func emit(r, g, b float64) *Mat                   { return &Mat{Emit: V{r, g, b}, NoShadow: true} }

// ---------- primitives ----------

type Prim interface {
	Intersect(r *Ray, tmin, tmax float64) (float64, V, bool)
	Bounds() AABB
	Mat() *Mat
}

type Box struct {
	C, H V
	c, s float64
	rot  bool
	m    *Mat
}

func (b *Box) Mat() *Mat { return b.m }
func (b *Box) Intersect(r *Ray, tmin, tmax float64) (float64, V, bool) {
	o := r.O.Sub(b.C)
	d := r.D
	if b.rot {
		o = V{o.X*b.c - o.Z*b.s, o.Y, o.X*b.s + o.Z*b.c}
		d = V{d.X*b.c - d.Z*b.s, d.Y, d.X*b.s + d.Z*b.c}
	}
	t0, t1 := tmin, tmax
	axisN := -1
	signN := 0.0
	for i := 0; i < 3; i++ {
		oi, di, hi := o.Get(i), d.Get(i), b.H.Get(i)
		if math.Abs(di) < 1e-12 {
			if oi < -hi || oi > hi {
				return 0, V{}, false
			}
			continue
		}
		inv := 1 / di
		tn := (-hi - oi) * inv
		tf := (hi - oi) * inv
		sg := -1.0
		if tn > tf {
			tn, tf = tf, tn
			sg = 1.0
		}
		if tn > t0 {
			t0 = tn
			axisN = i
			signN = sg
		}
		if tf < t1 {
			t1 = tf
		}
		if t0 > t1 {
			return 0, V{}, false
		}
	}
	if axisN < 0 {
		return 0, V{}, false
	}
	var n V
	switch axisN {
	case 0:
		n = V{signN, 0, 0}
	case 1:
		n = V{0, signN, 0}
	default:
		n = V{0, 0, signN}
	}
	if b.rot {
		n = V{n.X*b.c + n.Z*b.s, n.Y, -n.X*b.s + n.Z*b.c}
	}
	return t0, n, true
}
func (b *Box) Bounds() AABB {
	if !b.rot {
		return AABB{b.C.Sub(b.H), b.C.Add(b.H)}
	}
	bb := AABB{V{1e18, 1e18, 1e18}, V{-1e18, -1e18, -1e18}}
	for _, sx := range []float64{-1, 1} {
		for _, sy := range []float64{-1, 1} {
			for _, sz := range []float64{-1, 1} {
				l := V{sx * b.H.X, sy * b.H.Y, sz * b.H.Z}
				w := V{l.X*b.c + l.Z*b.s, l.Y, -l.X*b.s + l.Z*b.c}.Add(b.C)
				bb = union(bb, AABB{w, w})
			}
		}
	}
	return bb
}

type Cyl struct {
	B    V
	R, L float64
	Ax   int
	m    *Mat
}

func (c *Cyl) Mat() *Mat { return c.m }
func (c *Cyl) Intersect(r *Ray, tmin, tmax float64) (float64, V, bool) {
	o := r.O.Sub(c.B)
	d := r.D
	var ou, ov, oa, du, dv, da float64
	switch c.Ax {
	case 0:
		oa, ou, ov = o.X, o.Y, o.Z
		da, du, dv = d.X, d.Y, d.Z
	case 1:
		oa, ou, ov = o.Y, o.X, o.Z
		da, du, dv = d.Y, d.X, d.Z
	default:
		oa, ou, ov = o.Z, o.X, o.Y
		da, du, dv = d.Z, d.X, d.Y
	}
	best := tmax
	found := false
	var nl [3]float64
	A := du*du + dv*dv
	if A > 1e-12 {
		B := ou*du + ov*dv
		C := ou*ou + ov*ov - c.R*c.R
		disc := B*B - A*C
		if disc >= 0 {
			sq := math.Sqrt(disc)
			for _, t := range [2]float64{(-B - sq) / A, (-B + sq) / A} {
				if t > tmin && t < best {
					a := oa + t*da
					if a >= 0 && a <= c.L {
						best = t
						found = true
						nl = [3]float64{0, (ou + t*du) / c.R, (ov + t*dv) / c.R}
						break
					}
				}
			}
		}
	}
	if math.Abs(da) > 1e-12 {
		for _, cp := range [2]float64{0, c.L} {
			t := (cp - oa) / da
			if t > tmin && t < best {
				u := ou + t*du
				w := ov + t*dv
				if u*u+w*w <= c.R*c.R {
					best = t
					found = true
					s := -1.0
					if cp > 0 {
						s = 1.0
					}
					nl = [3]float64{s, 0, 0}
				}
			}
		}
	}
	if !found {
		return 0, V{}, false
	}
	var n V
	switch c.Ax {
	case 0:
		n = V{nl[0], nl[1], nl[2]}
	case 1:
		n = V{nl[1], nl[0], nl[2]}
	default:
		n = V{nl[1], nl[2], nl[0]}
	}
	return best, n, true
}
func (c *Cyl) Bounds() AABB {
	mn, mx := c.B, c.B
	switch c.Ax {
	case 0:
		mn = c.B.Add(V{0, -c.R, -c.R})
		mx = c.B.Add(V{c.L, c.R, c.R})
	case 1:
		mn = c.B.Add(V{-c.R, 0, -c.R})
		mx = c.B.Add(V{c.R, c.L, c.R})
	default:
		mn = c.B.Add(V{-c.R, -c.R, 0})
		mx = c.B.Add(V{c.R, c.R, c.L})
	}
	return AABB{mn, mx}
}

type Sph struct {
	C V
	R float64
	m *Mat
}

func (sp *Sph) Mat() *Mat { return sp.m }
func (sp *Sph) Intersect(r *Ray, tmin, tmax float64) (float64, V, bool) {
	oc := r.O.Sub(sp.C)
	b := oc.Dot(r.D)
	c := oc.Dot(oc) - sp.R*sp.R
	disc := b*b - c
	if disc < 0 {
		return 0, V{}, false
	}
	sq := math.Sqrt(disc)
	t := -b - sq
	if t <= tmin || t >= tmax {
		t = -b + sq
		if t <= tmin || t >= tmax {
			return 0, V{}, false
		}
	}
	p := r.O.Add(r.D.S(t))
	return t, p.Sub(sp.C).S(1 / sp.R), true
}
func (sp *Sph) Bounds() AABB {
	rv := V{sp.R, sp.R, sp.R}
	return AABB{sp.C.Sub(rv), sp.C.Add(rv)}
}

// ---------- scene + BVH ----------

type BVHNode struct {
	B                 AABB
	L, R, Start, Cnt int
}

type Scene struct {
	prims     []Prim
	idx       []int
	nodes     []BVHNode
	holes     [][4]float64
	groundMat *Mat
}

func (s *Scene) add(p Prim) { s.prims = append(s.prims, p) }

func (s *Scene) box(x0, y0, z0, x1, y1, z1 float64, m *Mat) {
	if x0 > x1 {
		x0, x1 = x1, x0
	}
	if y0 > y1 {
		y0, y1 = y1, y0
	}
	if z0 > z1 {
		z0, z1 = z1, z0
	}
	s.add(&Box{C: V{(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2}, H: V{(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2}, m: m})
}

// oriented box rotated around Y by yawDeg
func (s *Scene) obox(cx, cy, cz, hx, hy, hz, yawDeg float64, m *Mat) {
	a := yawDeg * math.Pi / 180
	s.add(&Box{C: V{cx, cy, cz}, H: V{hx, hy, hz}, c: math.Cos(a), s: math.Sin(a), rot: true, m: m})
}

func (s *Scene) cyl(ax int, bx, by, bz, r, l float64, m *Mat) {
	s.add(&Cyl{B: V{bx, by, bz}, R: r, L: l, Ax: ax, m: m})
}

func (s *Scene) sph(x, y, z, r float64, m *Mat) { s.add(&Sph{C: V{x, y, z}, R: r, m: m}) }

func (s *Scene) build() {
	n := len(s.prims)
	s.idx = make([]int, n)
	bounds := make([]AABB, n)
	cents := make([]V, n)
	for i, p := range s.prims {
		s.idx[i] = i
		bounds[i] = p.Bounds()
		cents[i] = bounds[i].Min.Add(bounds[i].Max).S(0.5)
	}
	s.nodes = s.nodes[:0]
	s.buildRec(0, n, bounds, cents)
}

func (s *Scene) buildRec(start, end int, bounds []AABB, cents []V) int {
	ni := len(s.nodes)
	s.nodes = append(s.nodes, BVHNode{})
	b := bounds[s.idx[start]]
	cb := AABB{cents[s.idx[start]], cents[s.idx[start]]}
	for i := start + 1; i < end; i++ {
		b = union(b, bounds[s.idx[i]])
		c := cents[s.idx[i]]
		cb = union(cb, AABB{c, c})
	}
	if end-start <= 4 {
		s.nodes[ni] = BVHNode{B: b, Start: start, Cnt: end - start}
		return ni
	}
	ext := cb.Max.Sub(cb.Min)
	ax := 0
	if ext.Y > ext.X {
		ax = 1
	}
	if ext.Z > ext.Get(ax) {
		ax = 2
	}
	sub := s.idx[start:end]
	sort.Slice(sub, func(i, j int) bool { return cents[sub[i]].Get(ax) < cents[sub[j]].Get(ax) })
	mid := (start + end) / 2
	l := s.buildRec(start, mid, bounds, cents)
	r := s.buildRec(mid, end, bounds, cents)
	s.nodes[ni] = BVHNode{B: b, L: l, R: r}
	return ni
}

func (s *Scene) inHole(p V) bool {
	for _, h := range s.holes {
		if p.X > h[0] && p.X < h[1] && p.Z > h[2] && p.Z < h[3] {
			return true
		}
	}
	return false
}

type Hit struct {
	T float64
	N V
	M *Mat
}

func (s *Scene) intersect(r *Ray, tmin, tmax float64, h *Hit, anyHit bool) bool {
	hit := false
	if math.Abs(r.D.Y) > 1e-9 {
		t := -r.O.Y / r.D.Y
		if t > tmin && t < tmax {
			p := r.O.Add(r.D.S(t))
			if !s.inHole(p) {
				if anyHit {
					return true
				}
				tmax = t
				hit = true
				h.T = t
				h.N = V{0, 1, 0}
				h.M = s.groundMat
			}
		}
	}
	var stack [128]int
	sp := 0
	stack[sp] = 0
	sp++
	for sp > 0 {
		sp--
		nd := &s.nodes[stack[sp]]
		if !nd.B.hit(r, tmin, tmax) {
			continue
		}
		if nd.Cnt > 0 {
			for i := nd.Start; i < nd.Start+nd.Cnt; i++ {
				p := s.prims[s.idx[i]]
				if anyHit && p.Mat().NoShadow {
					continue
				}
				if t, n, ok := p.Intersect(r, tmin, tmax); ok {
					if anyHit {
						return true
					}
					tmax = t
					hit = true
					h.T = t
					h.N = n
					h.M = p.Mat()
				}
			}
		} else {
			stack[sp] = nd.L
			sp++
			stack[sp] = nd.R
			sp++
		}
	}
	return hit
}

// ---------- noise ----------

func hash2(i, j int) float64 {
	h := uint32(i)*374761393 + uint32(j)*668265263
	h = (h ^ (h >> 13)) * 1274126177
	h ^= h >> 16
	return float64(h) / 4294967295.0
}

func noise2(x, y float64) float64 {
	xi, yi := math.Floor(x), math.Floor(y)
	fx, fy := x-xi, y-yi
	ix, iy := int(xi), int(yi)
	a := hash2(ix, iy)
	b := hash2(ix+1, iy)
	c := hash2(ix, iy+1)
	d := hash2(ix+1, iy+1)
	ux := fx * fx * (3 - 2*fx)
	uy := fy * fy * (3 - 2*fy)
	return a + (b-a)*ux + (c-a)*uy + (a-b-c+d)*ux*uy
}

func fbm(x, y float64) float64 {
	return (0.5*noise2(x, y) + 0.25*noise2(x*2.03+5.1, y*2.03+1.7) + 0.125*noise2(x*4.01+9.2, y*4.01+3.3)) / 0.875
}

// ---------- render config ----------

type Light struct {
	P, C V
	R    float64
	Down float64 // 0=全向; 1=只照下方（台灯）
}

type Cfg struct {
	SunOn          bool
	SunDir, SunCol V
	Sky            V
	SkyTop, SkyHor V
	Fill, FillDir  V
	Exposure       float64
	Lights         []Light
	AOSamples      int
	AODist         float64
	Inside         func(p V) bool
}

type Cam struct {
	Name           string
	Pos, Look      V
	VFov           float64
	Ortho          bool
	OrthoW, OrthoH float64
	W, H           int
}

type RNG struct{ s uint64 }

func (r *RNG) f() float64 {
	r.s ^= r.s << 13
	r.s ^= r.s >> 7
	r.s ^= r.s << 17
	return float64(r.s>>11) / float64(uint64(1)<<53)
}

func onb(n V) (V, V) {
	a := V{1, 0, 0}
	if math.Abs(n.X) > 0.9 {
		a = V{0, 1, 0}
	}
	u := a.Cross(n).N()
	w := n.Cross(u)
	return u, w
}

func (cfg *Cfg) sky(d V) V {
	t := math.Pow(math.Max(0, d.Y), 0.6)
	return lerpV(cfg.SkyHor, cfg.SkyTop, t)
}

func (s *Scene) shade(r *Ray, h *Hit, cfg *Cfg, rng *RNG) V {
	p := r.O.Add(r.D.S(h.T))
	n := h.N
	if n.Dot(r.D) > 0 {
		n = n.S(-1)
	}
	m := h.M
	if m.Emit.X+m.Emit.Y+m.Emit.Z > 0 {
		return m.Emit
	}
	alb := albedo(m, p, n)
	po := p.Add(n.S(1e-3))
	ao := 1.0
	if cfg.AOSamples > 0 {
		occ := 0
		u, w := onb(n)
		for i := 0; i < cfg.AOSamples; i++ {
			r1, r2 := rng.f(), rng.f()
			phi := 2 * math.Pi * r1
			sr := math.Sqrt(r2)
			dir := u.S(math.Cos(phi) * sr).Add(w.S(math.Sin(phi) * sr)).Add(n.S(math.Sqrt(1 - r2)))
			rr := newRay(po, dir)
			if s.intersect(&rr, 1e-4, cfg.AODist, nil, true) {
				occ++
			}
		}
		ao = 1 - float64(occ)/float64(cfg.AOSamples)
	}
	var amb V
	if cfg.Inside != nil && cfg.Inside(p) {
		amb = cfg.Fill.S(0.7 + 0.3*n.Dot(cfg.FillDir))
	} else {
		amb = cfg.Sky.S(0.65 + 0.35*n.Y)
	}
	col := alb.M(amb).S(0.2 + 0.8*ao)
	if cfg.SunOn {
		ndl := n.Dot(cfg.SunDir)
		if ndl > 0 {
			sr := newRay(po, cfg.SunDir)
			if !s.intersect(&sr, 1e-4, 1e9, nil, true) {
				col = col.Add(alb.M(cfg.SunCol).S(ndl))
			}
		}
	}
	for _, L := range cfg.Lights {
		d := L.P.Sub(p)
		dist := d.Len()
		if dist > L.R || dist < 1e-6 {
			continue
		}
		dn := d.S(1 / dist)
		ndl := n.Dot(dn)
		if ndl <= 0 {
			continue
		}
		sr := newRay(po, dn)
		if s.intersect(&sr, 1e-4, dist-1e-3, nil, true) {
			continue
		}
		k := 1.0
		if L.Down > 0 {
			k = (1 - L.Down) + L.Down*math.Max(0, dn.Y)
		}
		col = col.Add(alb.M(L.C).S(k * ndl / (dist*dist + 0.05)))
	}
	return col
}

func aces(x float64) float64 {
	y := (x * (2.51*x + 0.03)) / (x*(2.43*x+0.59) + 0.14)
	return clamp(y, 0, 1)
}

func render(s *Scene, cam Cam, cfg *Cfg, spp int, path string) error {
	W, H := cam.W, cam.H
	img := image.NewRGBA(image.Rect(0, 0, W, H))
	fwd := cam.Look.Sub(cam.Pos).N()
	upW := V{0, 1, 0}
	if math.Abs(fwd.Y) > 0.99 {
		upW = V{0, 0, -1}
	}
	right := fwd.Cross(upW).N()
	up := right.Cross(fwd)
	aspect := float64(W) / float64(H)
	th := math.Tan(cam.VFov * math.Pi / 360)
	grid := int(math.Sqrt(float64(spp)))
	if grid < 1 {
		grid = 1
	}
	rows := make(chan int, H)
	for j := 0; j < H; j++ {
		rows <- j
	}
	close(rows)
	var wg sync.WaitGroup
	for w := 0; w < runtime.NumCPU(); w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range rows {
				rng := &RNG{s: uint64(j)*2654435761 + 88172645463325252}
				for i := 0; i < W; i++ {
					var acc V
					for sy := 0; sy < grid; sy++ {
						for sx := 0; sx < grid; sx++ {
							dx := (float64(sx) + rng.f()) / float64(grid)
							dy := (float64(sy) + rng.f()) / float64(grid)
							px := (2*(float64(i)+dx)/float64(W) - 1)
							py := (1 - 2*(float64(j)+dy)/float64(H))
							var ray Ray
							if cam.Ortho {
								o := cam.Pos.Add(right.S(px * cam.OrthoW / 2)).Add(up.S(py * cam.OrthoH / 2))
								ray = newRay(o, fwd)
							} else {
								d := fwd.Add(right.S(px * th * aspect)).Add(up.S(py * th)).N()
								ray = newRay(cam.Pos, d)
							}
							var h Hit
							var c V
							if s.intersect(&ray, 1e-4, 1e9, &h, false) {
								c = s.shade(&ray, &h, cfg, rng)
							} else {
								c = cfg.sky(ray.D)
							}
							acc = acc.Add(c)
						}
					}
					acc = acc.S(cfg.Exposure / float64(grid*grid))
					img.SetRGBA(i, j, color.RGBA{
						uint8(255 * math.Pow(aces(acc.X), 1/2.2)),
						uint8(255 * math.Pow(aces(acc.Y), 1/2.2)),
						uint8(255 * math.Pow(aces(acc.Z), 1/2.2)),
						255,
					})
				}
			}
		}()
	}
	wg.Wait()
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return png.Encode(f, img)
}
