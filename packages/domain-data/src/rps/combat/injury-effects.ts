import { profileHasAdvantage, type FighterCapabilities } from "../characters";
import { requireInteger } from "./dice";
import type { HitLocation } from "./types";

export const STUN_DEFENSE_PENALTY = 4;

export interface InjuryCheck {
    majorWound: boolean;
    required: boolean;
    target: number;
}

export function getHealthCheckTarget(profile: FighterCapabilities): number {
    return (
        profile.attributes.HT + (profileHasAdvantage(profile, "fit") ? 1 : 0)
    );
}

export function getResourceDivisor(current: number, maximum: number): number {
    requireInteger(maximum, "Resource maximum", 1);
    if (!Number.isSafeInteger(current))
        throw new Error(`Resource value must be an integer: ${current}`);
    return current * 3 < maximum ? 2 : 1;
}

export function getShockPenalty(
    profile: FighterCapabilities,
    maxHP: number,
    injury: number,
    previousShock = 0,
): number {
    requireInteger(maxHP, "Maximum HP", 1);
    requireInteger(injury, "Injury");
    requireInteger(previousShock, "Previous shock");
    if (profileHasAdvantage(profile, "high_pain_threshold")) return 0;
    return Math.min(
        4,
        previousShock +
            Math.floor(injury / Math.max(1, Math.floor(maxHP / 10))),
    );
}

export function getInjuryCheck(
    profile: FighterCapabilities,
    maxHP: number,
    injury: number,
    location: HitLocation = "torso",
): InjuryCheck {
    requireInteger(maxHP, "Maximum HP", 1);
    requireInteger(injury, "Injury");
    const majorWound = injury > maxHP / 2;
    const headOrVitals = ["skull", "eyes", "face", "vitals"].includes(location);
    const locationPenalty = majorWound
        ? location === "skull" || location === "eyes"
            ? 10
            : headOrVitals
              ? 5
              : 0
        : 0;
    return {
        majorWound,
        required: majorWound || (headOrVitals && injury > 0),
        target:
            getHealthCheckTarget(profile) +
            (profileHasAdvantage(profile, "high_pain_threshold") ? 3 : 0) -
            locationPenalty,
    };
}
