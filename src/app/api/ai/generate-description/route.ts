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
                prompt = `Crie uma descrição detalhada e imersiva para a raça "${name}" em um RPG de fantasia. 
Inclua: características físicas, cultura, habilidades naturais, e papel no mundo.
Máximo 200 palavras. Seja criativo e envolvente.`;
                break;

            case 'class':
                prompt = `Crie uma descrição detalhada e imersiva para a classe "${name}" em um RPG de fantasia.
Inclua: papel em combate, habilidades principais, estilo de jogo, e filosofia.
Máximo 200 palavras. Seja criativo e envolvente.`;
                break;

            case 'item':
                prompt = `Crie uma descrição detalhada e imersiva para o item "${name}" em um RPG de fantasia.
Inclua: aparência, propriedades mágicas (se houver), história, e uso.
Máximo 150 palavras. Seja criativo e envolvente.`;
                break;

            case 'weapon':
                prompt = `Crie uma descrição detalhada e imersiva para a arma "${name}" em um RPG de fantasia.
Inclua: aparência, material, poder, história lendária, e efeitos especiais.
Máximo 150 palavras. Seja criativo e envolvente.`;
                break;

            case 'monster':
                prompt = `Crie uma descrição detalhada e aterrorizante para o monstro "${name}" em um RPG de fantasia.
Inclua: aparência, comportamento, habitat, perigos, e fraquezas.
Máximo 200 palavras. Seja criativo e assustador.`;
                break;

            case 'ability':
                const abilityContext = context || {};
                prompt = `Crie uma descrição detalhada para a habilidade "${name}" em um RPG de fantasia.
${abilityContext.abilityType ? `Tipo: ${abilityContext.abilityType}` : ''}
${abilityContext.manaCost ? `Custo de Mana: ${abilityContext.manaCost}` : ''}
Inclua: efeito visual, mecânica de jogo, e impacto tático.
Máximo 100 palavras. Seja claro e direto.`;
                break;

            default:
                prompt = `Crie uma descrição detalhada e imersiva para "${name}" em um RPG de fantasia.
Máximo 150 palavras. Seja criativo e envolvente.`;
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
