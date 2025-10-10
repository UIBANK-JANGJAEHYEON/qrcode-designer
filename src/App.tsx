import React, { useState, useEffect, useRef } from "react";
import { getDocument, GlobalWorkerOptions, PDFPageProxy } from "pdfjs-dist";
import QRCodeStyling from "qr-code-styling";
import jsQR from "jsqr";
import jsPDF from "jspdf";
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
  shopNameY: number;
  shopNameFontColor: string;
};

const App: React.FC = () => {
  // 템플릿에 관한 정보를 모아 둠.
  const templates: { [key: string]: Template } = {
    template1: {
      src: new URL("../public/assets/template1.png", import.meta.url).href,
      qrX: 324,
      qrY: 750,
      qrSize: 1100,
      shopNameY: 570,
      shopNameFontColor: "#FFFFFF",
    },
    template2: {
      src: new URL("../public/assets/template2.png", import.meta.url).href,
      qrX: 324,
      qrY: 750,
      qrSize: 1100,
      shopNameY: 2200,
      shopNameFontColor: "#000000",
    },
  };
  const logoSrc = new URL("../public/assets/logo.png", import.meta.url).href;

  const [template, setTemplate] = useState<"template1" | "template2">(
    "template1"
  );
  const [logoSize, setLogoSize] = useState(0.35);
  const [debouncedLogoSize, setDebouncedLogoSize] = useState(logoSize);
  const [qrDotsType, setQrDotsType] = useState<
    | "square"
    | "dots"
    | "rounded"
    | "extra-rounded"
    | "classy"
    | "classy-rounded"
  >("square");
  const [qrCornorsSqareType, setQrCornorsSqareType] = useState<
    "square" | "extra-rounded" | "dot"
  >("square");
  const [qrDotsColor, setQrDotsColor] = useState("#000000");
  const [debouncedQrDotsColor, setDebouncedQrDotsColor] = useState(qrDotsColor);
  const [qrCornorsColor, setQrCornorsColor] = useState("#000000");
  const [debouncedQrCornorsColor, setDebouncedQrCornorsColor] =
    useState(qrCornorsColor);
  const [qrBackgroundColor, setQrBackgroundColor] = useState("#FFFFFF");
  const [debouncedQrBackgroundColor, setDebouncedQrBackgroundColor] =
    useState(qrBackgroundColor);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState(templates[template].src);
  const [shopName, setShopName] = useState("");
  const [debouncedShopName, setDebouncedShopName] = useState(shopName);
  const [shopNameFontSize, setShopNameFontSize] = useState(100);
  const [debouncedShopNameFontSize, setDebouncedShopNameFontSize] =
    useState(shopNameFontSize);
  const [downloadFormat, setDownloadFormat] = useState<"png" | "jpg" | "pdf">(
    "pdf"
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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
        color: qrDotsColor,
        type: qrDotsType,
      },
      cornersSquareOptions: {
        type: qrCornorsSqareType,
        color: qrCornorsColor,
      },
      backgroundOptions: {
        color: qrBackgroundColor,
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

    // 6️⃣ 텍스트 추가
    ctx.save();
    ctx.fillStyle = currentTemplate.shopNameFontColor; // 글자 색상
    ctx.font = `bold ${shopNameFontSize}px Pretendard`; // 글꼴과 크기
    ctx.textAlign = "center"; // 가로 가운데 정렬
    ctx.textBaseline = "middle"; // 세로 기준
    ctx.fillText(shopName, canvas.width / 2, currentTemplate.shopNameY);
    ctx.restore();

    // 6️⃣ 최종 PNG 반환
    return canvas.toDataURL("image/png");
  };

  // 큐알 데이터 제거, 모든 항목 초기화
  const clearState = () => {
    setQrCodeData(null);
    setLogoSize(0.35);
    setQrDotsType("square");
    setQrCornorsSqareType("extra-rounded");
    setShopName("");
    setShopNameFontSize(100);
    setQrDotsColor("#000000");
    setQrCornorsColor("#000000");
    setQrBackgroundColor("#FFFFFF");
    setDownloadFormat("pdf");
    setScale(1);
  };

  // 이미지 저장
  const handleSave = async () => {
    if (!qrCodeData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const defaultName = shopName || "qr_code";

    if (downloadFormat === "png" || downloadFormat === "jpg") {
      const mime = downloadFormat === "png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(mime, 1.0);
      await window.electronAPI.saveImage(dataUrl, downloadFormat, defaultName);
    } else if (downloadFormat === "pdf") {
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      const pdfDataUrl = pdf.output("datauristring");
      await window.electronAPI.saveImage(pdfDataUrl, "pdf", defaultName);
    }
  };

  // pdf를 이미지화하고 qr코드를 인식하고 분석하는 것 까지
  const handlePdf = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("PDFファイルをアップロードしてください。");
      return;
    }

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
      setQrCodeData(code.data);
    } else {
      alert("QRコードが見つかりません。");
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

  // 가맹점명 변경이 너무 자주 일어나면 무거우니까 디바운스 처리
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedShopName(shopName);
    }, 100); // 100ms 동안 멈춰야 업데이트

    return () => clearTimeout(handler);
  }, [shopName]);

  // 로고사이즈 변경이 너무 자주 일어나면 무거우니까 디바운스 처리
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLogoSize(logoSize);
    }, 100); // 100ms 동안 멈춰야 업데이트

    return () => clearTimeout(handler);
  }, [logoSize]);

  // 폰트사이즈 변경이 너무 자주 일어나면 무거우니까 디바운스 처리
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedShopNameFontSize(shopNameFontSize);
    }, 100); // 100ms 동안 멈춰야 업데이트

    return () => clearTimeout(handler);
  }, [shopNameFontSize]);

  // 큐알 점 색 변경이 너무 자주 일어나면 무거우니까 디바운스 처리
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQrDotsColor(qrDotsColor);
    }, 100); // 100ms 동안 멈춰야 업데이트

    return () => clearTimeout(handler);
  }, [qrDotsColor]);

  // 큐알 코너 색 변경이 너무 자주 일어나면 무거우니까 디바운스 처리
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQrCornorsColor(qrCornorsColor);
    }, 100); // 100ms 동안 멈춰야 업데이트

    return () => clearTimeout(handler);
  }, [qrCornorsColor]);

  // 큐알 배경 색 변경이 너무 자주 일어나면 무거우니까 디바운스 처리
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQrBackgroundColor(qrBackgroundColor);
    }, 100); // 100ms 동안 멈춰야 업데이트

    return () => clearTimeout(handler);
  }, [qrBackgroundColor]);

  // 각 값들이 바뀌면 프리뷰 이미지를 갱신을 위해.
  useEffect(() => {
    renderPreviewImage();
  }, [
    template,
    qrCodeData,
    debouncedLogoSize,
    qrCornorsSqareType,
    qrDotsType,
    debouncedShopName,
    debouncedShopNameFontSize,
    debouncedQrDotsColor,
    debouncedQrCornorsColor,
    debouncedQrBackgroundColor,
  ]);

  // 컴포넌트 초기 렌더링시에 등록할 이벤트 리스너. 마우스 이동에 따른 회전, 마우스 드래그, 드래그 앤 드롭
  useEffect(() => {
    function updateDragOverlay() {
      if (
        !imgRef.current ||
        !imgRef.current.parentElement ||
        !overlayRef.current
      )
        return;

      const rect = imgRef.current.getBoundingClientRect();
      const containerRect =
        imgRef.current.parentElement.getBoundingClientRect();
      overlayRef.current.style.left = rect.left - containerRect.left + "px";
      overlayRef.current.style.top = rect.top - containerRect.top + "px";
      overlayRef.current.style.width = rect.width + "px";
      overlayRef.current.style.height = rect.height + "px";
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updateDragOverlay();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!e.dataTransfer) return;

      if (e.dataTransfer.files.length > 0) handlePdf(e.dataTransfer.files[0]);
    };

    document.body.addEventListener("dragover", handleDragOver);
    document.body.addEventListener("dragleave", handleDragLeave);
    document.body.addEventListener("drop", handleDrop);

    // 언마운트 시 이벤트 제거
    return () => {
      document.body.removeEventListener("dragover", handleDragOver);
      document.body.removeEventListener("dragleave", handleDragLeave);
      document.body.removeEventListener("drop", handleDrop);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!imgRef.current) return;

      // 마우스가 컨트롤 패널 위에 있는지 확인
      const controlCard = document.querySelector(".control-card");
      if (controlCard) {
        const rect = controlCard.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          // 컨트롤 패널 위면 정면 고정
          imgRef.current.style.transform = `rotateX(0deg) rotateY(0deg) scale(${scale})`;
          return;
        }
      }

      // 컨트롤 패널 밖이면 기존 회전 로직 적용
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const deltaX = mouseX - centerX;
      const deltaY = mouseY - centerY;

      const rotY = deltaX * 0.03;
      const rotX = -deltaY * 0.03;

      imgRef.current.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
    };

    document.body.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.body.removeEventListener("mousemove", handleMouseMove);
    };
  }, [scale]);

  return (
    <div className="container">
      <div className="scene" id="scene">
        <img id="bgImage" src={imgSrc} draggable="false" ref={imgRef} />
        <div
          className={`drag-overlay ${isDragging ? "active" : ""}`}
          id="dragOverlay"
          ref={overlayRef}
        ></div>
      </div>

      <div className={`control-card ${qrCodeData ? "" : "disabled"}`}>
        <h3>コントロール</h3>

        <div className="control">
          <label htmlFor="scale">拡大/縮小</label>
          <input
            type="range"
            id="scale"
            min="0.5"
            max="2"
            step="0.01"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
        </div>

        <div
          className={`control image-info ${qrCodeData ? "" : "error"}`}
          id="imageInfo"
        >
          {qrCodeData
            ? `QR読取済: ${qrCodeData}`
            : "QRコードを含むPDFファイルをドラッグ＆ドロップしてください。"}
        </div>

        <div className="control">
          <label>背景</label>
          <div className="toggle-group">
            <button
              className={`exclude-hover ${
                template === "template1" ? "active" : ""
              }`}
              onClick={() => setTemplate("template1")}
            >
              タイプ1
            </button>
            <button
              className={`exclude-hover ${
                template === "template2" ? "active" : ""
              }`}
              onClick={() => setTemplate("template2")}
            >
              タイプ2
            </button>
          </div>
        </div>

        <div className="control">
          <label>QRスタイル（点）</label>
          <div className="toggle-group">
            <button
              className={qrCodeData && qrDotsType === "square" ? "active" : ""}
              onClick={() => setQrDotsType("square")}
              disabled={!qrCodeData}
            >
              square
            </button>
            <button
              className={qrCodeData && qrDotsType === "dots" ? "active" : ""}
              onClick={() => setQrDotsType("dots")}
              disabled={!qrCodeData}
            >
              dots
            </button>
            <button
              className={qrCodeData && qrDotsType === "rounded" ? "active" : ""}
              onClick={() => setQrDotsType("rounded")}
              disabled={!qrCodeData}
            >
              rounded
            </button>
            <button
              className={
                qrCodeData && qrDotsType === "extra-rounded" ? "active" : ""
              }
              onClick={() => setQrDotsType("extra-rounded")}
              disabled={!qrCodeData}
            >
              extra-rounded
            </button>
            <button
              className={qrCodeData && qrDotsType === "classy" ? "active" : ""}
              onClick={() => setQrDotsType("classy")}
              disabled={!qrCodeData}
            >
              classy
            </button>
            <button
              className={
                qrCodeData && qrDotsType === "classy-rounded" ? "active" : ""
              }
              onClick={() => setQrDotsType("classy-rounded")}
              disabled={!qrCodeData}
            >
              classy-rounded
            </button>
          </div>
        </div>
        <div className="control">
          <label>QRスタイル（角）</label>
          <div className="toggle-group">
            <button
              className={
                qrCodeData && qrCornorsSqareType === "square" ? "active" : ""
              }
              onClick={() => setQrCornorsSqareType("square")}
              disabled={!qrCodeData}
            >
              square
            </button>
            <button
              className={
                qrCodeData && qrCornorsSqareType === "extra-rounded"
                  ? "active"
                  : ""
              }
              onClick={() => setQrCornorsSqareType("extra-rounded")}
              disabled={!qrCodeData}
            >
              extra-rounded
            </button>
            <button
              className={
                qrCodeData && qrCornorsSqareType === "dot" ? "active" : ""
              }
              onClick={() => setQrCornorsSqareType("dot")}
              disabled={!qrCodeData}
            >
              dot
            </button>
          </div>
        </div>

        <div className="control">
          <label>QR色</label>
          <div className="color-group">
            <div className="color-item">
              <span>点</span>
              <input
                type="color"
                list="presetColors"
                value={qrDotsColor}
                disabled={!qrCodeData}
                onChange={(e) => setQrDotsColor(e.target.value)}
              />
            </div>
            <div className="color-item">
              <span>角</span>
              <input
                type="color"
                list="presetColors"
                value={qrCornorsColor}
                disabled={!qrCodeData}
                onChange={(e) => setQrCornorsColor(e.target.value)}
              />
            </div>
            <div className="color-item">
              <span>背景</span>
              <input
                type="color"
                list="presetColors"
                value={qrBackgroundColor}
                disabled={!qrCodeData}
                onChange={(e) => setQrBackgroundColor(e.target.value)}
              />
            </div>
          </div>

          <datalist id="presetColors">
            <option value="#ffffff">White</option>
            <option value="#ff6666">Red</option>
            <option value="#ffcc66">Orange</option>
            <option value="#ffff66">Yellow</option>
            <option value="#66ff66">Green</option>
            <option value="#66ccff">Blue</option>
            <option value="#cc99ff">Purple</option>
            <option value="#ff99cc">Pink</option>
            <option value="#cccccc">Gray</option>
          </datalist>
        </div>

        <div className="control">
          <label htmlFor="logoSize">ロゴサイズ</label>
          <input
            type="range"
            id="logoSize"
            min="0"
            max="1"
            step="0.05"
            value={logoSize}
            disabled={!qrCodeData}
            onChange={(e) => setLogoSize(Number(e.target.value))}
          />
        </div>

        <div className="control">
          <label htmlFor="shopName">加盟店名</label>
          <input
            type="text"
            id="shopName"
            placeholder="加盟店名をご入力ください。"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            disabled={!qrCodeData}
          />
        </div>

        <div className="control">
          <label htmlFor="fontSize">フォントサイズ</label>
          <input
            type="range"
            id="fontSize"
            min="30"
            max="200"
            step="0.05"
            value={shopNameFontSize}
            disabled={!qrCodeData}
            onChange={(e) => setShopNameFontSize(Number(e.target.value))}
          />
        </div>

        <div className="control">
          <label>ダウンロード形式</label>
          <div className="toggle-group format-toggle">
            <button
              className={qrCodeData && downloadFormat === "png" ? "active" : ""}
              onClick={() => setDownloadFormat("png")}
              disabled={!qrCodeData}
            >
              PNG
            </button>
            <button
              className={qrCodeData && downloadFormat === "jpg" ? "active" : ""}
              onClick={() => setDownloadFormat("jpg")}
              disabled={!qrCodeData}
            >
              JPG
            </button>
            <button
              className={qrCodeData && downloadFormat === "pdf" ? "active" : ""}
              onClick={() => setDownloadFormat("pdf")}
              disabled={!qrCodeData}
            >
              PDF
            </button>
          </div>
        </div>

        <div className="btn-group">
          <button className="exclude-hover" onClick={clearState}>
            クリア
          </button>
          <button onClick={handleSave} disabled={!qrCodeData}>
            ダウンロード
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default App;
