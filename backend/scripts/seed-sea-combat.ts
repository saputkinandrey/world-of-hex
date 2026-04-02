import path from 'node:path';
import dotenv from 'dotenv';
import mongoose, { Model } from 'mongoose';
import { Encounter, EncounterSchema } from '../src/sea-combat/schemas/encounter.schema';
import { Ship, ShipSchema } from '../src/sea-combat/schemas/ship.schema';
import { Player, PlayerSchema } from '../src/player/schemas/player.schema';
import { ShipType } from '../src/sea-combat/types/ship-type.type';
import { EncounterAggregate } from '../src/sea-combat/domain/encounter/encounter.root';
import { axialToOffsetPoint } from '../src/sea-combat/utils/hex-coordinate.util';
import { Direction } from '../src/sea-combat/types/direction.type';

type DbConfig = {
    url?: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    name?: string;
};

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const getConfig = (): DbConfig => ({
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: process.env.DATABASE_PORT ?? '27017',
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
});

const buildMongoUri = (config: DbConfig) => config.url ?? `mongodb://${config.host}:${config.port}`;

const getModel = <T>(name: string, schema: mongoose.Schema) =>
    (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema);

const ensureShip = async (model: Model<Ship>, name: string, type: ShipType, speed: number, tactics: number) =>
    model.findOneAndUpdate({ name }, { $setOnInsert: { name, type, speed, tactics } }, { upsert: true, new: true });

const ensurePlayer = async (model: Model<Player>, name: string) =>
    model.findOneAndUpdate({ name }, { $setOnInsert: { name, ownedShips: [] } }, { upsert: true, new: true });

const ensureEncounter = async (model: Model<Encounter>, name: string, radius: number) => {
    const id = new mongoose.Types.ObjectId().toHexString();
    const aggregate = new EncounterAggregate(id)
        .setName(name)
        .setRadius(radius)
        .setCenter({ q: 0, r: 0 })
        .reRollWindDirection(Direction.N);

    return model.findOneAndUpdate(
        { name },
        {
            $setOnInsert: {
                _id: aggregate.id,
                name,
                radius,
                center: axialToOffsetPoint(aggregate.center),
                windDirection: aggregate.windrose.direction,
                players: [],
                ships: [],
            },
        },
        { upsert: true, new: true },
    );
};

const ensureOwnership = async (model: Model<Player>, playerId: string, shipId: string) =>
    model.updateOne({ _id: playerId }, { $addToSet: { ownedShips: { _id: shipId } } });

const run = async () => {
    const config = getConfig();
    const uri = buildMongoUri(config);
    await mongoose.connect(uri, {
        dbName: config.name,
        user: config.username,
        pass: config.password,
    });

    try {
        const ShipModel = getModel<Ship>(Ship.name, ShipSchema);
        const PlayerModel = getModel<Player>(Player.name, PlayerSchema);
        const EncounterModel = getModel<Encounter>(Encounter.name, EncounterSchema);

        const shipAlpha = await ensureShip(ShipModel, 'Sea Wraith', ShipType.DRAKKAR, 3, 11);
        const shipBravo = await ensureShip(ShipModel, 'Iron Gull', ShipType.GALLEON, 2, 8);

        const playerAlpha = await ensurePlayer(PlayerModel, 'Captain Elara Voss');
        const playerBravo = await ensurePlayer(PlayerModel, 'Navigator Bram Holt');

        await ensureOwnership(PlayerModel, playerAlpha._id, shipAlpha._id);
        await ensureOwnership(PlayerModel, playerBravo._id, shipBravo._id);

        const encounterAlpha = await ensureEncounter(EncounterModel, 'Shattered Shoals', 8);
        const encounterBravo = await ensureEncounter(EncounterModel, 'Frostbite Rift', 16);

        // eslint-disable-next-line no-console
        console.log('Seeded sea-combat data', {
            players: [playerAlpha._id, playerBravo._id],
            ships: [shipAlpha._id, shipBravo._id],
            encounters: [encounterAlpha._id, encounterBravo._id],
        });
    } finally {
        await mongoose.disconnect();
    }
};

run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
