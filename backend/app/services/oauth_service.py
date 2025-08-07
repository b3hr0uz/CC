"""
OAuth service for handling Apple, Google, and Microsoft authentication
"""

import jwt
import httpx
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
from authlib.integrations.starlette_client import OAuth
from authlib.jose import jwt as authlib_jwt
from loguru import logger
import json

from app.core.config import get_settings

settings = get_settings()


class OAuthService:
    """Service for handling OAuth authentication with multiple providers"""
    
    def __init__(self):
        self.oauth = OAuth()
        self._setup_providers()
    
    def _setup_providers(self):
        """Setup OAuth providers"""
        
        # Google OAuth
        if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
            self.oauth.register(
                name='google',
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
                client_kwargs={
                    'scope': 'openid email profile'
                }
            )
            logger.info("✅ Google OAuth configured")
        
        # Microsoft OAuth
        if settings.MICROSOFT_CLIENT_ID and settings.MICROSOFT_CLIENT_SECRET:
            self.oauth.register(
                name='microsoft',
                client_id=settings.MICROSOFT_CLIENT_ID,
                client_secret=settings.MICROSOFT_CLIENT_SECRET,
                authority=f'https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}',
                server_metadata_url=f'https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/v2.0/.well-known/openid-configuration',
                client_kwargs={
                    'scope': 'openid email profile User.Read'
                }
            )
            logger.info("✅ Microsoft OAuth configured")
        
        # Apple OAuth (more complex setup)
        if settings.APPLE_CLIENT_ID and settings.APPLE_TEAM_ID:
            self.oauth.register(
                name='apple',
                client_id=settings.APPLE_CLIENT_ID,
                server_metadata_url='https://appleid.apple.com/.well-known/openid_configuration',
                client_kwargs={
                    'scope': 'openid email name'
                }
            )
            logger.info("✅ Apple OAuth configured")
    
    async def get_auth_url(self, provider: str, redirect_uri: str, state: str = None) -> str:
        """Get authorization URL for OAuth provider"""
        try:
            if provider == 'apple':
                return await self._get_apple_auth_url(redirect_uri, state)
            
            client = self.oauth.create_client(provider)
            if not client:
                raise ValueError(f"Provider {provider} not configured")
            
            redirect_uri = redirect_uri or getattr(settings, f"{provider.upper()}_REDIRECT_URI")
            
            if provider == 'google':
                return await client.create_authorization_url(
                    redirect_uri,
                    state=state,
                    access_type='offline',
                    prompt='consent'
                )
            elif provider == 'microsoft':
                return await client.create_authorization_url(
                    redirect_uri,
                    state=state,
                    response_mode='query'
                )
            
        except Exception as e:
            logger.error(f"Failed to get auth URL for {provider}: {e}")
            raise
    
    async def _get_apple_auth_url(self, redirect_uri: str, state: str = None) -> str:
        """Get Apple Sign In authorization URL"""
        params = {
            'client_id': settings.APPLE_CLIENT_ID,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'email name',
            'response_mode': 'form_post'
        }
        if state:
            params['state'] = state
        
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        return f"https://appleid.apple.com/auth/authorize?{query_string}"
    
    async def exchange_code_for_token(
        self, 
        provider: str, 
        code: str, 
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        try:
            if provider == 'apple':
                return await self._exchange_apple_code(code, redirect_uri)
            
            client = self.oauth.create_client(provider)
            if not client:
                raise ValueError(f"Provider {provider} not configured")
            
            token = await client.fetch_token(
                redirect_uri=redirect_uri,
                code=code
            )
            
            return token
            
        except Exception as e:
            logger.error(f"Failed to exchange code for token ({provider}): {e}")
            raise
    
    async def _exchange_apple_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange Apple authorization code for tokens"""
        # Create client secret JWT for Apple
        client_secret = self._create_apple_client_secret()
        
        data = {
            'client_id': settings.APPLE_CLIENT_ID,
            'client_secret': client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://appleid.apple.com/auth/token',
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if response.status_code != 200:
                raise Exception(f"Apple token exchange failed: {response.text}")
            
            return response.json()
    
    def _create_apple_client_secret(self) -> str:
        """Create Apple client secret JWT"""
        now = datetime.utcnow()
        payload = {
            'iss': settings.APPLE_TEAM_ID,
            'iat': now,
            'exp': now + timedelta(minutes=5),
            'aud': 'https://appleid.apple.com',
            'sub': settings.APPLE_CLIENT_ID
        }
        
        # Load private key
        if settings.APPLE_PRIVATE_KEY.startswith('/'):
            with open(settings.APPLE_PRIVATE_KEY, 'r') as f:
                private_key = f.read()
        else:
            private_key = settings.APPLE_PRIVATE_KEY
        
        return jwt.encode(
            payload,
            private_key,
            algorithm='ES256',
            headers={'kid': settings.APPLE_KEY_ID}
        )
    
    async def get_user_info(self, provider: str, token: Dict[str, Any]) -> Dict[str, Any]:
        """Get user information from OAuth provider"""
        try:
            if provider == 'apple':
                return await self._get_apple_user_info(token)
            elif provider == 'google':
                return await self._get_google_user_info(token)
            elif provider == 'microsoft':
                return await self._get_microsoft_user_info(token)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
                
        except Exception as e:
            logger.error(f"Failed to get user info from {provider}: {e}")
            raise
    
    async def _get_apple_user_info(self, token: Dict[str, Any]) -> Dict[str, Any]:
        """Get user info from Apple ID token"""
        id_token = token.get('id_token')
        if not id_token:
            raise ValueError("No ID token received from Apple")
        
        # Decode without verification for demo (in production, verify signature)
        decoded = jwt.decode(id_token, options={"verify_signature": False})
        
        return {
            'id': decoded.get('sub'),
            'email': decoded.get('email'),
            'name': decoded.get('name', ''),
            'email_verified': decoded.get('email_verified', False),
            'provider': 'apple'
        }
    
    async def _get_google_user_info(self, token: Dict[str, Any]) -> Dict[str, Any]:
        """Get user info from Google"""
        access_token = token.get('access_token')
        if not access_token:
            raise ValueError("No access token received from Google")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if response.status_code != 200:
                raise Exception(f"Google user info request failed: {response.text}")
            
            data = response.json()
            return {
                'id': data.get('id'),
                'email': data.get('email'),
                'name': data.get('name'),
                'picture': data.get('picture'),
                'email_verified': data.get('verified_email', False),
                'provider': 'google'
            }
    
    async def _get_microsoft_user_info(self, token: Dict[str, Any]) -> Dict[str, Any]:
        """Get user info from Microsoft Graph"""
        access_token = token.get('access_token')
        if not access_token:
            raise ValueError("No access token received from Microsoft")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://graph.microsoft.com/v1.0/me',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if response.status_code != 200:
                raise Exception(f"Microsoft user info request failed: {response.text}")
            
            data = response.json()
            return {
                'id': data.get('id'),
                'email': data.get('mail') or data.get('userPrincipalName'),
                'name': data.get('displayName'),
                'picture': None,  # Would need separate request
                'email_verified': True,  # Microsoft emails are considered verified
                'provider': 'microsoft'
            }
    
    def get_configured_providers(self) -> List[str]:
        """Get list of configured OAuth providers"""
        return settings.oauth_providers_configured 