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
    { "id": "a937e5fb-35e1-575f-b5e3-ac6e9409c624" },
    { "id": "577dce48-5167-56a6-b3e7-893407fa54dc" },
    { "id": "44eb22a3-48a1-5275-a2ef-e103da8674ae" },
    { "id": "1421a3b1-5468-51a4-a758-0b901c8f4315" },
    { "id": "c8c39625-217d-5095-ac23-c64367c9303d" }
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
      "cursor": "MSMw",
      "node": { "id": "a937e5fb-35e1-575f-b5e3-ac6e9409c624" }
    },
    {
      "cursor": "MSMx",
      "node": { "id": "577dce48-5167-56a6-b3e7-893407fa54dc" }
    },
    {
      "cursor": "MSMy",
      "node": { "id": "44eb22a3-48a1-5275-a2ef-e103da8674ae" }
    },
    {
      "cursor": "MSMz",
      "node": { "id": "1421a3b1-5468-51a4-a758-0b901c8f4315" }
    },
    {
      "cursor": "MSM0",
      "node": { "id": "c8c39625-217d-5095-ac23-c64367c9303d" }
    },
  ],
  "pageInfo": {
    "hasNextPage": true,
    "hasPrevPage": false,
    "startCursor": "MSMw",
    "endCursor" "MSM0"
  }
}
```

## See also
- [Relay Server Specification](https://relay.dev/docs/en/graphql-server-specification#connections)
