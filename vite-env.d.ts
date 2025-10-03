/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  // 필요한 다른 환경변수 추가 가능
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
