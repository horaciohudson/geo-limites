import React from 'react';
import type { ButtonProps } from '../types/index';
import { classNames } from '@/utils';

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  className = '',
  ...rest
}) => {
  const baseClasses = 'btn';
  
  let variantClasses = '';
  switch (variant) {
    case 'primary':
      variantClasses = 'btn-primary';
      break;
    case 'secondary':
      variantClasses = 'btn-secondary';
      break;
    case 'danger':
      variantClasses = 'btn-danger';
      break;
    default:
      variantClasses = 'btn-primary';
  }
  
  let sizeClasses = '';
  switch (size) {
    case 'small':
      sizeClasses = 'btn-small';
      break;
    case 'large':
      sizeClasses = 'btn-large';
      break;
    default:
      sizeClasses = 'btn-medium';
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classNames(baseClasses, variantClasses, sizeClasses, className)}
      {...rest}
    >
      {children}
    </button>
  );
};

export { Button };
export default Button;
