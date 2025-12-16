"use client";

interface LoadingSpinnerProps {
    text?: string;
    size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ text = "Carregando", size = "md" }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-12 h-12",
        lg: "w-16 h-16"
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className={`${sizeClasses[size]} border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin`} />
            {text && <p className="text-neutral-400 text-sm">{text}</p>}
        </div>
    );
}
