export {};

declare global {
  interface Window {
    electronAPI: {
      /**
       * 이미지 또는 PDF를 저장
       * @param dataUrl - 저장할 데이터 URL (PNG, JPG, PDF)
       * @param format - 저장 형식 ('png' | 'jpg' | 'pdf')
       * @param defaultFileName - 기본 파일명 (확장자 제외)
       */
      saveImage: (
        dataUrl: string,
        format: "png" | "jpg" | "pdf",
        defaultFileName?: string
      ) => Promise<{ success: boolean; filePath?: string; error?: any }>;

      /**
       * 선택 이미지 가져오기 (선택적)
       */
      selectImage?: () => Promise<string | null>;

      // 필요하면 다른 IPC 함수 추가 가능
    };
  }
}