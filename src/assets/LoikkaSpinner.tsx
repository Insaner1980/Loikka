// LoikkaSpinner.tsx
// Pyörivä spinner joka perustuu Loikan rata-logoon

interface LoikkaSpinnerProps {
  size?: number;
  className?: string;
}

export function LoikkaSpinner({ size = 48, className = '' }: LoikkaSpinnerProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-spin ${className}`}
      style={{ animationDuration: '1s' }}
    >
      {/* Tausta-ympyrä */}
      <circle 
        cx="24" 
        cy="24" 
        r="20" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeOpacity="0.15" 
        fill="none"
      />
      
      {/* Rata-kaaret (3 rataa kuten logossa) */}
      <path 
        d="M24 4 A20 20 0 0 1 44 24" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        fill="none"
      />
      <path 
        d="M24 8 A16 16 0 0 1 40 24" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        fill="none"
        strokeOpacity="0.7"
      />
      <path 
        d="M24 12 A12 12 0 0 1 36 24" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        fill="none"
        strokeOpacity="0.4"
      />
    </svg>
  );
}

// Vaihtoehto 2: Yksinkertaisempi versio
export function LoikkaSpinnerSimple({ size = 48, className = '' }: LoikkaSpinnerProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-spin ${className}`}
      style={{ animationDuration: '0.8s' }}
    >
      {/* Yksi paksu kaari */}
      <circle 
        cx="24" 
        cy="24" 
        r="18" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeOpacity="0.15" 
        fill="none"
      />
      <path 
        d="M24 6 A18 18 0 0 1 42 24" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round" 
        fill="none"
      />
    </svg>
  );
}
