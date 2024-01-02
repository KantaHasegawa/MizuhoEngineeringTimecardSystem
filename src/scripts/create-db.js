// ローカル環境のDynamoDBテーブル作成
const AWS = require("aws-sdk");

AWS.config.update({
  region: "ap-northeast-1",
  endpoint: "http://localhost:8000",
  accessKeyId: "fakeAccessKeyId",
  secretAccessKey: "fakeSecretAccessKey",
});

const dynamoDB = new AWS.DynamoDB();


const params = {
  TableName: "Timecards",
  AttributeDefinitions: [
    { AttributeName: "user", AttributeType: "S" },
    { AttributeName: "attendance", AttributeType: "S" },
  ],
  KeySchema: [
    { AttributeName: "user", KeyType: "HASH" },
    { AttributeName: "attendance", KeyType: "RANGE" },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: "usersIndex",
      KeySchema: [
        {
          AttributeName: "attendance",
          KeyType: "HASH"
        }
      ],
      Projection: {
        ProjectionType: "ALL"
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1,
  },
};

dynamoDB.createTable(params, (err, data) => {
  if (err) {
    console.error(
      "Unable to create table. Error JSON:",
      JSON.stringify(err, null, 2)
    );
  } else {
    console.log(
      "Created table. Table description JSON:",
      JSON.stringify(data, null, 2)
    );
  }
});
