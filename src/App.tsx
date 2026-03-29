/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  PenTool, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  RefreshCw, 
  Sparkles,
  Type as TypeIcon,
  Users,
  Layout,
  FileText,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  BookText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateOutline, generateChapterContent, Book, Chapter } from './services/geminiService';
import { cn } from './lib/utils';

type Step = 'setup' | 'outline' | 'writing' | 'reading';
type ReadingMode = 'single' | 'full';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [step, setStep] = useState<Step>('setup');
  const [readingMode, setReadingMode] = useState<ReadingMode>('single');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isWritingFullBook, setIsWritingFullBook] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  
  const [book, setBook] = useState<Book>({
    title: '',
    genre: '',
    audience: '',
    plot: '',
    chapters: [],
    coverUrl: ''
  });

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const loadingMessages = [
    "Consultando as musas da inspiração...",
    "Estruturando arcos dramáticos...",
    "Desenvolvendo personagens complexos...",
    "Tecendo tramas e mistérios...",
    "Afiando a prosa...",
    "Revisando manuscritos digitais...",
    "Organizando a biblioteca de ideias..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading && !isWritingFullBook) {
      setLoadingMessage(loadingMessages[0]);
      let i = 1;
      interval = setInterval(() => {
        setLoadingMessage(loadingMessages[i % loadingMessages.length]);
        i++;
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading, isWritingFullBook]);

  const handleStartOutline = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const chapters = await generateOutline(book.title, book.genre, book.audience, book.plot);
      setBook(prev => ({ ...prev, chapters }));
      setStep('outline');
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar esboço. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBook(prev => ({ ...prev, coverUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateChapter = async (index: number) => {
    if (book.chapters[index].content) return;
    
    setLoading(true);
    try {
      const content = await generateChapterContent(book, index);
      const newChapters = [...book.chapters];
      newChapters[index] = { ...newChapters[index], content };
      setBook(prev => ({ ...prev, chapters: newChapters }));
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar capítulo.");
    } finally {
      setLoading(false);
    }
  };

  const handleWriteFullBook = async () => {
    setLoading(true);
    setIsWritingFullBook(true);
    try {
      let currentBook = { ...book };
      for (let i = 0; i < currentBook.chapters.length; i++) {
        if (currentBook.chapters[i].content) continue;
        
        setLoadingMessage(`Escrevendo Capítulo ${i + 1} de ${currentBook.chapters.length}: ${currentBook.chapters[i].title}...`);
        const content = await generateChapterContent(currentBook, i);
        
        const newChapters = [...currentBook.chapters];
        newChapters[i] = { ...newChapters[i], content };
        currentBook = { ...currentBook, chapters: newChapters };
        setBook(currentBook);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao escrever o livro completo.");
    } finally {
      setLoading(false);
      setIsWritingFullBook(false);
    }
  };

  const handleStartReading = () => {
    setStep('reading');
    setCurrentChapterIndex(0);
    setReadingMode('single');
  };

  const downloadBook = () => {
    const fullText = book.chapters.map(c => `# ${c.title}\n\n${c.content || '*Capítulo não gerado*'}`).join('\n\n---\n\n');
    const blob = new Blob([`# ${book.title}\n\n${fullText}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title || 'livro'}.md`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-serif selection:bg-[#E6D5B8]">
      {/* Header */}
      <header className="border-b border-[#E5E5E5] py-6 px-8 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1A1A1A] rounded-full flex items-center justify-center text-white">
            <BookOpen size={20} />
          </div>
          <h1 className="text-xl font-medium tracking-tight font-sans">Gerador de Livros AI</h1>
        </div>
        
        {step !== 'setup' && (
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setStep('setup')}
              className="text-sm font-sans text-gray-500 hover:text-black transition-colors"
            >
              Novo Projeto
            </button>
            {book.chapters.some(c => c.content) && (
              <button 
                onClick={downloadBook}
                className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2 rounded-full text-sm font-sans hover:bg-black transition-all"
              >
                <Download size={16} />
                Exportar MD
              </button>
            )}
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <Loader2 className="animate-spin text-gray-300 mb-6" size={48} />
              <p className="text-xl italic text-gray-600 animate-pulse">{loadingMessage}</p>
            </motion.div>
          ) : step === 'setup' ? (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-light tracking-tight">Qual história você quer contar hoje?</h2>
                <p className="text-gray-500 font-sans max-w-xl mx-auto">
                  Defina os pilares do seu livro e deixe a inteligência artificial ajudar na estruturação e escrita.
                </p>
              </div>

              <form onSubmit={handleStartOutline} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-10 rounded-3xl shadow-sm border border-[#F0F0F0]">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-sans font-semibold text-gray-400 flex items-center gap-2">
                      <TypeIcon size={14} /> Título do Livro
                    </label>
                    <input 
                      required
                      value={book.title}
                      onChange={e => setBook({...book, title: e.target.value})}
                      placeholder="Ex: O Segredo do Vale Esquecido"
                      className="w-full bg-transparent border-b border-gray-200 py-2 focus:border-black outline-none transition-colors text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-sans font-semibold text-gray-400 flex items-center gap-2">
                      <Layout size={14} /> Gênero Literário
                    </label>
                    <input 
                      required
                      value={book.genre}
                      onChange={e => setBook({...book, genre: e.target.value})}
                      placeholder="Ex: Fantasia Épica, Suspense, Romance"
                      className="w-full bg-transparent border-b border-gray-200 py-2 focus:border-black outline-none transition-colors text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-sans font-semibold text-gray-400 flex items-center gap-2">
                      <Users size={14} /> Público-Alvo
                    </label>
                    <input 
                      required
                      value={book.audience}
                      onChange={e => setBook({...book, audience: e.target.value})}
                      placeholder="Ex: Jovens Adultos, Acadêmicos, Crianças"
                      className="w-full bg-transparent border-b border-gray-200 py-2 focus:border-black outline-none transition-colors text-lg"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2 h-full flex flex-col">
                    <label className="text-xs uppercase tracking-widest font-sans font-semibold text-gray-400 flex items-center gap-2">
                      <FileText size={14} /> Resumo do Enredo
                    </label>
                    <textarea 
                      required
                      value={book.plot}
                      onChange={e => setBook({...book, plot: e.target.value})}
                      placeholder="Descreva brevemente o que acontece na história..."
                      className="w-full bg-[#F9F9F9] rounded-2xl p-4 focus:bg-white border border-transparent focus:border-gray-200 outline-none transition-all flex-grow resize-none min-h-[150px]"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-center pt-6">
                  <button 
                    type="submit"
                    className="group relative flex items-center gap-3 bg-[#1A1A1A] text-white px-10 py-4 rounded-full text-lg font-sans hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-95"
                  >
                    <span>Gerar Esboço</span>
                    <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                  </button>
                </div>
              </form>
            </motion.div>
          ) : step === 'outline' ? (
            <motion.div 
              key="outline"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                  <h2 className="text-4xl font-light italic">{book.title}</h2>
                  <p className="text-gray-500 font-sans">Esboço dos Capítulos</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleWriteFullBook}
                    disabled={book.chapters.every(c => c.content)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-full font-sans transition-all",
                      !book.chapters.every(c => c.content)
                        ? "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 shadow-sm"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed border border-transparent"
                    )}
                  >
                    <Sparkles size={18} className="text-amber-600" /> Escrever Tudo
                  </button>
                  <label className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-full font-sans hover:bg-gray-50 transition-all shadow-sm cursor-pointer">
                    <ImageIcon size={18} /> 
                    <span>{book.coverUrl ? 'Alterar Capa' : 'Adicionar Capa'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                  <button 
                    onClick={handleStartReading}
                    disabled={!book.chapters.some(c => c.content)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-full font-sans transition-all",
                      book.chapters.some(c => c.content) 
                        ? "bg-[#1A1A1A] text-white hover:bg-black shadow-lg" 
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    Ler Manuscrito <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                  {book.chapters.map((chapter, idx) => (
                    <div 
                      key={idx}
                      className="group bg-white border border-[#F0F0F0] p-6 rounded-3xl flex items-start gap-6 hover:shadow-md transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#F9F9F9] flex items-center justify-center text-gray-400 font-sans font-bold text-lg shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-grow space-y-2">
                        <h3 className="text-xl font-medium">{chapter.title}</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">{chapter.summary}</p>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        {chapter.content ? (
                          <div className="flex items-center gap-2 text-green-600 font-sans text-sm font-semibold">
                            <CheckCircle2 size={16} /> Escrito
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleGenerateChapter(idx)}
                            className="flex items-center gap-2 bg-[#F9F9F9] hover:bg-[#1A1A1A] hover:text-white px-4 py-2 rounded-xl text-sm font-sans transition-all"
                          >
                            <PenTool size={14} /> Escrever
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-[#F0F0F0] p-6 rounded-3xl sticky top-32">
                    <h3 className="text-xs uppercase tracking-widest font-sans font-bold text-gray-400 mb-4">Capa do Livro</h3>
                    {book.coverUrl ? (
                      <div className="space-y-4">
                        <div className="relative w-full aspect-[2/3] rounded-xl shadow-2xl overflow-hidden group">
                          <img 
                            src={book.coverUrl} 
                            alt="Capa do Livro" 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        </div>
                        <p className="text-xs text-center text-gray-400 italic">Capa adicionada manualmente</p>
                      </div>
                    ) : (
                      <label className="w-full aspect-[2/3] bg-[#F9F9F9] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-6 gap-4 cursor-pointer hover:bg-gray-50 transition-colors">
                        <ImageIcon size={32} className="text-gray-300" />
                        <p className="text-sm text-gray-400 font-sans">Clique para adicionar uma capa.</p>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileUpload} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="reading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between sticky top-24 bg-[#FDFCFB]/90 py-4 backdrop-blur-sm z-10 border-b border-gray-100">
                <button 
                  onClick={() => setStep('outline')}
                  className="flex items-center gap-2 text-gray-500 hover:text-black font-sans transition-colors"
                >
                  <ChevronLeft size={18} /> Voltar ao Esboço
                </button>
                
                <div className="flex bg-gray-100 p-1 rounded-full">
                  <button 
                    onClick={() => setReadingMode('single')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-sans font-semibold transition-all",
                      readingMode === 'single' ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black"
                    )}
                  >
                    <Layout size={14} /> Capítulo
                  </button>
                  <button 
                    onClick={() => setReadingMode('full')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-sans font-semibold transition-all",
                      readingMode === 'full' ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black"
                    )}
                  >
                    <BookText size={14} /> Livro Completo
                  </button>
                </div>

                <div className="flex gap-2">
                  {readingMode === 'single' && (
                    <>
                      <button 
                        disabled={currentChapterIndex === 0}
                        onClick={() => setCurrentChapterIndex(prev => prev - 1)}
                        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button 
                        disabled={currentChapterIndex === book.chapters.length - 1 || !book.chapters[currentChapterIndex + 1]?.content}
                        onClick={() => setCurrentChapterIndex(prev => prev + 1)}
                        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {readingMode === 'single' ? (
                <article className="prose prose-stone prose-lg max-w-none bg-white p-12 md:p-20 rounded-[40px] shadow-sm border border-[#F0F0F0] leading-loose">
                  <div className="text-center mb-16">
                    <span className="text-xs uppercase tracking-widest font-sans font-bold text-gray-400">Capítulo {currentChapterIndex + 1}</span>
                    <h2 className="text-4xl font-light italic mt-2">{book.chapters[currentChapterIndex].title}</h2>
                  </div>
                  {book.chapters[currentChapterIndex].content ? (
                    <ReactMarkdown>{book.chapters[currentChapterIndex].content!}</ReactMarkdown>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                      <PenTool size={48} className="text-gray-200" />
                      <p className="text-gray-400 italic">Este capítulo ainda não foi escrito.</p>
                      <button 
                        onClick={() => handleGenerateChapter(currentChapterIndex)}
                        className="flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 rounded-full font-sans hover:bg-black transition-all"
                      >
                        <Sparkles size={16} /> Escrever Agora
                      </button>
                    </div>
                  )}
                </article>
              ) : (
                <div className="space-y-12">
                  {/* Full Book Cover Page */}
                  {book.coverUrl && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="relative w-full max-w-md aspect-[2/3] rounded-2xl shadow-2xl overflow-hidden group mb-12">
                        <img 
                          src={book.coverUrl} 
                          alt="Capa" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* All Chapters */}
                  <div className="space-y-24">
                    {book.chapters.map((chapter, idx) => (
                      <article key={idx} className="prose prose-stone prose-lg max-w-none bg-white p-12 md:p-20 rounded-[40px] shadow-sm border border-[#F0F0F0] leading-loose">
                        <div className="text-center mb-16">
                          <span className="text-xs uppercase tracking-widest font-sans font-bold text-gray-400">Capítulo {idx + 1}</span>
                          <h2 className="text-4xl font-light italic mt-2">{chapter.title}</h2>
                        </div>
                        {chapter.content ? (
                          <ReactMarkdown>{chapter.content}</ReactMarkdown>
                        ) : (
                          <p className="text-gray-400 italic text-center">Capítulo ainda não gerado.</p>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {readingMode === 'single' && (
                <div className="flex justify-center gap-8 py-10">
                  {currentChapterIndex > 0 && (
                    <button 
                      onClick={() => setCurrentChapterIndex(prev => prev - 1)}
                      className="group flex flex-col items-center gap-2"
                    >
                      <span className="text-xs uppercase tracking-widest font-sans font-bold text-gray-400 group-hover:text-black transition-colors">Anterior</span>
                      <span className="text-sm italic">{book.chapters[currentChapterIndex - 1].title}</span>
                    </button>
                  )}
                  {currentChapterIndex < book.chapters.length - 1 && book.chapters[currentChapterIndex + 1]?.content && (
                    <button 
                      onClick={() => setCurrentChapterIndex(prev => prev + 1)}
                      className="group flex flex-col items-center gap-2"
                    >
                      <span className="text-xs uppercase tracking-widest font-sans font-bold text-gray-400 group-hover:text-black transition-colors">Próximo</span>
                      <span className="text-sm italic">{book.chapters[currentChapterIndex + 1].title}</span>
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] py-12 px-8 mt-24">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all">
          <div className="flex items-center gap-2 font-sans text-sm">
            <Sparkles size={16} />
            <span>Potencializado por Gemini AI</span>
          </div>
          <p className="text-sm font-sans">© 2026 Gerador de Livros AI. Criatividade sem limites.</p>
        </div>
      </footer>
    </div>
  );
}
