import React from 'react';
import type { ComponentProps } from '../types/index';
import { classNames } from '@/utils';

interface LoadingProps extends ComponentProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  text,
  className = '',
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={classNames('flex flex-col items-center justify-center', className)}>
      <div className={classNames('spinner', sizeClasses[size])}></div>
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

export { Loading };
export default Loading;