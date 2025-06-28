export const timeZoneCookieName = 'x-timezone';

export const DEFAULT_MSG_REACTION = '2764-fe0f';

export const TtlExpression = {
  // TODO: migrate other ttl expressions to this file
  NINETY_DAYS: 90 * 24 * 60 * 60,
} as const;
export type TtlExpression = (typeof TtlExpression)[keyof typeof TtlExpression];

export const AppCronExpression = {
  EVERY_MONDAY: '0 0 * * 1',
} as const;
export type AppCronExpression =
  (typeof AppCronExpression)[keyof typeof AppCronExpression];

export const characterHeight = {
  min: 155,
  max: 175,
};
