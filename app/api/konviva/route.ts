import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_INSTRUCTION = `Você é o "Mentor Konviva · Copiloto de Campo", um diretor comercial veterano de Agronegócio da Senior Sistemas e especialista em GAtec + ERP Senior + Soluções Agnósticas (HCM, WMS, TMS, CRM, Ronda/Acesso).
Você acompanha o jogador pelo rádio na Usina Horizonte durante o jogo interativo "Um Dia de Safra" (MVP para o Konviva LMS da Senior Sistemas).

Regras de tom e estilo:
- Fale como um mentor de campo experiente em um jogo indie AAA (direto, vivo, com vocabulário real de usina sucroenergética: talhão, broca, ATR, moenda, preventiva, balança, Operis YMS, SimpleFarm, Commerce, ERP Senior).
- Nunca dê respostas genéricas de RH ou listas robóticas longas. Responda em 2 a 4 frases curtas e incisivas.
- Ajude o jogador a fazer perguntas de descoberta (SPIN Selling: Situação, Problema, Implicação, Necessidade de Solução) sem empurrar produto antes de ouvir a dor.
- Se perguntarem sobre o Konviva / visão de produto, destaque como cenários 3D ramificados no mesmo motor permitem treinar executivos em Agro, Logística, Indústria e Varejo com telemetria real de decisão.`;

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

function buildLocalMentorFallback(lastUserMsg: string, context?: Record<string, unknown>): string {
  const q = (lastUserMsg || '').toLowerCase();
  const lugar = String(context?.lugar || 'Sede');
  const quem = String(context?.quem || 'Helena');
  const produto = String(context?.produto || 'SimpleFarm + ERP Senior');
  const aprende = String(context?.aprende || '');

  if (q.includes('konviva') || q.includes('mvp') || q.includes('head')) {
    return `No Konviva, este mesmo motor 3D transforma trilhas estáticas em simulação viva: cada escolha SPIN gera telemetria de descoberta, confiança e aderência ao portfólio Senior + GAtec. Basta trocar o arquivo de cenário para rodar o mesmo treinamento em Logística, Manufatura ou Construção.`;
  }
  if (q.includes('pergunta') || q.includes('abrir') || q.includes('dica') || q.includes('como')) {
    return `Aqui em ${lugar} com ${quem}, segure a vontade de falar de software agora. Comece pedindo para mostrar como a rotina corre hoje no papel ou na planilha; quando surgir o atraso ou retrabalho, pergunte quanto isso custa no fim da safra antes de conectar ${produto}.`;
  }
  if (q.includes('gatec') || q.includes('erp') || q.includes('integra') || q.includes('ponta')) {
    return `A regra de ouro na Usina Horizonte é clara: o GAtec (${produto}) captura o apontamento vivo lá na ponta operacional e o ERP Senior transforma isso em compra, estoque, fiscal e contabilidade sem ninguém redigitar no telefone.${aprende ? ` Lembre-se: ${aprende}` : ''}`;
  }
  return `Escuta de rádio limpa aqui em ${lugar}. Observe o ambiente ao redor de ${quem} antes de propor ${produto}: quem pergunta sobre a rotina abre a porta; quem chega recitando catálogo leva corte.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ChatTurn[] = Array.isArray(body?.messages) ? body.messages : [];
    const context = body?.context || {};
    const lastUser = [...messages].reverse().find(m => m.role === 'user')?.text || 'Me dê uma dica para esta parada.';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: buildLocalMentorFallback(lastUser, context),
        source: 'local-mentor'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const contextHeader = `Contexto atual do jogador na Usina Horizonte: Parada=${context.lugar || 'Usina'}, Personagem=${context.quem || 'Operação'}, Solução da frente=${context.produto || 'Senior + GAtec'}, Dores mapeadas=${context.feitas || 0}/10, Nível=${context.nivel || 'executivo'}.`;

    const contents = [
      {
        role: 'user' as const,
        parts: [{ text: `${contextHeader}\nMantenha o papel do Mentor Konviva.` }]
      },
      {
        role: 'model' as const,
        parts: [{ text: 'Câmbio. Estou na escuta no Canal Konviva acompanhando sua visita na Usina Horizonte.' }]
      },
      ...messages.map(m => ({
        role: (m.role === 'model' ? 'model' : 'user') as 'user' | 'model',
        parts: [{ text: String(m.text || '') }]
      }))
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.65,
        maxOutputTokens: 260,
      }
    });

    const reply = response.text?.trim() || buildLocalMentorFallback(lastUser, context);
    return NextResponse.json({ reply, source: 'gemini-3.1-flash-lite' });
  } catch (err) {
    console.error('Erro na rota /api/konviva:', err);
    return NextResponse.json({
      reply: 'Sinal de rádio oscilou perto da moenda, mas anota aí: primeiro faça o personagem descrever onde o processo trava hoje, depois faça ele calcular o impacto na safra e só então conecte a frente GAtec + ERP.',
      source: 'fallback'
    });
  }
}
