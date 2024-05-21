import type { DateTime } from "luxon";

export const formatReadableDateTime = (dt: DateTime) => dt.toFormat("DDD");
