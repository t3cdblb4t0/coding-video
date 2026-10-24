package main

import (
	"flag"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func inside(p V) bool { return insideHouse(p) || insideWorkshop(p) }

var sunAfternoon = V{-0.61, 0.707, 0.35}.N()

func afternoonCfg(fill float64, st State) *Cfg {
	c := &Cfg{
		SunOn:     true,
		SunDir:    sunAfternoon,
		SunCol:    V{1.55, 1.45, 1.28},
		Sky:       V{0.3, 0.36, 0.46},
		SkyTop:    V{0.28, 0.46, 0.8},
		SkyHor:    V{0.72, 0.78, 0.85},
		Fill:      V{fill, fill * 0.96, fill * 0.9},
		FillDir:   V{0, 0.3, 1}.N(),
		Exposure:  0.95,
		AOSamples: 8,
		AODist:    0.9,
		Inside:    inside,
	}
	c.Lights = append(c.Lights, Light{P: V{6.75, 1.72, -16.2}, C: V{1.0, 0.95, 0.85}, R: 12})
	switch st.Fire {
	case 2:
		c.Lights = append(c.Lights, Light{P: V{0, 0.5, -3.5}, C: V{0.9, 0.42, 0.12}, R: 8})
	case 1:
		c.Lights = append(c.Lights, Light{P: V{0, 0.35, -3.5}, C: V{0.25, 0.08, 0.02}, R: 4})
	}
	if st.Fire > 0 {
		c.Lights = append(c.Lights,
			Light{P: V{-0.64, 1.17, -4.5}, C: V{0.22, 0.13, 0.05}, R: 6},
			Light{P: V{0.64, 1.17, -4.5}, C: V{0.22, 0.13, 0.05}, R: 6},
		)
	}
	return c
}

func morningCfg(State) *Cfg {
	az := 145.0 * math.Pi / 180
	el := 22.0 * math.Pi / 180
	return &Cfg{
		SunOn:     true,
		SunDir:    V{math.Sin(az) * math.Cos(el), math.Sin(el), -math.Cos(az) * math.Cos(el)}.N(),
		SunCol:    V{2.2, 1.7, 1.15},
		Sky:       V{0.28, 0.34, 0.46},
		SkyTop:    V{0.32, 0.46, 0.75},
		SkyHor:    V{0.85, 0.78, 0.68},
		Fill:      V{0.1, 0.105, 0.12},
		FillDir:   V{0, 0.3, 1}.N(),
		Exposure:  1.2,
		AOSamples: 8,
		AODist:    0.9,
		Inside:    inside,
	}
}

func nightCfg(State) *Cfg {
	return &Cfg{
		SunOn:     false,
		Sky:       V{0.012, 0.016, 0.03},
		SkyTop:    V{0.008, 0.012, 0.03},
		SkyHor:    V{0.015, 0.02, 0.04},
		Fill:      V{0.03, 0.035, 0.055},
		FillDir:   V{0, 0.2, 1}.N(),
		Exposure:  1.25,
		AOSamples: 8,
		AODist:    0.9,
		Inside:    inside,
		Lights:    []Light{{P: V{-5.05, 1.02, -4.58}, C: V{0.75, 0.52, 0.27}, R: 12, Down: 0.7}},
	}
}

func bedroomDayCfg(State) *Cfg {
	return &Cfg{
		SunOn:     true,
		SunDir:    sunAfternoon,
		SunCol:    V{1.55, 1.45, 1.28},
		Sky:       V{0.3, 0.36, 0.46},
		SkyTop:    V{0.28, 0.46, 0.8},
		SkyHor:    V{0.72, 0.78, 0.85},
		Fill:      V{0.24, 0.235, 0.22},
		FillDir:   V{-1, 0.3, 0}.N(),
		Exposure:  0.95,
		AOSamples: 8,
		AODist:    0.9,
		Inside:    inside,
	}
}

type Shot struct {
	File  string
	Cam   Cam
	State State
	Cfg   func(State) *Cfg
}

func shots() []Shot {
	// D1 下午标准状态：活动门扇全开、火盆燃烧、茶几完好、后门关、卷帘门关
	day := State{EastLeafDeg: 95, Fire: 2}
	d := func(fill float64) func(State) *Cfg { return func(s State) *Cfg { return afternoonCfg(fill, s) } }
	W, H := 1920, 1080

	camM3 := Cam{Pos: V{0.5, 1.6, 12.6}, Look: V{1.6, 1.8, 0}, VFov: 58, W: W, H: H}
	camM5 := Cam{Pos: V{-0.25, 1.55, -0.35}, Look: V{0, 1.05, -4.875}, VFov: 62, W: W, H: H}
	camM6 := Cam{Pos: V{-1.4, 1.5, -4.3}, Look: V{0.3, 0.3, 2.0}, VFov: 60, W: W, H: H}
	camM7 := Cam{Pos: V{-2.2, 1.55, -1.3}, Look: V{2.0, 0.95, -4.75}, VFov: 58, W: W, H: H}
	camM8 := Cam{Pos: V{-3.7, 1.45, -0.3}, Look: V{-4.95, 1.25, -4.875}, VFov: 62, W: W, H: H}

	bedNight := State{EastLeafDeg: 95, LampOn: true}
	torn := State{EastLeafDeg: 95, LampOn: true, Certs: 1, Scraps: true, Bowl: true, ChairMoved: true}
	tornAsh := torn
	tornAsh.Ash = true
	tornDay := tornAsh
	tornDay.LampOn = false
	taped := State{EastLeafDeg: 95, Certs: 2, BookOpen: true}

	return []Shot{
		{"P0_总平面俯视图", Cam{Pos: V{0, 80, -1.0}, Look: V{0, 0, -1.0001}, Ortho: true, OrthoW: 33.3, OrthoH: 50, W: 1200, H: 1800}, State{EastLeafDeg: 95, Fire: 2, NoRoof: true}, func(s State) *Cfg {
			c := afternoonCfg(0.3, s)
			c.SunDir = V{-0.25, 0.93, 0.27}.N()
			c.Inside = nil
			return c
		}},
		{"M1_汽修站鸟瞰全景", Cam{Pos: V{-12, 30, 36}, Look: V{1, 0, -5}, VFov: 45, W: W, H: H}, day, d(0.12)},
		{"M2_从国道看正门", Cam{Pos: V{0, 1.6, 25}, Look: V{0, 2.2, 0}, VFov: 48, W: W, H: H}, day, d(0.12)},
		{"M3_大院看向平房", camM3, day, d(0.12)},
		{"M4_堂屋门口看向院门", Cam{Pos: V{0.4, 1.55, 0.05}, Look: V{-0.3, 1.3, 14}, VFov: 58, W: W, H: H}, day, d(0.12)},
		{"M5_堂屋_看向供桌", camM5, day, d(0.12)},
		{"M6_堂屋_反打看向门口", camM6, day, d(0.12)},
		{"M7_堂屋_后门和茶几", camM7, State{EastLeafDeg: 95, Fire: 2, BackDoorOpen: true}, d(0.12)},
		{"M8_陆宇卧室_深夜", camM8, bedNight, nightCfg},
		{"M9_车间_主视角", Cam{Pos: V{6.5, 1.7, -23.4}, Look: V{11.5, 1.5, -15.0}, VFov: 60, W: W, H: H}, day, d(0.22)},
		{"M10_车间_门柱后视角", Cam{Pos: V{7.65, 1.55, -6.6}, Look: V{10.6, 1.35, -16.0}, VFov: 55, W: W, H: H}, day, d(0.22)},

		{"E1_大院_卷帘门打开", camM3, State{EastLeafDeg: 95, Fire: 1, ShutterOpen: true, BackDoorOpen: true, Table: 1}, d(0.12)},
		{"E2_堂屋_铁皮门半掩", camM6, State{EastLeafDeg: 30, Fire: 2}, d(0.09)},
		{"E3_堂屋_茶几砸碎", camM7, State{EastLeafDeg: 95, Fire: 1, BackDoorOpen: true, Table: 1}, d(0.12)},
		{"E4_堂屋_次日清晨", camM5, State{EastLeafDeg: 0, Fire: 0, CandleShort: true, Table: 2}, morningCfg},
		{"E5a_卧室_奖状撕碎", camM8, torn, nightCfg},
		{"E5b_卧室_通知书灰烬", camM8, tornAsh, nightCfg},
		{"E5c_卧室_次日白天未收拾", camM8, tornDay, bedroomDayCfg},
		{"E6_卧室_奖状拼贴复原", camM8, taped, bedroomDayCfg},
	}
}

func main() {
	scale := flag.Float64("scale", 1.0, "resolution scale")
	spp := flag.Int("spp", 9, "samples per pixel (square number)")
	only := flag.String("only", "", "comma-separated prefixes to render")
	out := flag.String("out", "output", "output dir")
	flag.Parse()
	os.MkdirAll(*out, 0o755)
	cache := map[State]*Scene{}
	for _, sh := range shots() {
		if *only != "" {
			ok := false
			for _, p := range strings.Split(*only, ",") {
				if strings.HasPrefix(sh.File, p+"_") {
					ok = true
				}
			}
			if !ok {
				continue
			}
		}
		sc, ok := cache[sh.State]
		if !ok {
			sc = buildScene(sh.State)
			cache[sh.State] = sc
		}
		cam := sh.Cam
		cam.W = int(float64(cam.W) * *scale)
		cam.H = int(float64(cam.H) * *scale)
		t0 := time.Now()
		path := filepath.Join(*out, sh.File+".png")
		if err := render(sc, cam, sh.Cfg(sh.State), *spp, path); err != nil {
			fmt.Println("error:", err)
			os.Exit(1)
		}
		fmt.Printf("%s  %dx%d  prims=%d  %.1fs\n", path, cam.W, cam.H, len(sc.prims), time.Since(t0).Seconds())
	}
}
