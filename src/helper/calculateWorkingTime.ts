import dayjs from "../helper/dayjsSetting";
import { TimecardRow } from "../models/timecard";

type TypeCalculateWorkingTimeReturn = {
  workTime: number;
  leave: string;
  rest: number;
  regularWorkTime: number;
  irregularWorkTime: number;
};

export const calculateWorkingTime = (
  ArgumentAttendance: string,
  ArgumentLeave?: string | undefined,
  ArgumentRest?: number | undefined
): TypeCalculateWorkingTimeReturn => {
  const regularAttendanceTime = dayjs(
    `${ArgumentAttendance.slice(0, 8)}0730`
  ).tz();
  const regularLeaveTime = dayjs(`${ArgumentAttendance.slice(0, 8)}1700`).tz();
  const leave = ArgumentLeave ?? dayjs().tz().format("YYYYMMDDHHmmss");
  console.log(leave)
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

export const calculateEarly = (attendance: string) => {
  const regularAttendanceTime = dayjs(
    `${attendance.slice(0, 8)}0730`
  ).tz();
  const dayjsObjAttendance = dayjs(attendance).tz();
  const early = regularAttendanceTime.diff(dayjsObjAttendance, "minute")
  return early;
}

export const calculateLate = (attendance: string, leave: string) => {
  if (leave === "none") {
    return 0;
  }
  const regularLeaveTime = dayjs(`${attendance.slice(0, 8)}1700`).tz();
  const dayjsObjLeave = dayjs(leave).tz();
  const late = dayjsObjLeave.diff(regularLeaveTime, "minute")
  return late;
}

export const calculateAttendanceCount = (args: TimecardRow[]) => {
  let count = 0;
  args.forEach((arg) => {
    if (arg.attendance !== "none") {
      count++;
    }
  });
  return count;
}

export const calculateSumRegularWorkTime = (args: TimecardRow[]) => {
  let sumRegularWorkTime = 0;
  args.forEach((arg) => {
    sumRegularWorkTime += arg.regularWorkTime;
  });
  return sumRegularWorkTime;
};

export const calculateSumIrregularWorkTime = (args: TimecardRow[]) => {
  let sumIrregularWorkTime = 0;
  args.forEach((arg) => {
    sumIrregularWorkTime += arg.irregularWorkTime;
  });
  return sumIrregularWorkTime;
}

export const calculateAvgIrregularWorkTime = (args: TimecardRow[]) => {
  let sum = 0;
  let count = 0;
  for (const arg of args) {
    if (arg.leave === "none") {
      continue;
    }
    sum += arg.irregularWorkTime;
    count++;
  }
  return sum / count;
};