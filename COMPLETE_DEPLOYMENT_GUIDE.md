# 🚀 Complete Deployment Guide - All Services

## Quick Overview

We'll deploy 5 services:
1. **Backend** (Node.js API) → Railway
2. **Investor Dashboard** (Next.js) → Vercel
3. **SME Portal** (Next.js) → Vercel
4. **Marketplace** (Next.js) → Vercel
5. **Documentation** (Next.js/Nextra) → Vercel

---

## Step 1: Deploy Backend to Render.com

### A. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Verify email

### B. Create PostgreSQL Database First

1. Click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: catalyst-db
   - **Database**: catalyst_production
   - **User**: catalyst
   - **Region**: Choose closest to you
   - **Plan**: Free (or paid for production)
3. Click **"Create Database"**
4. **Copy the Internal Database URL** (starts with `postgresql://`)
   - Save this, you'll need it next!

### C. Deploy Backend Service

1. Click **"New +"** → **"Web Service"**
2. Select **"Connect a repository"** → Choose **"Catalyst"**
3. Configure:
   - **Name**: `catalyst-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend` ← **IMPORTANT!**
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid)

4. Click **"Environment Variables"** → **"Add from .env"** and paste:
```
DATABASE_URL=your-internal-database-url-from-step-b
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
BLOCKFROST_PROJECT_ID=preprodXXXXXXXXXXXXXXXX
BLOCKFROST_NETWORK=preprod
NODE_ENV=production
PORT=5000
COINGECKO_API_KEY=your-api-key
EXCHANGE_RATE_API_KEY=your-exchange-rate-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

5. Click **"Create Web Service"**

**Wait 3-5 minutes for deployment...**

6. Once deployed, copy your backend URL:
```
https://catalyst-backend.onrender.com
```

**✅ Backend Deployed on Render.com!**

---

## Step 2: Deploy Investor Dashboard to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Find and select **"Catalyst"** repository
4. Click **"Import"**

5. Configure:
   - **Project Name**: `catalyst-investor-dashboard`
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: Click **"Edit"** → Select `investor-dashboard`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

6. Add **Environment Variables**:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=preprodXXXXXXXXXXXXX
```

7. Click **"Deploy"**

**Wait 1-2 minutes...**

**✅ Investor Dashboard Deployed!**
```
https://catalyst-investor-dashboard.vercel.app
```

---

## Step 3: Deploy SME Portal to Vercel

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. Select **"Catalyst"** repository again (yes, same repo!)
3. Click **"Import"**

4. Configure:
   - **Project Name**: `catalyst-sme-portal`
   - **Framework Preset**: Next.js
   - **Root Directory**: Select `sme-portal`
   - **Build Command**: `npm run build`

5. Add **Environment Variables**:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
```

6. Click **"Deploy"**

**✅ SME Portal Deployed!**
```
https://catalyst-sme-portal.vercel.app
```

---

## Step 4: Deploy Marketplace to Vercel

1. Click **"Add New..."** → **"Project"**
2. Select **"Catalyst"** repository again
3. Click **"Import"**

4. Configure:
   - **Project Name**: `catalyst-marketplace`
   - **Framework Preset**: Next.js
   - **Root Directory**: Select `marketplace`
   - **Build Command**: `npm run build`

5. Add **Environment Variables**:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
```

6. Click **"Deploy"**

**✅ Marketplace Deployed!**
```
https://catalyst-marketplace.vercel.app
```

---

## Step 5: Deploy Documentation to Vercel

1. Click **"Add New..."** → **"Project"**
2. Select **"Catalyst"** repository
3. Click **"Import"**

4. Configure:
   - **Project Name**: `catalyst-docs`
   - **Framework Preset**: Next.js
   - **Root Directory**: Select `docs`
   - **Build Command**: `npm run build`

5. **No environment variables needed**

6. Click **"Deploy"**

