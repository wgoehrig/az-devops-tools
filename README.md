# az-devops-tools

## Getting Started

```sh
git clone https://github.com/wgoehrig/az-devops-tools/tree/log-tools
npm ci
npm run build
az extension add --name azure-devops
az devops configure --defaults organization="https://dev.azure.com/<ORGANIZATION>" project="<PROJECT>"
node .
```
