import React, { useState, useRef } from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Button,
  Card,
  Text,
  Spinner,
  Input,
  Select,
  Textarea,
} from '@fluentui/react-components';
import {
  Image24Regular,
  DocumentText24Regular,
  Dismiss24Regular,
  Copy24Regular,
  ArrowUpload24Regular,
} from '@fluentui/react-icons';
import { useAppContext } from './AppContext';
import { BASE_URL } from '../../config';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    ...shorthands.padding('20px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.gap('20px'),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('16px', '20px'),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    borderTopLeftRadius: tokens.borderRadiusLarge,
    borderTopRightRadius: tokens.borderRadiusLarge,
  },
  title: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('20px'),
    flex: 1,
    overflowY: 'auto',
  },
  uploadSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('20px'),
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    ...shorthands.border('2px', 'dashed', tokens.colorNeutralStroke1),
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('40px'),
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
    cursor: 'pointer',
    ...shorthands.border('2px', 'dashed', tokens.colorBrandStroke1),
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground3,
      ...shorthands.border('2px', 'dashed', tokens.colorBrandStroke2),
    },
  },
  uploadAreaActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('2px', 'solid', tokens.colorBrandStroke2),
  },
  imagePreview: {
    maxWidth: '100%',
    maxHeight: '400px',
    objectFit: 'contain',
    borderRadius: tokens.borderRadiusLarge,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
  },
  resultSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('20px'),
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultText: {
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    whiteSpace: 'pre-wrap',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase300,
    lineHeight: '1.6',
    minHeight: '200px',
  },
  controls: {
    display: 'flex',
    ...shorthands.gap('12px'),
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statsBar: {
    display: 'flex',
    ...shorthands.gap('16px'),
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
  },
  statItem: {
    display: 'flex',
    ...shorthands.gap('6px'),
    alignItems: 'center',
  },
  spinner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.gap('12px'),
    ...shorthands.padding('40px'),
  },
});

