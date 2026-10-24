package main

import "math"

type State struct {
	EastLeafDeg  float64 // 堂屋活动门扇（东扇）向内开启角度：0=关, 95=全开
	BackDoorOpen bool    // 堂屋后门
	ShutterOpen  bool    // 侧车道大卷帘门
	Fire         int     // 0=熄灭冷灰 1=余烬 2=燃烧（蜡烛在 Fire>0 时点燃）
	CandleShort  bool    // 次日蜡烛烧短
	NoRoof       bool    // 平面图用：去掉屋顶
	LampOn       bool    // 陆宇卧室台灯
	Table        int     // 0=茶几完好 1=刚砸碎 2=已清理（只剩铁架）
	Certs        int     // 0=奖状完整 1=被撕 2=胶带拼贴复原
	Scraps       bool    // 地上奖状碎纸
	Ash          bool    // 通知书纸灰
	Bowl         bool    // 矮柜上的面条碗
	ChairMoved   bool    // 椅子被拖离书桌
	BookOpen     bool    // 书桌上摊开的书
}

// ---- shared materials ----
var (
	mHouseWall = &Mat{Albedo: V{1, 1, 1}, Tex: TexHouseWall}
	mWorkWall  = &Mat{Albedo: V{1, 1, 1}, Tex: TexWorkWall}
	mBrick     = &Mat{Albedo: V{1, 1, 1}, Tex: TexBrick}
	mCap       = mt(0.55, 0.55, 0.52, TexNoise, 0.4)
	mRoof      = mt(0.5, 0.5, 0.48, TexRoof, 0)
	mShopRoof  = &Mat{Albedo: V{0.55, 0.63, 0.7}, Tex: TexRoof}
	mGreenDoor = mt(0.16, 0.3, 0.22, TexNoise, 0.5)
	mWoodDoor  = mt(0.42, 0.28, 0.17, TexNoise, 0.4)
	mWood      = mt(0.38, 0.24, 0.14, TexNoise, 0.4)
	mDarkWood  = mt(0.26, 0.16, 0.1, TexNoise, 0.3)
	mWhite     = mc(0.9, 0.9, 0.88)
	mPaper     = mt(0.86, 0.82, 0.68, TexNoise, 0.5)
	mSteelFr   = mc(0.22, 0.3, 0.27)
	mBlack     = mc(0.04, 0.04, 0.04)
	mPhoto     = mc(0.45, 0.45, 0.45)
	mStraw     = mt(0.7, 0.57, 0.32, TexNoise, 0.5)
	mIron      = mt(0.2, 0.18, 0.17, TexNoise, 0.4)
	mAsh       = mc(0.25, 0.24, 0.23)
	mCardboard = mt(0.6, 0.46, 0.28, TexNoise, 0.3)
	mBlueDrum  = mt(0.12, 0.28, 0.55, TexNoise, 0.3)
	mRedDrum   = mt(0.55, 0.12, 0.08, TexNoise, 0.3)
	mWorkwear  = mt(0.18, 0.28, 0.5, TexNoise, 0.6)
	mLeather   = mt(0.36, 0.2, 0.12, TexNoise, 0.35)
	mGlass     = mc(0.55, 0.7, 0.7)
	mMetal     = mc(0.3, 0.3, 0.32)
	mSteel     = mc(0.6, 0.62, 0.65)
	mRust      = mt(0.42, 0.24, 0.14, TexNoise, 0.7)
	mTire      = mc(0.07, 0.07, 0.07)
	mTireHub   = mc(0.2, 0.2, 0.2)
	mBark      = mt(0.68, 0.66, 0.58, TexNoise, 0.5)
	mLeaves    = &Mat{Albedo: V{0.22, 0.42, 0.16}, Tex: TexLeaves}
	mTrikeRed  = mt(0.62, 0.12, 0.09, TexNoise, 0.7)
	mVanWhite  = mt(0.78, 0.78, 0.74, TexNoise, 0.5)
	mDarkGlass = mc(0.1, 0.13, 0.16)
	mShutter   = &Mat{Albedo: V{0.42, 0.5, 0.56}, Tex: TexShutter}
	mGateBlue  = &Mat{Albedo: V{0.18, 0.33, 0.58}, Tex: TexRibs}
	mSignRed   = mc(0.7, 0.08, 0.06)
	mTruckBlue = &Mat{Albedo: V{0.12, 0.3, 0.62}, Tex: TexMud}
	mCargo     = &Mat{Albedo: V{0.72, 0.72, 0.7}, Tex: TexMud}
	mRoadBlue  = mc(0.15, 0.32, 0.65)
	mYellow    = mc(0.85, 0.68, 0.1)
	mToolRed   = mt(0.65, 0.1, 0.08, TexNoise, 0.3)
	mPeg       = mt(0.45, 0.4, 0.32, TexNoise, 0.3)
	mLiftBlue  = mc(0.15, 0.35, 0.65)
	mCertRed   = mc(0.68, 0.1, 0.08)
	mCertGold  = mc(0.8, 0.6, 0.15)
	mCertCream = mc(0.9, 0.85, 0.68)
	mLampGreen = mc(0.15, 0.4, 0.25)
	mMatTex    = &Mat{Albedo: V{0.72, 0.6, 0.38}, Tex: TexMat}
	mCurtain   = &Mat{Albedo: V{0.82, 0.76, 0.62}, Tex: TexCurtain}
	mFanBlue   = mc(0.55, 0.7, 0.75)
	mFruit     = mc(0.85, 0.4, 0.1)
	mApple     = mc(0.7, 0.12, 0.1)
	mWreath    = mc(0.93, 0.93, 0.92)
	mWreathIn  = mc(0.9, 0.75, 0.3)
	mBook1     = mc(0.2, 0.3, 0.55)
	mBook2     = mc(0.65, 0.6, 0.5)
	mBook3     = mc(0.55, 0.15, 0.12)
)

