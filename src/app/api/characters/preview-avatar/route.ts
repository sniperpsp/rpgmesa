import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

// POST /api/characters/preview-avatar -> gerar preview de avatar
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, class: charClass, race, weapon, appearance } = body || {};

        if (!name) {
            return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
        }

        console.log('🎨 [PREVIEW] Gerando preview de avatar para:', name);

        const mistralApiKey = process.env.MISTRAL_API_KEY;
        let avatarUrl = null;

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
- Se a arma for "sem arma", "nenhuma", "desarmado" ou se a descrição mencionar "mãos com magia/eletricidade", ESPECIFIQUE "unarmed, empty hands, casting magic with hands, glowing hands" e evite palavras como "holding" ou "wielding".
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

                        const encodedPrompt = encodeURIComponent(optimizedPrompt);
                        avatarUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true&seed=${Date.now()}`;

                        console.log('🖼️ [POLLINATIONS] URL:', avatarUrl);
                        console.log('✅ [PREVIEW] Preview gerado com sucesso!');
                    } else {
                        throw new Error('Prompt vazio');
                    }
                } else {
                    throw new Error('Mistral API erro');
                }
            } catch (mistralError: any) {
                console.warn('⚠️ [MISTRAL] Erro, usando prompt simples:', mistralError.message);

                // Fallback
                const fallbackPrompt = `Fantasy RPG character portrait, ${race || 'human'} ${charClass || 'adventurer'}, ${weapon ? `wielding ${weapon}` : 'ready for battle'}, ${appearance || 'detailed appearance'}, professional digital art, high quality illustration, detailed fantasy art style, dramatic lighting`;

                console.log('📝 [PROMPT FALLBACK]', fallbackPrompt);
                const encodedPrompt = encodeURIComponent(fallbackPrompt);
                avatarUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true&seed=${Date.now()}`;

                console.log('🖼️ [POLLINATIONS] URL:', avatarUrl);
                console.log('✅ [PREVIEW] Preview gerado (fallback)');
            }
        } else {
            console.warn('⚠️ [MISTRAL] API Key não configurada');

            // Sem Mistral
            const manualPrompt = `Fantasy RPG character portrait, ${race || 'human'} ${charClass || 'adventurer'}, ${weapon ? `wielding ${weapon}` : 'ready for battle'}, ${appearance || 'detailed character'}, professional digital art, high quality illustration, detailed fantasy art style, dramatic lighting`;

            console.log('📝 [PROMPT MANUAL]', manualPrompt);
            const encodedPrompt = encodeURIComponent(manualPrompt);
            avatarUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true&seed=${Date.now()}`;

            console.log('🖼️ [POLLINATIONS] URL:', avatarUrl);
            console.log('✅ [PREVIEW] Preview gerado');
        }

        return NextResponse.json({ avatarUrl }, { status: 200 });
    } catch (e: any) {
        console.error('❌ [PREVIEW] Erro:', e.message);
        return NextResponse.json({ error: "Erro ao gerar preview" }, { status: 500 });
    }
}
