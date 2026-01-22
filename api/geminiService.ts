import { GoogleGenAI, Type } from "@google/genai";

// No backend, usamos process.env diretamente
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export default async function handler(req: any, res: any) {
  // 1. Verificação de método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // 2. Extração de parâmetros (mantendo o que você já tinha no frontend)
  const { objectiveName, description, targetAmount, currency } = req.body;

  try {
    // 3. Inicialização do modelo (forma correta do SDK)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Decomponha o objetivo "${objectiveName}" (${description}) com orçamento de ${targetAmount} ${currency} em 12 a 18 marcos.`;

    // 4. Chamada usando a configuração de JSON que você já possuía
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              order_index: { type: Type.INTEGER }
            },
            required: ["title", "description", "order_index"]
          }
        }
      }
    });

    const responseText = result.response.text();
    
    // 5. Retorno limpo para o frontend
    res.status(200).json(JSON.parse(responseText));

  } catch (error) {
    console.error('Erro ao gerar marcos:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}