/**
 * Hook to calculate proximity-based magnification with non-linear easing and spring physics.
 */
import { RefObject } from "react";
import { MotionValue, useTransform, useSpring } from "framer-motion";

export const useMouseProximity = (
    mouseX: MotionValue<number>,
    ref: RefObject<HTMLElement>,
    defaultScale: number = 1,
    hoveredScale: number = 2,
    radius: number = 150
) => {
    // Non-linear scale formula (quadratic ease-out)
    const getScale = (distance: number) => {
        if (distance > radius) return defaultScale;
        const scale = defaultScale + (hoveredScale - defaultScale) * Math.pow(1 - distance / radius, 2);
        return Math.min(scale, hoveredScale);
    };

    const scaleTransform = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        const distance = Math.abs(val - bounds.x - bounds.width / 2);
        return getScale(distance);
    });

    // Spring physics for smooth magnification
    return useSpring(scaleTransform, {
        type: "spring",
        stiffness: 300,
        damping: 25,
        mass: 0.8,
    });
};
