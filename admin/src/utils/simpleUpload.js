import axios from 'axios';

// Simple image compression
export const simpleCompressImage = (file, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Limit size to 600px max
      const maxSize = 600;
      let { width, height } = img;
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Simple upload without complex retry logic
export const simpleImageUpload = async (baseURL, imageFile) => {
  try {
    
    // Always compress to reduce size
    const compressedBlob = await simpleCompressImage(imageFile, 0.5);
    const compressedFile = new File([compressedBlob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    const formData = new FormData();
    formData.append('images', compressedFile);
    
    // Create simple axios instance with minimal configuration
    const response = await axios({
      method: 'post',
      url: `${baseURL}/api/upload/multiple`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      withCredentials: true,
      timeout: 0, // No timeout
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percent}%`);
        }
      }
    });
    
    return response;
    
  } catch (error) {
    console.error('Simple upload failed:', error);
    throw error;
  }
};

export default simpleImageUpload;
