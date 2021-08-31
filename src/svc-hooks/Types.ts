export interface HookInput {
  org: string;
  project: string;
  eventType: string;
  url: string;
  eventSpecificArgs: any;
}

export interface HookData extends HookFormattedData{
  _links: any;
  actionDescription: string;
  consumerActionId: string;
  consumerId: string;
  consumerInputs: any;
  createdBy: any;
  createdDate: string;
  eventDescription: string;
  eventType: string;
  id: string;
  lastProbationRetryDate: string;
  modifiedBy: any;
  modifiedDate: string;
  publisherId: string;
  publisherInputs: any;
  resourceVersion: string;
  status: string;
  subscriber: any;
  url: string;
}

export interface HookFormattedData {
  consumerActionId: string;
  consumerId: string;
  consumerInputs: any;
  eventType: string;
  id: string;
  publisherId: string;
  publisherInputs: any;
  resourceVersion: string;
}

export interface RepoData {
  defaultBranch: string;
  id: string;
  isDisabled: boolean;
  isFork: boolean;
  name: string;
  parentRepository: string | null | undefined;
  project: any;
  remoteUrl: string;
  size: number;
  sshUrl: string;
  url: string;
  validRemoteUrls: string | string[] | undefined | null;
  webUrl: string;
}

export interface ProjectData {
  id: string;
  lastUpdateTime: string;
  name: string;
  revision: number;
  state: string;
  url: string;
  visibility: string;
}
