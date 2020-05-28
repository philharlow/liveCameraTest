'use strict';

// FPS
let processMaxFPS = 30; 
let processUpdateInterval = 1000 / processMaxFPS;

// opencv image res
let scaledImageWidth = 300;

// Get the dom elements
const video = document.querySelector('video');
const canvas = window.canvas = document.querySelector('canvas');
canvas.width = 480;
canvas.height = 360;

//Mode button
const modeButton = document.querySelector('#mode');
modeButton.onclick = function() {
  if (window.stream)
    stopCamera();
  else
    startCamera();
};

// Process button
let loopHandle;
const processButton = document.querySelector('#process');
processButton.onclick = function() {
  if (loopHandle) {
    processButton.textContent = "Start Processing";
    video.style.visibility = "visible";
    canvas.style.display = "none";
    // Stop the process loop
    clearInterval(loopHandle);
    loopHandle = null;
  } else {
    processButton.textContent = "Stop Processing";
    canvas.style.display = "";
    video.style.visibility = "hidden";
    // Start the process loop
    loopHandle = setInterval(processLoop, processUpdateInterval);
  }
};

function copyCameraToCanvas() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
}

function processLoop() {
  copyCameraToCanvas();
  processImage();
}

function stopCamera() {
  if (window.stream) {
    copyCameraToCanvas();
    // Stop camera
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
    processImage();
  }
  window.stream = null;
  canvas.style.display = "";
  video.style.display = "none";
  modeButton.textContent = "Start Camera";
}

function processImage() {
  // grab image from canvas
  let src = cv.imread('canvas');
  
  // resize image
  let src_scaled = new cv.Mat();
  let src_size = src.size();
  let ratio = src_size.height / src_size.width;
  let dsize = new cv.Size(scaledImageWidth, scaledImageWidth * ratio);
  cv.resize(src, src_scaled, dsize, 0, 0, cv.INTER_AREA);
  let toDraw = src_scaled;

  // convert to grayscale
  let gray = new cv.Mat();
  cv.cvtColor(src_scaled, gray, cv.COLOR_RGB2GRAY)

  // filter
  cv.GaussianBlur(gray, gray, new cv.Size(9, 9), 0, 0, cv.BORDER_DEFAULT);

  // apply unsharp masking to sharpen edges
  // let gray_blur = new cv.Mat();
  // cv.GaussianBlur(gray, gray_blur, new cv.Size(19, 19), 0, 0, cv.BORDER_DEFAULT);
  // cv.addWeighted(gray, 1.5, gray_blur, -0.5, 0, gray);

  // adjust contrast
  // cv.equalizeHist(gray, gray);
  // let clahe = new cv.CLAHE(4, new cv.Size(32, 32));
  // clahe.apply(gray, gray);
  
  // threshold grayscale image
  let threshed = new cv.Mat();
  cv.threshold(gray, threshed, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

  // extract contours from image
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat(); // DELETE if not used
  cv.findContours(threshed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)
  
  // filter contours for largest one
  let countourArray = [];
  let areaThresh = 100;
  let bboxOffset = 20;
  for (let i=0; i < contours.size(); i++) {
    let contour = contours.get(i);

    // display all contours
    // let arclen = cv.arcLength(contour, true)
    // let approx = new cv.Mat();
    // cv.approxPolyDP(contour, approx, 0.02* arclen, true);
    // let color = new cv.Scalar(255, 255, 255);
    // let color2 = new cv.Scalar(255, 0, 0);
    // let poly = new cv.MatVector();
    // poly.push_back(contour);
    // poly.push_back(approx);
    // // cv.drawContours(toDraw, poly, 0, color, 1, cv.LINE_AA)
    // cv.drawContours(toDraw, poly, 1, color2, 1, cv.LINE_AA)

    // filter if contour touches edge of camera
    let bb = new cv.boundingRect(contour);
    let xMin = bboxOffset;
    let yMin = bboxOffset;
    let xMax = scaledImageWidth - 1 - bboxOffset;
    let yMax = scaledImageWidth * ratio - 1 - bboxOffset;
    if (bb.x <= xMin || 
        bb.y <= yMin ||
        bb.width >= xMax ||
        bb.height >= yMax) { continue; }

    // filter if contour is smaller than minimum area
    let area = cv.contourArea(contour);
    if (area < areaThresh) { continue; }

    countourArray = [contour];
  }
  countourArray = countourArray.sort((a, b) => cv.contourArea(a, false) - cv.contourArea(b, false))

  // execute only if at least one valid contour is found
  if (countourArray.length > 0)
  {
    let contour = countourArray[countourArray.length-1];
  
    // simplify contour
    let arclen = cv.arcLength(contour, true)
    let approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.02* arclen, true);
  
    // draw approximated contour
    // let color = new cv.Scalar(255, 255, 255);
    // let color2 = new cv.Scalar(255, 0, 0);
    // let poly = new cv.MatVector();
    // poly.push_back(contour);
    // poly.push_back(approx);
    //cv.drawContours(toDraw, poly, 0, color, 1, cv.LINE_AA)
    // cv.drawContours(toDraw, poly, 1, color2, 1, cv.LINE_AA)
  
    // draw bounding rectangle
    let rotatedRect = cv.minAreaRect(approx);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(255, 0, 0);
    for (let i = 0; i < 4; i++) {
      cv.line(toDraw, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }
  }

  // draw offset rectangle
  let point1 = new cv.Point(bboxOffset, bboxOffset);
  let point2 = new cv.Point(scaledImageWidth - 1 - bboxOffset, 
    scaledImageWidth * ratio - 1 - bboxOffset);
  cv.rectangle(toDraw, point1, point2, new cv.Scalar(255, 255, 255), 2, cv.LINE_AA, 0);

  // draw to canvas
  cv.imshow('canvas', toDraw);
  // cv.imshow('canvas', threshed);
  // cv.imshow('canvas', gray);

  // wipe
  src.delete();
  src_scaled.delete();
  gray.delete();
  threshed.delete();
  contours.delete();
  hierarchy.delete();
  approx.delete();
  poly.delete();
}

function startCamera() {
  navigator.mediaDevices.getUserMedia(constraints).then(handleCameraStream).catch(handleError);

  modeButton.textContent = "Take snapshot";
}

const constraints = {
  audio: false,
  video: {
    facingMode: 'environment'
  }
};

function handleCameraStream(stream) {
  video.style.display = "";
  canvas.style.display = "none";
  window.stream = stream; // expose to inspector
  video.srcObject = stream;
}

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

startCamera();