import { GoogleGenAI } from "@google/genai";

// O cliente busca automaticamente a GEMINI_API_KEY no environment se não for passada explicitamente,
// mas manteremos a lógica de segurança.
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

    // No novo SDK, a chamada é direta através de ai.models.generateContent
    // e as configurações de JSON usam chaves snake_case (response_mime_type, response_schema)
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Atualizado para a versão recomendada em 2026
      contents: prompt,
      config: {
        response_mime_type: "application/json",
        response_schema: {
          type: "ARRAY", // No novo SDK, usamos strings para definir tipos
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

    // No novo SDK, o texto da resposta é acessado diretamente por .text
    const responseText = result.text;
    
    res.status(200).json(JSON.parse(responseText));

  } catch (error) {
    console.error('Erro ao gerar marcos:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
