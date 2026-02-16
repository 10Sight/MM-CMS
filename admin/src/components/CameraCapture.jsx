import React, { useState, useRef, useCallback } from 'react';
import { FiCamera, FiX, FiRotateCw, FiDownload, FiUpload, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

const CameraCapture = ({ isOpen, onClose, onCapture, questionId, questionText }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const isStartingRef = useRef(false);

  // Start camera
  const startCamera = useCallback(async () => {
    if (isStartingRef.current) return; // prevent parallel starts
    isStartingRef.current = true;
    try {
      setError(null);
      setIsCapturing(true);
      
      // Stop existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        // Wait for metadata before play
        await new Promise((resolve) => {
          const onLoaded = () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          };
          video.addEventListener('loadedmetadata', onLoaded);
        });
        try {
          await video.play();
        } catch (playErr) {
          // Ignore AbortError triggered by quick reloads
          console.warn('video.play() interrupted:', playErr?.message);
        }
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions or try uploading a file instead.');
      toast.error('Camera access denied or not available');
    } finally {
      setIsCapturing(false);
      isStartingRef.current = false;
    }
  }, [facingMode, stream]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

// Toggle camera (front/back)
  const toggleCamera = () => {
    // Stop first to avoid play() interruption
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Capture photo from video
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Downscale for faster upload (max 800px)
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const maxDim = 800;
    let dstW = srcW;
    let dstH = srcH;
    if (srcW > srcH && srcW > maxDim) {
      dstW = maxDim; dstH = Math.round((srcH * maxDim) / srcW);
    } else if (srcH >= srcW && srcH > maxDim) {
      dstH = maxDim; dstW = Math.round((srcW * maxDim) / srcH);
    }

    canvas.width = dstW;
    canvas.height = dstH;

    // Draw the video frame to canvas (scaled)
    context.drawImage(video, 0, 0, dstW, dstH);

    // Convert to small WebP blob for speed
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage({
          blob,
          url: imageUrl,
          file: new File([blob], `audit_photo_${Date.now()}.webp`, { type: 'image/webp' })
        });
        stopCamera();
      }
    }, 'image/webp', 0.5);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage({
        blob: file,
        url: imageUrl,
        file: file
      });
      event.target.value = ''; // Reset input
    } else {
      toast.error('Please select a valid image file');
    }
  };

  // Confirm and submit photo
  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(questionId, capturedImage);
      resetState();
      onClose();
      toast.success('Photo captured successfully');
    }
  };

  // Retake photo
  const retakePhoto = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage.url);
      setCapturedImage(null);
    }
    startCamera();
  };

  // Reset state
  const resetState = () => {
    stopCamera();
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage.url);
      setCapturedImage(null);
    }
    setError(null);
  };

  // Handle dialog close
  const handleClose = () => {
    resetState();
    onClose();
  };

// Start camera when dialog opens
  React.useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      if (!isOpen) {
        resetState();
      }
    };
  }, [isOpen]);

  // Update camera when facing mode changes
  React.useEffect(() => {
    if (isOpen && !capturedImage) {
      // Stop before restarting to avoid interrupted play()
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      startCamera();
    }
  }, [facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCamera className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Capture Photo</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Take a photo to document the issue for: "{questionText}"
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <FiAlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Camera View */}
          {!capturedImage && (
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Camera Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                <button
                  onClick={toggleCamera}
                  className="p-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-full"
                >
                  <FiRotateCw className="h-4 w-4" />
                </button>
                
                <button
                  onClick={capturePhoto}
                  disabled={!stream || isCapturing}
                  className="w-16 h-16 rounded-full bg-white text-black hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center"
                >
                  <FiCamera className="h-6 w-6" />
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-full"
                >
                  <FiUpload className="h-4 w-4" />
                </button>
              </div>

              {/* Loading indicator */}
              {isCapturing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="space-y-4">
              <img
                src={capturedImage.url}
                alt="Captured"
                className="w-full h-64 object-cover rounded-lg border"
              />
              
              <div className="flex gap-2 justify-center">
                <button
                  onClick={retakePhoto}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Retake Photo
                </button>
                <button
                  onClick={confirmPhoto}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <FiDownload className="h-4 w-4" />
                  Use This Photo
                </button>
              </div>
            </div>
          )}

          {/* File Input (Hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Canvas for capturing (Hidden) */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Take a clear photo showing the issue or problem area
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            <FiX className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
