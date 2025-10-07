import React, { useState, useEffect, useRef } from "react";
import { getDocument, GlobalWorkerOptions, PDFPageProxy } from "pdfjs-dist";
// import QRCode from "qrcode";
import QRCodeStyling from "qr-code-styling";
import jsQR from "jsqr";
import { SketchPicker } from "react-color";
import "./App.css";

// PDF.js 워커 설정 (개발/빌드 환경 모두 안전)
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// template의 타입을 정의
type Template = {
  src: string;
  qrX: number;
  qrY: number;
  qrSize: number;
};

// ColorResult 타입 정의
interface ColorResult {
  hex: string;
  rgb: { r: number; g: number; b: number; a: number };
  hsl: { h: number; s: number; l: number; a: number };
  hsv: { h: number; s: number; v: number; a: number };
  oldHue: number;
  source: string;
}

const App: React.FC = () => {
  // 템플릿에 관한 정보를 모아 둠.
  const templates: { [key: string]: Template } = {
    template1: {
      src: new URL("../public/assets/template1.png", import.meta.url).href,
      qrX: 324,
      qrY: 750,
      qrSize: 1100,
    },
    template2: {
      src: new URL("../public/assets/template2.png", import.meta.url).href,
      qrX: 324,
      qrY: 750,
      qrSize: 1100,
    },
  };
  const logoSrc = new URL("../public/assets/logo.png", import.meta.url).href;

  const [template, setTemplate] = useState<"template1" | "template2">(
    "template1"
  );
  const [qrColor, setQrColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [logoSize, setLogoSize] = useState(0.35);
  const [qrShape, setQrShape] = useState<"square" | "round">("square");
  const [preview, setPreview] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState(templates[template].src);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateQrOnTemplate = async (): Promise<string | null> => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const currentTemplate = templates[template];

    // 1️⃣ 템플릿 이미지 로딩
    const templateImg = new Image();
    templateImg.crossOrigin = "anonymous";
    templateImg.src = currentTemplate.src;
    await new Promise<void>((resolve, reject) => {
      templateImg.onload = () => resolve();
      templateImg.onerror = () =>
        reject(new Error(`템플릿 로딩 실패: ${templateImg.src}`));
    });

    canvas.width = templateImg.width;
    canvas.height = templateImg.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0);

    // 2️⃣ QR 코드 생성 (로고 없이)
    const qrSize = currentTemplate.qrSize;
    const qrX = currentTemplate.qrX;
    const qrY = currentTemplate.qrY;

    const qrCode = new QRCodeStyling({
      width: qrSize,
      height: qrSize,
      data: qrCodeData ?? "",
      dotsOptions: {
        color: qrColor ?? "#000000",
        type: qrShape === "square" ? "square" : "rounded",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: qrColor ?? "#000000",
      },
      backgroundOptions: {
        color: "#FFFFFF",
      },
      qrOptions: {
        errorCorrectionLevel: "H",
      },
    });

    // QR Blob → Canvas로 변환
    const qrBlob = (await qrCode.getRawData("png")) as Blob;
    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.src = URL.createObjectURL(qrBlob);
    await new Promise<void>((resolve) => (qrImg.onload = () => resolve()));

    const qrCanvas = document.createElement("canvas");
    qrCanvas.width = qrImg.width;
    qrCanvas.height = qrImg.height;
    qrCanvas.getContext("2d")!.drawImage(qrImg, 0, 0);

    // 3️⃣ QR 먼저 캔버스에 그리기
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // 4️⃣ 로고 배경 라운드 사각형
    const logoDrawSize = qrSize * logoSize;
    const logoX = qrX + qrSize / 2 - logoDrawSize / 2;
    const logoY = qrY + qrSize / 2 - logoDrawSize / 2;
    const cornerRadius = logoDrawSize * 0.2;

    ctx.save();
    ctx.fillStyle = "white";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoDrawSize, logoDrawSize, cornerRadius);
      ctx.fill();
    } else {
      // fallback
      ctx.beginPath();
      ctx.moveTo(logoX + cornerRadius, logoY);
      ctx.lineTo(logoX + logoDrawSize - cornerRadius, logoY);
      ctx.quadraticCurveTo(
        logoX + logoDrawSize,
        logoY,
        logoX + logoDrawSize,
        logoY + cornerRadius
      );
      ctx.lineTo(logoX + logoDrawSize, logoY + logoDrawSize - cornerRadius);
      ctx.quadraticCurveTo(
        logoX + logoDrawSize,
        logoY + logoDrawSize,
        logoX + logoDrawSize - cornerRadius,
        logoY + logoDrawSize
      );
      ctx.lineTo(logoX + cornerRadius, logoY + logoDrawSize);
      ctx.quadraticCurveTo(
        logoX,
        logoY + logoDrawSize,
        logoX,
        logoY + logoDrawSize - cornerRadius
      );
      ctx.lineTo(logoX, logoY + cornerRadius);
      ctx.quadraticCurveTo(logoX, logoY, logoX + cornerRadius, logoY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 5️⃣ 로고 그리기
    if (logoSrc) {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = logoSrc;
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject(new Error("로고 로딩 실패"));
      });
      ctx.drawImage(logoImg, logoX, logoY, logoDrawSize, logoDrawSize);
    }

    // 6️⃣ 최종 PNG 반환
    return canvas.toDataURL("image/png");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handlePdf(e.target.files[0]);
  };

  // 이미지 저장
  const handleSave = () => {
    if (qrCodeData === null) {
      alert("qr코드를 먼저 업로드하세요!!!");
      return;
    }

    window.electronAPI.saveImage(imgSrc);
  };

  // pdf를 이미지화하고 qr코드를 인식하고 분석하는 것 까지
  const handlePdf = async (file: File) => {
    if (file.type !== "application/pdf") return;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const page: PDFPageProxy = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;

    await page.render({ canvas: tempCanvas, viewport }).promise;

    const tempCtx = tempCanvas.getContext("2d")!;
    const imageData = tempCtx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );

    const code = jsQR(imageData.data, tempCanvas.width, tempCanvas.height);
    if (code) {
      // generateQrOnTemplate(code.data);
      setQrCodeData(code.data);
    } else {
      alert("QR 코드를 찾을 수 없습니다.");
    }
  };

  const renderPreviewImage = async () => {
    // qr코드가 아직 업로드되지 않은 상태에서는 템플릿 이미지만 나오게
    if (qrCodeData === null) {
      setImgSrc(templates[template].src);
      return;
    }

    const previewImgSrc = (await generateQrOnTemplate()) as string;
    setImgSrc(previewImgSrc);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handlePdf(e.dataTransfer.files[0]);
  };

  // 이거 무조건 해줘야 드롭 이벤트가 발동된다.
  const handledragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // 각 값들이 바뀌면 프리뷰 이미지를 갱신을 위해.
  useEffect(() => {
    renderPreviewImage();
  }, [template, qrCodeData]);

  return (
    <div className="container">
      <div className="customize-box">
        <div className="customize-field">
          <div className="customize-field-title">배경 타입</div>
          <div className="customize-field-items">
            <input
              type="radio"
              name="template-type"
              id="type1"
              checked={template === "template1"}
              onChange={() => setTemplate("template1")}
            />
            <label htmlFor="type1">타입1</label>
            <input
              type="radio"
              name="template-type"
              id="type2"
              checked={template === "template2"}
              onChange={() => setTemplate("template2")}
            />
            <label htmlFor="type2">타입2</label>
          </div>
        </div>
        <div className="customize-field">크기</div>
        <button onClick={handleSave}>다운로드</button>
      </div>
      <div className="preview-box">
        <img
          src={imgSrc}
          className="preview-image"
          onDrop={handleDrop}
          onDragOver={handledragOver}
        />
        <div className="qr-code-information">
          <div>
            {qrCodeData
              ? `qr코드 데이터: ${qrCodeData}`
              : "qr코드를 업로드해 주세요."}
          </div>
          <button onClick={() => setQrCodeData(null)}>
            큐알코드 선택 취소
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default App;
