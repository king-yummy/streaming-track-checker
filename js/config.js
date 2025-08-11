// Google Sheet URL
export const STREAMING_LIST_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7sUDMYoUsBpvEC9LjO25CnstexV74iKXfwRWVdqpQCOm65rzvJ6RrnedOv6JSqEYJNqyr2cje75CJ/pub?gid=0&single=true&output=csv";

export const TODO_LIST_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7sUDMYoUsBpvEC9LjO25CnstexV74iKXfwRWVdqpQCOm65rzvJ6RrnedOv6JSqEYJNqyr2cje75CJ/pub?gid=673035369&single=true&output=csv";

export const NOTICE_LIST_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7sUDMYoUsBpvEC9LjO25CnstexV74iKXfwRWVdqpQCOm65rzvJ6RrnedOv6JSqEYJNqyr2cje75CJ/pub?gid=2027332980&single=true&output=csv";

// 스밍 리스트 관련 변수
export const START_AT_MS = new Date("2025-06-16T00:00:00+09:00").getTime();
export const TARGETS = {
  kakurenbo: "かくれんぼ",
  rizz: "Rizz - japanese Ver.",
  chroma: "Chroma Drift - japanese Ver.",
};
export const CUTOVER_AT_MS = new Date("2025-07-06T23:00:00+09:00").getTime();
export const PER_CYCLE_OLD = { kakurenbo: 4, rizz: 3, chroma: 1 };
export const PER_CYCLE_NEW = { kakurenbo: 2, rizz: 1, chroma: 1 };
export const OLD_SYSTEM_DURATION_SEC = Math.floor(
  (CUTOVER_AT_MS - START_AT_MS) / 1000
);
export const OLD_SYSTEM_CYCLES = Math.floor(OLD_SYSTEM_DURATION_SEC / 3600);
export const BASE_COUNTS = {
  kakurenbo: OLD_SYSTEM_CYCLES * PER_CYCLE_OLD.kakurenbo,
  rizz: OLD_SYSTEM_CYCLES * PER_CYCLE_OLD.rizz,
  chroma: OLD_SYSTEM_CYCLES * PER_CYCLE_OLD.chroma,
};
