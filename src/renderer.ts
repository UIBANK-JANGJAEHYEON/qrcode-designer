const dropZone = document.getElementById('drop-zone')!;
const preview = document.getElementById('preview') as HTMLImageElement;
const selectButton = document.getElementById('select-file')!;

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'blue';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.borderColor = '#ccc';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '#ccc';

  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
});

selectButton.addEventListener('click', async () => {
  const filePath = await window.api.selectImage(); // preload를 통해 안전하게 호출
  if (filePath) {
    preview.src = `file://${filePath}`;
  }
});
