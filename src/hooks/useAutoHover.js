import { useState, useEffect } from 'react';

/**
 * useAutoHover Hook
 *
 * This hook checks if the user is on a touch device. If so, it cycles through
 * indices from 0 to `itemCount - 1` every `intervalMs` milliseconds.
 * This is useful for automatically triggering hover animations on mobile devices.
 *
 * @param {number} itemCount - The total number of items to cycle through.
 * @param {number} intervalMs - The duration of each cycle in milliseconds.
 * @returns {number | null} - The index of the item that should currently display its hover state, or null if not on a touch device or no items.
 */
export default function useAutoHover(itemCount, intervalMs = 2500) {
    const [activeIndex, setActiveIndex] = useState(null);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        // Feature detection for touch capability
        const checkTouch = () => {
            return (
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                navigator.msMaxTouchPoints > 0 ||
                window.matchMedia('(hover: none) and (pointer: coarse)').matches
            );
        };

        setIsTouchDevice(checkTouch());
    }, []);

    useEffect(() => {
        if (!isTouchDevice || itemCount <= 0) {
            setActiveIndex(null);
            return;
        }

        // Start at index 0 initially
        setActiveIndex(0);

        const interval = setInterval(() => {
            setActiveIndex((prev) => {
                if (prev === null) return 0;
                return (prev + 1) % itemCount;
            });
        }, intervalMs);

        return () => clearInterval(interval);
    }, [isTouchDevice, itemCount, intervalMs]);

    return activeIndex;
}
