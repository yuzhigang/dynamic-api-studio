export const homeOverviewQueryKeys = {
  all: ['home-overview'] as const,
  overview: () => [...homeOverviewQueryKeys.all, 'overview'] as const,
}
