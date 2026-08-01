import React, { useState } from 'react';

interface RltLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function RltLogo({ className = '', size = 'md' }: RltLogoProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'size-9 text-xs',
    md: 'size-12 text-sm',
    lg: 'size-16 text-lg',
    xl: 'size-24 text-2xl',
  };

  return (
    <div className={`relative inline-flex items-center justify-center font-black tracking-wider rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-indigo-500/25 select-none overflow-hidden ${sizeClasses[size]} ${className}`}>
      {!imgError ? (
        <img
          src="/rlt_logo.jpg"
          alt="Real Life Track Logo"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-2xl"
        />
      ) : (
        <>
          {/* Background Accent Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />
          
          {/* Logo Text / Graphic */}
          <div className="relative z-10 flex flex-col items-center justify-center leading-none">
            <span className="font-extrabold tracking-tighter drop-shadow-sm">RLT</span>
            <div className="w-5 h-0.5 bg-white/80 rounded-full mt-0.5 animate-pulse" />
          </div>
        </>
      )}
    </div>
  );
}

export default RltLogo;
