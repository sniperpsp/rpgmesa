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
        const { roomId, name, monsters, addPlayers } = await request.json();

        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                characterRooms: {
                    include: {
                        character: true,
                        roomStats: true
                    }
                }
            }
        });

        if (!room || room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        // Criar participantes NPCs (monstros) com Auto-Template
        const npcParticipants = [];

        for (const m of monsters) {
            const name = m.name;
            const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

            let monsterT = await (prisma as any).monsterTemplate.findUnique({ where: { slug } });

            if (!monsterT) {
                // Criar template com stats da IA ou valores padrão
                try {
                    monsterT = await (prisma as any).monsterTemplate.create({
                        data: {
                            name: name,
                            slug,
                            isGlobal: false,
                            ownerUserId: session.userId,
                            hp: m.hp || m.baseHp || 30,
                            mana: m.mana || m.baseMana || 10,
                            forca: m.forca || m.baseForca || 4,
                            destreza: m.destreza || m.baseDestreza || 4,
                            inteligencia: m.inteligencia || m.baseInteligencia || 2,
                            velocidade: m.velocidade || m.baseVelocidade || 3,
                            attack: m.attack || 10,
                            defense: m.defesa || m.defense || 3,
                            level: m.level || 1,
                            abilities: m.abilities || []
                        }
                    });
                    console.log(`👹 [AUTO-TEMPLATE] Monstro "${name}" criado com stats da IA`);
                } catch (e) {
                    console.error("Erro ao criar monster template", e);
                }
            }

            // Adicionar monstros (se count > 1, repetir)
            const count = m.count || 1;
            for (let i = 0; i < count; i++) {
                npcParticipants.push({
                    name: count > 1 ? `${name} ${i + 1}` : name,
                    hp: monsterT ? monsterT.hp : (m.hp || 20),
                    maxHp: monsterT ? monsterT.hp : (m.hp || 20),
                    mana: monsterT ? monsterT.mana : (m.mana || 0),
                    maxMana: monsterT ? monsterT.mana : (m.mana || 0),
                    initiative: 0,
                    isNPC: true,
                    statusEffects: []
                });
            }
        }

        // Adicionar jogadores se solicitado
        const playerParticipants = addPlayers ? room.characterRooms.map(cr => ({
            name: cr.character.name,
            hp: cr.roomStats ? cr.roomStats.hp : 25,
            maxHp: cr.roomStats ? cr.roomStats.hp : 25,
            mana: cr.roomStats ? cr.roomStats.mana : 12,
            maxMana: cr.roomStats ? cr.roomStats.mana : 12,
            initiative: 0,
            isNPC: false,
            statusEffects: []
        })) : [];

        const encounter = await prisma.encounter.create({
            data: {
                roomId,
                name: name || "Encontro Gerado",
                isActive: false,
                participants: {
                    create: [...npcParticipants, ...playerParticipants]
                }
            },
            include: { participants: true }
        });

        return NextResponse.json({ encounter });

    } catch (e) {
        console.error("Erro ao criar encontro sugerido:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
