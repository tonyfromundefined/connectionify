# Connectionify

Change page number based pagination to cursor based connection conforming to [Relay Server Specification](https://relay.dev/docs/en/graphql-server-specification#connections).

## Install

```bash
$ yarn add connectionify
```

## If your API...

Assume that your API using pagination based on page number, and 1 page has 5 items.

```
/users.json?&pageNum=1
```

```json
{
  "items": [
    { ... },
    { ... },
    { ... },
    { ... },
    { ... }
  ],
  "pageInfo": {
    "currentPageNum": 1,
    "nextPageNum": 2,
    "prevPageNum": null
  }
}
```

## Usage

```typescript
import connectionify from 'connectionify'
import { getUsers } from './api'

const getUsersConnection = connectionify(({ pageNum }) => {
  return getUsers({
    pageNum,
  })
}, {
  itemNumPerPage: 5,
})

const connection = await getUsersConnection({
  first: 8,
})
```

## Result

```json
{
  "edges": [
    {
      "cursor": "MyMx",
      "node": {...}
    },
    ...
  ],
  "pageInfo": {
    "hasNextPage": true,
    "hasPrevPage": false,
    "startCursor": "MyMx",
    "endCursor" "..."
  }
}
```

## See also
- [Relay Server Specification](https://relay.dev/docs/en/graphql-server-specification#connections)
