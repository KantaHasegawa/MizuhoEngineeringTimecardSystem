import HttpException from "../exceptions/HttpException";
import lineClient from "../helper/lineSetting";

const pushLINE = async (text: string) => {
  if (process.env.NODE_ENV === "development") {
    return;
  }
  try {
    await lineClient.broadcast({
      type: "text",
      text: text,
    });
  } catch (err) {
    throw new HttpException(500, "Failed push LINE message");
  }
};

export default pushLINE;
