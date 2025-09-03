import { api, APIError } from "encore.dev/api";
import { Bucket } from "encore.dev/storage/objects";

const portfolioBucket = new Bucket("portfolio-images", {
  public: true,
});

export interface GenerateUploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface GenerateUploadUrlResponse {
  uploadUrl: string;
  imageKey: string;
  publicUrl: string;
}

// Generates a signed upload URL for portfolio images.
export const generateUploadUrl = api<GenerateUploadUrlRequest, GenerateUploadUrlResponse>(
  { expose: true, method: "POST", path: "/storage/portfolio/upload-url" },
  async ({ fileName, contentType }) => {
    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      throw APIError.invalidArgument("Invalid content type. Only JPEG, PNG, and WebP images are allowed");
    }

    // Generate unique key
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = fileName.split('.').pop();
    const imageKey = `portfolio/${timestamp}-${randomId}.${extension}`;

    // Generate signed upload URL
    const { url: uploadUrl } = await portfolioBucket.signedUploadUrl(imageKey, {
      ttl: 3600, // 1 hour
    });

    // Generate public URL
    const publicUrl = portfolioBucket.publicUrl(imageKey);

    return {
      uploadUrl,
      imageKey,
      publicUrl,
    };
  }
);
