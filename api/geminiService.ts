import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { objectiveName, description, targetAmount, currency } = req.body;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('❌ GEMINI_API_KEY não encontrada');
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Decomponha "${objectiveName}" (${description}) orçamento ${targetAmount} ${currency} em 12-18 marcos. 
APENAS JSON array: [{"title":"...", "description":"...", "order_index":1}, ...]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log('✅ Resposta Gemini:', responseText.substring(0, 200) + '...');
    
    const milestones = JSON.parse(responseText || '[]');
    res.status(200).json(milestones);

  } catch (error: any) {
    console.error('❌ Erro Gemini:', error.message);
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
}
