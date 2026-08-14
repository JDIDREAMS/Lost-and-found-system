export interface OcrExtractionResult {
  rawText: string;
  studentId?: string | undefined;
  serialNumber?: string | undefined;
  brand?: string | undefined;
  model?: string | undefined;
  suggestedTitle?: string | undefined;
  suggestedDescription?: string | undefined;
  sensitiveDetailFragment?: string | undefined;
}

export class OcrService {
  /**
   * Extracts structured information like Student IDs, serial numbers, brands, and models
   * from optical text detected from item photos.
   */
  static extractEntities(text: string): OcrExtractionResult {
    const raw = text.trim();
    if (!raw) return { rawText: "" };

    const result: OcrExtractionResult = {
      rawText: raw,
    };

    // 1. Student Matriculation / ID pattern
    // Examples: ENG/2021/0491, 2021/12345, STU-9821, MATRIC NO: 2022/8941
    const studentIdMatch =
      raw.match(/\b([A-Za-z]{2,5}\/\d{2,4}\/\d{3,6})\b/) ||
      raw.match(/\b(20\d{2}\/\d{4,6})\b/) ||
      raw.match(/\b(STU-\d{4,8})\b/i) ||
      raw.match(
        /(?:matric(?:ulation)?(?:\s*no\.?)?|reg(?:\s*no\.?)?)[:\s]+([A-Za-z0-9/-]{4,20})/i,
      ) ||
      raw.match(/(?:student\s*id|id\s*no\.?)[:\s]+([A-Za-z0-9/-]{4,20})/i);

    if (studentIdMatch && studentIdMatch[1]) {
      result.studentId = studentIdMatch[1].trim();
      result.sensitiveDetailFragment = `Student ID / Matric No: ${result.studentId}`;
    }

    // 2. Serial number / IMEI / Part Number pattern
    // Examples: S/N: C02G4589MD6R, Serial: X982A1, IMEI: 354892019284716, Model: A2485
    const serialMatch =
      raw.match(/(?:s\/n|serial(?:\s*number|\s*no\.?)?|imei)[:\s]*([a-z0-9-]{5,25})/i) ||
      raw.match(/\b(SN-[a-z0-9]{6,16})\b/i);

    if (serialMatch && serialMatch[1]) {
      result.serialNumber = serialMatch[1].trim();
      if (!result.sensitiveDetailFragment) {
        result.sensitiveDetailFragment = `Serial Number: ${result.serialNumber}`;
      }
    }

    // 3. Model number
    const modelMatch = raw.match(/(?:model(?:\s*no\.?)?)[:\s]*([a-z0-9-]{3,15})/i);
    if (modelMatch && modelMatch[1]) {
      result.model = modelMatch[1].trim();
    }

    // 4. Common Brands detection
    const brands = [
      "Apple",
      "MacBook",
      "iPhone",
      "iPad",
      "Samsung",
      "Dell",
      "HP",
      "Lenovo",
      "Asus",
      "Sony",
      "Bose",
      "Casio",
      "Nike",
      "Adidas",
      "Mastercard",
      "Visa",
      "Zenith",
      "GTBank",
      "Access Bank",
    ];

    for (const b of brands) {
      const regex = new RegExp(`\\b${b}\\b`, "i");
      if (regex.test(raw)) {
        result.brand = b;
        break;
      }
    }

    // 5. Generate suggested title / description if high confidence
    if (result.studentId) {
      result.suggestedTitle = `Student ID Card (${result.studentId})`;
      result.suggestedDescription = `Identity card with matric/registration number ${result.studentId} detected on photo.`;
    } else if (result.brand && result.model) {
      result.suggestedTitle = `${result.brand} ${result.model}`;
      result.suggestedDescription = `${result.brand} device with model ${result.model} detected from uploaded image.`;
    } else if (result.brand) {
      result.suggestedTitle = `${result.brand} Item`;
    }

    return result;
  }
}
