export {};

declare global {
  interface Window {
    electronAPI: {
      saveImage: (dataUrl: string) => Promise<void>;
      selectImage?: () => Promise<string | null>;
      // 필요하면 다른 IPC 함수 추가
    };
  }
}