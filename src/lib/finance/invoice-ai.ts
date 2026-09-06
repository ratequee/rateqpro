import { invoiceExtractSchemaShape, parseInvoiceText, type InvoiceExtract } from "./invoice-parse";

const GEMINI_MODEL = "gemini-2.0-flash";

export async function extractInvoiceWithGemini(input: {
  bytes: Buffer;
  mimeType: string;
}): Promise<InvoiceExtract | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const prompt = `Extract the main payable invoice fields as JSON only, no markdown.
Keys: date (YYYY-MM-DD), amount (number string), description, type (DEPOSIT or WITHDRAWAL), category (one of project_payment, other_income, materials, subcontractors, labor, equipment, transportation, rent, salaries, vehicles, electricity, internet, marketing, other), notes, vendor, invoiceNumber, confidence (0-1).
Rules:
- Qatar invoices use DD/MM/YYYY. Convert to YYYY-MM-DD. Read the printed Date / Bill date, not today's date.
- invoiceNumber is Bill No / Invoice No and must contain a digit. Never use the word Date, Total, or Page.
- vendor is the supplier name only (e.g. LuLu Trading). Do not include OCR junk, logos, addresses, or customer names.
- description should be the main purchased items, not the raw header text.
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
        generationConfig: { temperature: 0.1 },
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
