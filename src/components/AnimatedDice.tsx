"use client";
import { useState } from "react";

interface AnimatedDiceProps {
    sides: number;
    onRoll: (result: number) => void;
    disabled?: boolean;
    label?: string;
}

export function AnimatedDice({ sides, onRoll, disabled, label }: AnimatedDiceProps) {
    const [rolling, setRolling] = useState(false);
    const [result, setResult] = useState<number | null>(null);

    const roll = () => {
        if (rolling || disabled) return;

        setRolling(true);
        setResult(null);

        // Tocar som (opcional)
        try {
            const audio = new Audio('/sounds/dice-roll.mp3');
            audio.play().catch(() => { });
        } catch (e) {
            // Som não disponível
        }

        // Animação de rolagem (números aleatórios rápidos)
        let count = 0;
        const interval = setInterval(() => {
            setResult(Math.floor(Math.random() * sides) + 1);
            count++;

            if (count >= 10) {
                clearInterval(interval);
                // Resultado final
                const finalResult = Math.floor(Math.random() * sides) + 1;
                setResult(finalResult);
                setRolling(false);
                onRoll(finalResult);
            }
        }, 100);
    };

    const getDiceEmoji = () => {
        if (sides === 20) return "🎲";
        if (sides === 6) return "🎲";
        if (sides === 4) return "🔷";
        if (sides === 8) return "🔶";
        if (sides === 10) return "🔟";
        if (sides === 12) return "🔵";
        return "🎲";
    };

    const getResultColor = () => {
        if (!result) return "";
        if (sides === 20) {
            if (result === 20) return "text-yellow-400 animate-pulse";
            if (result === 1) return "text-red-400";
        }
        return "text-emerald-400";
    };

    return (
        <button
            onClick={roll}
            disabled={disabled || rolling}
            className={`relative group ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'} transition-all duration-200`}
        >
            <div className={`
                w-20 h-20 rounded-2xl flex flex-col items-center justify-center
                bg-gradient-to-br from-purple-600 to-blue-600
                border-4 border-purple-400
                shadow-lg shadow-purple-500/50
                ${rolling ? 'animate-spin' : ''}
                ${disabled ? '' : 'hover:shadow-xl hover:shadow-purple-500/70'}
            `}>
                <span className="text-3xl">{getDiceEmoji()}</span>
                {result !== null && !rolling && (
                    <span className={`text-2xl font-bold ${getResultColor()}`}>
                        {result}
                    </span>
                )}
                {!result && !rolling && (
                    <span className="text-xs text-white/70 mt-1">d{sides}</span>
                )}
            </div>
            {label && (
                <p className="text-xs text-neutral-400 mt-2 text-center">{label}</p>
            )}
            {rolling && (
                <div className="absolute -top-2 -right-2">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full animate-ping"></div>
                </div>
            )}
        </button>
    );
}
