// Polyfill requerido por amazon-cognito-identity-js para correr en navegador.
// IMPORTANTE: este archivo debe importarse ANTES que cualquier otro módulo
// (los imports ES modules son hoisteados, así que el orden de los `import`
// statements en main.ts determina el orden de evaluación).
(window as unknown as { global: typeof window }).global = window;
