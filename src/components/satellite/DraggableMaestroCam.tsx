import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface DraggableMaestroCamProps {
    stream: MediaStream;
    onClose: () => void;
}

export function DraggableMaestroCam({ stream, onClose }: DraggableMaestroCamProps) {
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const startTranslate = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e: React.PointerEvent) => {
        isDragging.current = true;
        startPos.current = { x: e.clientX, y: e.clientY };
        startTranslate.current = { ...translate };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        setTranslate({
            x: startTranslate.current.x + dx,
            y: startTranslate.current.y + dy
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        isDragging.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    return (
        <div
            className="fixed z-[70] w-32 sm:w-40 aspect-[3/4] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden cursor-move shadow-black/50"
            style={{
                bottom: '8rem',
                right: '1.5rem',
                transform: `translate3d(${translate.x}px, ${translate.y}px, 0)`,
                touchAction: 'none' // Prevent scrolling while dragging
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <video
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover pointer-events-none"
                ref={(v) => {
                    if (v && v.srcObject !== stream) {
                        v.srcObject = stream;
                        v.play().catch(err => console.log('Auto-play prevented:', err));
                    }
                }}
            />

            {/* Top Overlay UI (Close button and Status) */}
            <div className="absolute top-2 left-0 w-full px-2 flex items-start justify-between pointer-events-none">
                <div className="flex items-center gap-1 bg-red-500/90 px-1.5 py-0.5 rounded text-[9px] font-black text-white uppercase backdrop-blur-md shadow-sm">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white/80 hover:text-white transition-colors pointer-events-auto shadow-md active:scale-95"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
