# Netlify Deployment Guide

## 🚀 Quick Deploy to Netlify

### Prerequisites
- GitHub account (to connect your repository)
- Netlify account (free tier available)
- Supabase project with your database

---

## Step-by-Step Deployment

### 1. Push to GitHub (if not already done)

```bash
git add .
git commit -m "Add Netlify configuration"
git push origin main
```

### 2. Deploy to Netlify

#### Option A: One-Click Deploy
1. Go to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and authorize
4. Select your repository: `OKSANA_INTERFACE`
5. Netlify will auto-detect the `netlify.toml` settings

#### Option B: Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

### 3. Configure Environment Variables

**In Netlify Dashboard:**

1. Go to **Site Settings** → **Environment Variables**
2. Click **"Add a variable"** and add:

| Key | Value | Source |
|-----|-------|--------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` (long key) | Supabase Dashboard → Settings → API → `anon` `public` |

**⚠️ IMPORTANT:** Use the **`anon/public`** key, NOT the `service_role` key!

### 4. Trigger Redeploy

After adding environment variables:
1. Go to **Deploys** tab
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**

---

## Build Configuration

The `netlify.toml` file is already configured with:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  environment = { NODE_VERSION = "18" }
```

### What it does:
- ✅ Runs `npm run build` to compile the Vite app
- ✅ Publishes the `dist` folder as your site
- ✅ Uses Node.js 18 (compatible with Vite)
- ✅ Handles SPA routing (redirects to `index.html`)
- ✅ Sets security headers
- ✅ Caches static assets for performance

---

## Custom Domain (Optional)

### To add your own domain:

1. Go to **Domain Settings**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `farm.yourdomain.com`)
4. Follow DNS configuration instructions

Netlify provides:
- ✅ Free SSL certificates (HTTPS)
- ✅ Automatic renewals
- ✅ DNS management

---

## Environment Variables Reference

### Required Variables

```bash
# Supabase Project URL
VITE_SUPABASE_URL=https://olxnahsxvyiadknybagt.supabase.co

# Supabase Anonymous/Public Key (safe to expose in frontend)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Where to find these:

**Supabase Dashboard:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys** → `anon` `public` → `VITE_SUPABASE_ANON_KEY`

---

## Deployment Previews

Netlify automatically creates **deploy previews** for:
- 🔀 Pull requests
- 🌿 Branch deployments

Each preview gets:
- Unique URL (e.g., `deploy-preview-123--your-site.netlify.app`)
- Same environment variables as production
- Full functionality for testing

---

## Continuous Deployment

Once set up, deployments are **automatic**:

1. Push to `main` branch → **Production deployment**
2. Push to other branches → **Branch preview**
3. Open pull request → **PR preview**

### Build Status

Check build status at:
- Netlify Dashboard → **Deploys** tab
- GitHub commit status checks

---

## Local Development

### Run locally with Netlify Dev:

```bash
# Install dependencies
npm install

# Start Netlify dev server (simulates Netlify environment)
netlify dev
```

This will:
- Use environment variables from Netlify
- Serve on `http://localhost:8888`
- Hot reload on changes

### Or use Vite directly:

```bash
# Create .env.local file (not committed to git)
echo "VITE_SUPABASE_URL=your-url" > .env.local
echo "VITE_SUPABASE_ANON_KEY=your-key" >> .env.local

# Start dev server
npm run dev
```

---

## Troubleshooting

### Build fails with "Command failed"
- ✅ Check **Build log** in Netlify dashboard
- ✅ Ensure `package.json` scripts are correct
- ✅ Verify Node version compatibility

### Site loads but shows errors
- ✅ Check environment variables are set correctly
- ✅ Verify Supabase URL and key are valid
- ✅ Check browser console for errors

### 404 on page refresh
- ✅ Ensure `netlify.toml` has the redirect rule (already configured)

### Supabase connection fails
- ✅ Verify RLS policies allow `anon` access
- ✅ Check CORS settings in Supabase
- ✅ Ensure database is not paused

---

## Performance Optimization

The `netlify.toml` is pre-configured with:

### ✅ Asset Caching
Static assets (JS, CSS, images) cached for 1 year:
```toml
Cache-Control = "public, max-age=31536000, immutable"
```

### ✅ Security Headers
- X-Frame-Options: Prevents clickjacking
- X-XSS-Protection: Blocks XSS attacks
- X-Content-Type-Options: Prevents MIME sniffing

### ✅ SPA Routing
All routes redirect to `index.html` for client-side routing

---

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Site loads without errors
- [ ] Login/authentication works
- [ ] Database queries work
- [ ] All modules accessible
- [ ] File uploads work (if applicable)
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active (should be automatic)

---

## Support & Documentation

- 📚 [Netlify Docs](https://docs.netlify.com)
- 🗄️ [Supabase Docs](https://supabase.com/docs)
- ⚡ [Vite Docs](https://vitejs.dev)

---

## Production URLs

After deployment, your app will be available at:
- **Netlify subdomain:** `https://your-site-name.netlify.app`
- **Custom domain:** `https://yourdomain.com` (if configured)

**Your app is now live! 🎉**
