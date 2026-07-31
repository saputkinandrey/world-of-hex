import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegionCalendar, RegionCalendarDocument } from '../schemas/region-calendar.schema';
import { WorldCalendarPulseEvent } from '../events/calendar-pulse.events';
import { simulationCalendarFromTick } from '../utils/simulation-calendar.util';
import { normalizeSimulationTick } from '../utils/simulation-tick.codec';

@Injectable()
export class RegionCalendarRepository {
    constructor(
        @InjectModel(RegionCalendar.name)
        private readonly calendarModel: Model<RegionCalendar>,
    ) {}

    /**
     * Projects calendar fields from the pulse tick.
     * Never moves the read model backwards when a stale pulse arrives.
     */
    async applyFromPulse(event: WorldCalendarPulseEvent): Promise<RegionCalendarDocument | null> {
        const tick = normalizeSimulationTick(event.tick);
        const calendar = simulationCalendarFromTick(tick);
        const existing = await this.calendarModel.findOne({ regionId: event.regionId }).exec();

        if (existing && existing.tick > tick) {
            return existing;
        }

        return this.calendarModel
            .findOneAndUpdate(
                { regionId: event.regionId },
                {
                    $set: {
                        tick,
                        year: calendar.year,
                        month: calendar.month,
                        week: calendar.week,
                        day: calendar.day,
                        hour: calendar.hour,
                        minute: calendar.minute,
                        second: calendar.second,
                        lastWorldEventId: event.worldEventId,
                        lastBoundaryType: event.boundaryType,
                    },
                    $setOnInsert: { regionId: event.regionId },
                },
                { upsert: true, new: true },
            )
            .exec() as Promise<RegionCalendarDocument>;
    }

    findByRegionId(regionId: string) {
        return this.calendarModel.findOne({ regionId }).exec() as Promise<RegionCalendarDocument | null>;
    }
}
