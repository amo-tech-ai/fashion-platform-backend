import { api, APIError } from "encore.dev/api";
import { Bucket } from "encore.dev/storage/objects";

const sponsorBucket = new Bucket("sponsor-logos", {
  public: true,
});

export interface GenerateSponsorUploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface GenerateSponsorUploadUrlResponse {
  uploadUrl: string;
  imageKey: string;
  publicUrl: string;
}

// Generates a signed upload URL for sponsor logos.
export const generateSponsorUploadUrl = api<GenerateSponsorUploadUrlRequest, GenerateSponsorUploadUrlResponse>(
  { expose: true, method: "POST", path: "/storage/sponsors/upload-url" },
  async ({ fileName, contentType }) => {
    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(contentType)) {
      throw APIError.invalidArgument("Invalid content type. Only JPEG, PNG, WebP, and SVG images are allowed");
    }

    // Generate unique key
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = fileName.split('.').pop();
    const imageKey = `sponsors/${timestamp}-${randomId}.${extension}`;

    // Generate signed upload URL
    const { url: uploadUrl } = await sponsorBucket.signedUploadUrl(imageKey, {
      ttl: 3600, // 1 hour
    });

    // Generate public URL
    const publicUrl = sponsorBucket.publicUrl(imageKey);

    return {
      uploadUrl,
      imageKey,
      publicUrl,
    };
  }
);
