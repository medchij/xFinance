const fetch = require('node-fetch');

module.exports = function setupMerchantCategoryRoute(app) {
  /**
   * OpenDataLab-аас байгууллагын ангилал мэдээллийг авах
   * GET /api/merchant-category/:id
   */
  app.get('/api/merchant-category/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'ID тоо хэлбэртэй байх ёстой.' });
      }

      // OpenDataLab сайт руу хүсэлт илгээх
      const url = `https://www.opendatalab.mn/search/${encodeURIComponent(id)}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ 
          error: `OpenDataLab сайтаас HTTP ${response.status} алдаа ирлээ.` 
        });
      }

      const htmlText = await response.text();

      // Хүснэгтийг regex-ээр хайх
      const tableMatch = htmlText.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
      
      if (!tableMatch) {
        return res.status(404).json({ error: 'Хүснэгт олдсонгүй.' });
      }

      const tableHtml = tableMatch[1];

      // Мөрүүдийг парсинг хийх (эхний мөрийг алгасах)
      const rowMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      
      if (!rowMatches || rowMatches.length < 2) {
        return res.status(404).json({ error: 'Мэдээлэл олдсонгүй.' });
      }

      let result = `ID: ${id}\n`;
      let categoryData = 'Олдсонгүй';

      // Эхний мөрийг (header) алгасаж, үлдсэнийг авах
      for (let i = 1; i < rowMatches.length; i++) {
        const rowHtml = rowMatches[i];
        const cellMatches = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        
        if (cellMatches) {
          const rowData = cellMatches
            .map(cell => cell.replace(/<[^>]*>/g, '').trim())
            .join(' | ');
          
          result += rowData + '\n';

          // Эхний өгөгдлийн мөрийг авах
          if (i === 1) {
            categoryData = rowData;
          }
        }
      }

      res.json({
        id,
        result,
        categoryData,
      });
    } catch (error) {
      console.error('Merchant category error:', error);
      res.status(500).json({ 
        error: 'Сервер алдаа: ' + error.message 
      });
    }
  });
};

