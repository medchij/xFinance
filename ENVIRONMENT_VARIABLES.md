# Environment Variables Configuration

## Critical: JWT_SECRET

The `JWT_SECRET` environment variable is **CRITICAL** for authentication to work. This secret is used to:
- Sign JWT tokens during login (`/api/auth/login`)
- Verify JWT tokens on API requests

### Issues:

If `JWT_SECRET` is not consistent across all files or not set in production:
- ✗ 403 Forbidden error on `/api/companies` 
- ✗ 401 Unauthorized error on `/api/user-settings`
- ✗ Users cannot log in or access API endpoints

### Solution:

#### For Local Development:
1. Ensure `.env.local` exists in the project root with:
   ```
   JWT_SECRET=your-very-secret-key
   ```
2. The backend will load this from `backend/.env` or the root `.env.local`

#### For Vercel Production:
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add a new variable:
   - **Name**: `JWT_SECRET`
   - **Value**: Generate a strong secret (at least 32 characters)
     - Example: `openssl rand -base64 32`
   - **Environments**: Select all (Production, Preview, Development)
3. Redeploy your application for the changes to take effect

#### Security Recommendations:
- **DO NOT** commit the JWT_SECRET to GitHub
- Use a strong, random secret in production (minimum 32 characters)
- Never use the default value `'your-very-secret-key'` in production
- Rotate JWT_SECRET if compromised
- Keep JWT_SECRET secret and never share it

### Files That Use JWT_SECRET:
- `backend/routes/auth.js` - Signs tokens
- `backend/middleware/authenticateToken.js` - Verifies tokens
- `backend/routes/user-settings.js` - Verifies tokens

All three files MUST use the same JWT_SECRET value.

## Other Environment Variables

### Database:
- `DATABASE_URL` - PostgreSQL connection string (already configured in `.env`)

### Email Service:
- `EMAIL_USER` - Gmail or email service username
- `EMAIL_PASS` - Email service password or app-specific password
- `FRONTEND_URL` - Frontend URL for password reset links

### Frontend (if needed):
- `NEXT_PUBLIC_*` - Variables prefixed with `NEXT_PUBLIC_` are exposed to browser

## Testing:
To verify JWT_SECRET is working:
1. Login with valid credentials → Should receive a token
2. Copy the token and test an API call with Authorization header
3. If 403 or 401 errors appear, JWT_SECRET mismatch or not set
