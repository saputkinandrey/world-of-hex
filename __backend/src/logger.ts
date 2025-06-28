import winston from "winston"

const transports: Array<winston.transport> = [
  new winston.transports.File({
    filename: '../winston.log',
  }),
]

if (process.env.NODE_ENV !== 'test') {
  transports.push(new winston.transports.Console({}))
}

export const logger = winston.createLogger({
  format: winston.format.simple(),
  transports: transports,
})
