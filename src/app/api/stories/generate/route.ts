
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

        const prompt = `Você é um Mestre de RPG experiente (Dungeon Master) criando uma campanha épica.
        
        Tema/Conceito: "${theme}"
        
        Sua tarefa: Criar o CONCEITO GLOBAL e APENAS O PRIMEIRO ATO da história.
        
        Regras:
        1. O Ato 1 deve introduzir a trama e ter pelo menos um desafio inicial.
        2. Retorne APENAS um JSON válido com a seguinte estrutura:
        {
            "title": "Título da Campanha",
            "summary": "Resumo geral da trama...",
            "act": {
                "title": "Ato 1: O Início",
                "description": "Descrição do objetivo deste ato.",
                "sceneContent": "Texto narrativo imersivo inicial...",
                "suggestedEncounter": {
                    "name": "Nome do Encontro (ex: Emboscada Goblin)",
                    "monsters": [
                        { "name": "Goblin", "count": 2, "stats": "HP: 15, ATK: +3" },
                        { "name": "Lobo", "count": 1, "stats": "HP: 20, ATK: +4" }
                    ]
                },
                "puzzle": {
                    "name": "Nome do Puzzle",
                    "description": "Desafio lógico ou perícia necessária",
                    "solution": "Como resolver"
                }
            }
        }
        
        Seja criativo. Não inclua markdown.`;

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
                status: 'active',
                acts: {
                    create: {
                        order: 1,
                        title: storyData.act.title,
                        description: storyData.act.description,
                        status: 'active',
                        metadata: {
                            encounter: storyData.act.suggestedEncounter,
                            puzzle: storyData.act.puzzle
                        },
                        scenes: {
                            create: {
                                order: 1,
                                content: storyData.act.sceneContent,
                                isActive: true
                            }
                        }
                    }
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
