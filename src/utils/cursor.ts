import { Base64 } from 'js-base64'

export function encode({ pageNum, itemIndex }: { pageNum: number, itemIndex: number }): string {
  return Base64.encode(String(pageNum) + '#' + String(itemIndex))
}

export function decode(cursor: string): {
  pageNum: number,
  itemIndex: number,
} {
  const [pageNum, itemIndex] = Base64.decode(cursor).split('#').map(Number)

  return {
    pageNum,
    itemIndex,
  }
}
