/**
 * Initializes the Save SVG button.
 * On click: serializes the SVG DOM node to a string and triggers a file download.
 */
export function initSaveButton(svgEl: SVGSVGElement, filename: string): void {
  const btn = document.getElementById('save-btn');
  if (!btn) {
    console.warn('Save button (#save-btn) not found in DOM');
    return;
  }

  btn.addEventListener('click', () => {
    // Ensure SVG has xmlns attribute for standalone files
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke after a short delay to allow the download to start
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