**✅ Documentation Deployed!**
```
https://catalyst-docs.vercel.app
```

---

## 📊 Deployment Summary

After completing all steps, you'll have:

| Service | Platform | URL | Status |
|---------|----------|-----|--------|
| Backend API | Railway | `catalyst-backend.up.railway.app` | 🟢 |
| Investor Dashboard | Vercel | `catalyst-investor-dashboard.vercel.app` | 🟢 |
| SME Portal | Vercel | `catalyst-sme-portal.vercel.app` | 🟢 |
| Marketplace | Vercel | `catalyst-marketplace.vercel.app` | 🟢 |
| Documentation | Vercel | `catalyst-docs.vercel.app` | 🟢 |

---

## 🔧 Post-Deployment Configuration

### Update CORS in Backend

After deploying frontends, update backend CORS settings:

1. Go to Railway dashboard → Your backend service
2. Add environment variable:
```
FRONTEND_URLS=https://catalyst-investor-dashboard.vercel.app,https://catalyst-sme-portal.vercel.app,https://catalyst-marketplace.vercel.app
```

3. Redeploy backend

### Test All Services

1. **Backend Health Check**:
   ```
   https://your-backend.railway.app/api/health
   ```
   Should return: `{"status":"ok"}`

2. **Frontend Tests**:
   - Open each frontend URL
   - Try registering a test account
   - Check console for API errors

---

## 🌐 Custom Domains (Optional)

To use custom domains:

### For Backend (Railway):
1. Settings → Networking → Custom Domain
2. Add: `api.catalyst.com`
3. Update DNS with provided CNAME

### For Frontends (Vercel):
1. Project Settings → Domains
2. Add domains:
   - `invest.catalyst.com` → Investor Dashboard
   - `sme.catalyst.com` → SME Portal
   - `marketplace.catalyst.com` → Marketplace
   - `docs.catalyst.com` → Documentation
3. Update DNS records as instructed
4. SSL certificates auto-provision

---

## 🔐 Environment Variables Checklist

### Backend (.env on Railway)
- [x] `DATABASE_URL` (auto-generated by Railway)
- [ ] `JWT_SECRET`
- [ ] `BLOCKFROST_PROJECT_ID`
- [ ] `BLOCKFROST_NETWORK`
- [ ] `NODE_ENV=production`
- [ ] `COINGECKO_API_KEY`
- [ ] `EXCHANGE_RATE_API_KEY`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`

### Investor Dashboard (Vercel)
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_BLOCKFROST_PROJECT_ID`

### SME Portal (Vercel)
- [ ] `NEXT_PUBLIC_API_URL`

### Marketplace (Vercel)
- [ ] `NEXT_PUBLIC_API_URL`

### Documentation (Vercel)
- No environment variables needed ✅

---

## 🚨 Troubleshooting

### Backend won't start
- Check Railway logs for errors
- Verify DATABASE_URL is set
- Ensure migrations ran successfully
- Check `npm run build` completes

### Frontend shows API errors
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check backend is running (visit health endpoint)
- Verify CORS settings in backend
- Check browser console for detailed errors

### Database connection failed
- Verify DATABASE_URL format
- Check database is running
- Ensure migrations were applied
- Check Railway PostgreSQL logs

---

## ⏱️ Deployment Time Estimate

- Backend (Railway): 3-5 minutes
- Each Frontend (Vercel): 1-2 minutes each
- Total: ~10-15 minutes for all 5 services

---

## 🎉 Next Steps

After deployment:

1. **Update README** with live URLs
2. **Test all features** across deployed apps
3. **Set up monitoring** (Railway + Vercel provide built-in)
4. **Configure custom domains** (optional)
5. **Set up CI/CD** (auto-deploys on git push - already configured!)

---

## 📞 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Catalyst Issues**: GitHub Issues tab

---

**Ready to Deploy?** Start with Step 1 (Backend) and work your way through! Each service builds on the previous one.
