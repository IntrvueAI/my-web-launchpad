/**
 * FeedbackCard Component
 * 
 * A reusable card component for displaying various types of feedback content.
 * Provides consistent styling and layout for different feedback sections
 * while allowing for customization of content and appearance.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface FeedbackCardProps {
  /** Card title */
  title: string;
  /** Optional card description/subtitle */
  description?: string;
  /** Optional icon component */
  icon?: LucideIcon;
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Variant for different card styles */
  variant?: 'default' | 'highlight' | 'success' | 'warning';
}

/**
 * Reusable card component for feedback content
 * Provides consistent styling across different feedback sections
 */
export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  title,
  description,
  icon: Icon,
  children,
  className = '',
  variant = 'default'
}) => {
  // Variant-based styling
  const variantClasses = {
    default: 'border-border',
    highlight: 'border-primary/25 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] shadow-lg',
    success: 'border-emerald/25 bg-emerald/[0.06]',
    warning: 'border-amber/25 bg-amber/[0.06]'
  };
  
  return (
    <Card className={`${variantClasses[variant]} ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5" />}
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export default FeedbackCard;