
import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { roomId, theme } = await request.json();

        // Validar permissão (Apenas GM da sala)
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Apenas o GM pode criar histórias" }, { status: 403 });
        }

        const mistralApiKey = process.env.MISTRAL_API_KEY;
        if (!mistralApiKey) {
            return NextResponse.json({ error: "API Key do Mistral não configurada" }, { status: 500 });
        }

        console.log('📖 [MISTRAL] Gerando história para sala:', room.name, 'Tema:', theme);

        const prompt = `Você é um Mestre de RPG experiente (Dungeon Master) criando uma campanha épica e estruturada.
        
        Tema/Conceito da Campanha: "${theme}"
        
        Sua tarefa: Criar uma estrutura de "História" dividida em "Atos".
        
        Regras:
        1. A história deve ter entre 4 a 10 ATOS.
        2. Comece com desafios menores e aumente a dificuldade progressivamente (monstros mais fortes, riscos maiores).
        3. Para cada ATO, descreva brevemente o que acontece e sugira 1 CENA inicial (descrição narrativa para os jogadores).
        4. Retorne APENAS um JSON válido com a seguinte estrutura:
        {
            "title": "Título Épico da Campanha",
            "summary": "Resumo geral da trama...",
            "acts": [
                {
                    "title": "Ato 1: O Início",
                    "description": "Descrição do objetivo deste ato e os monstros/desafios envolvidos.",
                    "sceneContent": "Texto narrativo imersivo para ler aos jogadores iniciando a cena..."
                }
            ]
        }
        
        Seja criativo, dramático e use português claro. Não inclua markdown ou explicações fora do JSON.`;

        const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralApiKey}`
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 2000,
                response_format: { type: "json_object" }
            })
        });

        if (!mistralRes.ok) {
            const errText = await mistralRes.text();
            console.error('Erro Mistral:', errText);
            return NextResponse.json({ error: "Erro na IA" }, { status: 500 });
        }

        const data = await mistralRes.json();
        const content = data.choices[0].message.content;
        let storyData;
        try {
            storyData = JSON.parse(content);
        } catch (e) {
            console.error('Erro ao parsear JSON da IA:', content);
            return NextResponse.json({ error: "Erro ao processar resposta da IA" }, { status: 500 });
        }

        // Salvar no banco
        const createdStory = await prisma.story.create({
            data: {
                roomId,
                title: storyData.title,
                summary: storyData.summary,
                status: 'draft',
                acts: {
                    create: storyData.acts.map((act: any, index: number) => ({
                        order: index + 1,
                        title: act.title,
                        description: act.description,
                        scenes: {
                            create: {
                                order: 1,
                                content: act.sceneContent,
                                isActive: false
                            }
                        }
                    }))
                }
            },
            include: {
                acts: {
                    include: { scenes: true }
                }
            }
        });

        return NextResponse.json({ story: createdStory });

    } catch (e) {
        console.error("Erro geral na geração de história:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
