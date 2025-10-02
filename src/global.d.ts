export {};

declare global {
  interface Window {
    api: {
      selectImage: () => Promise<string | null>;
    };
  }
}