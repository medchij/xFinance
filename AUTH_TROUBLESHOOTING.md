# Нэвтрэх Эрхийн Алдаа Засварлах Гарын Авлага

## Алдаа: 403 Forbidden - "Access token required" `/api/companies` дээр

### Шалтгаанууд:
1. **JWT_SECRET таарахгүй байна** - Токен үүсгэхэд ашигласан нууц түлхүүр, шалгахад ашиглаж байгаатай таарахгүй байна
2. **Орчны хувьсагч байхгүй** - JWT_SECRET production орчинд (Vercel) тохируулаагүй байна
3. **Өөр өөр нөөц утгууд** - Файлууд өөр өөр default secret ашиглаж байна

### Шийдэл:

#### Алхам 1: Локал орчныг шалгах
```bash
# backend/.env эсвэл root/.env.local файлд:
JWT_SECRET=your-very-secret-key
```

#### Алхам 2: Backend файлууд ижил secret ашиглаж байгааг баталгаажуулах
JWT_SECRET ашиглах ёстой файлууд:
- ✓ `backend/routes/auth.js` - мөр 10
- ✓ `backend/middleware/authenticateToken.js` - мөр 2
- ✓ `backend/routes/user-settings.js` - мөр 7
- ✓ `backend/logger.js` - мөр 80

Бүгд: `process.env.JWT_SECRET || 'your-very-secret-key'` ашиглах ёстой

#### Алхам 3: Vercel дээр JWT_SECRET тохируулах (production руу deploy хийвэл)
1. Очих: https://vercel.com/dashboard → Project → Settings → Environment Variables
2. Нэмэх:
   - **Нэр**: `JWT_SECRET`
   - **Утга**: Таны нууц түлхүүр (локал дээрх утгатай ижил байх ёстой)
   - **Орчнууд**: Production, Preview, Development
3. Дахин deploy хийх: `vercel --prod`

#### Алхам 4: Нэвтрэх процессыг турших
1. Нэвтрэх эрхээр нэвтрэх
2. Хөтөч DevTools → Application → LocalStorage → `authToken` шалгах
3. Амжилттай нэвтэрсний дараа токен байх ёстой
4. API дуудлага `Authorization: Bearer <token>` header агуулсан байх ёстой

## Алдаа: 401 Unauthorized `/api/user-settings` дээр

### Шалтгаанууд:
Дээрх 403 алдаатай адил - JWT токен буруу эсвэл илгээгдээгүй байна.

### Шалгах:
1. localStorage токен хадгалсан уу? (DevTools → Application → LocalStorage)
2. Токен API headers дээр илгээгдсэн үү? (DevTools → Network → Headers)
3. JWT_SECRET бүх файлд нэгэн адил байгаа юу?

## Хурдан Алдаа Шалгах Жагсаалт:
- [ ] JWT_SECRET `.env` эсвэл `.env.local` дээр тохируулсан
- [ ] JWT_SECRET Vercel орчны хувьсагчид тохируулсан (production-д)
- [ ] Бүх backend файлууд `'your-very-secret-key'` fallback ашиглаж байгаа
- [ ] Токен нэвтрэсний дараа localStorage-д хадгалагдсан
- [ ] Токен Authorization header дээр API дуудлагад илгээгдсэн
- [ ] Backend өөрчлөлтийн дараа frontend refresh хийгдсэн
- [ ] Орчны өөрчлөлтийн дараа backend дахин deploy хийгдсэн

## Энэ асуудлыг засахын тулд өөрчилсөн файлууд:
- ✓ `backend/routes/user-settings.js` - JWT_SECRET fallback засварласан
- ✓ `backend/middleware/authenticateToken.js` - JWT_SECRET fallback засварласан
- ✓ `backend/routes/auth.js` - Production-д анхааруулга нэмсэн
- ✓ `backend/logger.js` - JWT_SECRET fallback засварласан
- ✓ `ENVIRONMENT_VARIABLES.md` үүсгэсэн - Тохиргооны гарын авлага

## Дараагийн алхамууд:
1. Эдгээр өөрчлөлтүүдийг git руу commit хийх
2. JWT_SECRET орчны хувьсагчтай Vercel руу дахин deploy хийх
3. Нэвтрэх болон API дуудлагуудыг турших
4. Backend logs дээр JWT баталгаажуулалтын алдаануудыг хянах
