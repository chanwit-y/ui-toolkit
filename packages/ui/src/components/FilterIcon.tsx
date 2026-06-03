import React from 'react';

export interface FilterIconProps {
  className?: string;
  size?: number;
  active?: boolean;
}

export const FilterIcon: React.FC<FilterIconProps> = ({ 
  className = '', 
  size = 16, 
  active = false 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} ${active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'} transition-colors duration-200`}
    >
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" />
    </svg>
  );
};

export default FilterIcon;
