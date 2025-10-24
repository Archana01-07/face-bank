# Face-api.js Models

This directory needs to contain the Face-api.js model files for face recognition to work.

## Required Models

Download the following model files from the [face-api.js models repository](https://github.com/justadudewhohacks/face-api.js-models):

1. **tiny_face_detector_model-weights_manifest.json**
2. **tiny_face_detector_model-shard1**
3. **face_landmark_68_model-weights_manifest.json**
4. **face_landmark_68_model-shard1**
5. **face_recognition_model-weights_manifest.json**
6. **face_recognition_model-shard1**
7. **face_recognition_model-shard2**

## How to Install

1. Visit: https://github.com/justadudewhohacks/face-api.js-models
2. Download the `weights` folder
3. Copy all files to this `public/models/` directory

The models are approximately 5MB total and are required for the face recognition system to work properly.

## Alternative: CDN

You can also modify `src/lib/faceApi.ts` to load models from a CDN:

```javascript
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
```

However, local models provide better performance and reliability.
