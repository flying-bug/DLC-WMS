/**
 * Tiện ích nén và tối ưu hóa kích thước ảnh ở Client trước khi upload lên Server/Cloudinary.
 * Giúp giảm dung lượng từ hàng MB xuống vài chục KB, tăng tốc độ upload lên 50-100 lần.
 *
 * @param {File} file - File ảnh gốc được chọn từ input
 * @param {Object} options - Tùy chọn nén
 * @param {number} options.maxWidth - Chiều rộng tối đa (mặc định 600px)
 * @param {number} options.maxHeight - Chiều cao tối đa (mặc định 600px)
 * @param {number} options.quality - Chất lượng JPEG (0.1 -> 1.0, mặc định 0.85)
 * @returns {Promise<File>} - File ảnh đã được nén và tối ưu
 */
export async function compressImage(file, { maxWidth = 600, maxHeight = 600, quality = 0.85 } = {}) {
    if (!file || !file.type.startsWith('image/')) {
        return file;
    }

    // Không nén ảnh GIF (để giữ animation) hoặc SVG
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result;

            img.onload = () => {
                let { width, height } = img;

                // Nếu ảnh đã nhỏ hơn max dimension và nhỏ hơn 150KB, giữ nguyên
                if (width <= maxWidth && height <= maxHeight && file.size < 150 * 1024) {
                    resolve(file);
                    return;
                }

                // Tính toán kích thước mới giữ nguyên tỉ lệ khung hình (Aspect Ratio)
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                // Tăng chất lượng làm mượt khi scale nhỏ lại
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // Xuất ra dạng Blob JPEG/WebP
                canvas.toBlob(
                    (blob) => {
                        if (!blob || blob.size >= file.size) {
                            // Nếu nén xong mà dung lượng không giảm thì dùng file gốc
                            resolve(file);
                            return;
                        }

                        // Đổi đuôi file sang .jpg nếu file gốc là png/heic nặng
                        const originalName = file.name.replace(/\.[^/.]+$/, '');
                        const newFileName = `${originalName}.jpg`;

                        const compressedFile = new File([blob], newFileName, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });

                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => {
                resolve(file); // Fallback về file gốc nếu có lỗi
            };
        };

        reader.onerror = () => {
            resolve(file);
        };
    });
}
