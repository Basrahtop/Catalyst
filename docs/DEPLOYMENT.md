# Deployment Guide

## ✅ Pre-Deployment Checklist

All items completed:

- [x] All documentation pages created
- [x] Navigation configured (`meta.json`)
- [x] Production build successful (`npm run build`)
- [x] No 404 errors detected
- [x] Theme configured
- [x] README updated

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

**Why Vercel?**
- Built by Next.js creators
- Zero-configuration deployment
- Automatic HTTPS
- Global CDN
- Free for documentation sites

**Steps:**

1. **Push to GitHub**
```bash
cd C:\Users\Admin\Desktop\catalyst-project
git add docs/
git commit -m "docs: add complete documentation site"
git push origin main
```

2. **Deploy to Vercel**
- Visit [vercel.com](https://vercel.com/signup)
- Sign up with GitHub
- Click "Add New..." → "Project"
- Select your `catalyst-project` repository
- Framework Preset: **Next.js** (auto-detected)
- Root Directory: **docs**
- Build Command: `npm run build` (auto-filled)
- Output Directory: `.next` (auto-filled)
- Install Command: `npm install` (auto-filled)
- Click **"Deploy"**

3. **Done!**
Your documentation will be live at:
```
https://catalyst-project-docs.vercel.app
```

**Custom Domain (Optional):**
- Go to Project Settings → Domains
- Add your custom domain (e.g., `docs.catalyst.com`)
- Update DNS records as instructed
- SSL certificate auto-provisions

---

### Option 2: Netlify

**Steps:**

1. **Push to GitHub** (same as above)

2. **Deploy to Netlify**
- Visit [netlify.com](https://netlify.com)
- Sign up with GitHub
- Click "Add new site" → "Import an existing project"
- Choose GitHub provider
- Select `catalyst-project` repository
- Configure:
  - **Base directory**: `docs`
  - **Build command**: `npm run build`
  - **Publish directory**: `docs/.next`
- Click **"Deploy site"**

3. **Done!**
Live at: `https://your-site-name.netlify.app`

---

### Option 3: GitHub Pages

**Steps:**

1. **Add GitHub Pages deployment script**

Edit `docs/package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3006",
    "build": "next build",
    "start": "next start",
    "export": "next build && next export",
    "deploy": "npm run export && touch out/.nojekyll && gh-pages -d out -t true"
  }
}
```

2. **Install gh-pages**
```bash
cd docs
npm install --save-dev gh-pages
```

3. **Configure Next.js for static export**

Edit `docs/next.config.js`:
```javascript
import nextraPlugin from 'nextra'

const withNextra = nextraPlugin({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.js',
})

export default withNextra({
  output: 'export',
  images: {
    unoptimized: true
  },
  basePath: process.env.NODE_ENV === 'production' ? '/catalyst-project' : ''
})
```

4. **Deploy**
```bash
npm run deploy
```

5. **Enable GitHub Pages**
- Go to repository Settings → Pages
- Source: **gh-pages branch**
- Click **Save**

Live at: `https://yourusername.github.io/catalyst-project/`

---

## 🔒 Environment Variables

For production deployment, set these in your hosting platform:

**Not needed for static documentation** - our docs site has no backend dependencies!

All content is pre-rendered at build time.

---

## 📊 Post-Deployment

### Verify Deployment

1. Visit your live URL
2. Check all navigation links work
3. Test search functionality
4. Verify mobile responsiveness
5. Check page load speed

### Monitor Performance

- Vercel provides automatic analytics
- Netlify has built-in analytics
- Use Google Analytics for detailed tracking

### Continuous Deployment

Both Vercel and Netlify auto-deploy on git push:

```bash
# Make documentation updates
cd docs/pages
# Edit .mdx files

# Commit and push
git add .
git commit -m "docs: update investor guide"
git push

# Automatically deploys in 30-60 seconds!
```

---

## 🎯 Recommended: Vercel Deployment

**Fastest path to production:**

```bash
# 1. Ensure code is committed
git status

# 2. Push to GitHub
git push origin main

# 3. Deploy
- Visit vercel.com
- Import project
- Click Deploy
- Done in 2 minutes!
```

**Live URL**: `https://catalyst-project-docs.vercel.app`

---

## 📝 Notes

- **Build time**: ~30 seconds
- **Deployment time**: ~60 seconds
- **Global CDN**: Included automatically
- **HTTPS**: Free and automatic
- **Cost**: $0 for documentation sites

---

## 🆘 Troubleshooting

**Build fails:**
```bash
cd docs
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Pages show 404:**
- Check `meta.json` navigation config
- Verify file names match exactly
- Rebuild: `npm run build`

**Styling broken:**
- Clear browser cache
- Check `theme.config.js` syntax
- Verify Nextra version compatibility

---

## ✅ Ready to Deploy!

All prerequisites are met. Choose your deployment platform and go live! 🚀
