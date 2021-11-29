import jwt from "jsonwebtoken";

export type TypeUserToken = {
  name: string;
  role: string;
};

const generateAccessToken = (user: TypeUserToken) => {
  const accessTokenSecret: jwt.Secret =
    process.env.ACCESS_TOKEN_SECRET ?? "defaultaccesssecret";
  return jwt.sign(user, accessTokenSecret, { expiresIn: "5m" });
};

export default generateAccessToken;
