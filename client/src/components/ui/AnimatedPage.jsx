import { motion } from 'framer-motion';

// Reuse this wrapper for future dashboard pages like notices, events, and complaints.
function AnimatedPage({ children, className = 'dashboard-page' }) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}

export default AnimatedPage;
