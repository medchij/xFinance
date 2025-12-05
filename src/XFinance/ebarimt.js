import { withLoading } from "./apiHelpers";
import { BASE_URL } from "../config";
export async function getMerchantCategoryById(setMessage, setLoading) {
  return await withLoading(setLoading, setMessage, async () => {
    const id = await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      range.load("values");
      await context.sync();
      const value = range.values[0][0];
      if (!value || isNaN(value)) throw new Error("⚠️ Идэвхитэй нүдэнд ID тоо оруулна уу.");
      return value.toString().trim();
    });

    // Backend-ээр дамжуулан OpenDataLab-аас мэдээллийг авах
    const url = `${BASE_URL}/api/merchant-category/${encodeURIComponent(id)}`;

    let response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error("❌ Backend сайт руу fetch хийхэд алдаа гарлаа: " + error.message);
    }

    if (!response.ok) {
      throw new Error(`❌ HTTP алдаа: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.result) {
      throw new Error("⚠️ Мэдээлэл олдсонгүй.");
    }

    // Excel-д дараа нь баганад бичих
    await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      const newRange = range.getOffsetRange(0, 1);
      newRange.values = [[data.categoryData || "Олдсонгүй"]];
      await context.sync();
    });

    setMessage("⚠️ Байгууллагын ангилал:\n" + data.result);
    return data;
  });
}

/**
 * Регистрийн дугаараар байгууллагын нэрийг авах функц
 * @param {string} regNo - Регистрийн дугаар
 * @returns {Promise<string>} - Байгууллагын нэр
 */
export async function getMerchantNameByRegNumber(regNo) {
  try {
    // Регистрийн дугаарыг шалгах
    if (!regNo || regNo.toString().trim() === "") {
      return "Алдаа: РД хоосон байна.";
    }

    // URL үүсгэх
    const url = `https://info.ebarimt.mn/rest/merchant/info?regno=${encodeURIComponent(regNo)}`;

    // HTTP хүсэлт
    const response = await fetch(url);

    // Хариуг шалгах
    if (response.ok) {
      const json = await response.json();

      // Байгууллагын нэр авах
      if (json && json.name) {
        return json.name;
      } else {
        return "Байгууллагын нэр олдсонгүй.";
      }
    } else {
      return `HTTP алдаа. Статус: ${response.status}`;
    }
  } catch (error) {
    return `Алдаа гарлаа: ${error.message}`;
  }
}

/**
 * Excel дээр регистрийн дугаараар байгууллагын нэр авах функц
 * @param {Function} setMessage - Мессеж үзүүлэх функц
 * @param {Function} setLoading - Ачаалалтын статус үзүүлэх функц
 */
export async function getMerchantInfoFromExcel(setMessage, setLoading) {
  return await withLoading(setLoading, setMessage, async () => {
    const regNo = await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      range.load("values");
      await context.sync();
      const value = range.values[0][0];
      if (!value) throw new Error("⚠️ Идэвхитэй нүдэнд регистрийн дугаар оруулна уу.");
      return value.toString().trim();
    });

    const merchantName = await getMerchantNameByRegNumber(regNo);

    // Дараа нь баганын мэдээллийг бичих
    await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      const newRange = range.getOffsetRange(0, 1);
      newRange.values = [[merchantName]];
      await context.sync();
    });

    setMessage(`✅ "${regNo}" → "${merchantName}"`);
    return merchantName;
  });
}

