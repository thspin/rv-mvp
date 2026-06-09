import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DecorativeBlob } from '@/components/ui/decorative-blob';

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  blobColor?: string;
  blobSize?: string;
  padding?: string;
  spaceY?: string;
}

export function SectionCard({
  children,
  className,
  blobColor,
  blobSize,
  padding = 'p-6 sm:p-8',
  spaceY,
}: SectionCardProps) {
  return (
    <div className={cn(
      'bg-white border border-slate-200 rounded-[32px] shadow-sm relative overflow-hidden',
      padding,
      className
    )}>
      {blobColor !== null && (
        <DecorativeBlob color={blobColor} size={blobSize} />
      )}
      <div className={cn('relative z-10', spaceY)}>
        {children}
      </div>
    </div>
  );
}
