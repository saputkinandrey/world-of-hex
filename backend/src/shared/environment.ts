import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsUrl,
  IsEnum,
} from 'class-validator';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import * as dotenv from 'dotenv';

class EnvironmentVariables {
  @IsIn(['local', 'development', 'production'])
  NODE_ENV: 'local' | 'development' | 'production';

  @IsString()
  REDIS_HOST: string;

  @Type(() => Number)
  @IsNumber()
  REDIS_PORT: number;

  private static instance: EnvironmentVariables;

  public static getInstance(): EnvironmentVariables {
    if (!EnvironmentVariables.instance) {
      dotenv.config();
      // console.log('Environment variables: ', process.env);
      const config = plainToClass(EnvironmentVariables, process.env);
      const errors = validateSync(config);

      if (errors.length > 0) {
        throw new Error(
          `Environment validation failed: ${JSON.stringify(errors, null, 2)}`,
        );
      }

      EnvironmentVariables.instance = config;
    }

    return EnvironmentVariables.instance;
  }
}

export const environment = EnvironmentVariables.getInstance();
