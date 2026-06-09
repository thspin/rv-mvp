import { cn } from '@/lib/utils';

interface DecorativeBlobProps {
  color?: string;
  size?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

const positionClasses: Record<string, string> = {
  'top-right': 'top-0 right-0 rounded-bl-full',
  'top-left': 'top-0 left-0 rounded-br-full',
  'bottom-right': 'bottom-0 right-0 rounded-tl-full',
  'bottom-left': 'bottom-0 left-0 rounded-tr-full',
};

export function DecorativeBlob({
  color = 'from-slate-50',
  size = 'w-32 h-32',
  position = 'top-right',
  className,
}: DecorativeBlobProps) {
  return (
    <div
      className={cn(
        'absolute pointer-events-none bg-gradient-to-bl to-transparent',
        positionClasses[position],
        color,
        size,
        className
      )}
    />
  );
}
