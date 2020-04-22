import { cursor } from './utils'

interface OriginalPageInfo {
  currentPageNum: number
  nextPageNum: number | null
  prevPageNum: number | null
}
export interface OriginalReturn<T> {
  items: T[],
  pageInfo: OriginalPageInfo
}
export interface OriginalParams {
  pageNum: number
}
export type OriginalFetchFunction<T> = (params: OriginalParams) => Promise<OriginalReturn<T>>

interface Edge<T> {
  cursor: string
  node: T
}
interface _Edge<T> {
  _cursor: {
    pageNum: number
    itemIndex: number
  }
  node: T
}
interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}
export interface Connection<T> {
  edges: Array<Edge<T>>
  pageInfo: PageInfo
}
export type ConnectionifiedParams = {
  first: number
  after?: string | null
} | {
  last: number
  before?: string | null
}
export type ConnectionifiedFetchFunction<T> = (params: ConnectionifiedParams) => Promise<Connection<T>>

interface ConnectionifyOptions {
  itemNumPerPage: number
}
function connectionify<T>(
  fetch: OriginalFetchFunction<T>,
  options: ConnectionifyOptions,
): ConnectionifiedFetchFunction<T> {
  return async (params) => {
    /**
     * Type checks
     */
    if ('first' in params) {
      if (params.first <= 0) {
        throw new TypeError(
          `the 'first' parameter should be larger than 0.`
        )
      }

      if (params.after != null) {
        const { pageNum, itemIndex } = cursor.decode(params.after)

        if (pageNum === NaN || itemIndex === NaN) {
          throw new TypeError(
            'Invalid cursor type. ' +
            `This cursor doesn't generated with given connectionify function.`
          )
        }
      }

    } else if ('last' in params) {
      if (params.last <= 0) {
        throw new TypeError(
          'the `last` parameter should be larger than 0'
        )
      }

      if (params.before != null) {
        const { pageNum, itemIndex } = cursor.decode(params.before)

        if (pageNum === NaN || itemIndex === NaN) {
          throw new TypeError(
            'Invalid cursor type. ' +
            `This cursor doesn't generated with given connectionify function.`
          )
        }
      }

    } else {
      throw new TypeError(
        `You should give 'first' or 'last' parameter in connectionified function`
      )
    }

    let afterPageNum = 1
    let afterItemIndex = -1

    let beforePageNum = Infinity
    let beforeItemIndex = options.itemNumPerPage

    if ('first' in params && params.after != null) {
      const { pageNum, itemIndex } = cursor.decode(params.after)
      afterPageNum = pageNum
      afterItemIndex = itemIndex
    }
    if ('last' in params && params.before != null) {
      const { pageNum, itemIndex } = cursor.decode(params.before)
      beforePageNum = pageNum
      beforeItemIndex = itemIndex
    }

    const _edges: Array<{
      node: T,
      _cursor: {
        pageNum: number,
        itemIndex: number,
      }
    }> = []
    const pageInfo: PageInfo = {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    }

    const promises: Array<ReturnType<OriginalFetchFunction<T>>> = []

    if ('first' in params) {
      for (let i = 0; i < Math.ceil((afterItemIndex + 1 + params.first) / options.itemNumPerPage); i++) {
        promises.push(
          fetch({
            pageNum: afterPageNum + i,
          })
        )
      }
    }
    if ('last' in params && beforePageNum !== Infinity) {
      for (let i = Math.ceil((5 - beforeItemIndex + 1 + params.last) / options.itemNumPerPage) - 1; i >= 0; i--) {
        if (beforePageNum - i > 0) {
          promises.push(
            fetch({
              pageNum: beforePageNum - i,
            })
          )
        }
      }
    }

    const responses = await Promise.all(promises)
    const lastResponse = responses.length > 0 ? responses[responses.length - 1] : undefined

    for (let j = 0; j < responses.length; j++) {
      for (let k = 0; k < responses[j].items.length; k++) {
        _edges.push({
          _cursor: {
            pageNum: responses[j].pageInfo.currentPageNum,
            itemIndex: k,
          },
          node: responses[j].items[k],
        })
      }
    }

    const _rightEdge = _edges.length > 0 ? _edges[_edges.length - 1] : undefined
    const _rightEdgeCursor = _rightEdge && _rightEdge._cursor

    let edges: Array<Edge<T>> = []

    if ('first' in params) {
      for (let i = 0; i < _edges.length; i++) {
        const _edge = _edges[i]
        const { _cursor } = _edge

        if (afterPageNum === _cursor.pageNum ? afterItemIndex < _cursor.itemIndex : afterPageNum < _cursor.pageNum) {
          edges = [...edges, {
            node: _edge.node,
            cursor: cursor.encode(_edge._cursor),
          }]
          if (edges.length >= params.first) {
            break
          }
        }
      }
    }
    if ('last' in params) {
      for (let i = 0; i < _edges.length; i++) {
        const _edge = _edges[_edges.length - 1 - i]
        const { _cursor } = _edge

        if (beforePageNum === _cursor.pageNum ? beforeItemIndex > _cursor.itemIndex : beforePageNum > _cursor.pageNum) {
          edges = [{
            node: _edge.node,
            cursor: cursor.encode(_edge._cursor),
          }, ...edges]
          if (edges.length >= params.last) {
            break
          }
        }
      }
    }

    const firstEdge = edges[0] as Edge<T> | undefined
    const lastEdge = edges.length > 0 ? edges[edges.length - 1] : undefined
    const _firstEdgeCursor = firstEdge && cursor.decode(firstEdge.cursor)
    const _lastEdgeCursor = lastEdge && cursor.decode(lastEdge.cursor)

    if ('first' in params && _lastEdgeCursor) {
      if (lastResponse?.pageInfo.nextPageNum != null) {
        pageInfo.hasNextPage = true
      }
      if (_rightEdgeCursor?.pageNum !== _lastEdgeCursor.pageNum || _rightEdgeCursor?.itemIndex !== _lastEdgeCursor.itemIndex) {
        pageInfo.hasNextPage = true
      }
    }
    if ('last' in params && _lastEdgeCursor) {
      if (lastResponse?.pageInfo.nextPageNum != null) {
        pageInfo.hasNextPage = true
      }
      if (_rightEdgeCursor?.pageNum !== _lastEdgeCursor.pageNum || _rightEdgeCursor?.itemIndex !== _lastEdgeCursor.itemIndex) {
        pageInfo.hasNextPage = true
      }
    }

    if (_firstEdgeCursor) {
      if (_firstEdgeCursor?.pageNum > 1 || _firstEdgeCursor?.itemIndex > 0) {
        pageInfo.hasPreviousPage = true
      }
    }

    if (firstEdge) {
      pageInfo.startCursor = firstEdge.cursor
    }
    if (lastEdge) {
      pageInfo.endCursor = lastEdge.cursor
    }

    return {
      edges,
      pageInfo,
    }
  }
}

export default connectionify
