import { GoogleGenAI, Type } from "@google/genai";

// Helper to get the latest AI instance (important for user-selected keys)
const getAI = () => {
  const apiKey = process.env.API_KEY || 
                 process.env.GEMINI_API_KEY || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                 "";
  return new GoogleGenAI({ apiKey });
};

export interface Chapter {
  title: string;
  summary: string;
  content?: string;
}

export interface Book {
  title: string;
  genre: string;
  audience: string;
  plot: string;
  chapters: Chapter[];
  coverUrl?: string;
}

export async function generateOutline(title: string, genre: string, audience: string, plot: string): Promise<Chapter[]> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Crie um sumário detalhado para um livro com as seguintes informações:
    Título: ${title}
    Gênero: ${genre}
    Público-alvo: ${audience}
    Resumo do Enredo: ${plot}
    
    O sumário deve conter entre 5 a 10 capítulos. Cada capítulo deve ter um título e um breve resumo do que acontece.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título do capítulo" },
            summary: { type: Type.STRING, description: "Resumo do que acontece no capítulo" }
          },
          required: ["title", "summary"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse outline", e);
    return [];
  }
}

export async function generateChapterContent(book: Book, chapterIndex: number): Promise<string> {
  const ai = getAI();
  const chapter = book.chapters[chapterIndex];
  const previousChapters = book.chapters.slice(0, chapterIndex).map(c => c.title).join(", ");
  
  const prompt = `Escreva o conteúdo completo do capítulo "${chapter.title}" para o livro "${book.title}".
  Gênero: ${book.genre}
  Público-alvo: ${book.audience}
  Contexto do Livro: ${book.plot}
  Capítulos anteriores: ${previousChapters || "Nenhum (este é o primeiro capítulo)"}
  Resumo deste capítulo: ${chapter.summary}
  
  Escreva de forma envolvente, com diálogos e descrições ricas. O texto deve ser em Markdown.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      systemInstruction: "Você é um autor de best-sellers experiente, conhecido por sua escrita imersiva e personagens profundos."
    }
  });

  return response.text || "Erro ao gerar conteúdo.";
}
