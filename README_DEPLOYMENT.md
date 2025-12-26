# Catalyst MVP - Deployment Guide

## 🏗️ Architecture Overview

This is a **monorepo** containing multiple interconnected applications:

### Backend (Express/TypeScript)
- **Port**: 8000
- **Stack**: Node.js, Express, Prisma, PostgreSQL
- **Features**: REST API, JWT auth, Cardano blockchain integration
- **Location**: `./backend`

### Frontend Applications (Next.js)
1. **SME Portal** (Port 3000)
   - Business dashboard for SMEs
   - Product management, orders, funding requests
   - Wallet integration & reputation tracking

2. **Investor Dashboard** (Port 3002)
   - P2P lending platform
   - View opportunities, make investments
   - Blockchain verification UI

3. **Marketplace** (Port 3005)
   - E-commerce storefront
   - Shopping cart, product browsing
   - Customer-facing interface

### Mobile App (React Native/Expo)
- **SME Mobile App**
- Location: `./sme-app`
- Platform: iOS/Android

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Git

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/catalyst-project.git
cd catalyst-project

# Install backend dependencies
cd backend
npm install
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb catalyst

# Set DATABASE_URL in backend/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/catalyst"

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database
npx prisma db seed
```

### 3. Environment Variables
Copy and configure:
```bash
cd backend
cp .env.cardano.example .env
# Edit .env with your actual values
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Random secret for JWT tokens
- `EMAIL_USER` / `EMAIL_PASS`: Gmail SMTP credentials
- `BLOCKFROST_API_KEY`: Get from https://blockfrost.io
- `ORACLE_WALLET_SEED_PHRASE`: 24-word Cardano wallet seed

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - SME Portal:**
```bash
cd sme-portal
npm install
npm run dev
```

**Terminal 3 - Investor Dashboard:**
```bash
cd investor-dashboard
npm install
npm run dev
```

**Terminal 4 - Marketplace:**
```bash
cd marketplace
npm install
npm run dev
```

### 5. Access Applications
- Backend API: http://localhost:8000
- SME Portal: http://localhost:3000
- Investor Dashboard: http://localhost:3002
- Marketplace: http://localhost:3005

---

## 📦 Production Deployment

### Backend + Database → Railway (Recommended)

**Why Railway:**
- PostgreSQL included
- Supports cron jobs (for oracle service)
- Easy environment variable management
- ~$10/month

**Steps:**
1. Create account at https://railway.app
2. Create new project → Deploy from GitHub
3. Add PostgreSQL database service
4. Set all environment variables from `.env`
5. Deploy backend service
6. Run migrations: `npx prisma migrate deploy`

### Frontend Apps → Vercel

**Why Vercel:**
- Perfect for Next.js
- Free tier available
- Automatic HTTPS & CDN
- GitHub integration

**Steps for Each App:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy SME Portal
cd sme-portal
vercel --prod

# Deploy Investor Dashboard
cd ../investor-dashboard
vercel --prod

# Deploy Marketplace
cd ../marketplace
vercel --prod
```

**Environment Variables (Vercel):**
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

---

## 🔐 Security Checklist

Before deploying:

- [ ] Change `JWT_SECRET` to strong random value
- [ ] Use production-grade `REPUTATION_ID_SECRET`
- [ ] Set strong database password
- [ ] Never commit `.env` files
- [ ] Keep `ORACLE_WALLET_SEED_PHRASE` secure
- [ ] Use mainnet Blockfrost API key for production
- [ ] Enable CORS only for your domains
- [ ] Set `CARDANO_NETWORK=Mainnet` when ready

---

## 📊 Database Migrations

### Create New Migration
```bash
cd backend
npx prisma migrate dev --name migration_description
```

### Deploy to Production
```bash
npx prisma migrate deploy
```

### Reset Database (Development Only)
```bash
npx prisma migrate reset
```

---

## 🔧 Troubleshooting

### "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database connection errors
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL is correct
# Ensure database exists
```

### Blockchain transaction failures
```bash
# Check Blockfrost API key is valid
# Verify oracle wallet has ADA balance
# Confirm network is "Preprod" or "Mainnet"
```

---

## 📚 API Documentation

Base URL: `http://localhost:8000/api`

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

### Reputation
- `GET /reputation/user/:userId` - Get reputation scores
- `POST /reputation/update` - Recalculate all scores
- `POST /reputation/submit-onchain` - Submit to blockchain
- `GET /reputation/verify/:reputationId` - Verify on-chain data
- `GET /reputation/verify-tx/:txHash` - Verify by transaction

### Funding Requests
- `POST /funding-requests` - Create request
- `GET /funding-requests` - List all (pending/partial)
- `POST /funding-requests/:id/invest` - Invest in opportunity

### Wallet
- `POST /cardano/connect` - Connect Cardano wallet
- `POST /cardano/verify` - Verify wallet ownership
- `GET /cardano/wallet/:userId` - Get wallet info

---

## 💰 Cost Estimation

### Development (Free)
- Local PostgreSQL: Free
- Blockfrost Testnet: Free
- Test ADA: Free from faucet

### Production (Monthly)
- **Backend (Railway)**: $5-15
- **Database (Railway)**: Included
- **Frontend (Vercel)**: Free (within limits)
- **Blockfrost Mainnet**: Pay-as-you-go (~$10)
- **Total**: ~$15-25/month

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'feat: Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

---

## 📞 Support

For issues or questions:
- Open GitHub issue
- Email: devbasrahtop@gmail.com

---

## 📝 License

Private/Proprietary - Not for public distribution
