import dayjs from "dayjs";
import "dayjs/locale/ja";

type TypeCalculateWorkingTimeReturn = {
  workTime: number;
  leave: string;
  rest: number;
  regularWorkTime: number;
  irregularWorkTime: number;
};

const calculateWorkingTime = (
  ArgumentAttendance: string,
  ArgumentLeave?: string | undefined
): TypeCalculateWorkingTimeReturn => {
  const regularAttendanceTime: dayjs.Dayjs = dayjs(
    `${ArgumentAttendance.slice(0, 8)}0800`
  );
  const regularLeaveTime: dayjs.Dayjs = dayjs(
    `${ArgumentAttendance.slice(0, 8)}1700`
  );
  const leave: string = ArgumentLeave ?? dayjs().format("YYYYMMDDHHmmss");
  const dayjsObjLeave: dayjs.Dayjs = dayjs(leave);
  const dayjsObjAttendance: dayjs.Dayjs = dayjs(ArgumentAttendance);
  const workTime: number = dayjsObjLeave.diff(dayjsObjAttendance, "minute");
  const rest: number = workTime >= 60 ? 60 : 0;

  const early: number = dayjsObjLeave.isSameOrBefore(regularAttendanceTime)
    ? workTime
    : regularAttendanceTime.diff(dayjsObjAttendance, "minute") > 0
    ? regularAttendanceTime.diff(dayjsObjAttendance, "minute")
    : 0;

  const late: number = dayjsObjAttendance.isSameOrAfter(regularLeaveTime)
    ? workTime
    : dayjsObjLeave.diff(regularLeaveTime, "minute") > 0
    ? dayjsObjLeave.diff(regularLeaveTime, "minute")
    : 0;

  if (workTime - rest - early - late < 0) {
    const irregularRest: number = 0 - (workTime - rest - early - late);
    const regularWorkTime = 0;
    const irregularWorkTime: number = rest + early - irregularRest;
    return {
      workTime: workTime,
      leave: leave,
      rest: rest,
      regularWorkTime: regularWorkTime,
      irregularWorkTime: irregularWorkTime,
    };
  } else {
    const irregularWorkTime: number = early + late;
    const regularWorkTime: number = workTime - irregularWorkTime - rest;
    return {
      workTime: workTime,
      leave: leave,
      rest: rest,
      regularWorkTime: regularWorkTime,
      irregularWorkTime: irregularWorkTime,
    };
  }
};

export default calculateWorkingTime;
