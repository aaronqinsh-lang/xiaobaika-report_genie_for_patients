
import React from 'react';

interface CyberCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const CyberCard: React.FC<CyberCardProps> = ({ children, className = '', glow = false }) => {
  return (
    <div className={`glass-morphism rounded-[24px] p-6 transition-all duration-300 ${glow ? 'neon-border' : ''} ${className}`}>
      {children}
    </div>
  );
};

export const CyberButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = '', disabled }) => {
  const variants = {
    primary: 'bg-[#e94560] text-white hover:bg-[#ff5b75] shadow-lg shadow-[#e94560]/20',
    secondary: 'bg-white/10 text-white hover:bg-white/20 border border-white/10',
    danger: 'bg-red-900/40 text-red-200 hover:bg-red-800/60 border border-red-500/30',
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`px-6 py-3 rounded-2xl font-orbitron text-sm uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
