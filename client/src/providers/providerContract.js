export function createProviderDescriptor({ id, label, capabilities = {}, status = "available" }) {
  return Object.freeze({
    id,
    label,
    status,
    capabilities: Object.freeze({
      activities: Boolean(capabilities.activities),
      health: Boolean(capabilities.health),
      fileImport: Boolean(capabilities.fileImport),
      oauth: Boolean(capabilities.oauth),
      live: Boolean(capabilities.live),
    }),
  });
}

export const providerRegistry = Object.freeze({
  garmin: createProviderDescriptor({
    id: "garmin",
    label: "Garmin Connect (legacy personal)",
    capabilities: { activities: true, health: true, live: true },
  }),
  garmin_official: createProviderDescriptor({
    id: "garmin_official",
    label: "Garmin Connect Developer Program",
    status: "requires_configuration",
    capabilities: { activities: true, health: true, oauth: true, live: true },
  }),
  strava: createProviderDescriptor({
    id: "strava",
    label: "Strava",
    status: "requires_configuration",
    capabilities: { activities: true, oauth: true, live: true },
  }),
  fit: createProviderDescriptor({
    id: "fit",
    label: "FIT file",
    capabilities: { activities: true, fileImport: true },
  }),
  gpx: createProviderDescriptor({
    id: "gpx",
    label: "GPX file",
    capabilities: { activities: true, fileImport: true },
  }),
  komoot: createProviderDescriptor({
    id: "komoot",
    label: "Komoot GPX",
    capabilities: { activities: true, fileImport: true },
  }),
});
