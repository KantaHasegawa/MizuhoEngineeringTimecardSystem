import AWS from "aws-sdk";

const dynamoOptions =
  process.env.NODE_ENV === "development"
    ? {
      region: "localhost",
      endpoint: "http://localhost:8000",
    }
    : {};
const documentClient = new AWS.DynamoDB.DocumentClient(dynamoOptions);

export default documentClient;
