"use client";
import { useState } from "react";

interface DiceRollerProps {
    onRoll?: (result: DiceRollResult) => void;
    className?: string;
    allowedDice?: number[];
}

interface DiceRollResult {
    dice: string;
    rolls: number[];
    total: number;
    modifier: number;
    finalTotal: number;
}

export function DiceRoller({ onRoll, className = "", allowedDice }: DiceRollerProps) {
    const [rolling, setRolling] = useState(false);
    const [lastResult, setLastResult] = useState<DiceRollResult | null>(null);
    const [modifier, setModifier] = useState<number>(0);
    const [diceCount, setDiceCount] = useState<number>(1);

    const allDiceOptions = [
        { label: "d4", value: "1d4", sides: 4 },
        { label: "d6", value: "1d6", sides: 6 },
        { label: "d8", value: "1d8", sides: 8 },
        { label: "d10", value: "1d10", sides: 10 },
        { label: "d12", value: "1d12", sides: 12 },
        { label: "d20", value: "1d20", sides: 20 },
        { label: "d100", value: "1d100", sides: 100 },
    ];

    // Filtrar opções de dados com base na configuração da sala
    const filteredOptions = allowedDice
        ? allDiceOptions.filter(d => allowedDice.includes(d.sides))
        : allDiceOptions;

    // Estado local para o dado selecionado, inicializado com a primeira opção válida
    const [selectedDice, setSelectedDice] = useState<string>(filteredOptions[0]?.value || "1d20");

    // Garantir que se as opções mudarem, o selecionado reseta se for inválido
    if (!filteredOptions.find(d => d.value === selectedDice)) {
        if (filteredOptions.length > 0) {
            setSelectedDice(filteredOptions[0].value);
        }
    }

    function rollDice(diceStr: string, mod: number = 0): DiceRollResult {
        const [count, sides] = diceStr.split('d').map(Number);
        const rolls: number[] = [];

        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }

        const total = rolls.reduce((sum, roll) => sum + roll, 0);
        const finalTotal = total + mod;

        return {
            dice: diceStr,
            rolls,
            total,
            modifier: mod,
            finalTotal,
        };
    }

    async function handleRoll() {
        setRolling(true);

        // Animação de rolagem
        await new Promise(resolve => setTimeout(resolve, 500));

        // Construct dice string based on count and selected sides (extract sides from "1dX")
        const sides = selectedDice.split('d')[1];
        const finalDiceStr = `${diceCount}d${sides}`;

        const result = rollDice(finalDiceStr, modifier);
        setLastResult(result);
        setRolling(false);

        if (onRoll) {
            onRoll(result);
        }
    }

    return (
        <div className={`bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6 ${className}`}>
            <h3 className="text-lg font-bold mb-4">🎲 Rolagem de Dados</h3>

            {/* Dice Selection */}
            <div className="flex flex-wrap gap-2 mb-4">
                {filteredOptions.map((dice) => (
                    <button
                        key={dice.value}
                        onClick={() => setSelectedDice(dice.value)}
                        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${selectedDice === dice.value
                            ? 'bg-emerald-600 text-white'
                            : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700/50'
                            }`}
                    >
                        {dice.label}
                    </button>
                ))}
            </div>

            {/* Controls */}
            <div className="space-y-4 mb-6">
                {/* Quantity */}
                <div className="bg-neutral-800/30 p-3 rounded-xl border border-neutral-700/30">
                    <label className="block text-xs uppercase font-bold text-neutral-500 mb-2">Quantidade de Dados</label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 transition-all text-xl font-bold"
                        >
                            -
                        </button>
                        <input
                            type="number"
                            value={diceCount}
                            onChange={(e) => setDiceCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="flex-1 h-10 bg-neutral-900 border border-neutral-700 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <button
                            onClick={() => setDiceCount(diceCount + 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 transition-all text-xl font-bold"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Modifier */}
                <div className="bg-neutral-800/30 p-3 rounded-xl border border-neutral-700/30">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs uppercase font-bold text-neutral-500">Modificador (Bônus)</label>
                        <span className="text-[10px] text-neutral-600">Somado ao total</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setModifier(modifier - 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 transition-all text-xl font-bold"
                        >
                            -
                        </button>
                        <input
                            type="number"
                            value={modifier}
                            onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                            className="flex-1 h-10 bg-neutral-900 border border-neutral-700 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <button
                            onClick={() => setModifier(modifier + 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 transition-all text-xl font-bold"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* Roll Button */}
            <button
                onClick={handleRoll}
                disabled={rolling}
                className={`w-full px-6 py-3 rounded-xl font-bold text-lg transition-all ${rolling
                    ? 'bg-neutral-700/50 text-neutral-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                    }`}
            >
                {rolling ? '🎲 Rolando...' : '🎲 Rolar Dados'}
            </button>

            {/* Result */}
            {lastResult && !rolling && (
                <div className="mt-6 p-4 bg-neutral-800/50 rounded-xl border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-neutral-400 text-sm">{lastResult.dice}</span>
                        <span className="text-3xl font-bold text-emerald-400">
                            {lastResult.finalTotal}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {lastResult.rolls.map((roll, index) => (
                            <div
                                key={index}
                                className="w-10 h-10 rounded-lg bg-neutral-700/50 flex items-center justify-center font-bold text-sm"
                            >
                                {roll}
                            </div>
                        ))}
                    </div>
                    {lastResult.modifier !== 0 && (
                        <p className="text-neutral-400 text-sm">
                            {lastResult.total} {lastResult.modifier >= 0 ? '+' : ''}{lastResult.modifier} = {lastResult.finalTotal}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
