import * as cursor from './cursor'

test('After encoding and decoding, compare the result with the argument', () => {
  const pageNum = Math.ceil(Math.random() * 100)
  const itemIndex = Math.ceil(Math.random() * 100)

  const c = cursor.decode(cursor.encode({
    pageNum,
    itemIndex,
  }))

  expect(c.pageNum).toBe(pageNum)
  expect(c.itemIndex).toBe(itemIndex)
})
