import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { objectiveName, description, targetAmount, currency } = req.body;

  try {
    const prompt = `Decomponha o objetivo "${objectiveName}" (${description}) com orçamento de ${targetAmount} ${currency} em 12 a 18 marcos.`;

    // Alterado para camelCase: responseMimeType e responseSchema
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              description: { type: "STRING" },
              order_index: { type: "INTEGER" }
            },
            required: ["title", "description", "order_index"]
          }
        }
      }
    });

    // O novo SDK retorna o texto diretamente na propriedade .text
    const responseText = result.text;
    
    res.status(200).json(JSON.parse(responseText || '[]'));

  } catch (error) {
    console.error('Erro ao gerar marcos:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
