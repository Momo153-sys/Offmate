
import type { Resource } from '../domain/resources';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';



export function openDocument(resource: Resource): void {
  if (resource.kind !== 'document' || !resource.file) {
    throw new Error('No document file available.');
  }

  const url = URL.createObjectURL(resource.file);

  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', resource.title);

  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9998',
    display: 'flex',
    flexDirection: 'column',
    background: '#f3f4f6',
    color: '#111827',
  });

  const toolbar = document.createElement('div');
  Object.assign(toolbar.style, {
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: 'max(12px, env(safe-area-inset-top)) 12px 12px',
    background: '#ffffff',
    borderBottom: '1px solid #d1d5db',
  });

  const title = document.createElement('span');
  title.textContent = resource.title;
  Object.assign(title.style, {
    minWidth: '0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: '600',
  });

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  Object.assign(closeButton.style, {
    flex: '0 0 auto',
    padding: '9px 13px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    background: '#ffffff',
    color: '#111827',
    fontSize: '14px',
  });

  const content = document.createElement('div');
  Object.assign(content.style, {
    flex: '1 1 auto',
    minHeight: '0',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '12px',
  });

  let disposed = false;
  let resizeObserver: ResizeObserver | undefined;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    resizeObserver?.disconnect();
    window.removeEventListener('resize', handleResize);
    overlay.remove();
    URL.revokeObjectURL(url);
  };

  closeButton.addEventListener('click', cleanup);

  overlay.append(toolbar, content);
  toolbar.append(title, closeButton);
  document.body.appendChild(overlay);

  function handleResize() {
    // PDF page canvases are resized by the PDF rendering routine.
  }

  if (resource.file.type === 'application/pdf' ||
      resource.title.toLowerCase().endsWith('.pdf')) {
    void renderPdf();
  } else {
    const preview = document.createElement('iframe');
    preview.src = url;
    preview.title = resource.title;
    Object.assign(preview.style, {
      width: '100%',
      height: '100%',
      minHeight: '70vh',
      border: 'none',
      background: '#ffffff',
    });
    content.appendChild(preview);
  }

  async function renderPdf() {
    const message = document.createElement('p');
    message.textContent = 'Loading PDF…';
    message.style.textAlign = 'center';
    content.appendChild(message);

    try {
      const pdfjs = await import('pdfjs-dist');
      const data = new Uint8Array(await resource.file!.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data }).promise;

      message.remove();

      const pages: HTMLCanvasElement[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        if (disposed) {
          return;
        }

        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(200, content.clientWidth - 24);
        const scale = availableWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Could not render the PDF page.');
        }

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.display = 'block';
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        canvas.style.margin = '0 auto 16px';
        canvas.style.background = '#ffffff';
        canvas.style.boxShadow = '0 1px 5px rgba(0,0,0,0.16)';

        const pageContainer = document.createElement('div');
        pageContainer.style.width = '100%';
        pageContainer.appendChild(canvas);
        content.appendChild(pageContainer);
        pages.push(canvas);

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: pixelRatio === 1
            ? undefined
            : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        }).promise;
      }

      resizeObserver = new ResizeObserver(() => {
        // Keep the rendered pages stable while scrolling.
        // A full re-render on rotation can be added if needed.
      });
      resizeObserver.observe(content);
    } catch (error) {
      if (disposed) return;
      message.textContent =
        error instanceof Error
          ? `Could not display PDF: ${error.message}`
          : 'Could not display this PDF.';
    }
  }

  window.addEventListener('resize', handleResize);
}




export async function downloadDocument(resource: Resource): Promise<void> {
  if (resource.kind !== 'document' || !resource.file) {
    throw new Error('No document file available.');
  }

  // Keep browser behavior for the web version.
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(resource.file);
    const link = document.createElement('a');

    link.href = url;
    link.download = resource.title;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  // Convert the file to Base64 for native file storage.
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read the document.'));
        return;
      }

      const base64 = reader.result.split(',')[1];
      if (!base64) {
        reject(new Error('Could not encode the document.'));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => reject(
      reader.error ?? new Error('Could not read the document.'),
    );

    reader.readAsDataURL(resource.file!);
  });

  const safeName = resource.title.replace(/[\\/:\0]/g, '_');
  const result = await Filesystem.writeFile({
    path: `Offmate/${safeName}`,
    data: dataUrl,
    directory: Directory.Cache,
    recursive: true,
  });

  await Share.share({
    title: safeName,
    text: `Document exported from Offmate: ${safeName}`,
    url: result.uri,
    dialogTitle: 'Save or share document',
  });
}

