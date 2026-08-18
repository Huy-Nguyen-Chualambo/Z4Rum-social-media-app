/**
 * Unsigned Cloudinary upload, shared by the post composer and the Z4chat
 * character form.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

/** Uploads `file` and returns its secure URL. Throws with a Vietnamese message. */
export async function uploadImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Ảnh quá lớn (chỉ hỗ trợ < 5MB)");
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error("Chưa cấu hình Cloudinary");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("cloud_name", CLOUD_NAME);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => null);
  const url = (data as { secure_url?: string } | null)?.secure_url;
  if (!url) throw new Error("Lỗi khi tải ảnh lên Cloudinary");

  return url;
}
