import { GoogleGenAI } from "@google/genai";
import { IActivity } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeProductivity = async (activities: IActivity[]): Promise<string> => {
  try {
    const ai = getAI();
    
    // Filter for completed items in the last 7 days or so
    const completed = activities.filter(a => a.completed);
    
    if (completed.length === 0) {
      return "Ainda não há atividades concluídas para analisar. Comece a registrar suas tarefas!";
    }

    const taskList = completed.map(a => 
      `- ${a.date} (${a.day}): ${a.title} [${a.tag}] - ${(a.elapsedSeconds / 60).toFixed(1)} min`
    ).join('\n');

    const prompt = `
      Você é um especialista em produtividade e gestão de tempo.
      Analise o seguinte histórico de atividades concluídas:

      ${taskList}

      Forneça um feedback estruturado em Português:
      1. **Resumo Geral**: Como foi o desempenho?
      2. **Padrões**: Identifique onde o tempo está sendo mais gasto (tags).
      3. **Dica de Melhoria**: Uma sugestão acionável para otimizar o tempo baseada nos dados.
      
      Mantenha o tom profissional mas encorajador. Use formatação Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "Ocorreu um erro ao conectar com seu assistente virtual.";
  }
};
