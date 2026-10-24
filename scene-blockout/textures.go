package main

import "math"

func insideHouse(p V) bool {
	return p.X > -6.86 && p.X < 6.86 && p.Z < 0.1 && p.Z > -5.1 && p.Y < 3.02
}

func insideWorkshop(p V) bool {
	return p.X > -3.91 && p.X < 11.91 && p.Z > -23.91 && p.Z < -8.09 && p.Y < 6.02
}

// planar coordinates on a surface for patterning
func planeUV(p, n V) (float64, float64) {
	if math.Abs(n.X) > 0.5 {
		return p.Z, p.Y
	}
	if math.Abs(n.Z) > 0.5 {
		return p.X, p.Y
	}
	return p.X, p.Z
}

func brick(p, n V) V {
	u, v := planeUV(p, n)
	if math.Abs(n.Y) > 0.5 {
		return V{0.55, 0.53, 0.5}
	}
	row := math.Floor(v / 0.065)
	uu := u
	if int(row)%2 != 0 {
		uu += 0.12
	}
	col := math.Floor(uu / 0.24)
	if fr(v/0.065) < 0.16 || fr(uu/0.24) < 0.05 {
		return V{0.62, 0.6, 0.56}
	}
	h := hash2(int(col)*7+3, int(row)*13+1)
	base := V{0.56, 0.24, 0.17}
	g := 0.82 + 0.3*h
	dirt := 0.85 + 0.15*fbm(u*1.3, v*1.3)
	return base.S(g * dirt)
}

func concrete(p, n V, base V, k float64) V {
	u, v := planeUV(p, n)
	f := fbm(u*2.1, v*2.1)
	return base.S(1 - k*0.5 + k*f)
}

func albedo(m *Mat, p, n V) V {
	a := m.Albedo
	switch m.Tex {
	case TexNoise:
		u, v := planeUV(p, n)
		return a.S(1 - m.K*0.5 + m.K*fbm(u*3.7+p.Y, v*3.7))
	case TexBrick:
		if p.Y > 0 && math.Abs(n.Y) < 0.5 && p.Y < 0.5 {
			return concrete(p, n, V{0.5, 0.5, 0.48}, 0.4)
		}
		return brick(p, n)
	case TexHouseWall:
		if math.Abs(n.Y) > 0.5 {
			return concrete(p, n, V{0.55, 0.55, 0.52}, 0.3)
		}
		if insideHouse(p.Sub(n.S(0.01))) && insideHouse(p) {
			u, v := planeUV(p, n)
			if p.Y < 1.0 {
				c := V{0.42, 0.5, 0.46}
				if p.Y > 0.97 {
					c = V{0.3, 0.36, 0.33}
				}
				return c.S(0.8 + 0.25*fbm(u*3, v*3))
			}
			st := fbm(u*0.9+11, v*1.4)
			c := V{0.86, 0.82, 0.7}
			c = c.S(1 - 0.1*smooth(0.6, 0.75, st))
			return c.S(0.93 + 0.08*fbm(u*6, v*6))
		}
		if p.Y < 0.9 {
			return concrete(p, n, V{0.5, 0.5, 0.48}, 0.45)
		}
		return brick(p, n)
	case TexWorkWall:
		if math.Abs(n.Y) > 0.5 {
			return V{0.5, 0.5, 0.5}
		}
		in := insideWorkshop(p)
		if p.Y < 1.2 {
			if in {
				return concrete(p, n, V{0.45, 0.45, 0.43}, 0.5)
			}
			return brick(p, n)
		}
		u, _ := planeUV(p, n)
		rib := 0.85
		if fr(u/0.2) < 0.35 {
			rib = 1.0
		}
		base := V{0.72, 0.78, 0.84}
		if in {
			base = V{0.66, 0.68, 0.7}
		}
		_, v := planeUV(p, n)
		return base.S(rib * (0.85 + 0.2*fbm(u*0.8, v*0.8)))
	case TexGround:
		return groundAlbedo(p)
	case TexShutter:
		_, v := planeUV(p, n)
		s := 0.9
		if fr(v/0.09) < 0.25 {
			s = 0.7
		}
		u, _ := planeUV(p, n)
		return a.S(s * (0.85 + 0.2*fbm(u*1.5, v*1.5)))
	case TexRibs:
		u, v := planeUV(p, n)
		s := 1.0
		if fr(u/0.12) < 0.3 {
			s = 0.75
		}
		return a.S(s * (0.85 + 0.2*fbm(u*2, v*2)))
	case TexMud:
		u, v := planeUV(p, n)
		f := fbm(u*1.8, v*3)
		mud := V{0.36, 0.28, 0.18}
		t := smooth(1.9, 0.9, p.Y+0.6*(f-0.5))
		spots := smooth(0.62, 0.7, fbm(u*4+3, v*4+7))
		t = math.Max(t, spots*0.7)
		return lerpV(a.S(0.9+0.15*f), mud.S(0.8+0.3*f), t)
	case TexMat:
		u, _ := planeUV(p, n)
		s := 1.0
		if fr(u/0.03) < 0.4 {
			s = 0.82
		}
		return a.S(s)
	case TexCurtain:
		u, v := planeUV(p, n)
		f := noise2(u*14, v*14)
		if f > 0.72 {
			return V{0.75, 0.42, 0.45}
		}
		if f < 0.2 {
			return V{0.52, 0.62, 0.48}
		}
		return a
	case TexRoof:
		if n.Y < -0.5 {
			if insideHouse(p.Add(V{0, -0.05, 0})) {
				return V{0.86, 0.84, 0.78}
			}
			u, _ := planeUV(p, n)
			s := 1.0
			if fr(u/0.25) < 0.3 {
				s = 0.85
			}
			return V{0.62, 0.64, 0.66}.S(s)
		}
		u, v := planeUV(p, n)
		return a.S(0.8 + 0.3*fbm(u*0.7, v*0.7))
	case TexLeaves:
		f := fbm(p.X*3.1+p.Y*1.7, p.Z*3.1-p.Y*1.3)
		return a.S(0.7 + 0.6*f)
	}
	return a
}

