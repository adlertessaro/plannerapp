export const generateMilestones = async (objectiveName: string, description: string, targetAmount: number, currency: string) => {
  try {
    // Chamada para a sua nova rota de API na Vercel
    const response = await fetch('/api/geminiService', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        objectiveName,
        description,
        targetAmount,
        currency
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro na resposta do servidor');
    }

    // O backend já devolve o JSON pronto
    return await response.json();
    
  } catch (error) {
    console.error("Erro ao solicitar marcos ao backend:", error);
    return [];
  }
};