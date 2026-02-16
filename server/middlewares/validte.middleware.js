import { ApiError } from "../utils/ApiError.js";

export const validate = (schema, key = "body") => (req, _res, next) => {
  const { error, value } = schema.validate(req[key], {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    const msg = error.details.map(d => d.message).join(", ");
    return next(new ApiError(400, msg));
  }
  req[key] = value;
  next();
};
