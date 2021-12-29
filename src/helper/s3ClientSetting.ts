import { S3Client } from "@aws-sdk/client-s3";
const REGION = "ap-northeast-1";
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "default",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "default"
}
const s3Client =
  process.env.NODE_ENV === "development"
    ? new S3Client({ region: REGION, credentials: credentials })
    : new S3Client({ region: REGION});
export default s3Client;
