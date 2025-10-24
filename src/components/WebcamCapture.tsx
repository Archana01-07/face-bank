import { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface WebcamCaptureProps {
  onCapture: (video: HTMLVideoElement) => void;
  disabled?: boolean;
}

export const WebcamCapture = ({ onCapture, disabled }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');

  const startWebcam = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Unable to access webcam. Please grant camera permissions.');
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && isStreaming) {
      onCapture(videoRef.current);
    }
  };

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <Card className="p-6 space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center">
            <CameraOff className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        {!isStreaming ? (
          <Button
            onClick={startWebcam}
            disabled={disabled}
            className="flex-1"
            variant="outline"
          >
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </Button>
        ) : (
          <>
            <Button
              onClick={handleCapture}
              disabled={disabled}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture Face
            </Button>
            <Button
              onClick={stopWebcam}
              variant="outline"
            >
              Stop
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};