// wall along X at z-center zc, from x0..x1, openings {a0,a1,y0,y1}
func (s *Scene) wallX(x0, x1, zc, th, h float64, m *Mat, ops [][4]float64) {
	cur := x0
	for _, o := range ops {
		if o[0] > cur {
			s.box(cur, 0, zc-th/2, o[0], h, zc+th/2, m)
		}
		if o[2] > 0 {
			s.box(o[0], 0, zc-th/2, o[1], o[2], zc+th/2, m)
		}
		if o[3] < h {
			s.box(o[0], o[3], zc-th/2, o[1], h, zc+th/2, m)
		}
		cur = o[1]
	}
	if x1 > cur {
		s.box(cur, 0, zc-th/2, x1, h, zc+th/2, m)
	}
}

func (s *Scene) wallZ(z0, z1, xc, th, h float64, m *Mat, ops [][4]float64) {
	cur := z0
	for _, o := range ops {
		if o[0] > cur {
			s.box(xc-th/2, 0, cur, xc+th/2, h, o[0], m)
		}
		if o[2] > 0 {
			s.box(xc-th/2, 0, o[0], xc+th/2, o[2], o[1], m)
		}
		if o[3] < h {
			s.box(xc-th/2, o[3], o[0], xc+th/2, h, o[1], m)
		}
		cur = o[1]
	}
	if z1 > cur {
		s.box(xc-th/2, 0, cur, xc+th/2, h, z1, m)
	}
}

// window frame in a wall facing Z (opening x0..x1, y0..y1, at plane zc)
func (s *Scene) windowZ(x0, x1, y0, y1, zc float64, newspaper bool, tape bool) {
	t := 0.035
	s.box(x0, y0, zc-0.03, x1, y0+t, zc+0.03, mSteelFr)
	s.box(x0, y1-t, zc-0.03, x1, y1, zc+0.03, mSteelFr)
	s.box(x0, y0, zc-0.03, x0+t, y1, zc+0.03, mSteelFr)
	s.box(x1-t, y0, zc-0.03, x1, y1, zc+0.03, mSteelFr)
	xm := (x0 + x1) / 2
	ym := (y0 + y1) / 2
	s.box(xm-0.02, y0, zc-0.03, xm+0.02, y1, zc+0.03, mSteelFr)
	s.box(x0, ym-0.02, zc-0.03, x1, ym+0.02, zc+0.03, mSteelFr)
	if newspaper {
		s.box(x0+t, y0+t, zc-0.005, x1-t, ym-0.02, zc+0.005, mPaper)
	}
	if tape {
		cx := (x0 + xm) / 2
		cy := (ym + y1) / 2
		s.add(&Box{C: V{cx, cy, zc + 0.012}, H: V{0.16, 0.012, 0.003}, c: math.Cos(0.7), s: 0, rot: false, m: mWhite})
		s.box(cx-0.012, cy-0.15, zc+0.009, cx+0.012, cy+0.15, zc+0.015, mWhite)
	}
}

func (s *Scene) windowX(z0, z1, y0, y1, xc float64) {
	t := 0.035
	s.box(xc-0.03, y0, z0, xc+0.03, y0+t, z1, mSteelFr)
	s.box(xc-0.03, y1-t, z0, xc+0.03, y1, z1, mSteelFr)
	s.box(xc-0.03, y0, z0, xc+0.03, y1, z0+t, mSteelFr)
	s.box(xc-0.03, y0, z1-t, xc+0.03, y1, z1, mSteelFr)
	zm := (z0 + z1) / 2
	s.box(xc-0.03, y0, zm-0.02, xc+0.03, y1, zm+0.02, mSteelFr)
}

// hinged leaf: hinge at (hx,hz), closed leaf extends in direction dir (+1/-1 in x) with length L,
// opened by deg toward -z (inward/north)
func (s *Scene) leaf(hx, hz, L, y0, y1, th, deg float64, dirSign float64, m *Mat) {
	th2 := deg * math.Pi / 180
	// free-end direction from hinge
	fx := dirSign * math.Cos(th2)
	fz := -math.Sin(th2)
	cx := hx + fx*L/2
	cz := hz + fz*L/2
	// local X must align with (fx,fz): world = (c, -s) => c=fx, s=-fz
	a := math.Atan2(-fz, fx)
	s.add(&Box{C: V{cx, (y0 + y1) / 2, cz}, H: V{L / 2, (y1 - y0) / 2, th / 2}, c: math.Cos(a), s: math.Sin(a), rot: true, m: m})
}

// wooden chair centered at (cx,cz), backrest toward +z (south) when yaw=0
func (s *Scene) chair(cx, cz, yawDeg float64) {
	a := yawDeg * math.Pi / 180
	ca, sa := math.Cos(a), math.Sin(a)
	// local (lx,lz) -> world using same convention as Box: (lx*c + lz*s, -lx*s + lz*c)
	put := func(lx, ly, lz, hx, hy, hz float64) {
		wx := cx + lx*ca + lz*sa
		wz := cz - lx*sa + lz*ca
		s.add(&Box{C: V{wx, ly, wz}, H: V{hx, hy, hz}, c: ca, s: sa, rot: true, m: mWood})
	}
	put(0, 0.46, 0, 0.225, 0.02, 0.225)
	for _, lx := range []float64{-0.19, 0.19} {
		for _, lz := range []float64{-0.19, 0.19} {
			put(lx, 0.22, lz, 0.016, 0.22, 0.016)
		}
	}
	put(0, 0.72, 0.205, 0.225, 0.24, 0.02)
}

func (s *Scene) tireStack(x, z float64, n int) {
	for i := 0; i < n; i++ {
		y := float64(i) * 0.23
		s.cyl(1, x, y, z, 0.4, 0.22, mTire)
		s.cyl(1, x, y+0.221, z, 0.2, 0.002, mTireHub)
	}
}

func (s *Scene) poplar(x, z, h, r float64) {
	// 杨树：细高树干 + 竖向窄长树冠
	s.cyl(1, x, 0, z, 0.17*r, h*0.8, mBark)
	s.sph(x, h*0.42, z, 1.15*r, mLeaves)
	s.sph(x+0.25*r, h*0.53, z-0.2*r, 1.3*r, mLeaves)
	s.sph(x-0.25*r, h*0.64, z+0.2*r, 1.2*r, mLeaves)
	s.sph(x+0.1*r, h*0.75, z, 1.0*r, mLeaves)
	s.sph(x, h*0.85, z+0.1*r, 0.75*r, mLeaves)
	s.sph(x, h*0.93, z, 0.45*r, mLeaves)
}

