import React, { useState, useRef } from "react";
import { getDocument, GlobalWorkerOptions, PDFPageProxy } from "pdfjs-dist";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { SketchPicker } from "react-color";

// PDF.js 워커 설정 (개발/빌드 환경 모두 안전)
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

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
  const [template, setTemplate] = useState<"template1" | "template2">(
    "template1"
  );
  const [qrColor, setQrColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [logoSize, setLogoSize] = useState(0.3);
  const [qrShape, setQrShape] = useState<"square" | "round">("square");
  const [preview, setPreview] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 템플릿 & 로고 URL (개발/빌드 환경 모두 안전)
  const templateMap = {
    template1: new URL("../public/assets/template1.png", import.meta.url).href,
    template2: new URL("../public/assets/template2.png", import.meta.url).href,
  };
  const logoSrc = new URL("../public/assets/logo.png", import.meta.url).href;

  // PDF 처리
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
      generateQrOnTemplate(code.data);
    } else {
      alert("QR 코드를 찾을 수 없습니다.");
    }
  };

  // QR + 템플릿 합성
  const generateQrOnTemplate = async (data: string) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const templateImg = new Image();
    templateImg.src = templateMap[template];
    await new Promise<void>((res, rej) => {
      templateImg.onload = () => res();
      templateImg.onerror = () =>
        rej(new Error(`템플릿 로딩 실패: ${templateImg.src}`));
    });

    canvas.width = templateImg.width;
    canvas.height = templateImg.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0);

    // QR 생성
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, data, {
      color: { dark: qrColor, light: bgColor },
      width: 300,
      margin: 1,
    });

    const qrX = 200;
    const qrY = 200;
    const qrSize = 300;

    if (qrShape === "square") {
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(qrX + qrSize / 2, qrY + qrSize / 2, qrSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
      ctx.restore();
    }

    const logoImg = new Image();
    logoImg.src = logoSrc;
    await new Promise<void>((res, rej) => {
      logoImg.onload = () => res();
      logoImg.onerror = () => rej(new Error(`로고 로딩 실패: ${logoImg.src}`));
    });

    const logoDrawSize = qrSize * logoSize;
    const logoX = qrX + qrSize / 2 - logoDrawSize / 2;
    const logoY = qrY + qrSize / 2 - logoDrawSize / 2;
    ctx.drawImage(logoImg, logoX, logoY, logoDrawSize, logoDrawSize);

    setPreview(canvas.toDataURL("image/png"));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handlePdf(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handlePdf(e.target.files[0]);
  };

  const handleSave = async () => {
    if (preview) await window.electronAPI.saveImage(preview);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>QR 템플릿 생성기</h1>

      <div style={{ margin: "10px 0" }}>
        <label>
          <input
            type="radio"
            name="template"
            value="template1"
            checked={template === "template1"}
            onChange={() => setTemplate("template1")}
          />
          템플릿 1
        </label>
        <label style={{ marginLeft: "20px" }}>
          <input
            type="radio"
            name="template"
            value="template2"
            checked={template === "template2"}
            onChange={() => setTemplate("template2")}
          />
          템플릿 2
        </label>
      </div>

      <div style={{ margin: "10px 0", display: "flex", gap: "20px" }}>
        <div>
          <span>QR 전경색</span>
          <SketchPicker
            color={qrColor}
            onChangeComplete={(color: ColorResult) => setQrColor(color.hex)}
          />
        </div>
        <div>
          <span>QR 배경색</span>
          <SketchPicker
            color={bgColor}
            onChangeComplete={(color: ColorResult) => setBgColor(color.hex)}
          />
        </div>
      </div>

      <div style={{ margin: "10px 0" }}>
        <label>
          <input
            type="radio"
            name="qrShape"
            value="square"
            checked={qrShape === "square"}
            onChange={() => setQrShape("square")}
          />
          정사각형
        </label>
        <label style={{ marginLeft: "20px" }}>
          <input
            type="radio"
            name="qrShape"
            value="round"
            checked={qrShape === "round"}
            onChange={() => setQrShape("round")}
          />
          라운드
        </label>
      </div>

      <div style={{ margin: "10px 0", width: "300px" }}>
        <span>로고 크기 (%): {Math.round(logoSize * 100)}</span>
        <input
          type="range"
          min={0.1}
          max={0.5}
          step={0.01}
          value={logoSize}
          onChange={(e) => setLogoSize(parseFloat(e.target.value))}
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          border: "2px dashed #999",
          padding: "20px",
          width: "400px",
          textAlign: "center",
          margin: "10px 0",
          cursor: "pointer",
        }}
      >
        PDF 드래그 앤 드롭
        <br />
        또는
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />
      </div>

      {preview && (
        <div style={{ margin: "10px 0" }}>
          <img
            src={preview}
            alt="미리보기"
            style={{ border: "1px solid #000" }}
          />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {preview && (
        <button
          onClick={handleSave}
          style={{ padding: "10px 20px", fontSize: "16px" }}
        >
          PNG 저장
        </button>
      )}
    </div>
  );
};

export default App;
