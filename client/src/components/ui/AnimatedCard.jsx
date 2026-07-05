import { motion } from 'framer-motion';

// Reuse this card for dashboard stats, panels, and quick actions.
function AnimatedCard({ children, className = '', delay = 0, hover = true }) {
  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={hover ? { y: -4 } : undefined}
    >
      {children}
    </motion.article>
  );
}

export default AnimatedCard;
