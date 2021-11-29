import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import documentClient from "../helper/dbconnect";
import HttpException from "../exceptions/HttpException";
import generateAccessToken, {
  TypeUserToken,
} from "../helper/generateAccessToken";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

type TypeTokenResponse = {
  attendance: string;
};

class AuthModel {
  db: AWS.DynamoDB.DocumentClient;

  constructor(db: AWS.DynamoDB.DocumentClient) {
    this.db = db;
  }

  login = async (username: string, password: string) => {
    const params = {
      TableName: "Timecards",
      Key: {
        user: username,
        attendance: "user",
      },
    };
    try {
      const result = await documentClient.get(params).promise();
      if (!Object.keys(result).length) {
        throw new HttpException(404, "氏名が間違っています");
      }
      type TypeUserResponse = {
        user: string;
        role: string;
        password: string;
      };
      const resultItem = result.Item as TypeUserResponse;

      const comparedPassword = await bcrypt.compare(
        password,
        resultItem.password
      );

      if (!comparedPassword)
        throw new HttpException(400, "パスワードが間違っています");
      const user = {
        name: resultItem.user,
        role: resultItem.role,
      };
      const accessToken = generateAccessToken(user);
      const refreshTokenSecret: jwt.Secret =
        process.env.REFRESH_TOKEN_SECRET ?? "defaultrefreshsecret";
      const refreshToken = jwt.sign(user, refreshTokenSecret, {
        expiresIn: "90d",
      });
      return { accessToken, refreshToken };
    } catch (err) {
      throw err;
    }
  };

  logout = async (refreshToken: string | undefined) => {
    const params = {
      user: "refreshTokenBlackList",
      attendance: refreshToken,
      expirationTime: dayjs.utc().add(1, "week").unix(),
    };
    try {
      if (refreshToken) {
        await this.db
          .put({
            TableName: "Timecards",
            Item: params,
          })
          .promise();
      }
      return { message: "Logout Success" };
    } catch (err) {
      throw err;
    }
  };

  token = async (refreshToken: string | undefined) => {
    const params = {
      TableName: "Timecards",
      ExpressionAttributeNames: { "#u": "user" },
      ExpressionAttributeValues: { ":val": "refreshTokenBlackList" },
      KeyConditionExpression: "#u = :val",
    };
    try {
      if (refreshToken == null) {
        throw new HttpException(403, "RefreshToken is null");
      }
      const result = await documentClient.query(params).promise();
      const resultItems = result.Items as TypeTokenResponse[] | undefined;
      if (!resultItems) {
        throw new HttpException(500, "Result is empty");
      }
      const blackList = resultItems.map((item) => item.attendance);
      if (blackList.includes(refreshToken))
        throw new HttpException(403, "Invalid refreshToken");
      const refreshTokenSecret: jwt.Secret =
        process.env.REFRESH_TOKEN_SECRET ?? "defaultrefreshsecret";
      const verifiedToken = jwt.verify(refreshToken, refreshTokenSecret);
      const user = verifiedToken as TypeUserToken;
      if (!user?.name || !user?.role) {
        throw new HttpException(500, "User is not found");
      }
      const accessToken = generateAccessToken({
        name: user.name,
        role: user.role,
      });
      return accessToken;
    } catch (err) {
      throw err;
    }
  };

  currentuser = (accessToken: string | undefined) => {
    try {
      const accessTokenSecret: jwt.Secret =
        process.env.ACCESS_TOKEN_SECRET ?? "defaultaccesssecret";
      if (!accessToken) {
        throw new HttpException(403, "AccessToken is null");
      }
      const result = jwt.verify(accessToken, accessTokenSecret);
      return result;
    } catch (err) {
      throw err;
    }
  };
}

export default AuthModel;
