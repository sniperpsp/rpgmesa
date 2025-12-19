import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { name } = await request.json();

        if (!name) {
            return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
        }

        const mistralApiKey = process.env.MISTRAL_API_KEY;
        if (!mistralApiKey) {
            return NextResponse.json({ error: "API Key do Mistral não configurada" }, { status: 500 });
        }

        const prompt = `Analise o nome da habilidade de RPG "${name}" e determine suas propriedades mecânicas e temáticas.
Retorne APENAS um objeto JSON válido com a seguinte estrutura (sem markdown, sem explicações):

{
  "rarity": "comum" | "incomum" | "raro" | "epico" | "lendario",
  "effectType": "DAMAGE" | "HEAL" | "BUFF" | "DEBUFF",
  "scalingStat": "forca" | "destreza" | "inteligencia",
  "targetStat": "defesa" | "forca" | "destreza" | "inteligencia" | "velocidade",
  "description": "Uma descrição curta e imersiva em português (max 20 palavras)."
}

Regras de Inferência:
- "rarity": Baseado no quão poderoso o nome soa.
- "effectType": Ofensivo -> DAMAGE. Cura -> HEAL. Melhora -> BUFF. Atrapalha -> DEBUFF.
- "scalingStat": Atributo usado para lançar. Magia -> inteligencia. Força bruta -> forca. Agilidade -> destreza.
- "targetStat": PARA BUFF/DEBUFF APENAS. Qual atributo é afetado?
    - "Lentidão", "Gelo", "Corda" -> velocidade
    - "Quebrar", "Frágil", "Confusão" -> defesa
    - "Fraqueza", "Cansar" -> forca
    - "Silêncio", "Burrice" -> inteligencia
    - Se for DAMAGE/HEAL, retorne "defesa" (padrão).

Exemplo:
{ "rarity": "incomum", "effectType": "DEBUFF", "scalingStat": "inteligencia", "targetStat": "velocidade", "description": "Congela os pés do alvo reduzindo sua mobilidade." }`;

        console.log(`🤖 [MISTRAL] Analisando habilidade: ${name}`);

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
                        content: 'Você é um assistente especialista em mecânicas de RPG. Você DEVE retornar apenas JSON válido.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3, // Baixa temperatura para ser mais determinístico e seguir formato
                response_format: { type: "json_object" }
            })
        });

        if (!mistralRes.ok) {
            const errText = await mistralRes.text();
            console.error('Erro Mistral:', errText);
            return NextResponse.json({ error: "Erro ao analisar habilidade" }, { status: 500 });
        }

        const data = await mistralRes.json();
        const content = data.choices[0]?.message?.content?.trim() || '{}';

        // Parse JSON
        let result;
        try {
            result = JSON.parse(content);
        } catch (e) {
            console.error("Erro ao parsear JSON da IA:", content);
            return NextResponse.json({ error: "Falha ao processar resposta da IA" }, { status: 500 });
        }

        console.log(`✅ [MISTRAL] Análise concluída:`, result);
        return NextResponse.json(result);

    } catch (e) {
        console.error("Erro interno:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
