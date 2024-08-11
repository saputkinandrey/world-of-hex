import {FieldErrors} from "tsoa"

export type ErrorResponse = {
  status: number;
  message: string;
  stack?: string;
  fields?: FieldErrors
  request_id: string;
};

