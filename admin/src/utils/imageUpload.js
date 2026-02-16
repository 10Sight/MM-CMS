// Image upload utilities with compression and error handling
import axios from 'axios';

export const compressImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to blob conversion failed'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = URL.createObjectURL(file);
  });
};

export const uploadImageWithRetry = async (api, imageFile, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries}`);
      
      // Compress image for each attempt with increasing compression
      const quality = Math.max(0.3, 0.7 - (attempt - 1) * 0.2);
      const maxWidth = Math.max(400, 600 - (attempt - 1) * 100);
      
      let fileToUpload = imageFile;
      
      // Always compress for web upload efficiency
      console.log(`Compressing image (attempt ${attempt}, quality: ${quality}, maxWidth: ${maxWidth})`);
      const compressedBlob = await compressImage(imageFile, maxWidth, 400, quality);
      fileToUpload = new File([compressedBlob], `audit_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      console.log(`Compressed from ${(imageFile.size / 1024).toFixed(1)}KB to ${(fileToUpload.size / 1024).toFixed(1)}KB`);
      
      const formData = new FormData();
      formData.append('images', fileToUpload);
      
      // Create a new axios instance specifically for uploads to bypass default settings
      const uploadApi = axios.create({
        baseURL: api.defaults.baseURL,
        withCredentials: true,
        timeout: 0, // No timeout for uploads
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      const response = await uploadApi.post('/api/upload/multiple', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          ...api.defaults.headers.common // Include auth headers
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress (attempt ${attempt}): ${percentCompleted}%`);
          }
        },
      });
      
      // Success!
      console.log(`Upload successful on attempt ${attempt}`);
      return response;
      
    } catch (error) {
      console.error(`Upload attempt ${attempt} failed:`, error.message);
      lastError = error;
      
      // Don't retry if it's a client error (4xx) but retry on server errors (5xx) and network issues
      if (error.response?.status && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 408) {
        console.log('Client error detected, not retrying');
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt - 1) * 1500; // 1.5s, 3s, 6s
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All attempts failed
  console.error('All upload attempts failed');
  throw lastError;
};

export const validateImageFile = (file) => {
  const errors = [];
  
  // Check file type
  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
  }
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size must be less than 10MB');
  }
  
  // Check specific image formats
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Only JPEG, PNG, and WebP images are allowed');
  }
  
  return errors;
};

export default {
  compressImage,
  uploadImageWithRetry,
  validateImageFile
};
