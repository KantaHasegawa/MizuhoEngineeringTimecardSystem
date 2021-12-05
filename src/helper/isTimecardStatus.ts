import dayjs from "../helper/dayjsSetting";

export type TypeTimecard = {
  attendance: string;
  leave: string;
};

type TypeTimecardStatus = "NotAttend" | "NotLeave" | "AlreadyLeave";

const isTimecardStatus = (timecard: TypeTimecard): TypeTimecardStatus => {
  const today = dayjs().tz().format("YYYYMMDD");
  const result =
    timecard.leave === "none"
      ? "NotLeave"
      : timecard.attendance.slice(0, 8) === today
      ? "AlreadyLeave"
      : "NotAttend";
  return result;
};

export default isTimecardStatus;
