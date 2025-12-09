# Fix Summary: Authentication Error (403/401)

## Problem
Users were receiving:
- **403 Forbidden** on `/api/companies` with message "Access token required"
- **401 Unauthorized** on `/api/user-settings`

## Root Cause
JWT_SECRET environment variable had **inconsistent fallback values** across different backend files:
- `auth.js` used fallback: `'your-very-secret-key'`
- `authenticateToken.js` used fallback: `'your-secret-key'`  ← **MISMATCH!**
- `user-settings.js` used fallback: `'your-secret-key'`  ← **MISMATCH!**
- `logger.js` used fallback: `'your-secret-key'`  ← **MISMATCH!**

When tokens were signed with one secret and verified with a different secret, JWT verification failed.

## Changes Made

### 1. ✓ Fixed `backend/routes/user-settings.js`
**Before:**
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
```
**After:**
```javascript
// JWT Secret - must match auth.js and authenticateToken.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key';
...
const decoded = jwt.verify(token, JWT_SECRET);
```

### 2. ✓ Fixed `backend/middleware/authenticateToken.js`
**Before:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
```
**After:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key';
```

### 3. ✓ Enhanced `backend/routes/auth.js`
**Before:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key';
```
**After:**
```javascript
// JWT Secret - CRITICAL: Must be set in .env.local or Vercel environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key';

// Warn if using default secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your-very-secret-key') {
  console.warn('⚠️ WARNING: JWT_SECRET is using default value in production! This is a security risk. Set JWT_SECRET environment variable.');
}
```

### 4. ✓ Fixed `backend/logger.js`
**Before:**
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
```
**After:**
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-very-secret-key');
```

## Result
Now all backend files consistently use the same JWT_SECRET fallback value, ensuring:
- Tokens signed in `auth.js` can be verified in `authenticateToken.js`
- User settings can be authenticated properly
- Logging can decode JWT tokens correctly

## Deployment Instructions

### For Local Testing:
1. Backend already has `JWT_SECRET=your-very-secret-key` in `.env`
2. Just restart the backend: `npm run start:desktop` or `npm run dev-server`

### For Vercel Production:
1. Generate a strong secret:
   ```bash
   openssl rand -base64 32
   ```
   Example output: `aBc+DeFgHijKlMnOpQrStUvWxYzAbCdEfGhIjKlMn+O=`

2. Add to Vercel Environment Variables:
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Settings → Environment Variables
   - Add new: `JWT_SECRET = <your-generated-secret>`
   - Apply to: Production, Preview, Development

3. Redeploy:
   ```bash
   vercel --prod
   ```

4. Verify in Vercel logs that the warning about default secret is gone

## Testing Verification
After deployment, verify the fix:

```bash
# 1. Test login (should return token)
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 2. Use token to access protected endpoint
curl -X GET https://your-app.vercel.app/api/companies \
  -H "Authorization: Bearer <token-from-step-1>"

# Should return company list (200) instead of 403
```

## Files Changed
- `backend/routes/user-settings.js` - Line 5-18
- `backend/middleware/authenticateToken.js` - Line 2
- `backend/routes/auth.js` - Line 9-14
- `backend/logger.js` - Line 80

## Security Notes
- ✓ All files now use consistent JWT_SECRET
- ⚠️ Default value should NEVER be used in production
- ⚠️ JWT_SECRET should be kept secret and not committed to git
- ⚠️ Use a strong, random secret in production (minimum 32 characters)
