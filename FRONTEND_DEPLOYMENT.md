# Frontend Deployment Guide

## Deploying to Vercel (Recommended)

All three Next.js frontends can be deployed to Vercel:
- Investor Dashboard
- SME Portal
- Marketplace

### Steps for Each Frontend

#### 1. Investor Dashboard

**Via Vercel Dashboard:**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Select your "Catalyst" repository
4. Configure:
   - **Project Name**: `catalyst-investor-dashboard`
   - **Framework**: Next.js (auto-detected)
   - **Root Directory**: `investor-dashboard`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://catalyst-backend.railway.app/api`)
   - `NEXT_PUBLIC_BLOCKFROST_PROJECT_ID`: Your Blockfrost project ID
6. Click "Deploy"

**Expected URL:**
```
https://catalyst-investor-dashboard.vercel.app
```

#### 2. SME Portal

**Via Vercel Dashboard:**
1. Click "Add New..." → "Project"
2. Select "Catalyst" repository again
3. Configure:
   - **Project Name**: `catalyst-sme-portal`
   - **Framework**: Next.js
   - **Root Directory**: `sme-portal`
   - **Build Command**: `npm run build`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your backend URL
5. Click "Deploy"

**Expected URL:**
```
https://catalyst-sme-portal.vercel.app
```

#### 3. Marketplace

**Via Vercel Dashboard:**
1. Click "Add New..." → "Project"
2. Select "Catalyst" repository again
3. Configure:
   - **Project Name**: `catalyst-marketplace`
   - **Framework**: Next.js
   - **Root Directory**: `marketplace`
   - **Build Command**: `npm run build`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your backend URL
5. Click "Deploy"

**Expected URL:**
```
https://catalyst-marketplace.vercel.app
```

## Deployment Checklist

Before deploying frontends, ensure:

- [ ] Backend is deployed and accessible
- [ ] Backend URL is known
- [ ] Blockfrost project ID ready
- [ ] All environment variables prepared

## Environment Variables

Create `.env.local.example` files for reference:

**investor-dashboard/.env.local:**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=preprodXXXXXXXXXXXX
```

**sme-portal/.env.local:**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

**marketplace/.env.local:**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

## Custom Domains (Optional)

After deployment, add custom domains in Vercel:

- Investor Dashboard: `invest.catalyst.com`
- SME Portal: `sme.catalyst.com`  
- Marketplace: `marketplace.catalyst.com`
- Documentation: `docs.catalyst.com`

## Deployment Summary

After all deployments, you'll have:

| Service | URL | Platform |
|---------|-----|----------|
| Backend API | `catalyst-backend.railway.app` | Railway |
| Investor Dashboard | `catalyst-investor-dashboard.vercel.app` | Vercel |
| SME Portal | `catalyst-sme-portal.vercel.app` | Vercel |
| Marketplace | `catalyst-marketplace.vercel.app` | Vercel |
| Documentation | `catalyst-docs.vercel.app` | Vercel |

## Quick Deploy All Frontends

For faster deployment, you can deploy all at once:

1. Go to Vercel dashboard
2. Import project 3 times (once per frontend)
3. Set different root directories for each
4. Add environment variables
5. Deploy

All frontends will auto-redeploy when you push to GitHub!
