import { invoiceExtractSchemaShape, parseInvoiceText, type InvoiceExtract } from "./invoice-parse";

const GEMINI_MODEL = "gemini-2.0-flash";

export async function extractInvoiceWithGemini(input: {
  bytes: Buffer;
  mimeType: string;
}): Promise<InvoiceExtract | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const prompt = `Extract the main payable invoice fields as JSON only, no markdown.
Keys: date (YYYY-MM-DD), amount (number string), description, type (DEPOSIT or WITHDRAWAL), category (one of project_payment, other_income, materials, subcontractors, labor, equipment, transportation, rent, salaries, vehicles, electricity, internet, marketing, other), notes, vendor, invoiceNumber, items (array of purchased item names), confidence (0-1).
Rules:
- Qatar invoices use DD/MM/YYYY. Convert to YYYY-MM-DD. Read the printed Date / Bill date, not today's date.
- invoiceNumber is Bill No / Invoice No and must contain a digit. Never use the word Date, Total, or Page.
- vendor is the English supplier name only (e.g. LuLu Trading). No Arabic tagline, address, or customer name.
- items must be ONLY the DESCRIPTION / التفاصيل column cells. From a row like "1 | TILE GLUE SALINA 20 KG | 20 | PCS | 14.50 | 290.00" the item is "TILE GLUE SALINA 20 KG". Keep pack size in the name (20 KG, 1MM). Drop SN, QTY, UNIT, UNIT PRICE, AMOUNT, and currency.
- Never put QTY, PCS/PKT, unit price, amount, Subtotal, Sales Tax, TOTAL, Terms & Conditions, payment notes, addresses, or customer names in items.
- description MUST be those item names joined by ", " and nothing else. Example: "TILE GLUE SALINA 20 KG, TILE LEVELING SPACER 1MM".
- amount is Grand Total / Net Total.
- Most supplier invoices are WITHDRAWAL. Use DEPOSIT only if this is money received.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: input.mimeType,
                  data: input.bytes.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return invoiceExtractSchemaShape(JSON.parse(jsonMatch[0]));
    } catch {
      return parseInvoiceText(text);
    }
  }
  return parseInvoiceText(text);
}
