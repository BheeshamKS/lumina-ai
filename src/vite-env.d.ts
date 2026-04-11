/// <reference types="vite/client" />

interface Window {
  isMigratingChat?: boolean;
}

interface WindowEventMap {
  migrationComplete: Event;
}
