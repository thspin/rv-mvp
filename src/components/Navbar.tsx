'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUserAsync, setCurrentUserEmail, Athlete } from '@/lib/db';
import { LogOut, Compass, User, Home } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Athlete | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    loadUser();
  }, [pathname]);

  const loadUser = async () => {
    const currentUser = await getCurrentUserAsync();
    setUser(currentUser);
    
    // Ajustar el índice activo según la ruta actual (3 pestañas)
    if (pathname === '/equipos') {
      setActiveIndex(0);
    } else if (pathname === '/perfil') {
      setActiveIndex(1);
    } else {
      setActiveIndex(-1); // Se desliza fuera de pantalla si está en dashboard / admin
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentUserEmail(null);
    router.push('/');
  };

  if (!user) return null;

  const navigationItems = [
    { label: 'Equipos', href: '/equipos', icon: Compass },
    { label: 'Perfil', href: '/perfil', icon: User },
    { label: 'Salir', action: handleLogout, icon: LogOut }
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[360px] h-[72px] flex items-center justify-between pointer-events-none">
      {/* SVG Background with dynamic mask for the curved cutout */}
      <div className="absolute inset-0 w-full h-full pointer-events-auto drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
        <svg width="360" height="72" viewBox="0 0 360 72" className="w-full h-full text-zinc-950 fill-current">
          <defs>
            <mask id="navbar-mask">
              {/* White background means visible */}
              <rect x="0" y="0" width="360" height="72" rx="24" fill="white" />
              {/* Black shapes mean transparent cutout */}
              <g 
                style={{ 
                  transform: `translateX(${activeIndex * 120}px)`, 
                  transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                }}
              >
                {/* Curved cutout centered at 60px (half of 120px cell width) */}
                <path d="M 20 -1 C 40 -1, 37 28, 60 28 C 83 28, 80 -1, 100 -1 Z" fill="black" />
              </g>
            </mask>
          </defs>
          <rect x="0" y="0" width="360" height="72" rx="24" mask="url(#navbar-mask)" />
        </svg>
      </div>

      {/* Floating Active Lime Green Circle Indicator */}
      <div 
        className="absolute w-[120px] h-[72px] flex items-center justify-center pointer-events-none z-10"
        style={{ 
          transform: `translateX(${activeIndex * 120}px)`, 
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' 
        }}
      >
        {activeIndex >= 0 && (
          <div className="w-12 h-12 rounded-full bg-[#4ade80] flex items-center justify-center shadow-lg shadow-[#4ade80]/30 -translate-y-6 transition-all duration-300">
            {(() => {
              const ActiveIcon = navigationItems[activeIndex].icon;
              return <ActiveIcon className="w-5 h-5 text-black stroke-[2.5]" />;
            })()}
          </div>
        )}
      </div>

      {/* Tab Buttons Layer */}
      <div className="absolute inset-0 w-full h-full flex pointer-events-auto z-20">
        {navigationItems.map((item, idx) => {
          const isTabActive = activeIndex === idx;
          const Icon = item.icon;

          const buttonContent = (
            <div className="flex flex-col items-center justify-center w-[120px] h-[72px] group relative select-none">
              {!isTabActive && (
                <Icon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-150 stroke-[2]" />
              )}
            </div>
          );

          if (item.action) {
            return (
              <button 
                key={idx} 
                onClick={item.action} 
                className="focus:outline-none w-[120px] h-[72px] cursor-pointer"
              >
                {buttonContent}
              </button>
            );
          }

          return (
            <Link 
              key={idx} 
              href={item.href} 
              className="focus:outline-none w-[120px] h-[72px]"
            >
              {buttonContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
