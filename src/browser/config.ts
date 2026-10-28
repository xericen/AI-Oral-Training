export const rules = {confidence:.5,shoulderDegrees:10,bodyDegrees:12,yaw:18,pitch:20,roll:15,centerMin:.35,centerMax:.65,jawDelta:.2,mouthRatioDelta:.035,puckerDelta:.2,widthDelta:.025,neutralJawMax:.25,neutralPuckerMax:.25,calibrationSeconds:2,calibrationSamples:8,calibrationTimeout:20,maxGap:.5,maxAge:1.5,releaseFraction:.5};
export const visionConfig={inputSize:320,personConfidence:.5,nmsIou:.45,modelTimeoutMs:90000,inferenceTimeoutMs:15000,frameIntervalMs:50,frameWidth:640,frameHeight:480};
export const modelVersion='YOLO11n-pose-320-ONNX/MediaPipe-FaceLandmarker-v1';
