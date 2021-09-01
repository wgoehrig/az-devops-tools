# az-devops-tools

## Getting Started

```sh
git clone https://github.com/wgoehrig/az-devops-tools/
npm ci
npm run build
az extension add --name azure-devops
az devops configure --defaults organization="https://dev.azure.com/<ORGANIZATION>" project="<PROJECT>"
node .
```


## FAQ
**I keep getting an error about null keys and/or missing data in file.**

Do not leave any null or undefined values. You can force null with `''` empty string, but may have some unexpected behavior. For example, a `git.push` webhook with `branch: ''` will trigger on any branch.

**What are the supported event types?**

See [EventTypes.ts](src/svc-hooks/EventTypes.ts) for the list of currently supported event types.

See full list of event types and their required parameters [here](https://docs.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops).

**I don't understand the parameters.**

See full list of event types and their required parameters [here](https://docs.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops).