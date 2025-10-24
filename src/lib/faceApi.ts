import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;
  
  // Using jsDelivr CDN for Face-api.js models
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
  
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    
    modelsLoaded = true;
    console.log('Face-api.js models loaded successfully');
  } catch (error) {
    console.error('Error loading face-api.js models:', error);
    throw error;
  }
};

export const detectFaceAndGetDescriptor = async (
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> => {
  try {
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return detection.descriptor;
  } catch (error) {
    console.error('Error detecting face:', error);
    return null;
  }
};

export const compareFaces = (
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[],
  threshold: number = 0.6
): boolean => {
  const desc1 = descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1);
  const desc2 = descriptor2 instanceof Float32Array ? descriptor2 : new Float32Array(descriptor2);
  
  const distance = faceapi.euclideanDistance(desc1, desc2);
  return distance < threshold;
};

export const captureImageFromVideo = (videoElement: HTMLVideoElement): string => {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg');
  }
  
  return '';
};
