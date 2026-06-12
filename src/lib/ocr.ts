// OCR del ticket 100% en el dispositivo (tesseract.js).
// La foto nunca sale del teléfono. Solo se importa desde /dividir,
// y tesseract se carga dinámicamente para no engordar las demás páginas.

const MAX_DIMENSION = 1600;

// Escala + escala de grises + estiramiento de contraste (percentiles 5/95).
// No binarizamos a mano: Tesseract lo hace mejor con impresión térmica dispareja.
async function preprocess(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const image = ctx.getImageData(0, 0, width, height);
  const px = image.data;

  // Luma + histograma
  const histogram = new Uint32Array(256);
  const grays = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const gray = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    grays[j] = gray;
    histogram[Math.round(gray)]++;
  }

  // Percentiles 5 y 95 para estirar el contraste
  const totalPx = width * height;
  let low = 0;
  let high = 255;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += histogram[v];
    if (acc >= totalPx * 0.05) {
      low = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += histogram[v];
    if (acc >= totalPx * 0.05) {
      high = v;
      break;
    }
  }
  const range = Math.max(1, high - low);

  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const stretched = Math.max(0, Math.min(255, ((grays[j] - low) * 255) / range));
    px[i] = px[i + 1] = px[i + 2] = stretched;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export async function ocrReceipt(
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  const canvas = await preprocess(file);

  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const worker = await createWorker("spa", OEM.LSTM_ONLY, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr",
    langPath: "/ocr/lang",
    logger: (m) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });

  try {
    await worker.setParameters({
      // Una sola columna de texto: el layout típico de un ticket
      tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
      preserve_interword_spaces: "1",
    });
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    // Liberar memoria en iOS
    await worker.terminate();
  }
}
