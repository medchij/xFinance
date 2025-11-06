const nodemailer = require('nodemailer');

// Email transporter тохируулах
const createTransporter = () => {
  // Gmail ашиглах бол:
  // 1. Gmail дээрээ 2-Factor Authentication асаах
  // 2. App Password үүсгэх: https://myaccount.google.com/apppasswords
  // 3. .env файлд EMAIL_USER болон EMAIL_PASS нэмэх
  
  return nodemailer.createTransport({
    service: 'gmail', // эсвэл бусад service: 'outlook', 'yahoo' гэх мэт
    auth: {
      user: process.env.EMAIL_USER, // Жишээ: 'yourapp@gmail.com'
      pass: process.env.EMAIL_PASS, // App Password
    },
  });
};

/**
 * Нууц үг сэргээх имэйл илгээх
 * @param {string} to - Хүлээн авагчийн имэйл
 * @param {string} resetToken - Reset токен
 * @param {string} userName - Хэрэглэгчийн нэр
 */
const sendPasswordResetEmail = async (to, resetToken, userName) => {
  // Frontend URL - .env файлаас авна, эсвэл default
  const resetUrl = `${process.env.FRONTEND_URL || 'https://localhost:3000/XFinance.html'}?token=${resetToken}`;
  
  console.log('📧 Password Reset Email (DEVELOPMENT MODE):');
  console.log(`   To: ${to}`);
  console.log(`   User: ${userName}`);
  console.log(`   Reset URL: ${resetUrl}`);
  console.log(`   Token: ${resetToken}`);
  console.log('');
  console.log('   ⚠️ ХЭРЭГЛЭГЧИД: Excel дээр Add-in нээгдсэн байх ёстой!');
  console.log('   📋 Excel дээр хийх үйлдлүүд:');
  console.log('   1. Excel-г нээнэ');
  console.log('   2. xFinance Add-in-г нээнэ');
  console.log('   3. Нэвтрэх хуудас дээр "Нууц үг мартсан уу?" дарна');
  console.log('   4. Дараах токеныг ашиглана: ' + resetToken);
  console.log('');
  
  // Email тохиргоо хийгдсэн эсэхийг шалгах
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('   💡 .env файлд EMAIL_USER болон EMAIL_PASS нэмэх хэрэгтэй');
    // Test mode-д амжилттай гэж үзэх
    return { success: true, testMode: true, token: resetToken };
  }
  
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"xFinance Support" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Нууц үг сэргээх хүсэлт - xFinance',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0078d4;">Сайн байна уу, ${userName}!</h2>
          <p>Та нууц үгээ сэргээх хүсэлт илгээсэн байна.</p>
          
          <div style="background-color: #fff4ce; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #d13438;">⚠️ Анхаар:</h3>
            <p style="margin: 0;">Энэ линк нь зөвхөн <strong>Excel дээр xFinance Add-in нээгдсэн</strong> үед л ажиллана!</p>
          </div>

          <h3>Нууц үг сэргээх алхмууд:</h3>
          <ol style="line-height: 1.8;">
            <li>Excel-г нээнэ үү</li>
            <li>xFinance Add-in-г нээнэ үү</li>
            <li>Доорх товч дээр дарна уу:</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #0078d4; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Нууц үг сэргээх
            </a>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>Хэрэв линк ажиллахгүй бол:</strong><br>
              Excel дээр xFinance Add-in нээж, "Нууц үг мартсан уу?" дээр дарж, 
              доорх токеныг оруулна уу:
            </p>
            <p style="background-color: white; padding: 10px; border-radius: 3px; 
                      font-family: monospace; word-break: break-all; margin-top: 10px;">
              ${resetToken}
            </p>
          </div>
          
          <p style="color: #d13438; font-weight: bold; margin-top: 30px;">
            ⚠️ Энэ линк 1 цагийн дараа хүчингүй болно.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            Хэрэв та нууц үг сэргээх хүсэлт илгээгээгүй бол энэ имэйлийг үл хэрэгсээрэй. 
            Таны данс аюулгүй хэвээр байна.
          </p>
        </div>
      `,
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Имэйл илгээхэд алдаа гарлаа');
  }
};

module.exports = {
  sendPasswordResetEmail,
};
