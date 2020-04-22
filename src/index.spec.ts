import connectionify, { OriginalFetchFunction, Connection } from './'

const ITEMS = [
  { id: 'cd69734c-a75a-5128-8df8-068fb1037917' },
  { id: '4d750090-e856-5e75-8ea8-031e1d07ef1e' },
  { id: 'f8c18b53-e554-5890-951d-246db13f7bd6' },
  { id: '80284d49-4b00-5c6e-a0ea-465aaccb27a9' },
  { id: '1d5fd889-c7f5-5f9a-84bc-3cee59bb1dfe' },
  { id: 'bc992547-bec2-5c3c-bf3a-7b11d6a1af87' },
  { id: '2a0a0f9d-6c86-50b6-951d-ec9517f67ab1' },
  { id: 'd3484552-e2e2-54e2-b887-1a5c39874b97' },
  { id: 'efce9978-b8fd-5c1f-aae1-fda5c309e2ac' },
  { id: '4128c367-0b0a-5461-8219-7efa9f9407c8' },
  { id: '1752ce2f-9de3-54d3-b1d2-eab6b836e7f5' },
  { id: '84c9f895-0e39-5515-b06e-6d952dfc8167' },
  { id: '5e0eb9de-c76a-5046-bebb-3bacc62c51fb' },
  { id: 'b41b9300-2c04-546a-b425-0ff353925ff5' },
  { id: '07c10287-0ecf-5667-a5d4-42086d8b9720' },
  { id: '275ebf05-597c-57f3-9610-d611f30bc095' },
]

export const createOriginalFetchFunction = (itemNumPerPage: number): OriginalFetchFunction<{ id: string }> => async ({ pageNum }) => {
  const from = (pageNum - 1) * itemNumPerPage

  return {
    items: ITEMS
      .filter((_, i) => i >= from)
      .filter((_, i) => i < itemNumPerPage),
    pageInfo: {
      currentPageNum: pageNum,
      nextPageNum: (from + itemNumPerPage) < ITEMS.length ? pageNum + 1 : null,
      prevPageNum: pageNum === 1 ? null : pageNum - 1,
    }
  }
}

test('originalFetchFunction is working properly', async () => {
  const originalFetchFunction = createOriginalFetchFunction(5)

  let page: any

  page = await originalFetchFunction({ pageNum: 1 })

  expect(page.items[0].id).toBe('cd69734c-a75a-5128-8df8-068fb1037917')
  expect(page.pageInfo.prevPageNum).toBe(null)
  expect(page.pageInfo.nextPageNum).toBe(2)

  page = await originalFetchFunction({ pageNum: 3 })

  expect(page.items[0].id).toBe('1752ce2f-9de3-54d3-b1d2-eab6b836e7f5')
  expect(page.pageInfo.prevPageNum).toBe(2)
  expect(page.pageInfo.nextPageNum).toBe(4)

  page = await originalFetchFunction({ pageNum: 4 })

  expect(page.items[0].id).toBe('275ebf05-597c-57f3-9610-d611f30bc095')
  expect(page.pageInfo.prevPageNum).toBe(3)
  expect(page.pageInfo.nextPageNum).toBe(null)
})

test('connectionify is working properly', async () => {
  const fetch = connectionify(createOriginalFetchFunction(5), {
    itemNumPerPage: 5,
  })

  let connection: Connection<{ id: string }>

  connection = await fetch({
    first: 7,
  })

  expect(connection.edges[0].node.id).toBe('cd69734c-a75a-5128-8df8-068fb1037917')
  expect(connection.pageInfo.hasPreviousPage).toBe(false)
  expect(connection.pageInfo.hasNextPage).toBe(true)

  connection = await fetch({
    first: 7,
    after: connection.pageInfo.endCursor,
  })

  expect(connection.edges[0].node.id).toBe('d3484552-e2e2-54e2-b887-1a5c39874b97')
  expect(connection.pageInfo.hasPreviousPage).toBe(true)
  expect(connection.pageInfo.hasNextPage).toBe(true)

  connection = await fetch({
    first: 7,
    after: connection.pageInfo.endCursor,
  })

  expect(connection.edges[0].node.id).toBe('07c10287-0ecf-5667-a5d4-42086d8b9720')
  expect(connection.pageInfo.hasPreviousPage).toBe(true)
  expect(connection.pageInfo.hasNextPage).toBe(false)

  connection = await fetch({
    last: 6,
    before: 'NCMw',
  })

  expect(connection.edges[0].node.id).toBe('4128c367-0b0a-5461-8219-7efa9f9407c8')
  expect(connection.pageInfo.hasPreviousPage).toBe(true)
  expect(connection.pageInfo.hasNextPage).toBe(true)

  connection = await fetch({
    last: 6,
    before: connection.pageInfo.startCursor!,
  })

  expect(connection.edges[0].node.id).toBe('80284d49-4b00-5c6e-a0ea-465aaccb27a9')
  expect(connection.pageInfo.hasPreviousPage).toBe(true)
  expect(connection.pageInfo.hasNextPage).toBe(true)

  connection = await fetch({
    last: 6,
    before: connection.pageInfo.startCursor!,
  })

  expect(connection.edges[0].node.id).toBe('cd69734c-a75a-5128-8df8-068fb1037917')
  expect(connection.pageInfo.hasPreviousPage).toBe(false)
  expect(connection.pageInfo.hasNextPage).toBe(true)
})
