/**
 * AnimatedPage - Page Transition Component
 * 
 * Wraps page content with smooth enter/exit animations.
 * Respects prefers-reduced-motion for accessibility.
 * 
 * @see STYLE_GUIDE.md for usage examples
 */

'use client';

import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence, HTMLMotionProps, Variants } from 'framer-motion';

export interface AnimatedPageProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  /**
   * Animation variant preset
   * - fade: Simple opacity transition
   * - slide: Slide up with opacity
   * - scale: Scale up with opacity
   * - none: No animation
   */
  variant?: 'fade' | 'slide' | 'scale' | 'none';
  /**
   * Animation duration in seconds
   */
  duration?: number;
  /**
   * Unique key for AnimatePresence (useful for route transitions)
   */
  routeKey?: string;
}

// Animation variants
const pageVariants: Record<string, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
};

export function AnimatedPage({
  children,
  variant = 'slide',
  duration = 0.25,
  routeKey,
  className = '',
  style,
  ...props
}: AnimatedPageProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Use 'none' variant if user prefers reduced motion
  const activeVariant = prefersReducedMotion ? 'none' : variant;

  const content = (
    <motion.div
      className={className}
      style={{ width: '100%', ...style }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants[activeVariant]}
      transition={{
        duration,
        ease: [0.25, 0.1, 0.25, 1], // Custom easing for smooth feel
      }}
      {...props}
    >
      {children}
    </motion.div>
  );

  // Wrap with AnimatePresence if routeKey is provided
  if (routeKey) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key={routeKey}>{content}</motion.div>
      </AnimatePresence>
    );
  }

  return content;
}

/**
 * FadeIn - Simple fade-in wrapper for elements
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * SlideIn - Slide-in wrapper for elements
 */
export function SlideIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.3,
  distance = 16,
  className = '',
}: {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  const directionOffset = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  };

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerContainer - Container for staggered children animations
 */
export function StaggerContainer({
  children,
  staggerDelay = 0.05,
  className = '',
}: {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem - Item for use inside StaggerContainer
 */
export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Presence - Wrapper for conditional rendering with animation
 */
export function Presence({
  children,
  show,
  className = '',
}: {
  children: ReactNode;
  show: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
