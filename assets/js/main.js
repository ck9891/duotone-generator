/* eslint-disable prefer-destructuring */
const ls = window.localStorage;
const photo = document.getElementById('uploadImage');
const canvas = document.getElementById('canvas');
// filename = document.getElementById( 'filename' ).value,
const fileType = document.getElementById('fileType');
let fileSelection;
const colours = document.getElementById('colours');
const context = canvas.getContext('2d');
const fileReader = new FileReader();
const img = new Image(); const lastImgData = ls.getItem('image');
let x;
let y;
const color = ls.getItem('color') || 'black';
const link = document.getElementById('imgLink');
const brightness = document.getElementById('brightness');
const contrast = document.getElementById('contrast');
let brightValue = '';
let contrastValue = '';
let c = '';
let file;


// rgb colours for duotones.
// light colour goes first
const yellowRed = [[251, 209, 1], [166, 25, 46]];
const yellowGreen = [[251, 209, 1], [0, 123, 75]];
const yellowDarkBlue = [[251, 209, 1], [0, 112, 150]];
const yellowMaroon = [[251, 209, 1], [122, 0, 60]];
const lightGreenRed = [[210, 215, 85], [166, 25, 46]];
const lightDarkGreen = [[210, 215, 85], [0, 123, 75]];
const lightGreenDarkBlue = [[210, 215, 85], [0, 112, 150]];
const lightGreenMaroon = [[210, 215, 85], [122, 0, 60]];
const lightDarkBlue = [[139, 211, 230], [0, 112, 150]];
const lightBlueMaroon = [[139, 211, 230], [122, 0, 60]];

if (lastImgData) {
  img.src = lastImgData;
}

// eslint-disable-next-line func-names
fileReader.onload = function (e) {
  // eslint-disable-next-line no-console
  console.log(typeof e.target.result, e.target.result instanceof Blob);
  img.src = e.target.result;
};

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 * Taken from: https://codepen.io/72lions/pen/jPzLJX
 */
const rgbToHsl = (rx, gy, bz) => {
  const r = rx / 255;
  const g = gy / 255;
  const b = bz / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h; let s; const
    l = (max + min) / 2;

  if (max === min) {
    h = 0;
    s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }

  return [h, s, l];
};

// taken from: https://codepen.io/72lions/pen/jPzLJX
function convertToDuoTone(imageData, pixelCount, color1, color2) {
  const pixels = imageData.data;

  const pixelArray = [];
  const gradientArray = [];

  // Creates a gradient of 255 colors between color1 and color2
  for (let d = 0; d < 255; d += 1) {
    const ratio = d / 255;
    const l = ratio;
    const rA = Math.floor(color1[0] * l + color2[0] * (1 - l));
    const gA = Math.floor(color1[1] * l + color2[1] * (1 - l));
    const bA = Math.floor(color1[2] * l + color2[2] * (1 - l));
    gradientArray.push([rA, gA, bA]);
  }

  let offset;
  let r;
  let g;
  let b;
  let a;
  for (let i = 0; i < pixelCount; i += 1) {
    offset = i * 4;
    // Gets every color and the alpha channel (r, g, b, a)
    r = pixels[offset + 0];
    g = pixels[offset + 1];
    b = pixels[offset + 2];
    a = pixels[offset + 3];

    // Gets the avg
    const avg = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
    // Gets the hue, saturation and luminosity
    const hsl = rgbToHsl(avg, avg, avg);
    // The luminosity from 0 to 255
    const luminosity = Math.max(0, Math.min(254, Math.floor((hsl[2] * 254))));

    // Swap every color with the equivalent from the gradient array
    r = gradientArray[luminosity][0];
    g = gradientArray[luminosity][1];
    b = gradientArray[luminosity][2];

    pixelArray.push(r);
    pixelArray.push(g);
    pixelArray.push(b);
    pixelArray.push(a);
  }

  return pixelArray;
}

function adjustBrightness(imageData, adjustment) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] += (adjustment / 2);
    d[i + 1] += (adjustment / 2);
    d[i + 2] += (adjustment / 2);
  }
  return d;
}

function adjustContrast(imageData, imageContrast) { // input range [-100..100]
  const d = imageData.data;
  const imageC = (imageContrast / 100) + 1; // convert to decimal & shift range: [0..2]
  const intercept = 128 * (1 - imageC);
  for (let i = 0; i < d.length; i += 4) { // r,g,b,a
    d[i] = d[i] * imageC + intercept;
    d[i + 1] = d[i + 1] * imageC + intercept;
    d[i + 2] = d[i + 2] * imageC + intercept;
  }
  return d;
}

