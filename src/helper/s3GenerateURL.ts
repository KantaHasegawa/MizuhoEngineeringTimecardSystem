import s3Client from "./s3ClientSetting";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3GenerateURL = async (fileName: string, item: Buffer) => {
  const getObjectParams = {
    Bucket: process.env.BUCKET_NAME || "default name",
    Key: fileName,
  };
  const putObjectParams = {
    Bucket: process.env.BUCKET_NAME || "default name",
    Key: fileName,
    ContentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ContentDisposition: "atachement",
    Body: item,
  };
  const command = new GetObjectCommand(getObjectParams);
  try {
    await s3Client.send(new PutObjectCommand(putObjectParams));
    const url = await getSignedUrl(s3Client, command, { expiresIn: 7200 });
    return url;
  } catch (err) {
    throw err;
  }
};

export default s3GenerateURL;
