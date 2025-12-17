import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const mistralApiKey = process.env.MISTRAL_API_KEY;
    if (!mistralApiKey) {
        return NextResponse.json({ error: 'MISTRAL_API_KEY not configured' }, { status: 500 });
    }

    try {
        const { name, type, existingDescription } = await request.json();

        const systemPrompt = `Você é um assistente de RPG especializado em balanceamento de jogos.
Responda APENAS com um JSON válido contendo os campos "description", "manaCost" e "rarity". Não use blocos de código markdown.`;

        const userPrompt = `
        Analise a seguinte habilidade e defina seus atributos técnicos:
        - Nome: "${name}"
        - Tipo: "${type}"
        ${existingDescription ? `- Contexto: "${existingDescription}"` : ''}
        
        Tarefas:
        1. Determine a RARIDADE adequada (comum, incomum, rara, epica, lendaria).
        2. Defina o CUSTO DE MANA (MP) compatível com a raridade.
        3. A DESCRIÇÃO ("description") deve ser DIDÁTICA PARA INICIANTES e seguir este formato:
           "[Breve frase visual].\n\n**Efeito:** [Dano fixo ou faixa de dano. Ex: 'Tira 15 de HP' ou 'Dano 3-18 (3 dados de 6 lados)'].\n**Como Usar:** Jogue 1d20 + Atributo. Se tirar > [CD 10-20] acerta.\n**Crítico:** Se tirar 20 natural, o efeito dobra."

        
        Retorne um JSON no formato:
        {
            "rarity": "comum",
            "manaCost": 0,
            "description": "texto da descrição"
        }
        `;

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralApiKey}`
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Mistral API Error:", errorText);
            throw new Error("Erro na API Mistral: " + response.statusText);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error("Sem resposta da IA");

        const result = JSON.parse(content);
        return NextResponse.json(result);

    } catch (e: any) {
        console.error("AI Gen Error", e);
        // Fallback simples se der erro
        return NextResponse.json({
            description: "Erro ao gerar descrição com IA. Por favor, preencha manualmente.",
            manaCost: 0
        });
    }
}