function drawImage(duotoneColours = '') {
  let dataUrl;
  canvas.width = canvas.width;
  const pixelCount = canvas.width * canvas.height;
  if (img.width) context.drawImage(img, 0, 0, x, y);

  // get the initial image data
  let imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  if (brightValue !== '') {
    const bright = adjustBrightness(imageData, brightValue);
    const newImageData = new ImageData(new Uint8ClampedArray(bright), canvas.width, canvas.height);
    context.putImageData(newImageData, 0, 0, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL(fileSelection);
    link.href = dataUrl;
    link.setAttribute('download', 'duotone');
  }

  if (contrastValue !== '') {
    const newContrast = adjustContrast(imageData, contrastValue);
    const newImageData = new ImageData(new Uint8ClampedArray(newContrast), canvas.width, canvas.height);
    context.putImageData(newImageData, 0, 0, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL(fileSelection);
    link.href = dataUrl;
    link.setAttribute('download', 'duotone');
  }

  if (duotoneColours !== '') {
    let brightImageData;
    let contrastImageData;
    let bright;
    let newContrast;
    if (brightValue !== '') {
      console.log(imageData);
      bright = adjustBrightness(imageData, brightValue);
      console.log(bright);
      brightImageData = new ImageData(new Uint8ClampedArray(bright), canvas.width, canvas.height);
      context.putImageData(brightImageData, 0, 0, 0, 0, canvas.width, canvas.height);
    }
    // update imageData
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    if (contrastValue !== '') {
      console.log(imageData);
      newContrast = adjustContrast(imageData, contrastValue);
      console.log(newContrast);
      contrastImageData = new ImageData(new Uint8ClampedArray(newContrast), canvas.width, canvas.height);
      context.putImageData(contrastImageData, 0, 0, 0, 0, canvas.width, canvas.height);
    }

    // update imageData
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const duotone = convertToDuoTone(imageData, pixelCount, duotoneColours[0], duotoneColours[1]);

    const newImageData = new ImageData(new Uint8ClampedArray(duotone), canvas.width, canvas.height);

    context.putImageData(newImageData, 0, 0, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL(fileSelection);
    link.href = dataUrl;
    link.setAttribute('download', 'duotone');
    // link.innerHTML = canvas.outerHTML;
  } else {
    context.putImageData(imageData, 0, 0, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL(fileSelection);
    link.href = dataUrl;
    link.setAttribute('download', 'duotone');
    // link.innerHTML = canvas.outerHTML;
  }

  // set the urls for the img sources
  // document.getElementById( 'imageData' ).href = dataUrl;
  // document.getElementById( 'preview' ).src = dataUrl;

  // set local storage
  ls.setItem('color', color);
  ls.setItem('image', img.src);
}

// draw the image

drawImage();

photo.addEventListener('change', () => {
  file = photo.files[0];
  c = '';
  return file && fileReader.readAsDataURL(file);
});

fileType.addEventListener('change', () => {
  const f = fileType.value;
  switch (f) {
    case 'jpeg':
      fileSelection = 'image/jpeg';
      break;
    case 'png':
      fileSelection = 'image/png';
      break;
    default:
      fileSelection = '';
      break;
  }
  console.log(fileSelection);
});

canvas.addEventListener('dragover', (event) => {
  event.preventDefault();
});

canvas.addEventListener('drop', (event) => {
  event.preventDefault();
  fileReader.readAsDataURL(event.dataTransfer.files[0]);
});

brightness.addEventListener('change', () => {
  brightValue = brightness.value;
  drawImage(c);
});

contrast.addEventListener('change', () => {
  contrastValue = contrast.value;
  drawImage(c);
});

colours.addEventListener('change', () => {
  const colour = colours.value;

  switch (colour) {
    case 'yellowRed':
      c = yellowRed;
      break;
    case 'yellowGreen':
      c = yellowGreen;
      break;
    case 'yellowDarkBlue':
      c = yellowDarkBlue;
      break;
    case 'yellowMaroon':
      c = yellowMaroon;
      break;
    case 'lightGreenRed':
      c = lightGreenRed;
      break;
    case 'lightDarkGreen':
      c = lightDarkGreen;
      break;
    case 'lightGreenDarkBlue':
      c = lightGreenDarkBlue;
      break;
    case 'lightGreenMaroon':
      c = lightGreenMaroon;
      break;
    case 'lightDarkBlue':
      c = lightDarkBlue;
      break;
    case 'lightBlueMaroon':
      c = lightBlueMaroon;
      break;
    default:
      c = '';
      break;
  }

  drawImage(c);
});

img.onload = () => {
  // const rw = img.width / canvas.width; // width and height are maximum thumbnail's bounds
  // const rh = img.height / canvas.height;
  // console.log(`rw is ${rw}`);
  // console.log(`rh is ${rh}`);
  // if (rw > rh) {
  //   newh = Math.round(img.height / rw);
  //   neww = canvas.width;
  //   console.log(`neww is ${neww}`);
  // } else {
  //   neww = Math.round(img.width / rh);
  //   newh = canvas.height;
  //   console.log(`newh is ${newh}`);
  // }

  // canvas.width = img.width;
  // canvas.height = img.height;

  // x = (canvas.width - neww) / 2;
  // console.log(`width is ${x}`);
  // y = (canvas.height - newh) / 2;
  // console.log(`height is ${y}`);
  // // x = rw;
  // // y = rh;
  x = img.width;
  y = img.height;
  console.log(x);
  console.log(y);
  canvas.width = x;
  canvas.height = y;

  console.log(canvas.width);
  drawImage();
};
