import AWS from "aws-sdk";

const dynamoOptions =
  process.env.NODE_ENV === "development"
    ? {
        region: "ap-northeast-1",
        endpoint: "http://localhost:8000",
        accessKeyId: "fakeAccessKeyId",
        secretAccessKey: "fakeSecretAccessKey",
      }
    : {};
const documentClient = new AWS.DynamoDB.DocumentClient(dynamoOptions);

export default documentClient;
