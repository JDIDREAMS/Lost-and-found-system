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

export function extractEntitiesFromText(text: string): OcrExtractionResult {
  const raw = text.trim();
  if (!raw) return { rawText: "" };

  const result: OcrExtractionResult = {
    rawText: raw,
  };

  // 1. Student Matriculation / ID pattern
  const studentIdMatch =
    raw.match(/\b([A-Za-z]{2,5}\/\d{2,4}\/\d{3,6})\b/) ||
    raw.match(/\b(20\d{2}\/\d{4,6})\b/) ||
    raw.match(/\b(STU-\d{4,8})\b/i) ||
    raw.match(/(?:matric(?:ulation)?(?:\s*no\.?)?|reg(?:\s*no\.?)?)[:\s]+([A-Za-z0-9/-]{4,20})/i) ||
    raw.match(/(?:student\s*id|id\s*no\.?)[:\s]+([A-Za-z0-9/-]{4,20})/i);

  if (studentIdMatch && studentIdMatch[1]) {
    result.studentId = studentIdMatch[1].trim();
    result.sensitiveDetailFragment = `Student ID / Matric No: ${result.studentId}`;
  }

  // 2. Serial number / IMEI pattern
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

  // 4. Common Brands
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

  if (result.studentId) {
    result.suggestedTitle = `Student ID Card (${result.studentId})`;
    result.suggestedDescription = `Found Student Identity Card with matriculation number ${result.studentId}.`;
  } else if (result.brand && result.model) {
    result.suggestedTitle = `${result.brand} ${result.model}`;
    result.suggestedDescription = `${result.brand} device with model ${result.model} detected from evidence.`;
  } else if (result.brand) {
    result.suggestedTitle = `${result.brand} Item`;
  }

  return result;
}

/**
 * Performs fast simulated OCR scan on uploaded image files (using filename cues or text metadata).
 */
export async function performOcrScanOnFile(file: File): Promise<OcrExtractionResult | null> {
  const fileName = file.name.toLowerCase();

  // Inspect file name for mock cues or extract text patterns
  if (fileName.includes("id") || fileName.includes("card") || fileName.includes("matric")) {
    const matricMatch = file.name.match(/(\d{4}[-_/]\d{4,6}|[a-z]{3}[-_/]\d{2,4}[-_/]\d{3,6})/i);
    const mockId = matricMatch ? matricMatch[1]?.replace("_", "/") : "2023/849201";
    return extractEntitiesFromText(
      `UNIVERSITY STUDENT ID CARD MATRIC NO: ${mockId} FACULTY OF SCIENCE`,
    );
  }

  if (fileName.includes("macbook") || fileName.includes("laptop") || fileName.includes("apple")) {
    return extractEntitiesFromText(
      "Apple MacBook Pro Model A2485 S/N: C02G894MD6R Designed in California",
    );
  }

  if (fileName.includes("casio") || fileName.includes("calculator")) {
    return extractEntitiesFromText("CASIO fx-991EX CLASSWIZ Serial SN-982144");
  }

  if (fileName.includes("dell")) {
    return extractEntitiesFromText("DELL XPS 13 Model: XPS-9310 Service Tag: 8B92X1");
  }

  return null;
}
