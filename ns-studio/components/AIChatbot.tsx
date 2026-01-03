import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, User, Minimize2, Sparkles } from 'lucide-react';
import { GoogleGenAI, Chat } from "@google/genai";
import { Service, Barber } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';

interface AIChatbotProps {
  services: Service[];
  barbers: Barber[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ services, barbers }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Sou a IA do NS Studio. Posso ajudar com dúvidas sobre serviços, preços ou agendamentos?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && !chatSession) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const systemContext = `
          Você é o assistente virtual especializado do "NS Studio".
          
          DETALHES DO STUDIO:
          - Nome: NS Studio
          - Estilo: Barbearia Premium, ambiente dark/moderno.
          - Localização: Av. Paulista, 1000 - SP (Fictício)
          
          NOSSOS SERVIÇOS E PREÇOS:
          ${services.map(s => `- ${s.name}: R$ ${s.price.toFixed(2)} (${s.duration} min). ${s.description || ''}`).join('\n')}
          
          NOSSA EQUIPE (BARBEIROS):
          ${barbers.map(b => `- ${b.name}: Especialista em ${b.specialty}. Nota: ${b.rating}/5.0`).join('\n')}
          
          DIRETRIZES DE ATENDIMENTO:
          1. Seja cordial, breve e use um tom moderno e profissional.
          2. O objetivo principal é tirar dúvidas e incentivar o agendamento.
          3. Se perguntarem sobre agendamento, diga que podem fazer diretamente pelo painel ou página pública.
          4. Responda sempre em Português do Brasil.
          5. Use formatação markdown (negrito) para destacar preços e nomes.
        `;
  
        const chat = ai.chats.create({
          model: 'gemini-3-pro-preview',
          config: {
            systemInstruction: systemContext,
          },
        });
        setChatSession(chat);
      } catch (error) {
        console.error("Failed to init AI", error);
      }
    }
  }, [isOpen, services, barbers]);

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessageStream({ message: userMsg });
      
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
           fullResponse += text;
           setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].text = fullResponse;
              return newMsgs;
           });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => {
         const newMsgs = [...prev];
         if (newMsgs.length > 0 && newMsgs[newMsgs.length-1].text === '') newMsgs.pop();
         return [...newMsgs, { role: 'model', text: 'Desculpe, estou com dificuldade de conexão no momento. Tente novamente em instantes.' }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple formatter for basic markdown (bold)
  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-barber-gold hover:bg-barber-goldhover text-black rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center transition-all hover:scale-110 z-50 group"
        >
          <MessageCircle size={28} className="group-hover:animate-pulse" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-barber-950"></span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[90vw] md:w-[380px] h-[500px] max-h-[80vh] bg-barber-950 border border-barber-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-barber-900 p-4 border-b border-barber-800 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-barber-gold to-yellow-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Sparkles size={20} className="text-black fill-black" />
              </div>
              <div>
                <h3 className="font-bold text-main text-sm">NS Studio AI</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-green-500 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Online • gemini-3-pro
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-muted hover:text-main p-2 hover:bg-barber-800 rounded-lg transition-colors"
            >
              <Minimize2 size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/5 ${msg.role === 'user' ? 'bg-barber-800' : 'bg-barber-gold/90'}`}>
                   {msg.role === 'user' ? <User size={14} className="text-gray-300" /> : <Bot size={14} className="text-black" />}
                </div>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-barber-800 text-white rounded-tr-sm' 
                    : 'bg-zinc-900 border border-zinc-800 text-gray-200 rounded-tl-sm'
                }`}>
                  {msg.role === 'model' ? (
                     <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                  ) : msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 bg-barber-gold/90 rounded-full flex items-center justify-center shrink-0 border border-white/5">
                     <Bot size={14} className="text-black" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center h-10">
                     <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                     <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                     <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-barber-900 border-t border-barber-800">
            <div className="flex items-center gap-2">
               <Input 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={handleKeyPress}
                 placeholder="Digite sua mensagem..."
                 disabled={isLoading}
                 containerClassName="flex-1"
               />
               <Button 
                 onClick={handleSend}
                 disabled={!input.trim() || isLoading}
                 size="icon"
               >
                 <Send size={18} />
               </Button>
            </div>
            <div className="text-center mt-2">
               <span className="text-[10px] text-muted">Powered by Google Gemini</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;