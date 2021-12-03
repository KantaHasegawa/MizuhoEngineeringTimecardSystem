import NodeGeocoder from "node-geocoder";

class RleationModel {
  db: AWS.DynamoDB.DocumentClient;
  geocoder: NodeGeocoder.Geocoder;

  constructor(
    db: AWS.DynamoDB.DocumentClient,
    geocoder: NodeGeocoder.Geocoder
  ) {
    this.db = db;
    this.geocoder = geocoder;
  }

  indexUser = async (username: string) => {
    const params = {
      TableName: process.env.TABLE_NAME || "Timecards",
      ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
      ExpressionAttributeValues: { ":uval": username, ":aval": "relation" },
      KeyConditionExpression: "#u = :uval AND begins_with(#a, :aval)",
    };
    try {
      const result = await this.db.query(params).promise();
      return { params: result.Items };
    } catch (err) {
      throw err;
    }
  };

  indexWorkspot = async (workspot: string) => {
    const params = {
      TableName: process.env.TABLE_NAME || "Timecards",
      IndexName: "usersIndex",
      ExpressionAttributeNames: { "#a": "attendance" },
      ExpressionAttributeValues: { ":val": `relation ${workspot}` },
      KeyConditionExpression: "#a = :val",
    };
    try {
      const result = await this.db.query(params).promise();
      return { params: result.Items };
    } catch (err) {
      throw err;
    }
  };

  userSelectBoxItems = async (username: string) => {
    const relationsParams = {
      TableName: process.env.TABLE_NAME || "Timecards",
      ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
      ExpressionAttributeValues: { ":uval": username, ":aval": "relation" },
      KeyConditionExpression: "#u = :uval AND begins_with(#a, :aval)",
    };
    const workspotsParams = {
      TableName: process.env.TABLE_NAME || "Timecards",
      ExpressionAttributeNames: { "#u": "user" },
      ExpressionAttributeValues: { ":val": "workspot" },
      KeyConditionExpression: "#u = :val",
    };
    try {
      const relationsResult = await this.db.query(relationsParams).promise();
      const workspotsResult = await this.db.query(workspotsParams).promise();
      type TypeWorkspot = {
        workspot: string;
      };
      const workspotsResultItems = workspotsResult.Items as
        | TypeWorkspot[]
        | undefined;

      const selectBoxItems = workspotsResultItems
        ?.map((item) => {
          if (
            !relationsResult.Items?.find(
              ({ workspot }) => workspot === item.workspot
            )
          ) {
            return item.workspot;
          }
        })
        .filter((item) => item);
      return {
        selectBoxItems: selectBoxItems,
        relations: relationsResult.Items,
      };
    } catch (err) {
      throw err;
    }
  };

  workspotSelectBoxItems = async (workspot: string) => {
    const relationsParams = {
      TableName: process.env.TABLE_NAME || "Timecards",
      IndexName: "usersIndex",
      ExpressionAttributeNames: { "#a": "attendance" },
      ExpressionAttributeValues: { ":val": `relation ${workspot}` },
      KeyConditionExpression: "#a = :val",
    };
    const usersParams = {
      TableName: process.env.TABLE_NAME || "Timecards",
      IndexName: "usersIndex",
      ExpressionAttributeNames: { "#a": "attendance", "#r": "role" },
      ExpressionAttributeValues: { ":aval": "user", ":rval": "common" },
      KeyConditionExpression: "#a = :aval",
      FilterExpression: "#r = :rval",
    };
    try {
      const relationsResult = await this.db.query(relationsParams).promise();
      const usersResult = await this.db.query(usersParams).promise();
      type TypeUser = {
        user: string;
      };
      const usersResultItems = usersResult.Items as TypeUser[] | undefined;
      const selectBoxItems = usersResultItems
        ?.map((item) => {
          if (!relationsResult.Items?.find(({ user }) => user === item.user)) {
            return item.user;
          }
        })
        .filter((item) => item);
      return {
        selectBoxItems: selectBoxItems,
        relations: relationsResult.Items,
      };
    } catch (err) {
      throw err;
    }
  };

  new = async (user: string, workspot: string) => {
    try {
      const result = await this.geocoder.geocode(workspot);
      const params = {
        user: user,
        attendance: `relation ${workspot}`,
        workspot: workspot,
        latitude: result[0].latitude,
        longitude: result[0].longitude,
      };
      await this.db
        .put({
          TableName: process.env.TABLE_NAME || "Timecards",
          Item: params,
        })
        .promise();
      return { message: "Insert Success" };
    } catch (err) {
      throw err;
    }
  };

  delete = async (user: string, workspot: string) => {
    const params = {
      TableName: process.env.TABLE_NAME || "Timecards",
      Key: {
        user: user,
        attendance: `relation ${workspot}`,
      },
    };
    try {
      await this.db.delete(params).promise();
      return { message: "Delete Success" };
    } catch (err) {
      throw err;
    }
  };
}

export default RleationModel;
