<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>3D Background Image Controller</title>
<style>
  body {
    margin: 0;
    height: 100vh;
    overflow: hidden;
    background: #111;
    display: flex;
    justify-content: center;
    align-items: center;
    perspective: 1200px;
    font-family: 'Segoe UI', sans-serif;
    color: #fff;
  }

  .scene {
    width: 80%;
    height: 80%;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.1s ease;
    cursor: default;
    z-index: 1;
  }

  .scene img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background-color: #000;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    transform: rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1);
    transition: transform 0.1s ease, filter 0.3s ease;
    filter: brightness(1) blur(0px);
    user-select: none;
    pointer-events: none;
    position: relative;
  }

  .control-card {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    width: 260px;
    z-index: 9999;
  }

  .control-card h3 { margin-top:0; font-size:1.1em; text-align:center; }

  .control { margin-bottom:12px; }
  .control label { font-size:0.9em; display:block; margin-bottom:4px; }
  .control input[type='range'], .control select, .control input[type='color'] { width:100%; }

  .toggle-group { display:flex; justify-content:space-between; gap:6px; }
  .toggle-group button {
    flex:1;
    padding:6px 0;
    border:none;
    border-radius:6px;
    background: rgba(255,255,255,0.15);
    color:#fff;
    cursor:pointer;
    transition:0.2s;
  }
  .toggle-group button.active { background:#0f0; color:#000; }

  .image-info {
    font-size:0.8em;
    background: rgba(0,0,0,0.3);
    padding:4px 6px;
    border-radius:6px;
    margin-top:6px;
    text-align:center;
    word-break: break-word;
  }

  .btn-group { display:flex; justify-content:space-between; gap:6px; margin-top:6px; }
  .btn-group button {
    flex:1;
    padding:6px 0;
    border:none;
    border-radius:6px;
    background: rgba(255,255,255,0.15);
    color:#fff;
    cursor:pointer;
    transition:0.2s;
  }
  .btn-group button:hover { background:#0f0; color:#000; }
</style>
</head>
<body>
<div class="scene" id="scene">
  <img id="bgImage" src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80" alt="3D Background" draggable="false" />
</div>

<div class="control-card">
  <h3>Image Controls</h3>

  <div class="control"><label for="translateZ">Depth (Z)</label><input type="range" id="translateZ" min="0" max="200" value="0"></div>
  <div class="control"><label for="scale">Scale</label><input type="range" id="scale" min="0.5" max="2" step="0.01" value="1"></div>
  <div class="control"><label for="blur">Blur</label><input type="range" id="blur" min="0" max="10" step="0.1" value="0"></div>
  <div class="control"><label for="brightness">Brightness</label><input type="range" id="brightness" min="0.5" max="2" step="0.01" value="1"></div>

  <div class="control">
    <label>Image Fit</label>
    <div class="toggle-group" id="fitToggle">
      <button data-fit="contain" class="active">Contain</button>
      <button data-fit="cover">Cover</button>
    </div>
  </div>

  <div class="control">
    <label for="filterPreset">Filter Preset</label>
    <select id="filterPreset">
      <option value="normal">Normal</option>
      <option value="grayscale">Grayscale</option>
      <option value="warm">Warm</option>
      <option value="cool">Cool</option>
      <option value="sepia">Sepia</option>
    </select>
  </div>

  <div class="control">
    <label for="bgColor">Background Color</label>
    <input type="color" id="bgColor" value="#000000">
  </div>

  <div class="control image-info" id="imageInfo">이미지 업로드가 필요합니다.</div>

  <div class="btn-group">
    <button id="cancelImage">취소</button>
    <button id="downloadImage">다운로드</button>
  </div>
</div>

<script>
const img = document.getElementById('bgImage');
const translateZ = document.getElementById('translateZ');
const scale = document.getElementById('scale');
const blur = document.getElementById('blur');
const brightness = document.getElementById('brightness');
const fitToggle = document.getElementById('fitToggle');
const filterPreset = document.getElementById('filterPreset');
const bgColor = document.getElementById('bgColor');
const imageInfo = document.getElementById('imageInfo');
const cancelImage = document.getElementById('cancelImage');
const downloadImage = document.getElementById('downloadImage');
const scene = document.getElementById('scene');

let currentImageSrc = img.src;

// 이미지 변환 업데이트
function updateTransform(mouseX=0, mouseY=0) {
  const centerX = window.innerWidth/2;
  const centerY = window.innerHeight/2;

  const deltaX = mouseX - centerX;
  const deltaY = mouseY - centerY;

  const rotY = deltaX * 0.02; // 감도 조절
  const rotX = -deltaY * 0.02;

  img.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(${translateZ.value}px) scale(${scale.value})`;
  applyFilter();
}

// 필터 적용
function applyFilter() {
  let filter = `blur(${blur.value}px) brightness(${brightness.value})`;
  switch(filterPreset.value){
    case 'grayscale': filter+=' grayscale(1)'; break;
    case 'warm': filter+=' sepia(0.3) saturate(1.3)'; break;
    case 'cool': filter+=' contrast(1.1) hue-rotate(180deg)'; break;
    case 'sepia': filter+=' sepia(1)'; break;
  }
  img.style.filter = filter;
}

// 슬라이더 이벤트
document.querySelectorAll('.control input[type="range"]').forEach(input=>{
  input.addEventListener('input', ()=>updateTransform());
});
filterPreset.addEventListener('change', applyFilter);

// 이미지 fit toggle
fitToggle.querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    fitToggle.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    img.style.objectFit = btn.dataset.fit;
  });
});

// 배경 색상 변경
bgColor.addEventListener('input', ()=>{
  img.style.backgroundColor = bgColor.value;
});

// 이미지 취소
cancelImage.addEventListener('click', ()=>{
  img.src = currentImageSrc;
  imageInfo.textContent = '이미지 업로드가 필요합니다.';
});

// 이미지 다운로드
downloadImage.addEventListener('click', ()=>{
  const link = document.createElement('a');
  link.href = img.src;
  link.download = 'image.png';
  link.click();
});

// 드래그앤드롭 업로드
document.body.addEventListener('dragover', e=>{ e.preventDefault(); scene.style.outline='2px dashed #0f0'; });
document.body.addEventListener('dragleave', e=>{ e.preventDefault(); scene.style.outline='none'; });
document.body.addEventListener('drop', e=>{
  e.preventDefault();
  scene.style.outline='none';
  const file = e.dataTransfer.files[0];
  if(file && file.type.startsWith('image/')){
    const reader = new FileReader();
    reader.onload = function(event){
      img.src = event.target.result;
      imageInfo.textContent = `업로드됨: ${file.name} (${Math.round(file.size/1024)} KB)`;
    };
    reader.readAsDataURL(file);
  } else {
    imageInfo.textContent = '이미지 파일만 올릴 수 있습니다.';
  }
});

// 마우스 이동 이벤트
document.addEventListener('mousemove', e=>{
  updateTransform(e.clientX, e.clientY);
});
</script>
</body>
</html>
