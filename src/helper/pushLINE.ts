import HttpException from "../exceptions/HttpException";
import lineClient from "../helper/lineSetting";

const pushLINE = async (text: string) => {
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
