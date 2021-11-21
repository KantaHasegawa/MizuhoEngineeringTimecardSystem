import Ajv from "ajv";
import HttpException from "../exceptions/HttpException";
const ajv = new Ajv();

type User = {
  username: string;
  password: string;
};

class UserValidator {
  db: AWS.DynamoDB.DocumentClient;

  constructor(db: AWS.DynamoDB.DocumentClient) {
    this.db = db;
  }

  schemaSignup = {
    type: "object",
    properties: {
      username: {
        type: "string",
        pattern: "^[ぁ-んァ-ヶｱ-ﾝﾞﾟ一-龠]*$",
        maximum: 15,
      },
      password: {
        type: "string",
        pattern: "^[0-9a-zA-Z]+$",
        minimum: 4,
        maximum: 15,
      },
    },
    required: ["username", "password"],
  };

  schemaEdit = {
    type: "object",
    properties: {
      password: {
        type: "string",
        pattern: "/^[0-9a-zA-Z]*$/",
        minimum: 4,
        maximum: 15,
      },
    },
    required: ["password"],
  };

  validateSignup = ajv.compile(this.schemaSignup);
  validateEdit = ajv.compile(this.schemaEdit);

  signup = async (data: User) => {
    try {
      if (this.validateSignup(data)) {
        const params = {
          TableName: "Timecards",
          Key: {
            user: data.username,
            attendance: "user",
          },
        };
        const result = await this.db.get(params).promise();
        if (Object.keys(result).length) {
          throw new HttpException(400, "このユーザー名は既に使用されています");
        }
      } else {
        throw new HttpException(400, "不正な入力です");
      }
    } catch (err) {
      throw err;
    }
  };

  edit = (data: User) => {
    try {
      if (!this.validateEdit(data)) {
        throw new HttpException(400, "不正な入力です");
      }
    } catch (err) {
      throw err;
    }
  };
}

export default UserValidator;
