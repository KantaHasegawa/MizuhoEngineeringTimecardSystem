import HttpException from "../exceptions/HttpException";
import NodeGeocoder from "node-geocoder";

class Workspot {
  db: AWS.DynamoDB.DocumentClient;
  geocoder: NodeGeocoder.Geocoder;

  constructor(
    db: AWS.DynamoDB.DocumentClient,
    geocoder: NodeGeocoder.Geocoder
  ) {
    this.db = db;
    this.geocoder = geocoder;
  }

  get = async (name: string | undefined) => {
    if (!name) {
      throw new HttpException(400, "Bad request");
    }
    const params = {
      TableName: process.env.TABLE_NAME || "Timecards",
      ExpressionAttributeNames: { "#u": "user", "#w": "workspot" },
      ExpressionAttributeValues: {
        ":userval": "workspot",
        ":workspotval": name,
      },
      KeyConditionExpression: "#u = :userval",
      FilterExpression: "#w = :workspotval",
    };
    try {
      const result = await this.db.query(params).promise();
      if (!result.Items?.length) {
        throw new HttpException(404, "Workspot does not exist");
      }
      return { workspot: result.Items[0] };
    } catch (err) {
      throw err;
    }
  };

  all = async () => {
    const params = {
      TableName: process.env.TABLE_NAME || "Timecards",
      ExpressionAttributeNames: { "#u": "user" },
      ExpressionAttributeValues: { ":val": "workspot" },
      KeyConditionExpression: "#u = :val",
    };
    try {
      const result = await this.db.query(params).promise();
      return { params: result.Items };
    } catch (err) {
      throw err;
    }
  };

  new = async (lat: number, lon: number) => {
    try {
      const result = await this.geocoder.reverse({ lat: lat, lon: lon });
      if (!result[0].formattedAddress)
        throw new HttpException(400, "Location information is invalid");
      const formattedAddressName = result[0].formattedAddress.startsWith(
        "日本、"
      )
        ? result[0].formattedAddress.split("、")[1]
        : result[0].formattedAddress;
      const latitude = result[0].latitude;
      const longitude = result[0].longitude;

      const vaildationParams = {
        TableName: process.env.TABLE_NAME || "Timecards",
        ExpressionAttributeNames: {
          "#u": "user",
          "#t": "latitude",
          "#g": "longitude",
        },
        ExpressionAttributeValues: {
          ":uval": "workspot",
          ":tval": latitude,
          ":gval": longitude,
        },
        KeyConditionExpression: "#u = :uval",
        FilterExpression: "#t = :tval AND #g = :gval",
      };

      const validationResult = await this.db.query(vaildationParams).promise();
      if (validationResult.Items?.length) {
        throw new HttpException(500, "この勤務地は既に登録されています");
      }

      const params = {
        user: "workspot",
        attendance: `workspot ${formattedAddressName}`,
        workspot: formattedAddressName,
        latitude: latitude,
        longitude: longitude,
      };
      await this.db
        .put({ TableName: process.env.TABLE_NAME || "Timecards", Item: params })
        .promise();
      return {
        message: "Insert Success",
        workspotName: formattedAddressName,
      };
    } catch (err) {
      throw err;
    }
  };

  delete = async (attendance: string, workspot: string) => {
    const tableName = process.env.TABLE_NAME || "Timecards";
    const workspotParams = {
      DeleteRequest: {
        Key: {
          user: "workspot",
          attendance: attendance,
        },
      },
    };
    const relationParams = {
      TableName: process.env.TABLE_NAME || "Timecards",
      IndexName: "usersIndex",
      ExpressionAttributeNames: { "#a": "attendance" },
      ExpressionAttributeValues: { ":val": `relation ${workspot}` },
      KeyConditionExpression: "#a = :val",
    };

    try {
      const relationResult = await this.db.query(relationParams).promise();
      type TypeRelation = {
        user: string;
      };
      const relationResultItems = relationResult.Items as
        | TypeRelation[]
        | undefined;
      if (relationResultItems) {
        const requestArray = relationResultItems.map((item) => {
          return {
            DeleteRequest: {
              Key: {
                user: item.user,
                attendance: `relation ${workspot}`,
              },
            },
          };
        });
        requestArray.push(workspotParams);
        const requestParams = {
          RequestItems: {
            [tableName]: requestArray,
          },
        };
        await this.db.batchWrite(requestParams).promise();
        return { message: "Delete Success" };
      }
    } catch (err) {
      throw err;
    }
  };
}

export default Workspot;
