import type React from 'react';

export const CAD_ICON_PATHS = {
  dockFerramentas: 'M4 4l11 11-4.5 1.5 3.5 6-2.5 1.5-3.5-6-3.5 3.5z',
  dockCriarMolde: 'M3 3v18h18V3H3zm16 16H5V5h14v14z',
  dockAjustes: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z',
  dockCosturaMedidas: 'M 2 12 L 6 8 L 6 11 H 18 L 18 8 L 22 12 L 18 16 L 18 13 H 6 L 6 16 Z',
  dockUtilitarios: 'M5 4v3h5.5v12h3V7H19V4z',
  select: 'M4 4l11 11-4.5 1.5 3.5 6-2.5 1.5-3.5-6-3.5 3.5z',
  pan: 'M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z',
  zoom: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  'save-primary-boundary': 'M5 4h12l2 2v14H5z M8 4v5h6V4 M7 15l3-3 2 2 5-5 1.5 1.5-6.5 6.5-2-2-4 4z',
  rectangle: 'M3 3v18h18V3H3zm16 16H5V5h14v14z',
  circle: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zm0 2a7 7 0 1 1 0 14a7 7 0 0 1 0-14z',
  bezier: 'M16 6l2.29-2.29-4.88-4.88-4 4L2 2v9h7v13h13v-9l-4-4-2.29 2.29 2.29 2.29-1.41 1.41L14.59 12 16 10.59 13.41 8 16 6z',
  point: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
  distance: 'M 2 12 L 6 8 L 6 11 H 18 L 18 8 L 22 12 L 18 16 L 18 13 H 6 L 6 16 Z',
  line: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z',
  'point-to-point': 'M4 18l4-4 4 2 8-8 2 2-10 10-4-2-2 2z',
  text: 'M5 4v3h5.5v12h3V7H19V4z',
  move: 'M13 4l3 3h-2v4h4V9l3 3-3 3v-2h-4v4h2l-3 3-3-3h2v-4H7v2L4 12l3-3v2h4V7H9l3-3z',
  copy: 'M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  rotate: 'M12 5V2L8 6l4 4V7c2.76 0 5 2.24 5 5a5 5 0 0 1-8.66 3.41l-1.42 1.42A7 7 0 1 0 12 5z',
  scale: 'M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z',
  offset: 'M5 5h8v2H7v6H5V5zm6 6h8v8h-2v-6h-6v-2z',
  extend: 'M4 12h10V8l6 4-6 4v-4H4z',
  trim: 'M4 7h12v2H4V7zm0 8h7v2H4v-2zm10-7 6 4-6 4V8z',
  'edit-nodes': 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z',
  'edit-curve': 'M4 14c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8-8 3.58-8 8z',
  knife: 'M9.75 12h-2.5v2h2.5v-2z',
  mirror: 'M 12 3 v 18 M 8 8 l -4 4 l 4 4 v -8 z',
  join: 'M6.4 7C5.6 7 5 7.6 5 8.4v7.2c0 .8.6 1.4 1.4 1.4h7.2c.8 0 1.4-.6 1.4-1.4V8.4c0-.8-.6-1.4-1.4-1.4H6.4z',
  'technical-summary': 'M5 4h14v2H5z M5 8h14v2H5z M5 12h10v2H5z M5 16h8v2H5z M17 12l4 4-4 4v-3h-3v-2h3z',
  'open-standards-templates': 'M4 5h7v14H4z M13 5h7v14h-7z M6 7h3 M6 10h3 M15 8h3 M15 11h3 M15 14h3',
  'scan-errors': 'M15.5 14h-.79l-.28-.27A6.5 6.5 0 1 0 16 9.5c0 1.25-.35 2.42-.95 3.42l.27.28h.79l4.99 5L19 20.49 14 15.5zm-6-1.1a.9.9 0 1 1 0-1.8a.9.9 0 0 1 0 1.8zm1-3.4h-2V6h2v3.5z',
  'scan-errors-next': 'M8 5v14l11-7z M4 5h2v14H4z',
  'scan-errors-clear': 'M6 7h12v2H6z M8 11h8v2H8z M10 15h4v2h-4z',
  pencil: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z',
  eye: 'M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z'
} as const;

export const CadIcon: React.FC<{ path: string; className?: string; viewBox?: string }> = ({
  path,
  className = '',
  viewBox = '0 0 24 24'
}) => (
  <svg className={className} viewBox={viewBox} aria-hidden="true" focusable="false">
    <path d={path} />
  </svg>
);
