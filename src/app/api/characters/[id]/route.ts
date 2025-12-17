import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// PATCH /api/characters/[id] -> atualizar personagem
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const { name, class: charClass, race, avatarUrl } = body;

        // Verificar se o personagem pertence ao usuário
        const character = await prisma.character.findUnique({
            where: { id }
        });

        if (!character) {
            return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
        }

        if (character.ownerUserId !== session.userId) {
            return NextResponse.json({ error: "Você não tem permissão para editar este personagem" }, { status: 403 });
        }

        // Função para gerar stats baseados no tipo
        function generateStatsForType(type: 'class' | 'race', name: string) {
            const nameLower = name.toLowerCase();

            if (type === 'class') {
                if (nameLower.includes('guerr') || nameLower.includes('lutad') || nameLower.includes('barb')) {
                    return { baseHp: 15, baseMana: 3, baseForca: 5, baseDestreza: 3, baseInteligencia: 2, baseDefesa: 5, baseVelocidade: 3 };
                } else if (nameLower.includes('mag') || nameLower.includes('feitiç') || nameLower.includes('brux')) {
                    return { baseHp: 8, baseMana: 12, baseForca: 2, baseDestreza: 2, baseInteligencia: 6, baseDefesa: 2, baseVelocidade: 3 };
                } else if (nameLower.includes('lad') || nameLower.includes('assass') || nameLower.includes('ninja')) {
                    return { baseHp: 10, baseMana: 5, baseForca: 3, baseDestreza: 6, baseInteligencia: 3, baseDefesa: 3, baseVelocidade: 5 };
                } else if (nameLower.includes('clér') || nameLower.includes('sacerd') || nameLower.includes('paladino')) {
                    return { baseHp: 12, baseMana: 8, baseForca: 3, baseDestreza: 2, baseInteligencia: 4, baseDefesa: 4, baseVelocidade: 3 };
                } else if (nameLower.includes('arque') || nameLower.includes('caçad') || nameLower.includes('ranger')) {
                    return { baseHp: 11, baseMana: 4, baseForca: 3, baseDestreza: 5, baseInteligencia: 3, baseDefesa: 3, baseVelocidade: 4 };
                }
                return { baseHp: 12, baseMana: 5, baseForca: 3, baseDestreza: 3, baseInteligencia: 3, baseDefesa: 3, baseVelocidade: 3 };
            } else if (type === 'race') {
                if (nameLower.includes('elfo')) {
                    return { modHp: -2, modMana: 3, modForca: -1, modDestreza: 2, modInteligencia: 2, modDefesa: 0, modVelocidade: 1 };
                } else if (nameLower.includes('anão') || nameLower.includes('anao')) {
                    return { modHp: 3, modMana: -2, modForca: 2, modDestreza: -1, modInteligencia: 0, modDefesa: 3, modVelocidade: -1 };
                } else if (nameLower.includes('orc')) {
                    return { modHp: 4, modMana: -3, modForca: 3, modDestreza: 0, modInteligencia: -2, modDefesa: 2, modVelocidade: 0 };
                } else if (nameLower.includes('halfling') || nameLower.includes('hobbit')) {
                    return { modHp: -1, modMana: 1, modForca: -2, modDestreza: 3, modInteligencia: 1, modDefesa: -1, modVelocidade: 2 };
                }
                return { modHp: 0, modMana: 0, modForca: 0, modDestreza: 0, modInteligencia: 0, modDefesa: 0, modVelocidade: 0 };
            }

            return {};
        }

        // Auto-criar template de classe se não existir
        if (charClass && charClass !== character.class) {
            const slug = charClass.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const classExists = await (prisma as any).classTemplate.findFirst({
                where: { slug }
            });

            if (!classExists) {
                console.log(`🎨 [AUTO-TEMPLATE] Criando template de classe: ${charClass}`);
                try {
                    const stats = generateStatsForType('class', charClass);
                    await (prisma as any).classTemplate.create({
                        data: {
                            name: charClass,
                            slug,
                            description: `Classe criada automaticamente`,
                            isGlobal: false,
                            ownerUserId: session.userId,
                            ...stats
                        }
                    });
                    console.log(`✅ [AUTO-TEMPLATE] Classe "${charClass}" criada`);
                } catch (e: any) {
                    console.error('❌ [AUTO-TEMPLATE] Erro ao criar classe:', e);
                }
            }
        }

        // Auto-criar template de raça se não existir
        if (race && race !== character.race) {
            const slug = race.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const raceExists = await (prisma as any).raceTemplate.findFirst({
                where: { slug }
            });

            if (!raceExists) {
                console.log(`🎨 [AUTO-TEMPLATE] Criando template de raça: ${race}`);
                try {
                    const stats = generateStatsForType('race', race);
                    await (prisma as any).raceTemplate.create({
                        data: {
                            name: race,
                            slug,
                            description: `Raça criada automaticamente`,
                            isGlobal: false,
                            ownerUserId: session.userId,
                            ...stats
                        }
                    });
                    console.log(`✅ [AUTO-TEMPLATE] Raça "${race}" criada`);
                } catch (e: any) {
                    console.error('❌ [AUTO-TEMPLATE] Erro ao criar raça:', e);
                }
            }
        }

        // Atualizar personagem
        const updatedCharacter = await prisma.character.update({
            where: { id },
            data: {
                name: name || character.name,
                class: charClass !== undefined ? charClass : character.class,
                race: race !== undefined ? race : character.race,
                avatarUrl: avatarUrl !== undefined ? avatarUrl : character.avatarUrl,
            },
            include: { stats: true, abilities: true },
        });

        console.log(`✅ [CHARACTER] Personagem "${updatedCharacter.name}" atualizado`);
        return NextResponse.json({ character: updatedCharacter }, { status: 200 });
    } catch (e) {
        console.error("/api/characters/[id] PATCH", e);
        return NextResponse.json({ error: "Erro ao atualizar personagem" }, { status: 500 });
    }
}

