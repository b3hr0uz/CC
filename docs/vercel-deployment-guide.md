# ContextCleanse Vercel Deployment Guide

## 🚀 **Quick Fix for Demo Mode Configuration Error**

The demo mode configuration error at https://contextcleanse.vercel.app/?error=Configuration is caused by missing NextAuth environment variables. Here's how to fix it:

## 🔧 **Required Environment Variables**

### **1. Set in Vercel Dashboard**

Go to your Vercel project dashboard → Settings → Environment Variables and add:

```bash
# NextAuth Configuration (REQUIRED)
NEXTAUTH_URL=https://contextcleanse.vercel.app
NEXTAUTH_SECRET=contextcleanse-secure-jwt-secret-production-2024

# Optional OAuth Providers (not required for demo mode)
AUTH_GOOGLE_ID=(leave empty for demo-only)
AUTH_GOOGLE_SECRET=(leave empty for demo-only)
AUTH_APPLE_ID=(leave empty for demo-only) 
AUTH_APPLE_SECRET=(leave empty for demo-only)
AUTH_AZURE_AD_ID=(leave empty for demo-only)
AUTH_AZURE_AD_SECRET=(leave empty for demo-only)
AUTH_AZURE_AD_TENANT_ID=(leave empty for demo-only)

# Backend Configuration (for full functionality)
NEXT_PUBLIC_API_URL=https://your-backend-url.com
INTERNAL_API_URL=https://your-backend-url.com
```

### **2. Demo Mode Credentials**

Demo mode uses these built-in credentials:
- **Username:** `demo`
- **Password:** `demo`

## 🛠️ **Deployment Steps**

### **1. Environment Variables Setup**

```bash
# In Vercel Dashboard:
NEXTAUTH_URL = https://contextcleanse.vercel.app
NEXTAUTH_SECRET = contextcleanse-secure-jwt-secret-production-2024
```

### **2. Redeploy**

After adding environment variables:
```bash
git push origin main  # Trigger automatic deployment
# OR
vercel --prod        # Manual deployment
```

### **3. Verify Demo Mode**

1. Visit https://contextcleanse.vercel.app
2. Click "Try with sample data (Demo)"
3. Enter credentials: `demo` / `demo`
4. Should redirect to dashboard with mock data

## 🔍 **Troubleshooting**

### **Configuration Error Persists**

If you still see `?error=Configuration`:

1. **Check Environment Variables:**
   - Ensure `NEXTAUTH_URL` matches your Vercel domain exactly
   - Ensure `NEXTAUTH_SECRET` is set (min 32 characters)

2. **Clear Browser Cache:**
   ```bash
   # Chrome DevTools → Application → Storage → Clear site data
   ```

3. **Check Vercel Logs:**
   ```bash
   vercel logs https://contextcleanse.vercel.app
   ```

### **Demo Mode Not Working**

If demo login fails:

1. **Verify Credentials:** Username `demo`, Password `demo`
2. **Check Console:** Open browser DevTools → Console for errors
3. **Try Incognito Mode:** Rule out browser caching issues

## 🎯 **Production OAuth Setup** (Optional)

For full OAuth functionality, configure these providers:

### **Google OAuth**
```bash
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

### **Apple OAuth** 
```bash
AUTH_APPLE_ID=your-apple-client-id
AUTH_APPLE_SECRET=your-apple-client-secret
```

### **Microsoft OAuth**
```bash
AUTH_AZURE_AD_ID=your-azure-client-id
AUTH_AZURE_AD_SECRET=your-azure-client-secret
AUTH_AZURE_AD_TENANT_ID=your-tenant-id
```

## 📊 **Verification Checklist**

- [ ] ✅ `NEXTAUTH_URL` set to `https://contextcleanse.vercel.app`
- [ ] ✅ `NEXTAUTH_SECRET` set (32+ characters)
- [ ] ✅ Environment variables saved in Vercel dashboard
- [ ] ✅ Project redeployed after env var changes
- [ ] ✅ Demo mode accessible with `demo`/`demo` credentials
- [ ] ✅ No `?error=Configuration` in URL
- [ ] ✅ Dashboard loads with mock data for demo users

## 🚨 **Security Notes**

1. **Never commit secrets to Git** - Use Vercel environment variables
2. **Use strong NEXTAUTH_SECRET** - Generate with: `openssl rand -base64 32`
3. **Enable HTTPS only** - Vercel handles this automatically
4. **Regular secret rotation** - Update NEXTAUTH_SECRET periodically

## 🎉 **Expected Result**

After following this guide:
- ✅ https://contextcleanse.vercel.app loads without configuration errors
- ✅ Demo mode works with `demo`/`demo` credentials  
- ✅ Dashboard shows mock data and full functionality
- ✅ All features work in demo mode (classification, training, feedback)

---

**Need Help?** Check the console logs in your browser or Vercel deployment logs for specific error messages.