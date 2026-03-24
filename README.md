# XTR — BALLISTICS
### Interactive Cinematic Advertisement

---

## 🗂️ Project Structure

```
xtr-ballistics/
├── index.html              ← Main page
├── css/
│   └── style.css           ← All styles (violet/tron theme)
├── js/
│   ├── loader.js           ← Rising blade-curve intro animation
│   ├── logo.js             ← X + TR sword slash reveal
│   ├── gif-hover.js        ← GIF freeze/play on hover
│   └── bg.js               ← Hero ambient + footer fx
├── assets/
│   ├── gifs/               ← Drop Blender GIF exports here
│   │   ├── product1.gif
│   │   ├── product2.gif
│   │   └── product3.gif
│   ├── images/
│   │   └── reel-poster.jpg ← Video fallback poster image
│   └── video/
│       ├── reel.mp4        ← Blender video export (primary)
│       └── reel.webm       ← Blender video export (fallback)
└── README.md
```

---

## 🚀 GitHub Pages Setup

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Under **Source**, select `main` branch and `/ (root)` folder
4. Hit **Save** — your site will be live at `https://yourusername.github.io/repo-name`

---

## 🎨 Adding Your Friend's Assets

### GIFs (Showcase Section)
- Export Blender renders as GIF
- Drop into `assets/gifs/`
- Name them `product1.gif`, `product2.gif`, `product3.gif`
- Or update the `src` and `data-gif` attributes in `index.html`

### Videos (Reel Section)
- Export Blender animation as `.mp4` (H.264) and optionally `.webm`
- Drop into `assets/video/`
- Files must be named `reel.mp4` / `reel.webm` — or update `index.html`
- For poster: export a single frame as `assets/images/reel-poster.jpg`

### Still Images (Products/Gallery)
- Drop `.png` or `.jpg` renders into `assets/images/`
- Reference them in `index.html` as needed

---

## 🛠️ Codespace Development

```bash
# Open terminal in Codespace
# Preview with Live Server (VS Code extension) or:
npx serve .
# → Open on port 3000 or 5000
```

---

## 🎨 Color Palette

| Name | Hex |
|------|-----|
| Background | `#000000` |
| Deep bg | `#05000a` |
| Primary violet | `#9D00FF` |
| Mid violet | `#BF5FFF` |
| Pale violet | `#E0AAFF` |
| Text white | `#F0F0F0` |

---

## 📝 Placeholder Text to Replace

- Section copy in `#about` cards
- GIF labels (`XTR — 01`, `XTR — 02`, `XTR — 03`)
- Tagline: `ENGINEERED FOR IMPACT`
- Footer copyright line