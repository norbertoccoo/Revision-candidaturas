import React from 'react';

// Un patrón de fondo simple y sutil con artículos de supermercado.
export const SupermarketBackground: React.FC = () => {
  const patternColor = "#E5E7EB"; // Lighter gray
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-5">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="groceryPattern" patternUnits="userSpaceOnUse" width="150" height="150" patternTransform="scale(1) rotate(0)">
            {/* Manzana simple */}
            <g transform="translate(20, 30) scale(0.8)">
              <path d="M16 2.6A4.4 4.4 0 0011.5 1 4.5 4.5 0 007 5.5c0 2.2 1.6 4.3 3.5 5.5A4.5 4.5 0 0015 11c2.5 0 4.5-2 4.5-4.5A4.4 4.4 0 0016 2.6zM12 0a1 1 0 011 1v2a1 1 0 11-2 0V1a1 1 0 011-1z" fill={patternColor} />
            </g>
            {/* Zanahoria simple */}
            <g transform="translate(100, 50) scale(0.8) rotate(45)">
              <path d="M17.7 2.3A1 1 0 0016.3.8L.3 16.8a1 1 0 001.4 1.4L17.7 2.3z" fill={patternColor} />
              <path d="M18 1a1 1 0 00-1-1h-2a1 1 0 100 2h2a1 1 0 001-1zM20 4a1 1 0 00-1-1h-2a1 1 0 100 2h2a1 1 0 001-1z" fill={patternColor}/>
            </g>
             {/* Rodaja de limón simple */}
            <g transform="translate(40, 110) scale(0.8) rotate(-30)">
               <circle cx="10" cy="10" r="8" stroke={patternColor} strokeWidth="2" fill="none" />
               <path d="M10 2v16M2 10h16M4.9 4.9l10.2 10.2M4.9 15.1l10.2-10.2" stroke={patternColor} strokeWidth="1" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#groceryPattern)" />
      </svg>
    </div>
  );
};