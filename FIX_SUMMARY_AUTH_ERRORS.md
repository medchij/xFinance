# Засварын Хураангуй: Нэвтрэх Эрхийн Алдаа (403/401)

## Асуудал
Хэрэглэгчид дараах алдаануудыг хүлээн авч байсан:
- **403 Forbidden** `/api/companies` дээр "Access token required" мессежтэй
- **401 Unauthorized** `/api/user-settings` дээр

## Үндсэн шалтгаан
JWT_SECRET орчны хувьсагч өөр өөр backend файлуудад **нийцэхгүй нөөц утгууд** ашигласан:
- `auth.js` нөөц утга: `'your-very-secret-key'`
- `authenticateToken.js` нөөц утга: `'your-secret-key'`  ← **ТААРАХГҮЙ!**
- `user-settings.js` нөөц утга: `'your-secret-key'`  ← **ТААРАХГҮЙ!**
- `logger.js` нөөц утга: `'your-secret-key'`  ← **ТААРАХГҮЙ!**

Токенууд нэг нууцаар үүсгэгдэж, өөр нууцаар шалгагдсан тул JWT баталгаажуулалт амжилтгүй болсон.

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

## Үр дүн
Одоо бүх backend файлууд ижил JWT_SECRET нөөц утга ашиглаж байгаа нь:
- `auth.js` дээр үүсгэсэн токенууд `authenticateToken.js` дээр шалгагдах боломжтой
- Хэрэглэгчийн тохиргоо зөв баталгаажих боломжтой
- Logging JWT токенуудыг зөв тайлж чадна

## Deploy хийх заавар

### Локал турших:
1. Backend `.env` файлд аль хэдийн `JWT_SECRET=your-very-secret-key` байгаа
2. Зүгээр л backend дахин эхлүүлнэ: `npm run start:desktop` эсвэл `npm run dev-server`

### Vercel Production-д:
1. Хүчтэй нууц үүсгэнэ:
   ```bash
   openssl rand -base64 32
   ```
   Жишээ гаралт: `aBc+DeFgHijKlMnOpQrStUvWxYzAbCdEfGhIjKlMn+O=`

2. Vercel Орчны Хувьсагчид нэмнэ:
   - Очих: https://vercel.com/dashboard
   - Төслөө сонгох
   - Settings → Environment Variables
   - Шинэ нэмэх: `JWT_SECRET = <таны-үүсгэсэн-нууц>`
   - Хамааруулах: Production, Preview, Development

3. Дахин deploy хийх:
   ```bash
   vercel --prod
   ```

4. Vercel logs дээр анхдагч нууцын тухай анхааруулга алга болсныг шалгах

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
