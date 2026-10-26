import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

function ThemeToggle({ className = '', style = {} }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      style={style}
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.95 }}
      aria-pressed={isDark}
    >
      <motion.span
        key={theme}
        className="theme-toggle-icon"
        initial={{ rotate: -45, opacity: 0, scale: 0.8 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 45, opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {isDark ? (
          <Sun size={18} className="theme-icon-sun" aria-hidden="true" />
        ) : (
          <Moon size={18} className="theme-icon-moon" aria-hidden="true" />
        )}
      </motion.span>
      <span className="theme-toggle-sr">{label}</span>
    </motion.button>
  );
}

export default ThemeToggle;
