function readEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlaceholder(value: string): boolean {
  return (
    !value ||
    value.startsWith('PASTE_YOUR_') ||
    value.startsWith('YOUR_') ||
    value === 'undefined' ||
    value === 'null'
  );
}

export const env = {
  firebase: {
    apiKey: readEnv(import.meta.env.VITE_FIREBASE_API_KEY),
    authDomain: readEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: readEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    storageBucket: readEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: readEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: readEnv(import.meta.env.VITE_FIREBASE_APP_ID),
    measurementId: readEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
    databaseId: readEnv(import.meta.env.VITE_FIREBASE_DATABASE_ID),
  },
  uploads: {
    imgbbApiKey: readEnv(import.meta.env.VITE_IMGBB_API_KEY),
    freeimageApiKey: readEnv(import.meta.env.VITE_FREEIMAGE_API_KEY),
  },
} as const;

const REQUIRED_ENV_CHECKS: Array<{ key: string; value: string }> = [
  { key: 'VITE_FIREBASE_API_KEY', value: env.firebase.apiKey },
  { key: 'VITE_FIREBASE_AUTH_DOMAIN', value: env.firebase.authDomain },
  { key: 'VITE_FIREBASE_PROJECT_ID', value: env.firebase.projectId },
  { key: 'VITE_FIREBASE_STORAGE_BUCKET', value: env.firebase.storageBucket },
  { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', value: env.firebase.messagingSenderId },
  { key: 'VITE_FIREBASE_APP_ID', value: env.firebase.appId },
];

export const missingRequiredEnvVars: string[] = REQUIRED_ENV_CHECKS.filter((item) =>
  isPlaceholder(item.value)
).map((item) => item.key);

export const isEnvConfigured: boolean = missingRequiredEnvVars.length === 0;
