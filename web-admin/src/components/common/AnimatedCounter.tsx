import { useState, useEffect, useRef } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    formatFn?: (value: number) => string;
}

/**
 * Animated counter that smoothly transitions from 0 to the target value
 */
export const AnimatedCounter = ({
    value,
    duration = 1000,
    formatFn = (v) => v.toLocaleString('ar-SA')
}: AnimatedCounterProps) => {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValue = useRef(0);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const startValue = previousValue.current;
        const endValue = value;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth deceleration
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            const currentValue = startValue + (endValue - startValue) * easeOutQuart;
            setDisplayValue(Math.round(currentValue));

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                previousValue.current = endValue;
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration]);

    return <>{formatFn(displayValue)}</>;
};

export default AnimatedCounter;
