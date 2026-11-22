import React, { useState, useRef, useEffect } from 'react';
import { useTheme, type ColorMode, type AccentColor, type Density } from '../../context/ThemeContext';
import {
    Sun,
    Moon,
    Monitor,
    Palette,
    LayoutGrid,
    Settings2,
    Check,
} from 'lucide-react';

const COLOR_MODES: { value: ColorMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Jasny', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Ciemny', icon: <Moon size={16} /> },
    { value: 'system', label: 'Systemowy', icon: <Monitor size={16} /> },
];

const ACCENTS: { value: AccentColor; label: string; color: string }[] = [
    { value: 'slate', label: 'Grafitowy', color: '#0f172a' },
    { value: 'blue', label: 'Niebieski', color: '#2563eb' },
    { value: 'violet', label: 'Fioletowy', color: '#7c3aed' },
    { value: 'emerald', label: 'Szmaragdowy', color: '#059669' },
    { value: 'rose', label: 'Różowy', color: '#e11d48' },
    { value: 'amber', label: 'Bursztynowy', color: '#d97706' },
];

const DENSITY_LABELS: Record<Density, string> = {
    comfortable: 'Komfortowy',
    compact: 'Kompaktowy',
};

function optionClass(isSelected: boolean) {
    return `flex items-center gap-2 rounded-lg border text-xs font-medium transition-colors ${
        isSelected ? 'option-selected' : 'option-default'
    }`;
}

export function AppearancePanel() {
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const { settings, setColorMode, setAccent, setDensity } = useTheme();

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setOpen(!open)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Ustawienia wyglądu"
                aria-expanded={open}
            >
                <Settings2 size={20} strokeWidth={1.75} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 card p-4 shadow-xl z-50">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <Palette size={16} className="text-muted" />
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Wygląd</span>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <p className="text-xs font-medium text-muted mb-2">Motyw</p>
                            <div className="grid grid-cols-3 gap-1.5">
                                {COLOR_MODES.map((mode) => (
                                    <button
                                        key={mode.value}
                                        onClick={() => setColorMode(mode.value)}
                                        className={`${optionClass(settings.colorMode === mode.value)} flex-col py-2.5`}
                                    >
                                        {mode.icon}
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-muted mb-2">Kolor akcentu</p>
                            <div className="grid grid-cols-3 gap-1.5">
                                {ACCENTS.map((accent) => (
                                    <button
                                        key={accent.value}
                                        onClick={() => setAccent(accent.value)}
                                        className={`${optionClass(settings.accent === accent.value)} px-2 py-2`}
                                        title={accent.label}
                                    >
                                        <span
                                            className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900"
                                            style={{ backgroundColor: accent.color }}
                                        />
                                        <span className="truncate">{accent.label}</span>
                                        {settings.accent === accent.value && (
                                            <Check size={12} className="shrink-0 text-accent" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-muted mb-2">Gęstość układu</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {(['comfortable', 'compact'] as Density[]).map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDensity(d)}
                                        className={`${optionClass(settings.density === d)} justify-center py-2.5`}
                                    >
                                        <LayoutGrid size={14} />
                                        {DENSITY_LABELS[d]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
