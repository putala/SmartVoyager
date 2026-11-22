import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Description clamped to three lines with a "Pokaż więcej" toggle, shown only when the text is longer.
 */
export const ExpandableDescription = ({ text }: { text: string }) => {
    const [expanded, setExpanded] = useState(false);
    const [overflows, setOverflows] = useState(false);
    const paragraphRef = useRef<HTMLParagraphElement>(null);

    useLayoutEffect(() => {
        const paragraph = paragraphRef.current;
        if (paragraph && !expanded) setOverflows(paragraph.scrollHeight > paragraph.clientHeight + 1);
    }, [text, expanded]);

    const toggle = (event: React.MouseEvent) => {
        event.stopPropagation();
        setExpanded(previous => !previous);
    };

    return (
        <div className="mt-2">
            <p ref={paragraphRef} className={`text-xs text-muted leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
                {text}
            </p>
            {(overflows || expanded) && (
                <button
                    onClick={toggle}
                    className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-accent hover:underline"
                    aria-expanded={expanded}
                >
                    {expanded ? 'Pokaż mniej' : 'Pokaż więcej'}
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
            )}
        </div>
    );
};
