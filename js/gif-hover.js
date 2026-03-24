/* js/gif-hover.js — Freeze GIF on load, play on hover */

(function () {
  const cards = document.querySelectorAll('.gif-card');

  cards.forEach(card => {
    const img = card.querySelector('.gif-still');
    if (!img) return;

    const gifSrc = card.dataset.gif;
    if (!gifSrc) return;

    // Freeze: replace img src with a canvas snapshot
    // Strategy: load gif, draw first frame to canvas, show canvas normally
    // On hover: swap back to gif src so it plays

    const canvas = document.createElement('canvas');
    canvas.style.cssText = img.style.cssText;
    canvas.className = img.className;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    // Load the gif into a temp image to capture first frame
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';

    tempImg.onload = () => {
      canvas.width = tempImg.naturalWidth || 400;
      canvas.height = tempImg.naturalHeight || 533;
      const c = canvas.getContext('2d');
      c.drawImage(tempImg, 0, 0);

      // Apply same desaturated style via filter
      canvas.style.filter = 'saturate(0.3) brightness(0.6)';
      canvas.style.objectFit = 'cover';
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      // Replace img with canvas for frozen state
      img.parentElement.insertBefore(canvas, img);
      img.style.display = 'none';
    };

    tempImg.onerror = () => {
      // If image fails (placeholder path), just keep the img tag as-is
      // and handle hover purely via CSS
    };

    tempImg.src = gifSrc;

    // Hover: show live gif, hide canvas
    card.addEventListener('mouseenter', () => {
      if (canvas.parentElement) {
        canvas.style.display = 'none';
        img.style.display = 'block';
        img.style.filter = 'saturate(1) brightness(1)';
        // Force GIF restart by appending timestamp
        const base = gifSrc.split('?')[0];
        img.src = base + '?t=' + Date.now();
      } else {
        // fallback — just show img
        img.style.filter = 'saturate(1) brightness(1)';
      }
    });

    card.addEventListener('mouseleave', () => {
      if (canvas.parentElement) {
        img.style.display = 'none';
        img.style.filter = 'saturate(0.3) brightness(0.6)';
        canvas.style.display = 'block';
      } else {
        img.style.filter = 'saturate(0.3) brightness(0.6)';
        // Reset src to "freeze" (browser re-renders from start)
        const currentSrc = img.src;
        img.src = '';
        img.src = currentSrc;
      }
    });
  });
})();