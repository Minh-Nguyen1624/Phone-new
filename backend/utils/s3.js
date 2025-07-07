// utils/s3.js
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Cấu hình S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Ví dụ: "us-east-1"
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Tải file lên S3
const uploadFile = async (fileStream, fileName, mimetype) => {
  try {
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME, // Tên bucket của bạn
      Key: `chat-attachments/${fileName}`, // Đường dẫn trên S3
      Body: fileStream,
      ContentType: mimetype,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Trả về key của file trên S3
    return uploadParams.Key;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error("Failed to upload file to S3");
  }
};

// Tạo signed URL để truy cập file trên S3
const getSignedUrlS3 = async (key) => {
  try {
    const getObjectParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    };

    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL hết hạn sau 1 giờ

    return url;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate signed URL");
  }
};

// Xóa file trên S3
const deleteFile = async (key) => {
  try {
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return true;
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error("Failed to delete file from S3");
  }
};

module.exports = { uploadFile, getSignedUrlS3, deleteFile };
