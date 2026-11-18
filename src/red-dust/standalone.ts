import React from 'react';
import { createRoot } from 'react-dom/client';
import RedDustShell from '../ui/RedDustShell';

const rootEl = document.getElementById('app');
if (rootEl) {
  createRoot(rootEl).render(React.createElement(RedDustShell));
}
