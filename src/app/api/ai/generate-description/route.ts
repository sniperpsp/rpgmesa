import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { type, name, context } = await request.json();

        const mistralApiKey = process.env.MISTRAL_API_KEY;
        if (!mistralApiKey) {
            return NextResponse.json({ error: "API Key do Mistral não configurada" }, { status: 500 });
        }

        // Criar prompt baseado no tipo
        let prompt = "";

        switch (type) {
            case 'race':
                prompt = `Crie uma descrição CONCISA para a raça "${name}". 
Inclua: aparência física marcante e principal traço cultural.
Máximo 40 palavras. Seja direto.`;
                break;

            case 'class':
                prompt = `Crie uma descrição CONCISA para a classe "${name}".
Inclua: estilo de combate principal e função no grupo.
Máximo 40 palavras. Seja direto.`;
                break;

            case 'item':
                prompt = `Crie uma descrição CONCISA para o item "${name}".
Inclua: aparência e uso prático.
Máximo 30 palavras. Seja direto.`;
                break;

            case 'weapon':
                prompt = `Crie uma descrição CONCISA para a arma "${name}".
Inclua: estilo visual e tipo de dano.
Máximo 30 palavras. Seja direto.`;
                break;

            case 'monster':
                prompt = `Crie uma descrição CONCISA para o monstro "${name}".
Inclua: aparência aterrorizante e comportamento principal.
Máximo 40 palavras. Seja direto.`;
                break;

            case 'ability':
                const abilityContext = context || {};
                prompt = `Você é um Game Designer ajudando iniciantes. Crie a mecânica para a habilidade "${name}".
Contexto: ${JSON.stringify(abilityContext)}

Gere uma descrição EXATAMENTE neste formato simplificado:

"[Breve descrição visual]"
**Efeito:** [Info de Dano. Ex: "Tira 10 de HP" ou "Dano 3-18 (3 dados de 6 lados)"]. Prefira dano direto a reduzir atributos.
**Custo:** ${abilityContext.manaCost ? abilityContext.manaCost + ' Mana' : '[Sugira valor] Mana'}
**Como Usar:** Jogue 1d20 + [Atributo]. Se tirar mais que [12], acerta.
**Crítico:** Se tirar 20 no dado, o dano dobra.

Seja didático e claro. O jogador é iniciante.`;
                break;

            default:
                prompt = `Crie uma descrição curta e objetiva para "${name}". Máximo 30 palavras.`;
        }

        console.log(`🤖 [MISTRAL] Gerando descrição para ${type}: ${name}`);

        const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralApiKey}`
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [
                    {
                        role: 'system',
                        content: 'Você é um mestre de RPG experiente que cria descrições imersivas e criativas para elementos de jogos de fantasia.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 500
            })
        });

        if (!mistralRes.ok) {
            const errText = await mistralRes.text();
            console.error('Erro Mistral:', errText);
            return NextResponse.json({ error: "Erro ao gerar descrição" }, { status: 500 });
        }

        const data = await mistralRes.json();
        const description = data.choices[0]?.message?.content?.trim() || '';

        console.log(`✅ [MISTRAL] Descrição gerada com sucesso`);

        return NextResponse.json({ description });

    } catch (e) {
        console.error("Erro ao gerar descrição:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
