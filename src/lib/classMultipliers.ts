// Multiplicadores de HP/Mana por classe
export const CLASS_MULTIPLIERS = {
    // Classes de Alta Vida (Tanques)
    'Guerreiro': { hp: { min: 3.0, max: 3.5 }, mana: { min: 1.0, max: 1.5 } },
    'Bárbaro': { hp: { min: 3.2, max: 3.8 }, mana: { min: 0.8, max: 1.2 } },
    'Paladino': { hp: { min: 2.8, max: 3.2 }, mana: { min: 2.0, max: 2.5 } },

    // Classes Equilibradas
    'Clérigo': { hp: { min: 2.5, max: 3.0 }, mana: { min: 2.5, max: 3.0 } },
    'Druida': { hp: { min: 2.3, max: 2.8 }, mana: { min: 2.5, max: 3.0 } },
    'Ranger': { hp: { min: 2.2, max: 2.7 }, mana: { min: 1.5, max: 2.0 } },
    'Bardo': { hp: { min: 2.0, max: 2.5 }, mana: { min: 2.2, max: 2.7 } },

    // Classes Ágeis (Baixa Vida)
    'Ladino': { hp: { min: 2.0, max: 2.5 }, mana: { min: 1.2, max: 1.7 } },
    'Monge': { hp: { min: 2.2, max: 2.7 }, mana: { min: 1.8, max: 2.3 } },

    // Conjuradores (Baixa Vida, Alta Mana)
    'Mago': { hp: { min: 1.5, max: 2.0 }, mana: { min: 3.0, max: 3.5 } },
    'Feiticeiro': { hp: { min: 1.5, max: 2.0 }, mana: { min: 3.2, max: 3.8 } },
    'Bruxo': { hp: { min: 1.8, max: 2.3 }, mana: { min: 2.8, max: 3.3 } },

    // Padrão (caso a classe não esteja listada)
    'default': { hp: { min: 2.0, max: 2.5 }, mana: { min: 2.0, max: 2.5 } }
} as const;

export function getRandomMultiplier(className: string | null): { hp: number; mana: number } {
    const classKey = className || 'default';
    const multipliers = CLASS_MULTIPLIERS[classKey as keyof typeof CLASS_MULTIPLIERS] || CLASS_MULTIPLIERS.default;

    // Gera valores aleatórios dentro do range
    const hp = parseFloat((Math.random() * (multipliers.hp.max - multipliers.hp.min) + multipliers.hp.min).toFixed(2));
    const mana = parseFloat((Math.random() * (multipliers.mana.max - multipliers.mana.min) + multipliers.mana.min).toFixed(2));

    return { hp, mana };
}

export function getClassMultiplierRange(className: string | null): { hp: { min: number; max: number }; mana: { min: number; max: number } } {
    const classKey = className || 'default';
    return CLASS_MULTIPLIERS[classKey as keyof typeof CLASS_MULTIPLIERS] || CLASS_MULTIPLIERS.default;
}
