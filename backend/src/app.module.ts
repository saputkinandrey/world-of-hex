import { Module } from '@nestjs/common';
import databaseConfig from './database/config/database.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { AllConfigType } from './config/config.type';
import { MailerModule } from './mailer/mailer.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './database/mongoose-config.service';
import { SeaCombatModule } from './sea-combat/sea-combat.module';
import { EventNestMongoDbModule } from '@event-nest/mongodb';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { environment } from './utils/environment';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { JwtModule } from '@nestjs/jwt';
import { AiModule } from './ai/ai.module';
import { URL } from 'url';
import {RpsModule} from "./rps/rps.module";

const infrastructureDatabaseModule = MongooseModule.forRootAsync({
    useClass: MongooseConfigService,
});

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, appConfig, mailConfig],
            envFilePath: ['.env'],
        }),
        ScheduleModule.forRoot({ cronJobs: true }),
        EventEmitterModule.forRoot({
            wildcard: true,
            maxListeners: 30,
        }),
        infrastructureDatabaseModule,
        EventNestMongoDbModule.forRootAsync({
            useFactory: (configService: ConfigService<AllConfigType>) => {
                const configuredUri = configService.get('database.url', {
                    infer: true,
                });
                const defaultHost =
                    configService.get('database.host', { infer: true }) ??
                    'localhost';
                const defaultPort =
                    configService.get('database.port', { infer: true }) ??
                    27017;
                const fallbackUri = `mongodb://${defaultHost}:${defaultPort}`;

                let connectionUrl: URL;
                try {
                    connectionUrl = new URL(configuredUri ?? fallbackUri);
                } catch {
                    connectionUrl = new URL(fallbackUri);
                }

                const username = configService.get('database.username', {
                    infer: true,
                });
                const password = configService.get('database.password', {
                    infer: true,
                });
                const dbName = configService.get('database.name', {
                    infer: true,
                });

                if (username && password) {
                    connectionUrl.username = username;
                    connectionUrl.password = password;
                }

                if ((connectionUrl.pathname ?? '/') === '/' && dbName) {
                    connectionUrl.pathname = `/${dbName}`;
                }

                return {
                    connectionUri: connectionUrl.toString(),
                    aggregatesCollection: 'aggregates-collection',
                    eventsCollection: 'events-collection',
                };
            },
            inject: [ConfigService],
        }),
        BullModule.forRoot({
            connection: {
                host: environment.REDIS_HOST,
                port: Number(environment.REDIS_PORT || 6379),
                tls: environment.NODE_ENV === 'production' ? {} : undefined,
            },
        }),
        BullBoardModule.forRoot({
            route: '/queues',
            adapter: ExpressAdapter, // Or FastifyAdapter from `@bull-board/fastify`
        }),
        JwtModule.register({ secret: environment.JWT_SECRET, global: true }),

        I18nModule.forRootAsync({
            useFactory: (configService: ConfigService<AllConfigType>) => ({
                fallbackLanguage: configService.getOrThrow(
                    'app.fallbackLanguage',
                    {
                        infer: true,
                    },
                ),
                loaderOptions: {
                    path: path.join(__dirname, '../i18n'),
                    watch: true,
                },
            }),
            resolvers: [
                {
                    use: HeaderResolver,
                    useFactory: (
                        configService: ConfigService<AllConfigType>,
                    ) => {
                        return [
                            configService.get('app.headerLanguage', {
                                infer: true,
                            }),
                        ];
                    },
                    inject: [ConfigService],
                },
            ],
            imports: [ConfigModule],
            inject: [ConfigService],
        }),
        MailModule,
        MailerModule,
        HomeModule,
        SeaCombatModule,
        RpsModule,
        AiModule,
    ],
})
export class AppModule {}
