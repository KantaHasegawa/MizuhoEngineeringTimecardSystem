import dayjs from "../helper/dayjsSetting";

type TypeCalculateWorkingTimeReturn = {
  workTime: number;
  leave: string;
  rest: number;
  regularWorkTime: number;
  irregularWorkTime: number;
};

const calculateWorkingTime = (
  ArgumentAttendance: string,
  ArgumentLeave?: string | undefined,
  ArgumentRest?: number | undefined
): TypeCalculateWorkingTimeReturn => {
  const regularAttendanceTime = dayjs(
    `${ArgumentAttendance.slice(0, 8)}0730`
  ).tz();
  const regularLeaveTime = dayjs(`${ArgumentAttendance.slice(0, 8)}1700`).tz();
  const leave = ArgumentLeave ?? dayjs().tz().format("YYYYMMDDHHmmss");
  const dayjsObjLeave = dayjs(leave).tz();
  const dayjsObjAttendance = dayjs(ArgumentAttendance).tz();
  const workTime = dayjsObjLeave.diff(dayjsObjAttendance, "minute");
  const rest = ArgumentRest ? ArgumentRest : workTime >= 90 ? 90 : 0;

  const early = dayjsObjLeave.isSameOrBefore(regularAttendanceTime)
    ? workTime
    : regularAttendanceTime.diff(dayjsObjAttendance, "minute") > 0
    ? regularAttendanceTime.diff(dayjsObjAttendance, "minute")
    : 0;

  const late = dayjsObjAttendance.isSameOrAfter(regularLeaveTime)
    ? workTime
    : dayjsObjLeave.diff(regularLeaveTime, "minute") > 0
    ? dayjsObjLeave.diff(regularLeaveTime, "minute")
    : 0;

  if (workTime - rest - early - late < 0) {
    const irregularRest = 0 - (workTime - rest - early - late);
    const regularWorkTime = 0;
    const irregularWorkTime = late + early - irregularRest;
    return {
      workTime: workTime,
      leave: leave,
      rest: rest,
      regularWorkTime: regularWorkTime,
      irregularWorkTime: irregularWorkTime,
    };
  } else {
    const irregularWorkTime = early + late;
    const regularWorkTime = workTime - irregularWorkTime - rest;
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
