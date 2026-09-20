# 🏎️ MARK-II RACING — VPS Game Creator

A 3D car racing game built with **Three.js** and **Vite**, featuring GTA 5 vehicle physics, procedural 3D tracks & cars, dynamic camera effects, and mobile touch support.

![Three.js](https://img.shields.io/badge/Three.js-0.170-black?logo=three.js)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)
![Render](https://img.shields.io/badge/Render-Static%20Site-46E3B7?logo=render)

---

## 🌟 Features

- **GTA 5 Style Physics**: Simulated 5-speed transmission, power-slide drifting with counter-steering, suspension squat/dive/roll, and guardrail deflection.
- **6 Unique Vehicles**: Rookie, Viper, Phantom, Thunderbolt, Shadow, and Inferno — each with custom proportions, steerable front wheels, and unique stats.
- **3 Themed Tracks**: City Streets 🏙️, Desert Canyon 🏜️, and Neon Nightway 🌃.
- **GTA 5 Dynamic Camera**: Speed-sensitive dynamic FOV (62°–78°), drift camera panning, and screen shake.
- **Audio & Visual Effects**: Multi-gear RPM engine audio, continuous tire screech, exhaust backfire flames, thick tire smoke, and guardrail scrape sparks.
- **Mobile Responsive**: On-screen touch controls with landscape detection.
- **1-Click Render Deployment**: Configured with `render.yaml` for instant zero-config static hosting.

---

## 🎮 Controls

| Action | Desktop | Mobile |
|:---|:---|:---|
| **Accelerate** | `W` or `↑` | `▲` (Gas button) |
| **Brake / Reverse** | `S` or `↓` | `B` (Brake button) |
| **Steer Left / Right** | `A` / `D` or `←` / `→` | `◀` / `▶` (Steering buttons) |
| **Handbrake (Drift)** | `Space` | `B` while turning |
| **Burnout / Donut** | `W` + `Space` + `A`/`D` | `▲` + `B` + `◀`/`▶` |

---

## 🚀 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run local dev server
npm run dev

# 3. Build for production
npm run build
```

---

## 🌐 Deploy to Render.com

### Option A: Using Blueprint (Automatic via `render.yaml`)
1. Push this repository to **GitHub** or **GitLab**.
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect your repository — Render will automatically read `render.yaml` and configure everything.
5. Click **Apply**!

### Option B: Manual Static Site Setup
1. Click **New +** → **Static Site**.
2. Connect your repository.
3. Configure settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Click **Create Static Site**.
