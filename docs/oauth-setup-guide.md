# Google OAuth Setup Guide for ContextCleanse

## Create New OAuth 2.0 Credentials

### Step 1: Create New Project (Optional)
1. Go to: https://console.cloud.google.com/
2. Click project selector at top
3. Click "NEW PROJECT" 
4. Name: "ContextCleanse-OAuth"
5. Click "CREATE"

### Step 2: Enable Gmail API
1. Go to: APIs & Services > Library
2. Search: "Gmail API"
3. Click "Gmail API"
4. Click "ENABLE"

### Step 3: Configure OAuth Consent Screen
1. Go to: APIs & Services > OAuth consent screen
2. Choose "External" user type
3. Click "CREATE"
4. Fill required fields:
   - App name: "ContextCleanse"
   - User support email: behianoa@gmail.com
   - Developer contact: behianoa@gmail.com
5. Click "SAVE AND CONTINUE"
6. Skip Scopes section (click "SAVE AND CONTINUE")
7. Add Test Users:
   - Click "ADD USERS"
   - Enter: behianoa@gmail.com
   - Click "ADD"
8. Click "SAVE AND CONTINUE"

### Step 4: Create OAuth 2.0 Client ID
1. Go to: APIs & Services > Credentials
2. Click "CREATE CREDENTIALS"
3. Select "OAuth 2.0 Client IDs"
4. Application type: "Web application"
5. Name: "ContextCleanse Web Client"
6. Authorized redirect URIs:
   - http://localhost:3000/api/auth/callback/google
   - http://localhost:3001/api/auth/callback/google
   - http://localhost:3002/api/auth/callback/google
   - http://localhost:3004/api/auth/callback/google
7. Click "CREATE"
8. Copy Client ID and Client Secret

### Step 5: Update Environment Variables
Replace in frontend/.env.local:
```
AUTH_GOOGLE_ID=your-new-client-id
AUTH_GOOGLE_SECRET=your-new-client-secret
```

### Step 6: Test
1. Restart your development server
2. Go to http://localhost:3000/login
3. Try Google Sign-In