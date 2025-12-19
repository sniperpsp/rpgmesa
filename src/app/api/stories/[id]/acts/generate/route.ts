
import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: storyId } = await params;

    try {
        const { gmInput } = await request.json();

        const story = await prisma.story.findUnique({
            where: { id: storyId },
            include: { acts: { orderBy: { order: 'desc' }, take: 1 }, room: true }
        });

        if (!story || story.room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada ou história não encontrada" }, { status: 403 });
        }

        const lastAct = story.acts[0];
        const nextOrder = (lastAct?.order || 0) + 1;
        const mistralApiKey = process.env.MISTRAL_API_KEY;

        const prompt = `Você é um Mestre de RPG (Dungeon Master) continuando uma campanha em andamento.
        
        CONTEXTO ATUAL:
        Campanha: "${story.title}"
        Resumo Global: "${story.summary}"
        
        ÚLTIMO ATO JOGADO (Ato ${lastAct?.order}):
        Título: ${lastAct?.title}
        Descrição: ${lastAct?.description}
        
        O QUE OS JOGADORES FIZERAM (Input do Mestre):
        "${gmInput || "Os jogadores completaram o ato anterior e seguiram em frente."}"
        
        SUA TAREFA:
        Criar o ATO ${nextOrder}. Reaja às ações dos jogadores. Se eles mudaram o rumo, adapte a história.
        
        Regras:
        1. Crie apenas UM ato (o próximo).
        2. Inclua sugestão de combate E/OU puzzle baseados na nova situação.
           - PUZZLE: Deve ser ÚNICO e CRIATIVO. Evite clichês. Desafie a inteligência dos jogadores, não apenas rolagem de dados.
        3. Para os monstros, use stats numéricos apropriados:
           - hp: 10-50, mana: 0-30, forca: 2-6, destreza: 2-6
           - inteligencia: 1-5, defesa: 2-5, velocidade: 2-6, level: 1-5
        4. Retorne APENAS JSON válido:
        {
            "act": {
                "title": "Ato ${nextOrder}: [Título]",
                "description": "Resumo do que vai acontecer.",
                "sceneContent": "Texto narrativo inicial para a nova cena...",
                "suggestedEncounter": {
                    "name": "Nome do Encontro",
                    "monsters": [
                        { "name": "Monstro", "count": 1, "hp": 25, "mana": 5, "forca": 4, "destreza": 3, "inteligencia": 2, "defesa": 3, "velocidade": 4, "level": 2 }
                    ]
                },
                "puzzle": {
                    "name": "Nome Criativo",
                    "description": "Descrição detalhada do desafio lógico/físico/social. Evite 'encontrar chaves'. Use runas, alavancas, enigmas ou negociação.",
                    "solution": "Solução clara para o Mestre."
                }
            }
        }
        
        Seja criativo e mantenha a coerência com a história global.`;

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

        const data = await mistralRes.json();
        const content = data.choices[0].message.content;
        const actData = JSON.parse(content).act;

        const newAct = await prisma.act.create({
            data: {
                storyId,
                order: nextOrder,
                title: actData.title,
                description: actData.description,
                status: 'active',
                metadata: {
                    encounter: actData.suggestedEncounter,
                    puzzle: actData.puzzle
                },
                scenes: {
                    create: {
                        order: 1,
                        content: actData.sceneContent,
                        isActive: true
                    }
                }
            },
            include: { scenes: true }
        });

        return NextResponse.json({ act: newAct });

    } catch (e) {
        console.error("Erro ao gerar próximo ato:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
