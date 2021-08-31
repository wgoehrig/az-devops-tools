// See full list of event types and their required parameters here. https://docs.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops

export const validEventTypes = [
  "build.complete",
  "ms.vss-pipelines.run-state-changed-event",
  "git.push",
];