// DELETE /api/characters/[id] -> deletar personagem
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { id } = await params;

        // Verificar se o personagem pertence ao usuário
        const character = await prisma.character.findUnique({
            where: { id },
            include: {
                stats: true,
                abilities: true,
                rooms: {
                    include: {
                        roomStats: true,
                        roomAbilities: true
                    }
                }
            }
        });

        if (!character) {
            return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
        }

        if (character.ownerUserId !== session.userId) {
            return NextResponse.json({ error: "Você não tem permissão para deletar este personagem" }, { status: 403 });
        }

        console.log(`🗑️ [CHARACTER] Deletando personagem "${character.name}" (ID: ${id})`);
        console.log(`   - Stats: ${character.stats ? 'Sim' : 'Não'}`);
        console.log(`   - Abilities: ${character.abilities.length}`);
        console.log(`   - Rooms: ${character.rooms.length}`);

        // Deletar manualmente todos os relacionamentos para garantir
        // 1. Deletar habilidades de sala
        for (const room of character.rooms) {
            if (room.roomAbilities.length > 0) {
                await prisma.characterRoomAbility.deleteMany({
                    where: { characterRoomId: room.id }
                });
                console.log(`   ✓ Deletadas ${room.roomAbilities.length} habilidades de sala`);
            }

            // 2. Deletar stats de sala
            if (room.roomStats) {
                await prisma.characterRoomStats.delete({
                    where: { id: room.roomStats.id }
                });
                console.log(`   ✓ Deletados stats de sala`);
            }
        }

        // 3. Deletar relações com salas
        if (character.rooms.length > 0) {
            await prisma.characterRoom.deleteMany({
                where: { characterId: id }
            });
            console.log(`   ✓ Deletadas ${character.rooms.length} relações com salas`);
        }

        // 4. Deletar habilidades do personagem
        if (character.abilities.length > 0) {
            await prisma.characterAbility.deleteMany({
                where: { characterId: id }
            });
            console.log(`   ✓ Deletadas ${character.abilities.length} habilidades`);
        }

        // 5. Deletar stats do personagem
        if (character.stats) {
            await prisma.characterStats.delete({
                where: { id: character.stats.id }
            });
            console.log(`   ✓ Deletados stats`);
        }

        // 6. Finalmente, deletar o personagem
        await prisma.character.delete({
            where: { id }
        });

        console.log(`✅ [CHARACTER] Personagem "${character.name}" deletado com sucesso`);
        return NextResponse.json({ message: "Personagem deletado com sucesso" }, { status: 200 });
    } catch (e: any) {
        console.error("❌ [CHARACTER DELETE] Erro:", e);
        console.error("   Mensagem:", e.message);
        console.error("   Stack:", e.stack);
        return NextResponse.json({
            error: "Erro ao deletar personagem",
            details: e.message
        }, { status: 500 });
    }
}
