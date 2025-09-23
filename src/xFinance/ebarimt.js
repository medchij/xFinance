import {withLoading} from "./apiHelpers";
import { BASE_URL, fetchWithTimeout } from "../config";
export async function getMerchantCategoryById(setMessage, setLoading) {
  return await withLoading(setLoading, setMessage, async () => {
    const id = await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      range.load("values");
      await context.sync();
      const value = range.values[0][0];
      if (!value || isNaN(value)) throw new Error("📌 ID тоо хэлбэртэй байх ёстой.");
      return value;
    });

    const url = `${BASE_URL}/api/merchant/${id}`;
    

    let response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error("❌ Сайт руу fetch хийхэд алдаа гарлаа: " + error.message);
    }

    if (!response.ok) {
      throw new Error(`❌ HTTP алдаа: ${response.status}`);
    }

    const htmlText = await response.text();

    if (typeof DOMParser === "undefined") {
      throw new Error("❌ DOMParser дэмжигдэхгүй орчинд ажиллуулж байна.");
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const table = doc.querySelector("table");
    const pageTitle = doc.querySelector("title")?.textContent || "Гарчиг олдсонгүй";
    if (!table) {
      throw new Error("⚠️ Хүснэгт олдсонгүй.");
    }

     let result = `${pageTitle}\n`;
    
    const rows = table.querySelectorAll("tr");

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll("td");
      const rowText = Array.from(cells)
        .map((cell) => cell.textContent.trim())
        .join(" ");
      result += rowText + "\n";
    }

    // Excel дээр бичих
    

    setMessage("📋 Үр дүн:\n" + result);
    //console.log("📋 Үр дүн:", result);
    return { result, response };
  });
}
