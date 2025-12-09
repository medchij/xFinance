# Authentication Error Troubleshooting Guide

## Error: 403 Forbidden - "Access token required" on `/api/companies`

### Causes:
1. **JWT_SECRET Mismatch** - The secret used to sign the token doesn't match the secret used to verify it
2. **Missing Environment Variable** - JWT_SECRET not set in production (Vercel)
3. **Inconsistent Fallback Values** - Different files using different default secrets

### Solution:

#### Step 1: Check Local Environment
```bash
# In backend/.env or root/.env.local, ensure:
JWT_SECRET=your-very-secret-key
```

#### Step 2: Verify All Backend Files Use Same Secret
Files that should use JWT_SECRET:
- ✓ `backend/routes/auth.js` - line 10
- ✓ `backend/middleware/authenticateToken.js` - line 2
- ✓ `backend/routes/user-settings.js` - line 7
- ✓ `backend/logger.js` - line 80

All should use: `process.env.JWT_SECRET || 'your-very-secret-key'`

#### Step 3: Set JWT_SECRET in Vercel (if deploying to production)
1. Go to: https://vercel.com/dashboard → Project → Settings → Environment Variables
2. Add:
   - **Name**: `JWT_SECRET`
   - **Value**: Your secret (must match what you use locally for testing)
   - **Environments**: Production, Preview, Development
3. Redeploy: `vercel --prod`

#### Step 4: Test Login Flow
1. Login with credentials
2. Check browser DevTools → Application → LocalStorage → `authToken`
3. Token should be present after successful login
4. API calls should include `Authorization: Bearer <token>` header

## Error: 401 Unauthorized on `/api/user-settings`

### Causes:
Same as 403 error above - JWT token is invalid or not being sent.

### Check:
1. Is localStorage storing the token? (DevTools → Application → LocalStorage)
2. Is the token being sent in API headers? (DevTools → Network → Headers)
3. Is JWT_SECRET consistent across all files?

## Quick Debug Checklist:
- [ ] JWT_SECRET set in `.env` or `.env.local`
- [ ] JWT_SECRET set in Vercel environment variables (for production)
- [ ] All backend files use `'your-very-secret-key'` as fallback
- [ ] Token is stored in localStorage after login
- [ ] Token is sent in Authorization header for API calls
- [ ] Frontend has refreshed after backend changes
- [ ] Backend has been redeployed after environment changes

## Files Modified to Fix This Issue:
- ✓ `backend/routes/user-settings.js` - Fixed JWT_SECRET fallback
- ✓ `backend/middleware/authenticateToken.js` - Fixed JWT_SECRET fallback
- ✓ `backend/routes/auth.js` - Added warning for production
- ✓ `backend/logger.js` - Fixed JWT_SECRET fallback
- ✓ Created `ENVIRONMENT_VARIABLES.md` - Configuration guide

## Next Steps:
1. Commit these changes to git
2. Redeploy to Vercel with JWT_SECRET environment variable set
3. Test login and API calls
4. Monitor backend logs for JWT verification errors
