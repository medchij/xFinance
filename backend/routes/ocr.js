const express = require('express');
const router = express.Router();
const Tesseract = require('tesseract.js');
const multer = require('multer');
const translate = require('translate-google');

// Multer configuration for handling file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Зөвхөн зураг файл оруулна уу'), false);
    }
  }
});

/**
 * POST /api/ocr/extract
 * Extract text from uploaded image using Tesseract OCR
 */
router.post('/extract', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Зураг файл оруулна уу' 
      });
    }

    const imageBuffer = req.file.buffer;
    const language = req.body.language || 'eng'; // Default to English

    console.log(`OCR processing started for file: ${req.file.originalname}, language: ${language}`);

    // Perform OCR using Tesseract
    const { data: { text, confidence } } = await Tesseract.recognize(
      imageBuffer,
      language,
      {
        logger: (m) => {
          // Log progress
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    console.log('OCR completed successfully');

    res.json({
      success: true,
      text: text.trim(),
      confidence: Math.round(confidence),
      fileName: req.file.originalname,
      fileSize: req.file.size,
      language: language
    });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({
      success: false,
      error: 'Текст задлах үед алдаа гарлаа',
      details: error.message
    });
  }
});

/**
 * GET /api/ocr/languages
 * Get list of supported languages
 */
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    languages: [
      { code: 'eng', name: 'English' },
      { code: 'mon', name: 'Mongolian' },
      { code: 'rus', name: 'Russian' },
      { code: 'chi_sim', name: 'Chinese Simplified' },
      { code: 'jpn', name: 'Japanese' },
      { code: 'kor', name: 'Korean' },
      { code: 'eng+mon', name: 'English + Mongolian' },
    ]
  });
});

/**
 * POST /api/ocr/translate
 * Translate text from one language to another
 */
router.post('/translate', express.json(), async (req, res) => {
  try {
    const { text, from, to } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Текст оруулна уу'
      });
    }

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Орчуулах хэл сонгоно уу'
      });
    }

    console.log(`Translation requested: from=${from || 'auto'} to=${to}, text length=${text.length}`);

    // translate-google API: Returns translated text string directly
    const translatedText = await translate(text, { 
      from: from || 'auto', 
      to: to 
    });

    console.log('Translation completed successfully');

    // Simple language detection based on character ranges
    let detectedLanguage = null;
    if (!from || from === 'auto') {
      if (/[\u0400-\u04FF]/.test(text)) {
        detectedLanguage = text.includes('ө') || text.includes('ү') ? 'mn' : 'ru';
      } else if (/[\u4E00-\u9FFF]/.test(text)) {
        detectedLanguage = 'zh-CN';
      } else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
        detectedLanguage = 'ja';
      } else if (/[\uAC00-\uD7AF]/.test(text)) {
        detectedLanguage = 'ko';
      } else {
        detectedLanguage = 'en';
      }
    }

    res.json({
      success: true,
      originalText: text,
      translatedText: translatedText,
      from: from || detectedLanguage,
      to: to,
      detectedLanguage: !from || from === 'auto' ? detectedLanguage : null
    });

  } catch (error) {
    console.error('Translation Error:', error);
    res.status(500).json({
      success: false,
      error: 'Орчуулга хийх үед алдаа гарлаа',
      details: error.message
    });
  }
});

/**
 * GET /api/ocr/translate-languages
 * Get list of supported translation languages
 */
router.get('/translate-languages', (req, res) => {
  res.json({
    success: true,
    languages: [
      { code: 'auto', name: 'Автоматаар тодорхойлох' },
      { code: 'en', name: 'English' },
      { code: 'mn', name: 'Монгол' },
      { code: 'ru', name: 'Русский' },
      { code: 'zh-CN', name: '中文 (简体)' },
      { code: 'zh-TW', name: '中文 (繁體)' },
      { code: 'ja', name: '日本語' },
      { code: 'ko', name: '한국어' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
      { code: 'es', name: 'Español' },
      { code: 'it', name: 'Italiano' },
      { code: 'pt', name: 'Português' },
      { code: 'ar', name: 'العربية' },
      { code: 'hi', name: 'हिन्दी' },
      { code: 'tr', name: 'Türkçe' },
      { code: 'vi', name: 'Tiếng Việt' },
      { code: 'th', name: 'ไทย' },
    ]
  });
});

module.exports = router;
