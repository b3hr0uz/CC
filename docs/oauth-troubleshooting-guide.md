# Google OAuth Troubleshooting Guide for ContextCleanse

## 🚨 **Quick Fix for Common OAuth Error**

If you're seeing: `http://localhost:3000/?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fdashboard&error=OAuthSignin`

### **Immediate Steps:**

1. **Run the OAuth diagnostic script:**
   ```bash
   ./scripts/fix-google-oauth.sh
   ```

2. **Restart the development server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   # Or with Docker
   docker-compose down && docker-compose up --build
   ```

3. **Clear browser cache and cookies** for `localhost:3000`

---

## 🔍 **Common Causes & Solutions**

### **1. Missing Environment Variables**

**Problem:** NextAuth can't find OAuth credentials

**Solution:** Ensure these variables are set in `.env`:
```bash
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### **2. Google Cloud Console Configuration**

**Problem:** Redirect URI mismatch

**Solution:** In [Google Cloud Console](https://console.cloud.google.com/):

1. Go to **APIs & Services > Credentials**
2. Select your OAuth 2.0 Client ID
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/callback/google`

### **3. Environment Variable Loading Issues**

**Problem:** Variables not loaded in development

**Solutions:**
- Ensure `.env` file is in the project root
- Restart your development server
- Check for typos in variable names
- Verify no extra spaces around `=` signs

### **4. Docker Environment Issues**

**Problem:** Environment variables not passed to container

**Solution:** Check `docker-compose.yml` includes all OAuth variables:
```yaml
environment:
  - NEXTAUTH_URL=http://localhost:3000
  - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
  - AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID}
  - AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET}
```

---

## 🛠️ **Step-by-Step Debugging**

### **Step 1: Verify Environment Setup**

```bash
# Check if environment variables are loaded
grep -E "AUTH_GOOGLE|NEXTAUTH" .env

# Should show:
# AUTH_GOOGLE_ID=...
# AUTH_GOOGLE_SECRET=...
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=...
```

### **Step 2: Test NextAuth Endpoint**

```bash
# Test if NextAuth is responding
curl http://localhost:3000/api/auth/providers

# Should return JSON with Google provider
```

### **Step 3: Check Browser Network Tab**

1. Open Developer Tools (F12)
2. Go to Network tab
3. Try to sign in with Google
4. Look for failed requests to `/api/auth/*`

### **Step 4: Enable NextAuth Debug Mode**

In `frontend/lib/auth.ts`, debug mode is enabled for development:
```typescript
export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  // ... rest of config
}
```

Check server console for detailed NextAuth logs.

---

## 🔐 **Google Cloud Console Setup Guide**

### **1. Create OAuth 2.0 Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client IDs**
5. Choose **Web application**

### **2. Configure OAuth Client**

**Application type:** Web application

**Name:** ContextCleanse Development

**Authorized JavaScript origins:**
- `http://localhost:3000`
- `https://yourdomain.com` (for production)

**Authorized redirect URIs:**
- `http://localhost:3000/api/auth/callback/google`
- `https://yourdomain.com/api/auth/callback/google` (for production)

### **3. Enable Required APIs**

Enable these APIs in the Google Cloud Console:
- Google+ API (for basic profile)
- Gmail API (for email access) 
- People API (for profile information)

---

## 🧪 **Testing OAuth Flow**

### **Manual Test Steps:**

1. **Start the application:**
   ```bash
   npm run dev
   # or
   docker-compose up
   ```

2. **Access the login page:**
   - Go to `http://localhost:3000`
   - You should see the Google sign-in button

3. **Test the OAuth flow:**
   - Click "Continue with Google"
   - Should redirect to Google's OAuth consent screen
   - After consent, should redirect back to `/dashboard`

4. **Check for errors:**
   - If redirected to `/?error=OAuthSignin`, check server logs
   - Look for specific error messages in browser console

---

## 🚨 **Common Error Messages**

### **Error: `OAuthSignin`**
**Cause:** OAuth provider configuration issue
**Fix:** Check Google Cloud Console settings and environment variables

### **Error: `OAuthCallback`**
**Cause:** Callback URL mismatch or OAuth flow interruption
**Fix:** Verify redirect URIs in Google Cloud Console

### **Error: `AccessDenied`**
**Cause:** User denied OAuth consent or app not verified
**Fix:** Check OAuth consent screen configuration

### **Error: `Configuration`**
**Cause:** Missing NextAuth configuration
**Fix:** Verify `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are set

---

## 🔧 **Development vs Production**

### **Development (localhost:3000)**
```bash
NEXTAUTH_URL=http://localhost:3000
# Google OAuth origins: http://localhost:3000
# Redirect URI: http://localhost:3000/api/auth/callback/google
```

### **Production (your domain)**
```bash
NEXTAUTH_URL=https://yourdomain.com
# Google OAuth origins: https://yourdomain.com
# Redirect URI: https://yourdomain.com/api/auth/callback/google
```

---

## 📝 **Checklist for OAuth Setup**

- [ ] Google Cloud project created
- [ ] OAuth 2.0 credentials configured
- [ ] Authorized JavaScript origins set correctly
- [ ] Authorized redirect URIs set correctly
- [ ] Required APIs enabled (Gmail, People, Google+)
- [ ] Environment variables set in `.env`
- [ ] NextAuth configuration updated
- [ ] Development server restarted
- [ ] Browser cache cleared

---

## 🆘 **Still Having Issues?**

### **1. Check Server Logs**
Look for NextAuth debug output in your server console

### **2. Verify OAuth Scopes**
Ensure requested scopes are enabled in Google Cloud Console

### **3. Test with Mock Data**
Use the mock data login to verify the rest of the app works

### **4. Check Network Connectivity**
Ensure your server can reach Google's OAuth endpoints

### **5. Browser Issues**
- Try incognito/private browsing mode
- Clear all cookies for localhost:3000
- Try a different browser

---

## 🛡️ **Security Considerations**

- **Never commit real OAuth secrets** to version control
- **Use environment variables** for all sensitive data
- **Set up different OAuth clients** for development and production
- **Regularly rotate OAuth secrets** in production
- **Enable OAuth consent screen verification** for public apps

---

## 📚 **Useful Resources**

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)

---

**Need more help?** Check the ContextCleanse documentation or run the diagnostic script: `./scripts/fix-google-oauth.sh`