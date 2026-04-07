export function initSaveButton(svgEl: SVGSVGElement, filename: string): void {
  const button = document.getElementById('save-svg');
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  button.addEventListener('click', () => {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
}
