import bcrypt from "bcrypt";
import HttpException from "../exceptions/HttpException";

class UserModel {
  db: AWS.DynamoDB.DocumentClient;

  constructor(db: AWS.DynamoDB.DocumentClient) {
    this.db = db;
  }

  get = async (name: string | undefined) => {
    if (!name) {
      throw new HttpException(400, "Bad request")
    }
    const params = {
      TableName: "Timecards",
      Key: {
        user: name,
        attendance: "user",
      },
    };
    try {
      const result = await this.db.get(params).promise();
      return { user: result.Item };
    } catch (err) {
      throw err;
    }
  };

  all = async () => {
    const params = {
      TableName: "Timecards",
      IndexName: "usersIndex",
      ExpressionAttributeNames: { "#a": "attendance", "#r": "role" },
      ExpressionAttributeValues: { ":aval": "user", ":rval": "common" },
      KeyConditionExpression: "#a = :aval",
      FilterExpression: "#r = :rval",
    };
    try {
      const result = await this.db.query(params).promise();
      return { params: result.Items };
    } catch (err) {
      throw err;
    }
  };

  allIDs = async () => {
    const params = {
      TableName: "Timecards",
      IndexName: "usersIndex",
      ExpressionAttributeNames: { "#a": "attendance", "#r": "role" },
      ExpressionAttributeValues: { ":aval": "user", ":rval": "common" },
      KeyConditionExpression: "#a = :aval",
      FilterExpression: "#r = :rval",
    };
    try {
      const result = await this.db.query(params).promise();
      type TypeUser = {
        user: string;
      };
      const resultItems = result.Items as TypeUser[] | undefined;
      const response = resultItems?.map((item) => {
        return { params: { id: item.user } };
      });
      return response;
    } catch (err) {
      throw err;
    }
  };

  create = async (username: string, password: string) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const params = {
      user: username,
      password: hashedPassword,
      attendance: "user",
      role: "common",
    };
    try {
      await this.db
        .put({
          TableName: "Timecards",
          Item: params,
        })
        .promise();
      return { message: "Insert Success" };
    } catch (err) {
      throw err;
    }
  };

  update = async (username: string, password: string) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const params = {
      user: username,
      password: hashedPassword,
      attendance: "user",
      role: "common",
    };
    try {
      await this.db
        .put({
          TableName: "Timecards",
          Item: params,
        })
        .promise();
      return { message: "Update Success" };
    } catch (err) {
      throw err;
    }
  };

  delete = async (username: string) => {
    const userParams = {
      DeleteRequest: {
        Key: {
          user: username,
          attendance: "user",
        },
      },
    };
    const relationParams = {
      TableName: "Timecards",
      ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
      ExpressionAttributeValues: { ":uval": username, ":aval": "relation" },
      KeyConditionExpression: "#u = :uval AND begins_with(#a, :aval)",
    };
    try {
      const relationResult = await this.db.query(relationParams).promise();
      type TypeRelation = {
        workspot: string;
      };
      const relationResultItems = relationResult.Items as
        | TypeRelation[]
        | undefined;
      if (relationResultItems) {
        const requestArray = relationResultItems.map((item) => {
          return {
            DeleteRequest: {
              Key: {
                user: username,
                attendance: `relation ${item.workspot}`,
              },
            },
          };
        });
        requestArray.push(userParams);
        const requestParams = {
          RequestItems: {
            Timecards: requestArray,
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

export default UserModel;
