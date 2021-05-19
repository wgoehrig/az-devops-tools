# az-devops-tools

## Installation

```
git clone https://github.com/wgoehrig/az-devops-tools/tree/log-tools
git checkout log-tools
npm ci
npm run build
az extension add --name azure-devops
az devops configure --defaults organization="https://dev.azure.com/<ORGANIZATION>" project="<REDACTED>"
```

## Usage

Command: node path/to/az-devops-tools logs get \<Azure Build Link\>  
For example: `node . logs get https://dev.azure.com/<ORGANIZATION>/<REDACTED>/_build/results?buildId=123456`