func groundAlbedo(p V) V {
	x, z := p.X, p.Z
	// national road
	if z > 16 && z < 23 {
		c := V{0.2, 0.2, 0.21}.S(0.85 + 0.25*fbm(x*1.5, z*1.5))
		if (z > 16.25 && z < 16.4) || (z > 22.6 && z < 22.75) {
			return V{0.85, 0.85, 0.82}
		}
		if z > 19.42 && z < 19.58 && fr(x/6) < 0.5 {
			return V{0.85, 0.85, 0.82}
		}
		return c
	}
	insideCompound := x > -12 && x < 12 && z < 14 && z > -24
	if !insideCompound {
		// 路肩为土路，远处为农田
		if (z > 14 && z < 16.3) || (z > 22.7 && z < 24.5) {
			return V{0.55, 0.49, 0.38}.S(0.8 + 0.35*fbm(x*0.8, z*0.8))
		}
		row := 0.85 + 0.15*math.Sin(x*4.0)
		if z > 23 {
			row = 0.85 + 0.15*math.Sin(z*4.0)
		}
		return V{0.3, 0.42, 0.18}.S(row * (0.75 + 0.4*fbm(x*0.3, z*0.3)))
	}
	if insideHouse(V{x, 0.01, z}) {
		c := V{0.5, 0.5, 0.48}.S(0.9 + 0.15*fbm(x*2.5, z*2.5))
		c = c.S(1 - 0.12*smooth(0.62, 0.72, fbm(x*1.6+4, z*1.6+2)))
		return c
	}
	base := V{0.6, 0.59, 0.56}
	if insideWorkshop(V{x, 0.01, z}) {
		base = V{0.46, 0.45, 0.43}
	}
	c := base.S(0.85 + 0.25*fbm(x*1.7, z*1.7))
	// expansion joints
	if fr(x/4) < 0.006 || fr(z/4) < 0.006 {
		c = c.S(0.6)
	}
	// oil stains
	st := fbm(x*0.8+7.3, z*0.8+1.1)
	thr := 0.66
	if insideWorkshop(V{x, 0.01, z}) {
		thr = 0.56
	}
	if st > thr {
		t := smooth(thr, thr+0.08, st)
		c = lerpV(c, V{0.16, 0.15, 0.14}, 0.75*t)
	}
	return c
}
