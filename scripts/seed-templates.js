const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTemplates() {
    console.log('🌱 Iniciando seed de templates...');

    // Classes
    const classes = [
        {
            name: 'Guerreiro',
            slug: 'guerreiro',
            description: 'Mestre em combate corpo a corpo, com alta resistência e força.',
            storyType: 'fantasia',
            isGlobal: true,
            baseHp: 15,
            baseMana: 3,
            baseForca: 5,
            baseDestreza: 3,
            baseInteligencia: 2,
            baseDefesa: 5,
            baseVelocidade: 3,
        },
        {
            name: 'Mago',
            slug: 'mago',
            description: 'Especialista em magia arcana, com grande poder mágico mas frágil fisicamente.',
            storyType: 'fantasia',
            isGlobal: true,
            baseHp: 8,
            baseMana: 12,
            baseForca: 2,
            baseDestreza: 2,
            baseInteligencia: 6,
            baseDefesa: 2,
            baseVelocidade: 3,
        },
        {
            name: 'Ladino',
            slug: 'ladino',
            description: 'Ágil e furtivo, especialista em ataques rápidos e precisos.',
            storyType: 'fantasia',
            isGlobal: true,
            baseHp: 10,
            baseMana: 5,
            baseForca: 3,
            baseDestreza: 6,
            baseInteligencia: 3,
            baseDefesa: 3,
            baseVelocidade: 5,
        },
        {
            name: 'Clérigo',
            slug: 'clerigo',
            description: 'Servo divino com poderes de cura e proteção.',
            storyType: 'fantasia',
            isGlobal: true,
            baseHp: 12,
            baseMana: 8,
            baseForca: 3,
            baseDestreza: 2,
            baseInteligencia: 4,
            baseDefesa: 4,
            baseVelocidade: 3,
        },
    ];

    for (const cls of classes) {
        await prisma.classTemplate.upsert({
            where: { slug: cls.slug },
            update: {},
            create: cls,
        });
    }
    console.log(`✅ ${classes.length} classes criadas`);

    // Raças
    const races = [
        {
            name: 'Humano',
            slug: 'humano',
            description: 'Versátil e adaptável, sem bônus específicos mas equilibrado.',
            storyType: 'fantasia',
            isGlobal: true,
            modHp: 0,
            modMana: 0,
            modForca: 0,
            modDestreza: 0,
            modInteligencia: 0,
            modDefesa: 0,
            modVelocidade: 0,
        },
        {
            name: 'Elfo',
            slug: 'elfo',
            description: 'Ágil e inteligente, com afinidade natural com magia.',
            storyType: 'fantasia',
            isGlobal: true,
            modHp: -2,
            modMana: 3,
            modForca: -1,
            modDestreza: 2,
            modInteligencia: 2,
            modDefesa: 0,
            modVelocidade: 1,
        },
        {
            name: 'Anão',
            slug: 'anao',
            description: 'Forte e resistente, excelente em combate e defesa.',
            storyType: 'fantasia',
            isGlobal: true,
            modHp: 3,
            modMana: -2,
            modForca: 2,
            modDestreza: -1,
            modInteligencia: 0,
            modDefesa: 3,
            modVelocidade: -1,
        },
        {
            name: 'Halfling',
            slug: 'halfling',
            description: 'Pequeno e ágil, com sorte natural.',
            storyType: 'fantasia',
            isGlobal: true,
            modHp: -1,
            modMana: 1,
            modForca: -2,
            modDestreza: 3,
            modInteligencia: 1,
            modDefesa: -1,
            modVelocidade: 2,
        },
    ];

    for (const race of races) {
        await prisma.raceTemplate.upsert({
            where: { slug: race.slug },
            update: {},
            create: race,
        });
    }
    console.log(`✅ ${races.length} raças criadas`);

    // Habilidades
    const abilities = [
        {
            name: 'Bola de Fogo',
            slug: 'bola-de-fogo',
            description: 'Lança uma bola de fogo que causa dano em área.',
            storyType: 'fantasia',
            isGlobal: true,
            manaCost: 5,
            rarity: 'Comum',
            school: 'Evocação',
            classRestriction: 'Mago',
        },
        {
            name: 'Cura Menor',
            slug: 'cura-menor',
            description: 'Restaura uma pequena quantidade de HP.',
            storyType: 'fantasia',
            isGlobal: true,
            manaCost: 3,
            rarity: 'Comum',
            school: 'Divina',
            classRestriction: 'Clérigo',
        },
        {
            name: 'Ataque Furtivo',
            slug: 'ataque-furtivo',
            description: 'Ataque surpresa que causa dano extra.',
            storyType: 'fantasia',
            isGlobal: true,
            manaCost: 2,
            rarity: 'Comum',
            school: null,
            classRestriction: 'Ladino',
        },
        {
            name: 'Golpe Poderoso',
            slug: 'golpe-poderoso',
            description: 'Um golpe devastador com arma corpo a corpo.',
            storyType: 'fantasia',
            isGlobal: true,
            manaCost: 3,
            rarity: 'Comum',
            school: null,
            classRestriction: 'Guerreiro',
        },
        {
            name: 'Relâmpago',
            slug: 'relampago',
            description: 'Invoca um relâmpago que atinge um inimigo.',
            storyType: 'fantasia',
            isGlobal: true,
            manaCost: 6,
            rarity: 'Incomum',
            school: 'Evocação',
            classRestriction: 'Mago',
        },
        {
            name: 'Escudo Sagrado',
            slug: 'escudo-sagrado',
            description: 'Cria um escudo mágico que absorve dano.',
            storyType: 'fantasia',
            isGlobal: true,
            manaCost: 4,
            rarity: 'Incomum',
            school: 'Divina',
            classRestriction: 'Clérigo',
        },
    ];

    for (const ability of abilities) {
        await prisma.abilityTemplate.upsert({
            where: { slug: ability.slug },
            update: {},
            create: ability,
        });
    }
    console.log(`✅ ${abilities.length} habilidades criadas`);

    console.log('🎉 Seed de templates concluído!');
}

seedTemplates()
    .catch((e) => {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
