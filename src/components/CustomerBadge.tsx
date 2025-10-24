import { Badge } from '@/components/ui/badge';
import { CustomerCategory } from '@/types/customer';
import { Crown, Heart, Shield, User } from 'lucide-react';

interface CustomerBadgeProps {
  category: CustomerCategory;
  size?: 'sm' | 'md' | 'lg';
}

const categoryConfig = {
  HNW: {
    icon: Crown,
    label: 'High Net Worth',
    variant: 'premium' as const,
  },
  VIP: {
    icon: Shield,
    label: 'VIP',
    variant: 'vip' as const,
  },
  Elderly: {
    icon: Heart,
    label: 'Elderly',
    variant: 'secondary' as const,
  },
  Regular: {
    icon: User,
    label: 'Regular',
    variant: 'outline' as const,
  },
};

export const CustomerBadge = ({ category, size = 'md' }: CustomerBadgeProps) => {
  const config = categoryConfig[category];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Badge variant={config.variant} className={sizeClasses[size]}>
      <Icon className={`${iconSizes[size]} mr-1`} />
      {config.label}
    </Badge>
  );
};
