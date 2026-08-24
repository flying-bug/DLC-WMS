import axiosClient from './axiosClient';

/**
 * Upload an image file to Cloudinary
 * @param {File} file - Image file object
 * @param {string} folder - Destination folder name (e.g. 'sales_orders', 'import_slips', 'export_slips')
 */
export const uploadImage = async (file, folder = 'attachments') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  const res = await axiosClient.post('/uploads/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

/**
 * Upload a document or image file to Cloudinary
 * @param {File} file - Document or image file object
 * @param {string} folder - Destination folder name
 */
export const uploadDocument = async (file, folder = 'attachments') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  const res = await axiosClient.post('/uploads/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
