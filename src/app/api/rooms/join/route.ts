import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// POST /api/rooms/join
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { joinCode, characterId } = await request.json();

        if (!joinCode) {
            return NextResponse.json({ error: "Código da sala é obrigatório" }, { status: 400 });
        }

        // Buscar a sala pelo código
        const room = await prisma.room.findUnique({
            where: { joinCode: joinCode.toUpperCase() },
            include: {
                members: true,
                characterRooms: true,
            }
        });

        if (!room) {
            return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
        }

        // Verificar se o usuário já é membro
        const existingMember = room.members.find(m => m.userId === session.userId);

        if (!existingMember) {
            // Adicionar usuário como membro
            await prisma.roomMember.create({
                data: {
                    roomId: room.id,
                    userId: session.userId,
                    role: "player",
                }
            });
        }

        // Se um personagem foi fornecido, adicionar à sala
        if (characterId) {
            // Verificar se o personagem pertence ao usuário
            const character = await prisma.character.findFirst({
                where: {
                    id: characterId,
                    ownerUserId: session.userId,
                }
            });

            if (!character) {
                return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
            }

            // Verificar se o personagem já está na sala
            const existingCharacterRoom = room.characterRooms.find(
                cr => cr.characterId === characterId
            );

            if (!existingCharacterRoom) {
                // Buscar stats do personagem
                const characterStats = await prisma.characterStats.findUnique({
                    where: { characterId }
                });

                // Buscar habilidades do personagem
                const characterAbilities = await prisma.characterAbility.findMany({
                    where: { characterId }
                });

                // Adicionar personagem à sala
                const characterRoom = await prisma.characterRoom.create({
                    data: {
                        roomId: room.id,
                        characterId: characterId,
                        roomStats: characterStats ? {
                            create: {
                                hp: characterStats.hp,
                                mana: characterStats.mana,
                                forca: characterStats.forca,
                                destreza: characterStats.destreza,
                                inteligencia: characterStats.inteligencia,
                                defesa: characterStats.defesa,
                                velocidade: characterStats.velocidade,
                            }
                        } : undefined,
                        roomAbilities: {
                            create: characterAbilities.map(ability => ({
                                name: ability.name,
                                description: ability.description,
                                manaCost: ability.manaCost,
                                effectType: ability.effectType,
                                baseDamage: ability.baseDamage,
                                diceCount: ability.diceCount,
                                diceType: ability.diceType,
                                scalingStat: ability.scalingStat,
                                targetStat: ability.targetStat,
                                effectValue: ability.effectValue,
                                duration: ability.duration,
                                rarity: ability.rarity,
                            }))
                        }
                    }
                });

                // Registrar evento de entrada
                await prisma.eventsLog.create({
                    data: {
                        roomId: room.id,
                        actorUserId: session.userId,
                        action: "character_joined",
                        payload: {
                            characterId,
                            characterName: character.name,
                        }
                    }
                });
            }
        }

        // Retornar sala atualizada
        const updatedRoom = await prisma.room.findUnique({
            where: { id: room.id },
            include: {
                gm: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                    }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                displayName: true,
                                email: true,
                            }
                        }
                    }
                },
                characterRooms: {
                    include: {
                        character: {
                            select: {
                                id: true,
                                name: true,
                                class: true,
                                race: true,
                                avatarUrl: true,
                            }
                        },
                        roomStats: true,
                        roomAbilities: true,
                    }
                }
            }
        });

        return NextResponse.json({ room: updatedRoom }, { status: 200 });
    } catch (e) {
        console.error("Erro ao entrar na sala:", e);
        return NextResponse.json({ error: "Erro ao entrar na sala" }, { status: 500 });
    }
}
