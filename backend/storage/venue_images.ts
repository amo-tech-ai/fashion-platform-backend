import { api, APIError } from "encore.dev/api";
import { Bucket } from "encore.dev/storage/objects";

const venueBucket = new Bucket("venue-images", {
  public: true,
});

export interface GenerateVenueUploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface GenerateVenueUploadUrlResponse {
  uploadUrl: string;
  imageKey: string;
  publicUrl: string;
}

// Generates a signed upload URL for venue images.
export const generateVenueUploadUrl = api<GenerateVenueUploadUrlRequest, GenerateVenueUploadUrlResponse>(
  { expose: true, method: "POST", path: "/storage/venues/upload-url" },
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
    const imageKey = `venues/${timestamp}-${randomId}.${extension}`;

    // Generate signed upload URL
    const { url: uploadUrl } = await venueBucket.signedUploadUrl(imageKey, {
      ttl: 3600, // 1 hour
    });

    // Generate public URL
    const publicUrl = venueBucket.publicUrl(imageKey);

    return {
      uploadUrl,
      imageKey,
      publicUrl,
    };
  }
);