const ChatPage = () => {
  const classes = useStyles();
  const { showMessage } = useAppContext();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState('eng');
  const [confidence, setConfidence] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Translation states
  const [translateText, setTranslateText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [fromLang, setFromLang] = useState('auto');
  const [toLang, setToLang] = useState('mn');

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('⚠️ Зөвхөн зураг файл оруулна уу', 'error');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showMessage('⚠️ Файлын хэмжээ 10MB-аас бага байх ёстой', 'error');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);

    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Clear previous results
    setExtractedText('');
    setConfidence(null);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleExtractText = async () => {
    if (!selectedFile) {
      showMessage('⚠️ Эхлээд зураг сонгоно уу', 'warning');
      return;
    }

    setIsProcessing(true);
    setExtractedText('');
    setConfidence(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('language', language);

      const response = await fetch(`${BASE_URL}/api/ocr/extract`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setExtractedText(data.text);
        setConfidence(data.confidence);
        showMessage('✅ Текст амжилттай задлагдлаа', 'success');
      } else {
        showMessage(`❌ ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      showMessage(`❌ Текст задлах үед алдаа гарлаа: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      showMessage('✅ Текст хуулагдлаа', 'success');
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setExtractedText('');
    setConfidence(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTranslate = async () => {
    if (!translateText.trim()) {
      showMessage('⚠️ Орчуулах текст оруулна уу', 'warning');
      return;
    }

    setIsTranslating(true);
    setTranslatedText('');

    try {
      const response = await fetch(`${BASE_URL}/api/ocr/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: translateText,
          from: fromLang,
          to: toLang,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setTranslatedText(data.translatedText);
        showMessage('✅ Орчуулга амжилттай', 'success');
      } else {
        showMessage(`❌ ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Translation Error:', error);
      showMessage(`❌ Орчуулга хийх үед алдаа гарлаа: ${error.message}`, 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyTranslation = () => {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
      showMessage('✅ Орчуулга хуулагдлаа', 'success');
    }
  };

  const handleUseOcrTextForTranslation = () => {
    if (extractedText) {
      setTranslateText(extractedText);
      showMessage('✅ OCR текст орчуулгад ашигласан', 'success');
    }
  };

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DocumentText24Regular />
          <Text className={classes.title}>OCR болон Орчуулга</Text>
        </div>
      </div>

      <div className={classes.content}>
        {/* Upload Section */}
        <Card className={classes.uploadSection}>
          <div className={classes.controls}>
            <Select
              value={language}
              onChange={(e, data) => setLanguage(data.value)}
              style={{ width: '200px' }}
            >
              <option value="eng">English</option>
              <option value="mon">Mongolian</option>
              <option value="rus">Russian</option>
              <option value="eng+mon">English + Mongolian</option>
            </Select>

            <Button
              appearance="primary"
              icon={<ArrowUpload24Regular />}
              onClick={() => fileInputRef.current?.click()}
            >
              Зураг сонгох
            </Button>

            {selectedFile && (
              <>
                <Button
                  appearance="primary"
                  icon={<DocumentText24Regular />}
                  onClick={handleExtractText}
                  disabled={isProcessing}
                >
                  Текст задлах
                </Button>
                <Button
                  appearance="subtle"
                  icon={<Dismiss24Regular />}
                  onClick={handleClear}
                  disabled={isProcessing}
                >
                  Цэвэрлэх
                </Button>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          <div
            className={`${classes.uploadArea} ${isDragging ? classes.uploadAreaActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className={classes.imagePreview} />
            ) : (
              <>
                <Image24Regular style={{ fontSize: '48px', color: tokens.colorBrandStroke1 }} />
                <Text size={400} weight="semibold">
                  Зураг чирж оруулах эсвэл дарж сонгох
                </Text>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  PNG, JPG, JPEG, GIF, WebP (Max 10MB)
                </Text>
              </>
            )}
          </div>

          {fileName && (
            <div className={classes.statsBar}>
              <div className={classes.statItem}>
                <Text weight="semibold">Файл:</Text>
                <Text>{fileName}</Text>
              </div>
            </div>
          )}
        </Card>

        {/* Processing Spinner */}
        {isProcessing && (
          <Card className={classes.spinner}>
            <Spinner size="large" />
            <Text size={400}>Текст задалж байна...</Text>
          </Card>
        )}

        {/* Result Section */}
        {extractedText && !isProcessing && (
          <Card className={classes.resultSection}>
            <div className={classes.resultHeader}>
              <Text size={500} weight="semibold">
                Задласан текст
              </Text>
              <Button
                appearance="subtle"
                icon={<Copy24Regular />}
                onClick={handleCopyText}
              >
                Хуулах
              </Button>
            </div>

            {confidence !== null && (
              <div className={classes.statsBar}>
                <div className={classes.statItem}>
                  <Text weight="semibold">Итгэлцэл:</Text>
                  <Text>{confidence}%</Text>
                </div>
                <div className={classes.statItem}>
                  <Text weight="semibold">Үг:</Text>
                  <Text>{extractedText.split(/\s+/).length}</Text>
                </div>
                <div className={classes.statItem}>
                  <Text weight="semibold">Тэмдэгт:</Text>
                  <Text>{extractedText.length}</Text>
                </div>
              </div>
            )}

            <Textarea
              value={extractedText}
              onChange={(e, data) => setExtractedText(data.value)}
              className={classes.resultText}
              resize="vertical"
              rows={12}
            />

            {extractedText && (
              <Button
                appearance="subtle"
                onClick={handleUseOcrTextForTranslation}
              >
                📋 Орчуулгад ашиглах
              </Button>
            )}
          </Card>
        )}

        {/* Translation Section */}
        <Card className={classes.uploadSection}>
          <Text size={500} weight="semibold" style={{ marginBottom: '12px' }}>
            🌐 Орчуулга
          </Text>

          <div className={classes.controls}>
            <Select
              value={fromLang}
              onChange={(e, data) => setFromLang(data.value)}
              style={{ width: '200px' }}
            >
              <option value="auto">Автоматаар тодорхойлох</option>
              <option value="en">English</option>
              <option value="mn">Монгол</option>
              <option value="ru">Русский</option>
              <option value="zh-CN">中文 (简体)</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </Select>

            <Text>→</Text>

            <Select
              value={toLang}
              onChange={(e, data) => setToLang(data.value)}
              style={{ width: '200px' }}
            >
              <option value="en">English</option>
              <option value="mn">Монгол</option>
              <option value="ru">Русский</option>
              <option value="zh-CN">中文 (简体)</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
            </Select>

            <Button
              appearance="primary"
              onClick={handleTranslate}
              disabled={isTranslating}
            >
              {isTranslating ? 'Орчуулж байна...' : 'Орчуулах'}
            </Button>
          </div>

          <Textarea
            placeholder="Орчуулах текстээ энд оруулна уу..."
            value={translateText}
            onChange={(e, data) => setTranslateText(data.value)}
            resize="vertical"
            rows={Math.max(6, Math.ceil(translateText.length / 80))}
            style={{ marginTop: '12px', width: '100%' }}
          />

          {isTranslating && (
            <div className={classes.spinner}>
              <Spinner size="medium" />
              <Text size={300}>Орчуулж байна...</Text>
            </div>
          )}

          {translatedText && !isTranslating && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text size={400} weight="semibold">Орчуулга:</Text>
                <Button
                  appearance="subtle"
                  icon={<Copy24Regular />}
                  onClick={handleCopyTranslation}
                >
                  Хуулах
                </Button>
              </div>
              <Textarea
                value={translatedText}
                onChange={(e, data) => setTranslatedText(data.value)}
                className={classes.resultText}
                resize="vertical"
                rows={Math.max(6, Math.ceil(translatedText.length / 80))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChatPage;
