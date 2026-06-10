// src/components/icons/KShIcon.jsx
import React from 'react';

/**
 * Custom Kenya Shilling (KSh) Icon
 * Styled to match Feather Icons (react-icons/fi)
 */
const KShIcon = ({ size = 24, className = '', ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`feather feather-ksh ${className}`}
      {...props}
    >
      {/* "K" part */}
      <path d="M4 4v16" />
      <path d="M11 4l-7 8 7 8" />
      
      {/* "Sh" part */}
      <path d="M15 13a2 2 0 1 0 0-4 2 2 0 1 0 0 4 2 2 0 1 0 0 4" />
      <path d="M19 13a2 2 0 1 0 0-4 2 2 0 1 0 0 4" />
      <path d="M19 17v-4" />
    </svg>
  );
};

export default KShIcon;
