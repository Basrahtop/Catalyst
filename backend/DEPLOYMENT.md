# Catalyst Backend Deployment

## Railway Deployment (Recommended for Backend)

### Prerequisites
- Railway account (sign up at railway.app)
- PostgreSQL database
- Environment variables configured

### Quick Deploy

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Login**
```bash
railway login
```

3. **Initialize Project**
```bash
cd backend
railway init
```

4. **Add PostgreSQL**
```bash
railway add --database postgresql
```

5. **Set Environment Variables**
```bash
railway variables set JWT_SECRET="your-secure-secret-min-32-chars"
railway variables set BLOCKFROST_PROJECT_ID="your-blockfrost-id"
railway variables set BLOCKFROST_NETWORK="preprod"
railway variables set NODE_ENV="production"
```

6. **Deploy**
```bash
railway up
```

### Alternative: Render.com

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: catalyst-backend
   - **Root Directory**: backend
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`

5. Add Environment Variables:
   - `DATABASE_URL`: (PostgreSQL connection string)
   - `JWT_SECRET`: Your secret key
   - `BLOCKFROST_PROJECT_ID`: Your Blockfrost ID
   - `BLOCKFROST_NETWORK`: preprod or mainnet
   - `NODE_ENV`: production
   - `PORT`: 5000

6. Click "Create Web Service"

### Environment Variables Required

```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-very-secure-secret-key-minimum-32-characters
BLOCKFROST_PROJECT_ID=your-blockfrost-project-id
BLOCKFROST_NETWORK=preprod
COINGECKO_API_KEY=optional
EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
NODE_ENV=production
PORT=5000
```

### Database Setup

The backend needs PostgreSQL. Railway/Render provide managed databases:

**Railway:**
```bash
railway add --database postgresql
# Connection string automatically added to DATABASE_URL
```

**Render:**
- Create PostgreSQL database in Render dashboard
- Copy connection string
- Add to environment variables

### Post-Deployment

After deployment, run migrations:

**Railway:**
```bash
railway run npx prisma migrate deploy
```

**Render:**
Migrations run automatically in build command.

### Health Check

Visit `https://your-backend-url.railway.app/api/health` to verify deployment.

### Deployment URL

Backend will be deployed at:
```
https://catalyst-backend-production.up.railway.app
```

Use this URL as `NEXT_PUBLIC_API_URL` in frontend apps.