func (s *Scene) wreath(x, zWall float64) {
	z := zWall + 0.3
	s.box(x-0.3, 0, z+0.15, x-0.27, 0.9, z+0.18, mDarkWood)
	s.box(x+0.27, 0, z+0.15, x+0.3, 0.9, z+0.18, mDarkWood)
	s.cyl(2, x, 1.15, z, 0.5, 0.06, mWreath)
	s.cyl(2, x, 1.15, z+0.061, 0.22, 0.01, mWreathIn)
	s.box(x-0.18, 0.35, z+0.07, x-0.1, 0.8, z+0.075, mWhite)
	s.box(x+0.1, 0.35, z+0.07, x+0.18, 0.8, z+0.075, mWhite)
}

// box truck along +X (front at +x)
func (s *Scene) roadTruck(frontX, zc float64) {
	w := 1.15
	s.box(frontX-1.9, 0.9, zc-w, frontX, 3.0, zc+w, mRoadBlue)
	s.box(frontX-0.02, 1.95, zc-w+0.12, frontX+0.01, 2.8, zc+w-0.12, mDarkGlass)
	s.box(frontX-8.0, 1.0, zc-w, frontX-2.0, 3.6, zc+w, mCargo)
	s.box(frontX-8.0, 0.55, zc-0.7, frontX-0.2, 1.0, zc+0.7, mMetal)
	for _, ax := range []float64{frontX - 0.8, frontX - 4.9, frontX - 6.6} {
		s.cyl(2, ax, 0.5, zc-w-0.05, 0.5, 0.3, mTire)
		s.cyl(2, ax, 0.5, zc+w-0.25, 0.5, 0.3, mTire)
	}
}

