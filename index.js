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

  let src = cv.imread('canvas');
  let src_scaled = new cv.Mat();
  
  let src_size = src.size();
  let ratio = src_size.height / src_size.width;
  let dsize = new cv.Size(scaledImageWidth, scaledImageWidth * ratio);
  // You can try more different parameters
  cv.resize(src, src_scaled, dsize, 0, 0, cv.INTER_AREA);

  let toDraw = src_scaled;

  let s = new cv.Mat();
  cv.cvtColor(src_scaled, s, cv.COLOR_RGB2GRAY)

  let threshed = new cv.Mat();
  cv.threshold(s, threshed, 50, 255, cv.THRESH_BINARY_INV);
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(threshed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
  
  // only an array so I can sort it, but this could probably be better
  let countourArray = [];
  for (let i=0; i < contours.size(); i++) {
    let contour = contours.get(i);
    countourArray = [contour];
  }
  countourArray = countourArray.sort((a, b) => cv.contourArea(a, false) - cv.contourArea(b, false))
  let contour = countourArray[countourArray.length-1];

  let arclen = cv.arcLength(contour, true)
  let approx = new cv.Mat();
  cv.approxPolyDP(contour, approx, 0.02* arclen, true)

  let color = new cv.Scalar(255, 255, 255);
  let color2 = new cv.Scalar(255, 0, 0);
  
  //toDraw = hsv;
  let poly = new cv.MatVector();
  poly.push_back(contour);
  poly.push_back(approx);
  //cv.drawContours(toDraw, poly, 0, color, 1, cv.LINE_AA)
  cv.drawContours(toDraw, poly, 1, color2, 1, cv.LINE_AA)

  cv.imshow('canvas', toDraw);
  //hsv.delete();
  src.delete();
  src_scaled.delete();
  s.delete();
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