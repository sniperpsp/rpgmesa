import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// GET /api/characters -> lista personagens do usuário
export async function GET(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const userId = session.userId;
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    const characters = await prisma.character.findMany({
        where: {
            ownerUserId: userId,
            ...(roomId ? { rooms: { some: { roomId } } } : {}),
        },
        include: { stats: true, abilities: true, rooms: true },
        orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ characters });
}

// POST /api/characters -> cria personagem do usuário
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const userId = session.userId;

    try {
        const body = await request.json();
        const {
            name,
            class: charClass,
            race,
            notes,
            withStats,
            avatarUrl,
            weapon,
            appearance,
            generateAvatar,
            abilities
        } = body || {};

        if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

        let finalAvatarUrl = avatarUrl;

        // Gerar avatar com Mistral AI + Pollinations ANTES de criar o personagem
        if (generateAvatar && !avatarUrl) {
            try {
                console.log('🎨 [AVATAR] Iniciando geração de avatar para:', name);

                const mistralApiKey = process.env.MISTRAL_API_KEY;

                if (mistralApiKey) {
                    console.log('🤖 [MISTRAL] Criando prompt otimizado...');

                    // Criar contexto detalhado para o Mistral
                    const contextParts = [];
                    if (name) contextParts.push(`Nome: ${name}`);
                    if (charClass) contextParts.push(`Classe: ${charClass}`);
                    if (race) contextParts.push(`Raça: ${race}`);
                    if (weapon) contextParts.push(`Arma: ${weapon}`);
                    if (appearance) contextParts.push(`Aparência: ${appearance}`);

                    const context = contextParts.join('\n');

                    const mistralPrompt = `Você é um especialista em criar prompts para geração de imagens de personagens de RPG fantasy.

Dados do personagem:
${context}

Crie um prompt DETALHADO e VISUAL em inglês para gerar uma imagem deste personagem. O prompt deve:
- Ser em inglês
- Focar em detalhes visuais (aparência física, roupas, arma, pose)
- Incluir estilo artístico: "detailed fantasy digital art, high quality, professional illustration"
- Ser conciso mas descritivo (máximo 150 palavras)
- NÃO incluir o nome do personagem
- Descrever a cena como "portrait" ou "character portrait"

Retorne APENAS o prompt, sem explicações ou formatação adicional.`;

                    try {
                        const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${mistralApiKey}`
                            },
                            body: JSON.stringify({
                                model: 'mistral-small-latest',
                                messages: [{ role: 'user', content: mistralPrompt }],
                                temperature: 0.7,
                                max_tokens: 250
                            })
                        });

                        if (mistralRes.ok) {
                            const mistralData = await mistralRes.json();
                            const optimizedPrompt = mistralData.choices[0]?.message?.content?.trim() || '';

                            if (optimizedPrompt) {
                                console.log('✅ [MISTRAL] Prompt otimizado gerado:');
                                console.log('📝 [PROMPT]', optimizedPrompt);

                                // Gerar URL da imagem com o prompt otimizado
                                const encodedPrompt = encodeURIComponent(optimizedPrompt);
                                finalAvatarUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true`;

                                console.log('🖼️ [POLLINATIONS] URL:', finalAvatarUrl);
                                console.log('🖼️ [POLLINATIONS] Gerando imagem...');

                                // Fazer uma requisição para "pré-gerar" a imagem
                                await fetch(finalAvatarUrl, { method: 'HEAD' }).catch(() => { });

                                console.log('✅ [AVATAR] Avatar gerado com sucesso!');
                            } else {
                                throw new Error('Prompt vazio retornado pelo Mistral');
                            }
                        } else {
                            const errorData = await mistralRes.json().catch(() => ({}));
                            console.error('❌ [MISTRAL] Erro na API:', errorData);
                            throw new Error('Mistral API retornou erro');
                        }
                    } catch (mistralError: any) {
                        console.warn('⚠️ [MISTRAL] Erro ao usar Mistral, usando prompt simples:', mistralError.message);

                        // Fallback: criar prompt manualmente mais detalhado
                        const fallbackPrompt = `Fantasy RPG character portrait, ${race || 'human'} ${charClass || 'adventurer'}, ${weapon ? `wielding ${weapon}` : 'ready for battle'}, ${appearance || 'detailed appearance'}, professional digital art, high quality illustration, detailed fantasy art style, dramatic lighting`;

                        console.log('📝 [PROMPT FALLBACK]', fallbackPrompt);
                        const encodedPrompt = encodeURIComponent(fallbackPrompt);
                        finalAvatarUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true`;

                        console.log('🖼️ [POLLINATIONS] URL:', finalAvatarUrl);
                        console.log('🖼️ [POLLINATIONS] Gerando imagem com prompt fallback...');
                        await fetch(finalAvatarUrl, { method: 'HEAD' }).catch(() => { });
                        console.log('✅ [AVATAR] Avatar gerado (fallback)');
                    }
                } else {
                    console.warn('⚠️ [MISTRAL] API Key não configurada');

                    // Sem Mistral, criar prompt detalhado manualmente
                    const manualPrompt = `Fantasy RPG character portrait, ${race || 'human'} ${charClass || 'adventurer'}, ${weapon ? `wielding ${weapon}` : 'ready for battle'}, ${appearance || 'detailed character'}, professional digital art, high quality illustration, detailed fantasy art style, dramatic lighting`;

                    console.log('📝 [PROMPT MANUAL]', manualPrompt);
                    const encodedPrompt = encodeURIComponent(manualPrompt);
                    finalAvatarUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true`;

                    console.log('🖼️ [POLLINATIONS] URL:', finalAvatarUrl);
                    console.log('🖼️ [POLLINATIONS] Gerando imagem...');
                    await fetch(finalAvatarUrl, { method: 'HEAD' }).catch(() => { });
                    console.log('✅ [AVATAR] Avatar gerado');
                }
            } catch (e: any) {
                console.error('❌ [AVATAR] Erro geral ao gerar avatar:', e.message);
                // Continua sem avatar se tudo falhar
                finalAvatarUrl = null;
            }
        }

        // Auto-criar templates se classe/raça não existir
        if (charClass) {
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
                    await (prisma as any).classTemplate.create({
                        data: {
                            name: charClass,
                            slug,
                            description: `Classe criada automaticamente`,
                            isGlobal: false,
                            ownerUserId: userId,
                            baseHp: 12,
                            baseMana: 5,
                            baseForca: 3,
                            baseDestreza: 3,
                            baseInteligencia: 3,
                            baseDefesa: 3,
                            baseVelocidade: 3,
                        }
                    });
                    console.log(`✅ [AUTO-TEMPLATE] Classe "${charClass}" criada`);
                } catch (e: any) {
                    console.error('❌ [AUTO-TEMPLATE] Erro ao criar classe:', e);
                }
            }
        }

        if (race) {
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
                    await (prisma as any).raceTemplate.create({
                        data: {
                            name: race,
                            slug,
                            description: `Raça criada automaticamente`,
                            isGlobal: false,
                            ownerUserId: userId,
                            // Atributos Aleatórios para Raças Novas
                            modHp: Math.floor(Math.random() * 5) + 2,   // +2 a +6 HP
                            modMana: Math.floor(Math.random() * 5) + 2, // +2 a +6 Mana
                            modForca: Math.random() > 0.5 ? 1 : 0,
                            modDestreza: Math.random() > 0.5 ? 1 : 0,
                            modInteligencia: Math.random() > 0.5 ? 1 : 0,
                            modDefesa: Math.random() > 0.5 ? 1 : 0,
                            modVelocidade: Math.random() > 0.5 ? 1 : 0,
                            // Garantir pelo menos +1 em algo se o random falhar muito (opcional, mas o random acima cobre bem)
                        }
                    });
                    console.log(`✅ [AUTO-TEMPLATE] Raça "${race}" criada`);
                } catch (e: any) {
                    console.error('❌ [AUTO-TEMPLATE] Erro ao criar raça:', e);
                }
            }
        }

        // Calcular Stats Iniciais baseados nos Templates
        let statsData = {
            hp: 10, mana: 5, forca: 3, destreza: 3,
            inteligencia: 3, defesa: 3, velocidade: 3
        };

        if (charClass) {
            const slug = charClass.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

            const classT = await (prisma as any).classTemplate.findFirst({ where: { slug } });

            if (classT) {
                statsData = {
                    hp: classT.baseHp,
                    mana: classT.baseMana,
                    forca: classT.baseForca,
                    destreza: classT.baseDestreza,
                    inteligencia: classT.baseInteligencia,
                    defesa: classT.baseDefesa,
                    velocidade: classT.baseVelocidade
                };
            }
            // Se não existir, será criado no bloco de auto-template abaixo, mas usaremos defaults por enquanto
        }

        if (race) {
            const slug = race.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

            const raceT = await (prisma as any).raceTemplate.findFirst({ where: { slug } });

            if (raceT) {
                statsData.hp += raceT.modHp || 0;
                statsData.mana += raceT.modMana || 0;
                statsData.forca += raceT.modForca || 0;
                statsData.destreza += raceT.modDestreza || 0;
                statsData.inteligencia += raceT.modInteligencia || 0;
                statsData.defesa += raceT.modDefesa || 0;
                statsData.velocidade += raceT.modVelocidade || 0;
            }
        }


        // Bônus de Atributos por Arma (Com Auto-Template)
        if (weapon) {
            const slug = weapon.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

            let weaponT = await (prisma as any).weaponTemplate.findUnique({ where: { slug } });

            if (!weaponT) {
                // Se não existe, define stats iniciais padrão
                const w = weapon.toLowerCase();
                let initialStats = { modForca: 0, modDestreza: 0, modInteligencia: 0, modDefesa: 0, modVelocidade: 0 };

                if (['espada longa', 'machado de batalha', 'martelo de guerra', 'machado duplo', 'maça'].some(type => w.includes(type))) {
                    initialStats.modForca = 2;
                } else if (['arco', 'besta', 'foice'].some(type => w.includes(type))) {
                    initialStats.modDestreza = 2;
                } else if (['adaga', 'espada curta', 'katana', 'mangual'].some(type => w.includes(type))) {
                    initialStats.modForca = 1; initialStats.modDestreza = 1;
                } else if (['cajado', 'varinha'].some(type => w.includes(type))) {
                    initialStats.modInteligencia = 2;
                } else {
                    // Arma customizada: +2 aleatório
                    const attrs = ['modForca', 'modDestreza', 'modInteligencia', 'modDefesa', 'modVelocidade'];
                    // @ts-ignore
                    initialStats[attrs[Math.floor(Math.random() * attrs.length)]] += 1;
                    // @ts-ignore
                    initialStats[attrs[Math.floor(Math.random() * attrs.length)]] += 1;
                }

                // Cria o template
                try {
                    weaponT = await (prisma as any).weaponTemplate.create({
                        data: {
                            name: weapon,
                            slug,
                            isGlobal: false,
                            ownerUserId: userId,
                            ...initialStats
                        }
                    });
                    console.log(`⚔️ [AUTO-TEMPLATE] Arma "${weapon}" criada`);
                } catch (e) {
                    console.error('Erro ao criar weapon template', e);
                }
            }

            // Aplica os stats do template (seja novo ou existente)
            if (weaponT) {
                statsData.forca += weaponT.modForca || 0;
                statsData.destreza += weaponT.modDestreza || 0;
                statsData.inteligencia += weaponT.modInteligencia || 0;
                statsData.defesa += weaponT.modDefesa || 0;
                statsData.velocidade += weaponT.modVelocidade || 0;
                // Armas geralmente não dão HP/Mana, mas se o template tiver, aplica
                statsData.hp += weaponT.modHp || 0;
                statsData.mana += weaponT.modMana || 0;
            }
        }

        // Gerar multiplicadores aleatórios baseados na classe
        const { getRandomMultiplier } = await import('@/lib/classMultipliers');
        const multipliers = getRandomMultiplier(charClass);

        statsData.hp = Math.round(statsData.hp * multipliers.hp);
        statsData.mana = Math.round(statsData.mana * multipliers.mana);

        const character = await prisma.character.create({
            data: {
                ownerUserId: userId,
                name,
                class: charClass ?? null,
                race: race ?? null,
                weapon: weapon ?? null,
                notes: notes ?? null,
                avatarUrl: finalAvatarUrl ?? null,
                stats: {
                    create: {
                        ...statsData
                    }
                },
                abilities: abilities && abilities.length > 0 ? {
                    create: abilities.map((a: any) => ({
                        name: a.name,
                        description: a.description,
                        manaCost: a.manaCost,
                        abilityType: a.abilityType,
                        // Novos campos de efeito
                        effectType: a.effectType,
                        baseDamage: a.baseDamage,
                        diceCount: a.diceCount,
                        diceType: a.diceType,
                        scalingStat: a.scalingStat,
                        targetStat: a.targetStat,
                        effectValue: a.effectValue,
                        duration: a.duration,
                        rarity: a.rarity
                    }))
                } : undefined,
            },
            include: { stats: true, abilities: true },
        });

        console.log(`✅ [CHARACTER] Personagem "${name}" criado com sucesso`);
        return NextResponse.json({ character }, { status: 201 });
    } catch (e) {
        console.error("/api/characters POST", e);
        return NextResponse.json({ error: "Erro ao criar personagem" }, { status: 500 });
    }
}