func buildScene(st State) *Scene {
	s := &Scene{groundMat: &Mat{Albedo: V{1, 1, 1}, Tex: TexGround}}
	s.holes = append(s.holes, [4]float64{8.95, 10.05, -19.5, -10.5})

	// ================= 平房（西屋 / 堂屋 / 东屋） =================
	H := 3.0
	th := 0.25
	// 前墙 z=0
	s.wallX(-6.875, 6.875, 0, th, H, mHouseWall, [][4]float64{
		{-5.4, -4.2, 1.0, 1.9},
		{-2.45, -1.75, 0.9, 2.0},
		{-0.8, 0.8, 0, 2.2},
		{1.75, 2.45, 0.9, 2.0},
		{4.2, 5.4, 1.0, 1.9},
	})
	// 后墙 z=-5（堂屋后门）
	s.wallX(-6.875, 6.875, -5, th, H, mHouseWall, [][4]float64{
		{1.6, 2.5, 0, 2.0},
	})
	// 西山墙（西屋窗）
	s.wallZ(-4.875, -0.125, -6.75, th, H, mHouseWall, [][4]float64{{-3.6, -2.6, 1.1, 2.0}})
	// 东山墙
	s.wallZ(-4.875, -0.125, 6.75, th, H, mHouseWall, nil)
	// 隔墙：西（通陆宇卧室），东（通陆野卧室）
	s.wallZ(-4.875, -0.125, -2.75, th, H, mHouseWall, [][4]float64{{-2.2, -1.3, 0, 2.0}})
	s.wallZ(-4.875, -0.125, 2.75, th, H, mHouseWall, [][4]float64{{-1.8, -0.9, 0, 2.0}})
	if !st.NoRoof {
		s.box(-7.05, 3.0, -5.35, 7.05, 3.25, 0.75, mRoof)
	}

	// 窗户
	s.windowZ(-2.45, -1.75, 0.9, 2.0, 0, true, false)
	s.windowZ(1.75, 2.45, 0.9, 2.0, 0, true, true)
	s.windowZ(-5.4, -4.2, 1.0, 1.9, 0, false, false)
	s.windowZ(4.2, 5.4, 1.0, 1.9, 0, false, false)
	s.windowX(-3.6, -2.6, 1.1, 2.0, -6.75)

	// 堂屋铁皮门：西扇固定（关），东扇活动
	s.box(-0.8, 0.1, -0.1, 0.0, 2.2, -0.05, mGreenDoor)
	s.leaf(0.8, -0.075, 0.8, 0.1, 2.2, 0.05, st.EastLeafDeg, -1, mGreenDoor)
	// 门槛
	s.box(-0.8, 0, -0.12, 0.8, 0.1, 0.12, mCap)
	// 挽联 + 横批（门外侧）
	s.box(-1.17, 0.3, 0.125, -0.92, 2.1, 0.135, mWhite)
	s.box(0.92, 0.3, 0.125, 1.17, 2.1, 0.135, mWhite)
	s.box(-0.85, 2.27, 0.125, 0.85, 2.5, 0.135, mWhite)
	// 门前旧钢板和零件
	s.box(-0.9, 0, 0.5, 0.9, 0.025, 1.6, mRust)
	s.cyl(1, 1.45, 0, 1.25, 0.16, 0.05, mIron)
	s.box(-1.65, 0, 0.8, -1.42, 0.1, 0.98, mIron)
	s.cyl(1, 1.15, 0, 2.05, 0.11, 0.08, mMetal)
	s.cyl(0, -1.2, 0.08, 2.2, 0.08, 0.35, mMetal)

	// 后门（向外开）
	backDeg := 0.0
	if st.BackDoorOpen {
		backDeg = 100
	}
	// hinge at x=2.5,z=-5.0 ; leaf extends toward -x when closed; opens toward -z (outward)
	s.leaf(2.5, -5.0, 0.9, 0.0, 2.0, 0.05, backDeg, -1, mWoodDoor)
	// 隔墙门（关）
	s.box(-2.78, 0, -2.2, -2.72, 2.0, -1.3, mWoodDoor)
	s.box(2.72, 0, -1.8, 2.78, 2.0, -0.9, mWoodDoor)

	// ---- 堂屋陈设 ----
	// 供桌
	s.box(-0.8, 0.8, -4.85, 0.8, 0.86, -4.25, mDarkWood)
	for _, lx := range []float64{-0.75, 0.69} {
		for _, lz := range []float64{-4.82, -4.34} {
			s.box(lx, 0, lz, lx+0.06, 0.8, lz+0.06, mDarkWood)
		}
	}
	s.box(-0.82, 0.86, -4.87, 0.82, 0.875, -4.23, mWhite)
	s.box(-0.82, 0.45, -4.245, 0.82, 0.875, -4.23, mWhite)
	// 遗像 ×2
	for _, px := range []float64{-0.21, 0.21} {
		s.box(px-0.15, 0.9, -4.74, px+0.15, 1.3, -4.71, mBlack)
		s.box(px-0.11, 0.95, -4.711, px+0.11, 1.25, -4.705, mPhoto)
		s.box(px-0.15, 1.22, -4.705, px-0.08, 1.3, -4.7, mWhite)
		s.box(px+0.08, 1.22, -4.705, px+0.15, 1.3, -4.7, mWhite)
	}
	// 供品
	for _, fx := range []float64{-0.4, 0.0, 0.4} {
		s.cyl(1, fx, 0.875, -4.42, 0.1, 0.015, mWhite)
		s.sph(fx-0.03, 0.93, -4.42, 0.045, mFruit)
		s.sph(fx+0.04, 0.93, -4.40, 0.045, mApple)
		s.sph(fx, 0.99, -4.42, 0.04, mFruit)
	}
	// 白蜡烛
	candleH := 0.22
	if st.CandleShort {
		candleH = 0.14
	}
	for _, cx := range []float64{-0.64, 0.64} {
		s.cyl(1, cx, 0.875, -4.55, 0.05, 0.03, mIron)
		s.cyl(1, cx, 0.905, -4.55, 0.03, candleH, mWhite)
		if st.Fire > 0 {
			s.sph(cx, 0.905+candleH+0.025, -4.55, 0.018, emit(6, 3.5, 1.2))
		}
	}
	// 蒲团 ×2，火盆在中间靠前
	s.cyl(1, -0.45, 0, -3.0, 0.28, 0.12, mStraw)
	s.cyl(1, 0.45, 0, -3.0, 0.28, 0.12, mStraw)
	s.cyl(1, 0.0, 0, -3.5, 0.22, 0.2, mIron)
	switch st.Fire {
	case 2:
		s.cyl(1, 0.0, 0.2, -3.5, 0.19, 0.005, mAsh)
		s.cyl(1, 0.0, 0.2, -3.5, 0.12, 0.09, emit(3.0, 1.2, 0.3))
		s.sph(0.0, 0.3, -3.5, 0.07, emit(3.5, 1.6, 0.4))
	case 1:
		s.cyl(1, 0.0, 0.2, -3.5, 0.19, 0.005, mAsh)
		s.cyl(1, 0.0, 0.2, -3.5, 0.13, 0.012, emit(1.2, 0.3, 0.05))
	default:
		s.cyl(1, 0.0, 0.2, -3.5, 0.19, 0.012, mc(0.62, 0.61, 0.58))
	}
	s.box(-0.95, 0, -3.2, -0.75, 0.04, -3.05, mYellow)
	// 配件纸箱、机油桶（西北角）
	s.box(-2.6, 0, -4.85, -1.95, 0.45, -4.3, mCardboard)
	s.box(-2.55, 0.45, -4.82, -2.02, 0.85, -4.35, mCardboard)
	s.box(-1.9, 0, -4.85, -1.35, 0.4, -4.4, mCardboard)
	s.cyl(1, -2.38, 0, -3.85, 0.2, 0.62, mBlueDrum)
	s.cyl(1, -2.38, 0, -3.4, 0.2, 0.62, mRedDrum)
	// 西墙：挂历、工作服
	s.box(-2.625, 1.45, -3.15, -2.615, 2.0, -2.75, mWhite)
	s.box(-2.615, 1.88, -3.15, -2.605, 2.0, -2.75, mCertRed)
	s.box(-2.625, 1.15, -1.05, -2.6, 1.95, -0.5, mWorkwear)
	s.box(-2.625, 1.6, -1.25, -2.6, 1.95, -1.05, mWorkwear)
	s.box(-2.625, 1.6, -0.5, -2.6, 1.95, -0.3, mWorkwear)
	// 东侧：旧沙发 + 玻璃茶几（靠近后门）
	s.box(1.85, 0, -3.9, 2.6, 0.42, -2.0, mLeather)
	s.box(2.42, 0.42, -3.9, 2.6, 0.88, -2.0, mLeather)
	s.box(1.85, 0.42, -3.9, 2.6, 0.62, -3.74, mLeather)
	s.box(1.85, 0.42, -2.16, 2.6, 0.62, -2.0, mLeather)
	for _, lx := range []float64{1.06, 1.66} {
		for _, lz := range []float64{-3.59, -2.33} {
			s.box(lx-0.02, 0, lz-0.02, lx+0.02, 0.42, lz+0.02, mMetal)
		}
	}
	// 茶几铁架（四边框）
	s.box(1.04, 0.38, -3.61, 1.68, 0.41, -3.57, mMetal)
	s.box(1.04, 0.38, -2.33, 1.68, 0.41, -2.29, mMetal)
	s.box(1.04, 0.38, -3.61, 1.08, 0.41, -2.29, mMetal)
	s.box(1.64, 0.38, -3.61, 1.68, 0.41, -2.29, mMetal)
	s.box(1.04, 0.1, -3.61, 1.68, 0.12, -2.29, mMetal)
	switch st.Table {
	case 0:
		s.box(1.03, 0.41, -3.62, 1.69, 0.43, -2.28, mGlass)
		s.sph(1.36, 0.5, -3.1, 0.075, mWhite)
		s.cyl(1, 1.24, 0.43, -2.72, 0.03, 0.08, mGlass)
		s.cyl(1, 1.44, 0.43, -2.62, 0.03, 0.08, mGlass)
		s.cyl(1, 1.5, 0.43, -2.85, 0.03, 0.08, mGlass)
	case 1:
		// 钢化玻璃碎成颗粒，散落一地；茶壶茶杯摔碎
		for i := 0; i < 420; i++ {
			r := math.Sqrt(hash2(i, 1)) * 1.15
			a := hash2(i, 2) * 2 * math.Pi
			x := 1.36 + r*math.Cos(a)*0.9
			z := -2.95 + r*math.Sin(a)
			if x > 1.82 && z < -2.0 && z > -3.9 {
				continue
			}
			sz := 0.012 + 0.022*hash2(i, 3)
			s.obox(x, 0.003, z, sz, 0.003, sz*0.8, hash2(i, 4)*180, mGlass)
		}
		for i := 0; i < 40; i++ {
			x := 1.08 + 0.56*hash2(i, 5)
			z := -3.58 + 1.26*hash2(i, 6)
			s.obox(x, 0.125, z, 0.015, 0.004, 0.012, hash2(i, 7)*180, mGlass)
		}
		for i := 0; i < 9; i++ {
			s.obox(1.2+0.5*hash2(i, 8), 0.02, -3.4+0.8*hash2(i, 9), 0.03+0.02*hash2(i, 10), 0.02, 0.025, hash2(i, 11)*180, mWhite)
		}
	case 2:
		// 碎玻璃已扫拢到后门旁墙角，靠着一把旧扫帚
		for i := 0; i < 90; i++ {
			r := math.Sqrt(hash2(i, 12)) * 0.16
			a := hash2(i, 13) * 2 * math.Pi
			sz := 0.012 + 0.02*hash2(i, 14)
			s.obox(1.25+r*math.Cos(a), 0.003+0.02*hash2(i, 15)*(1-r/0.16), -4.62+r*math.Sin(a)*0.8, sz, 0.004, sz*0.8, hash2(i, 16)*180, mGlass)
		}
		s.box(1.47, 0, -4.86, 1.5, 1.2, -4.83, mWood)
		s.box(1.38, 0, -4.86, 1.6, 0.28, -4.78, mStraw)
	}
	// 吊扇（静止）
	s.cyl(1, 0, 2.62, -2.4, 0.015, 0.38, mMetal)
	s.cyl(1, 0, 2.5, -2.4, 0.12, 0.12, mWhite)
	for i := 0; i < 3; i++ {
		al := float64(i) * 2 * math.Pi / 3
		s.add(&Box{C: V{0.42 * math.Cos(al), 2.53, -2.4 + 0.42*math.Sin(al)}, H: V{0.32, 0.006, 0.06}, c: math.Cos(-al), s: math.Sin(-al), rot: true, m: mWhite})
	}

	// ---- 陆宇卧室（西屋）----
	// 书桌
	s.box(-5.3, 0.74, -4.875, -4.2, 0.78, -4.42, mWood)
	s.box(-5.3, 0, -4.875, -5.25, 0.74, -4.45, mWood)
	s.box(-4.25, 0, -4.875, -4.2, 0.74, -4.45, mWood)
	s.box(-5.25, 0.58, -4.43, -4.72, 0.735, -4.41, mDarkWood)
	s.sph(-4.985, 0.655, -4.405, 0.015, mSteel)
	// 椅子（木头硬椅）
	if st.ChairMoved {
		s.chair(-4.55, -3.3, 28)
	} else {
		s.chair(-4.775, -3.925, 0)
	}
	// 台灯（灯罩不挡光，用朝下的光照模拟）
	mShade := &Mat{Albedo: mLampGreen.Albedo, NoShadow: true}
	s.cyl(1, -5.05, 0.78, -4.68, 0.08, 0.03, mLampGreen)
	s.box(-5.06, 0.8, -4.69, -5.04, 1.12, -4.67, mShade)
	s.cyl(1, -5.05, 1.08, -4.62, 0.11, 0.14, mShade)
	if st.LampOn {
		s.sph(-5.05, 1.06, -4.62, 0.03, emit(8, 6, 3))
	}
	// 书
	s.box(-4.62, 0.78, -4.8, -4.3, 0.86, -4.55, mBook1)
	s.box(-4.6, 0.86, -4.78, -4.32, 0.9, -4.57, mBook2)
	s.box(-4.62, 0.9, -4.8, -4.34, 0.95, -4.56, mBook3)
	s.cyl(1, -4.35, 0.78, -4.5, 0.035, 0.11, mBook1)
	if st.BookOpen {
		s.box(-4.98, 0.78, -4.62, -4.66, 0.8, -4.44, mPaper)
		s.box(-4.83, 0.8, -4.62, -4.81, 0.801, -4.44, mBlack)
	} else {
		s.box(-4.85, 0.78, -4.6, -4.62, 0.83, -4.45, mBook2)
	}
	// 奖状墙（北墙内侧 z=-4.875）
	zc := -4.874
	mTape := mc(0.93, 0.9, 0.84)
	for row := 0; row < 6; row++ {
		for col := 0; col < 9; col++ {
			x0 := -6.5 + float64(col)*0.39 + 0.03*hash2(row, col)
			y0 := 0.86 + float64(row)*0.31 + 0.03*hash2(col, row)
			w := 0.33 + 0.05*hash2(row*3, col*5)
			hh := 0.24 + 0.03*hash2(row*7, col)
			if x0+w > -3.0 {
				continue
			}
			// leave room for the biggest one above the desk
			if x0+w > -5.2 && x0 < -4.3 && y0+hh > 1.85 && y0 < 2.48 {
				continue
			}
			if y0+hh > 2.78 {
				continue
			}
			if st.Certs == 1 {
				k := hash2(row*23+5, col*31+7)
				if k < 0.45 {
					continue // 整张被撕掉
				}
				if k < 0.8 {
					// 只剩撕裂的残片
					w *= 0.35 + 0.3*hash2(row, col*3)
					hh *= 0.4 + 0.3*hash2(row*5, col)
				}
			}
			cream := hash2(row*11, col*17) > 0.72
			if cream {
				s.box(x0-0.012, y0-0.012, zc, x0+w+0.012, y0+hh+0.012, zc+0.004, mCertRed)
				s.box(x0, y0, zc+0.004, x0+w, y0+hh, zc+0.007, mCertCream)
			} else {
				s.box(x0-0.012, y0-0.012, zc, x0+w+0.012, y0+hh+0.012, zc+0.004, mCertGold)
				s.box(x0, y0, zc+0.004, x0+w, y0+hh, zc+0.007, mCertRed)
			}
			if st.Certs == 2 {
				k := hash2(row*13+3, col*19+5)
				if k < 0.75 {
					tx := x0 + w*(0.25+0.5*hash2(row*3, col*7))
					s.box(tx-0.005, y0-0.01, zc+0.007, tx+0.005, y0+hh+0.01, zc+0.009, mTape)
				}
				if k > 0.4 {
					ty := y0 + hh*(0.25+0.5*hash2(row*7, col*3))
					s.box(x0-0.01, ty-0.005, zc+0.007, x0+w+0.01, ty+0.005, zc+0.009, mTape)
				}
			}
		}
	}
	// 最大最显眼的奖状（书桌正上方，约2米高）
	if st.Certs == 1 {
		s.box(-5.15, 1.9, zc, -4.78, 2.44, zc+0.005, mCertGold)
		s.box(-5.1, 1.94, zc+0.005, -4.8, 2.4, zc+0.009, mCertRed)
	} else {
		s.box(-5.15, 1.9, zc, -4.35, 2.44, zc+0.005, mCertGold)
		s.box(-5.1, 1.94, zc+0.005, -4.4, 2.4, zc+0.009, mCertRed)
		s.box(-4.95, 2.28, zc+0.009, -4.55, 2.33, zc+0.011, mCertGold)
		if st.Certs == 2 {
			s.box(-4.765, 1.88, zc+0.011, -4.755, 2.46, zc+0.013, mTape)
			s.box(-5.17, 2.13, zc+0.011, -4.33, 2.14, zc+0.013, mTape)
		}
	}
	// 地上撕碎的奖状纸屑
	if st.Scraps {
		for i := 0; i < 380; i++ {
			x := -5.55 + 2.2*hash2(i, 31)
			z := -4.35 + 1.95*hash2(i, 32)
			if x > -3.35 && z > -3.2 && z < -2.4 {
				continue
			}
			var m *Mat
			switch k := hash2(i, 33); {
			case k < 0.62:
				m = mCertRed
			case k < 0.82:
				m = mCertGold
			default:
				m = mCertCream
			}
			sz := 0.02 + 0.05*hash2(i, 34)
			s.obox(x, 0.002+0.004*hash2(i, 35), z, sz, 0.0015, sz*(0.5+0.6*hash2(i, 36)), hash2(i, 37)*180, m)
		}
	}
	// 通知书烧成的纸灰
	if st.Ash {
		mAshB := mc(0.05, 0.05, 0.05)
		for i := 0; i < 7; i++ {
			s.cyl(1, -4.15+0.16*(hash2(i, 41)-0.5), 0, -3.05+0.14*(hash2(i, 42)-0.5), 0.04+0.05*hash2(i, 43), 0.004+0.003*float64(i%2), mAshB)
		}
		s.obox(-4.02, 0.004, -3.0, 0.035, 0.002, 0.025, 30, mCertRed)
	}
	// 矮柜上的清水面条
	if st.Bowl {
		s.cyl(1, -3.1, 0.8, -2.8, 0.085, 0.065, mWhite)
		s.cyl(1, -3.1, 0.8, -2.8, 0.075, 0.062, mc(0.9, 0.85, 0.62))
		s.box(-3.16, 0.865, -2.9, -3.15, 0.875, -2.62, mWood)
		s.box(-3.13, 0.865, -2.9, -3.12, 0.875, -2.62, mWood)
	}
	// 单人床 + 凉席（西墙）
	s.box(-6.6, 0, -4.85, -5.7, 0.42, -2.85, mWood)
	s.box(-6.58, 0.42, -4.83, -5.72, 0.5, -2.87, mMatTex)
	s.box(-6.5, 0.5, -4.75, -5.8, 0.6, -4.4, mWhite)
	s.box(-6.6, 0, -4.875, -5.7, 0.9, -4.82, mWood)
	// 电风扇（床尾小凳上）
	s.box(-6.4, 0, -2.75, -6.05, 0.4, -2.4, mWood)
	s.cyl(1, -6.22, 0.4, -2.58, 0.1, 0.03, mFanBlue)
	s.cyl(1, -6.22, 0.43, -2.58, 0.02, 0.3, mFanBlue)
	s.cyl(0, -6.3, 0.85, -2.58, 0.19, 0.08, mFanBlue)
	// 窗帘（西墙窗，两侧半拉）
	s.box(-6.62, 1.0, -3.72, -6.58, 2.12, -3.28, mCurtain)
	s.box(-6.62, 1.0, -2.92, -6.58, 2.12, -2.48, mCurtain)
	s.box(-6.62, 2.12, -3.8, -6.57, 2.15, -2.4, mMetal)
	// 门边矮柜
	s.box(-3.32, 0, -3.15, -2.88, 0.8, -2.45, mWood)
	s.box(-3.33, 0.1, -3.1, -3.32, 0.7, -2.82, mDarkWood)
	s.box(-3.33, 0.1, -2.78, -3.32, 0.7, -2.5, mDarkWood)

	// ================= 侧车道 + 大卷帘门 =================
	s.box(6.875, 0, -0.2, 7.35, 4.6, 0.2, mBrick)
	s.box(11.65, 0, -0.2, 12.1, 4.6, 0.2, mBrick)
	s.box(6.875, 4.2, -0.2, 12.1, 4.7, 0.2, mBrick)
	if st.ShutterOpen {
		s.cyl(0, 7.35, 3.95, 0.0, 0.22, 4.3, mShutter)
	} else {
		s.box(7.35, 0, -0.05, 11.65, 4.2, 0.05, mShutter)
		s.box(9.2, 0.3, 0.05, 9.8, 0.36, 0.08, mMetal)
	}

	// ================= 院墙 / 院门 / 招牌 =================
	wh := 2.4
	s.box(-12.1, 0, 13.9, -2.45, wh, 14.1, mBrick)
	s.box(2.45, 0, 13.9, 12.1, wh, 14.1, mBrick)
	s.box(-12.15, wh, 13.85, -2.45, wh+0.1, 14.15, mCap)
	s.box(2.45, wh, 13.85, 12.15, wh+0.1, 14.15, mCap)
	s.box(-12.1, 0, -10, -11.9, wh, 13.9, mBrick)
	s.box(-12.15, wh, -10, -11.85, wh+0.1, 13.9, mCap)
	s.box(11.9, 0, 0.2, 12.1, wh, 13.9, mBrick)
	s.box(11.85, wh, 0.2, 12.15, wh+0.1, 13.9, mCap)
	s.box(11.9, 0, -7.9, 12.1, wh, -0.2, mBrick)
	s.box(-12.1, 0, -10.1, -4.1, wh, -9.9, mBrick)
	s.box(-12.1, 0, -5.4, -6.875, wh, -5.2, mBrick)
	// 门柱 + 招牌
	s.box(-2.45, 0, 13.8, -2.0, 3.6, 14.2, mBrick)
	s.box(2.0, 0, 13.8, 2.45, 3.6, 14.2, mBrick)
	s.box(-2.45, 2.75, 14.2, 2.45, 3.45, 14.3, mSignRed)
	s.box(-2.45, 2.75, 13.7, 2.45, 3.45, 13.8, mSignRed)
	// 院门：西扇向内开90°，东扇关
	s.box(-2.0, 0.05, 12.0, -1.94, 2.35, 14.0, mGateBlue)
	s.box(0.0, 0.05, 13.97, 2.0, 2.35, 14.03, mGateBlue)

	// ================= 大院陈设 =================
	s.poplar(-9.0, 4.0, 9.5, 1.25)
	s.tireStack(-6.8, 8.8, 5)
	s.tireStack(-6.0, 9.5, 4)
	s.tireStack(-7.5, 9.7, 3)
	s.cyl(0, -5.55, 0.4, 8.4, 0.4, 0.22, mTire)
	// 花圈 ×3（平房墙根）
	s.wreath(-3.4, 0.125)
	s.wreath(-6.1, 0.125)
	s.wreath(3.4, 0.125)
	// 红色带斗三轮摩托（车头朝南）
	s.box(4.95, 0.55, 4.6, 6.25, 0.6, 6.2, mTrikeRed)
	s.box(4.95, 0.6, 4.6, 5.0, 0.98, 6.2, mTrikeRed)
	s.box(6.2, 0.6, 4.6, 6.25, 0.98, 6.2, mTrikeRed)
	s.box(4.95, 0.6, 4.6, 6.25, 0.98, 4.65, mTrikeRed)
	s.box(4.95, 0.6, 6.15, 6.25, 0.98, 6.2, mTrikeRed)
	s.cyl(0, 4.8, 0.32, 5.2, 0.32, 0.15, mTire)
	s.cyl(0, 6.25, 0.32, 5.2, 0.32, 0.15, mTire)
	s.box(5.4, 0.35, 6.2, 5.8, 0.6, 7.0, mIron)
	s.box(5.45, 0.6, 6.2, 5.75, 0.82, 7.2, mTrikeRed)
	s.box(5.47, 0.82, 6.35, 5.73, 0.92, 6.85, mBlack)
	s.cyl(0, 5.52, 0.3, 7.45, 0.3, 0.16, mTire)
	s.box(5.57, 0.3, 7.4, 5.63, 1.12, 7.46, mMetal)
	s.box(5.15, 1.1, 7.3, 6.05, 1.14, 7.34, mMetal)
	s.sph(5.6, 1.0, 7.52, 0.08, mWhite)
	// 报废白色旧面包车（车头朝南）
	s.box(8.15, 0.32, 6.8, 9.85, 2.0, 11.0, mVanWhite)
	s.box(8.13, 1.2, 7.1, 8.16, 1.8, 10.0, mDarkGlass)
	s.box(9.84, 1.2, 7.1, 9.87, 1.8, 10.0, mDarkGlass)
	s.box(8.25, 1.2, 10.99, 9.75, 1.85, 11.02, mDarkGlass)
	for _, wz := range []float64{7.6, 10.2} {
		s.cyl(0, 8.0, 0.33, wz, 0.33, 0.15, mTire)
		s.cyl(0, 9.85, 0.33, wz, 0.33, 0.15, mTire)
	}
	s.box(8.3, 0.6, 9.0, 8.17, 0.9, 9.6, mRust)

	// ================= 院外：路边杨树、国道、货车 =================
	for _, tx := range []float64{-17, -10.5, 10.5, 17} {
		s.poplar(tx, 15.2, 11, 1.1)
	}
	for _, tx := range []float64{-18, -10, 10, 18} {
		s.poplar(tx, 25.5, 11, 1.1)
	}
	s.roadTruck(-5.0, 21.1)

	// ================= 后院 + 车间 =================
	wsH := 6.0
	s.wallX(-4.0, 12.0, -8.0, 0.2, wsH, mWorkWall, [][4]float64{{7.5, 11.5, 0, 4.6}})
	s.wallX(-4.0, 12.0, -24.0, 0.2, wsH, mWorkWall, nil)
	s.wallZ(-24.0, -8.0, -4.0, 0.2, wsH, mWorkWall, nil)
	s.wallZ(-24.0, -8.0, 12.0, 0.2, wsH, mWorkWall, nil)
	if !st.NoRoof {
		for _, seg := range [][2]float64{{-24.2, -20.4}, {-19.6, -16.4}, {-15.6, -12.4}, {-11.6, -7.8}} {
			s.box(-4.2, wsH, seg[0], 12.2, wsH+0.15, seg[1], mShopRoof)
		}
		for _, bz := range []float64{-22, -18, -14, -10} {
			s.box(-3.9, wsH-0.4, bz-0.1, 11.9, wsH, bz+0.1, mMetal)
		}
	}
	// 车间入口红砖门柱 + 卷起的卷帘门
	s.box(7.0, 0, -8.35, 7.5, 5.0, -7.65, mBrick)
	s.box(11.5, 0, -8.35, 12.0, 5.0, -7.65, mBrick)
	s.cyl(0, 7.5, 4.82, -8.0, 0.24, 4.0, mShutter)
	// 修理地沟
	s.box(8.85, -1.6, -19.6, 10.15, -1.5, -10.4, mCap)
	s.box(8.85, -1.5, -19.6, 8.95, 0, -10.4, mCap)
	s.box(10.05, -1.5, -19.6, 10.15, 0, -10.4, mCap)
	s.box(8.95, -1.5, -19.6, 10.05, 0, -19.5, mCap)
	s.box(8.95, -1.5, -10.5, 10.05, 0, -10.4, mCap)
	for i := 1; i <= 4; i++ {
		top := -float64(i) * 0.3
		s.box(8.95, -1.5, -10.5-0.3*float64(i), 10.05, top, -10.5-0.3*float64(i-1), mCap)
	}
	s.box(8.7, 0, -19.6, 8.85, 0.012, -10.4, mYellow)
	s.box(10.15, 0, -19.6, 10.3, 0.012, -10.4, mYellow)
	// 满身泥浆的平头重卡（车头朝北）
	s.box(8.25, 1.0, -19.4, 10.75, 3.2, -17.2, mTruckBlue)
	s.box(8.4, 2.1, -19.42, 10.6, 3.0, -19.4, mDarkGlass)
	s.box(8.4, 1.15, -19.43, 10.6, 1.8, -19.41, mMetal)
	s.box(8.2, 0.75, -19.55, 10.8, 1.1, -19.35, mMetal)
	s.box(8.35, 1.2, -19.45, 8.65, 1.4, -19.42, mWhite)
	s.box(10.35, 1.2, -19.45, 10.65, 1.4, -19.42, mWhite)
	s.box(8.24, 2.1, -19.2, 8.26, 2.9, -17.6, mDarkGlass)
	s.box(10.74, 2.1, -19.2, 10.76, 2.9, -17.6, mDarkGlass)
	s.box(8.25, 1.15, -17.0, 10.75, 4.0, -10.2, mCargo)
	s.box(8.7, 0.6, -19.3, 10.3, 1.15, -10.3, mMetal)
	for _, wz := range []float64{-18.3, -13.0, -11.6} {
		s.cyl(0, 7.92, 0.52, wz, 0.52, 0.36, mTire)
		s.cyl(0, 10.72, 0.52, wz, 0.52, 0.36, mTire)
	}
	// 东墙工具墙（含重型大扳手）
	s.box(11.86, 0.9, -22.8, 11.9, 2.7, -19.8, mPeg)
	for r := 0; r < 4; r++ {
		for c := 0; c < 12; c++ {
			z0 := -22.65 + float64(c)*0.24
			y0 := 1.0 + float64(r)*0.42
			l := 0.12 + 0.2*hash2(r*5, c*3)
			if r == 2 && c >= 4 && c <= 7 {
				continue
			}
			if hash2(r*9+1, c*7+2) > 0.5 {
				s.box(11.82, y0, z0, 11.86, y0+l, z0+0.03, mSteel)
				s.box(11.82, y0+l, z0-0.02, 11.86, y0+l+0.04, z0+0.05, mSteel)
			} else {
				s.cyl(0, 11.81, y0+0.1, z0+0.03, 0.035, 0.05, mSteel)
			}
		}
	}
	// 重型大扳手（约半条胳膊长，横挂）
	s.box(11.8, 1.86, -21.65, 11.86, 1.94, -21.0, mSteel)
	s.box(11.79, 1.8, -21.75, 11.86, 2.0, -21.62, mSteel)
	s.box(11.79, 1.82, -21.03, 11.86, 1.98, -20.93, mSteel)
	// 工具推车、气泵
	s.box(11.25, 0.15, -22.5, 11.8, 0.95, -21.7, mToolRed)
	s.cyl(0, 11.3, 0.07, -22.4, 0.07, 0.05, mBlack)
	s.cyl(0, 11.3, 0.07, -21.8, 0.07, 0.05, mBlack)
	s.cyl(2, 11.45, 0.45, -20.8, 0.3, 0.9, mToolRed)
	// 西侧：轮胎、机油桶、千斤顶、举升机、工作灯、工作台
	s.tireStack(4.8, -11.0, 5)
	s.tireStack(5.7, -11.3, 3)
	s.tireStack(4.9, -12.0, 4)
	s.cyl(1, 6.3, 0, -13.6, 0.3, 0.9, mBlueDrum)
	s.cyl(1, 5.6, 0, -13.9, 0.3, 0.9, mRedDrum)
	s.cyl(1, 6.0, 0, -14.6, 0.3, 0.9, mBlueDrum)
	s.box(7.2, 0, -15.2, 7.8, 0.25, -14.9, mToolRed)
	s.box(7.4, 0.25, -15.1, 7.6, 0.5, -15.0, mToolRed)
	s.box(6.6, 0, -16.6, 6.9, 0.05, -16.3, mMetal)
	s.box(6.73, 0.05, -16.47, 6.77, 1.7, -16.43, mMetal)
	s.box(6.6, 1.6, -16.55, 6.9, 1.85, -16.35, emit(4, 3.8, 3.2))
	s.box(1.0, 0, -18.4, 1.4, 3.8, -18.0, mLiftBlue)
	s.box(4.4, 0, -18.4, 4.8, 3.8, -18.0, mLiftBlue)
	s.box(1.0, 3.8, -18.4, 4.8, 4.0, -18.0, mLiftBlue)
	s.box(-3.9, 0.85, -20, -3.2, 0.9, -14, mWood)
	s.box(-3.9, 0, -20, -3.85, 0.85, -14, mWood)
	s.box(-3.3, 0, -20, -3.25, 0.85, -14, mWood)
	s.box(-3.6, 0.9, -17.2, -3.35, 1.05, -16.9, mIron)

	// 后院（堂屋后门外）：车间南外墙上的工具板、轮胎、机油桶
	s.box(1.6, 1.0, -7.92, 3.0, 2.0, -7.9, mPeg)
	for c := 0; c < 6; c++ {
		x0 := 1.7 + float64(c)*0.22
		s.box(x0, 1.15, -7.9, x0+0.03, 1.15+0.15+0.2*hash2(c, 7), -7.87, mSteel)
		s.cyl(2, x0+0.1, 1.75, -7.9, 0.04, 0.04, mSteel)
	}
	s.tireStack(0.9, -7.0, 4)
	s.cyl(1, 3.4, 0, -7.4, 0.3, 0.9, mBlueDrum)
	s.cyl(1, 4.0, 0, -7.3, 0.3, 0.9, mRedDrum)

	s.build()
	return s
}
