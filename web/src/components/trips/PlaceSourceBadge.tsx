import { BadgeCheck, Sparkles } from 'lucide-react';

const BADGE = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium';

export const PlaceSourceBadge = ({ verified }: { verified?: boolean }) => (verified ? (
    <span
        className={`${BADGE} bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400`}
        title="Położenie potwierdzone w OpenStreetMap"
    >
        <BadgeCheck size={11} />
        Potwierdzone w mapach
    </span>
) : (
    <span
        className={`${BADGE} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400`}
        title="Miejsce zaproponowane przez AI, nie znalezione w OpenStreetMap"
    >
        <Sparkles size={11} />
        Propozycja AI
    </span>
));
