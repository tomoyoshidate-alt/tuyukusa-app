import { getPollenLevel } from "./pollen";
import type { EnvironmentProvider } from "./types";
import { getWeather } from "./weather";

/** Default environment provider — swap implementation here for paid APIs. */
export const defaultEnvironmentProvider: EnvironmentProvider = {
  getWeather,
  getPollenLevel,
};
