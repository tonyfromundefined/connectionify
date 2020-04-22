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

      if (params.after) {
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

      if (params.before) {
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

    /**
     * decode cursors and store it temporary
     */
    let afterPageNum = 1
    let afterItemIndex = -1

    let beforePageNum = Infinity
    let beforeItemIndex = options.itemNumPerPage

    if ('first' in params && params.after) {
      const { pageNum, itemIndex } = cursor.decode(params.after)
      afterPageNum = pageNum
      afterItemIndex = itemIndex
    }
    if ('last' in params && params.before) {
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
    if ('last' in params) {
      if (beforePageNum !== Infinity) {
        for (let i = Math.ceil((5 - beforeItemIndex + 1 + params.last) / options.itemNumPerPage) - 1; i >= 0; i--) {
          if (beforePageNum - i > 0) {
            promises.push(
              fetch({
                pageNum: beforePageNum - i,
              })
            )
          }
        }
        if (beforeItemIndex === options.itemNumPerPage - 1) {
          promises.push(
            fetch({
              pageNum: beforePageNum + 1,
            })
          )
        }
      }
    }

    const responses = await Promise.all(promises)

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

    const _leftEdge = _edges[0] as _Edge<T> | undefined
    const _leftEdgeCursor = _leftEdge && _leftEdge._cursor
    const _rightEdge = _edges.length > 0 ? _edges[_edges.length - 1] : undefined
    const _rightEdgeCursor = _rightEdge && _rightEdge._cursor

    let edges: Array<Edge<T>> = _edges
      .filter(({ _cursor }) => {
        if ('first' in params) {
          return afterPageNum === _cursor.pageNum ? afterItemIndex < _cursor.itemIndex : afterPageNum < _cursor.pageNum
        }
        if ('last' in params) {
          return beforePageNum === _cursor.pageNum ? beforeItemIndex > _cursor.itemIndex : beforePageNum > _cursor.pageNum
        }

        return false
      })
      .map((_edge) => ({
        node: _edge.node,
        cursor: cursor.encode(_edge._cursor),
      }))
    
    const lastResponse = responses.length > 0 ? responses[responses.length - 1] : undefined

    if ('first' in params) {
      if (edges.length > params.first) {
        pageInfo.hasNextPage = true
      }
      if (edges.length === params.first && lastResponse?.pageInfo.nextPageNum !== null) {
        pageInfo.hasNextPage = true
      }
    }
    if ('last' in params && edges.length > 0) {
      const _lastEdgeCursor = cursor.decode(edges[edges.length - 1].cursor)

      if (_rightEdgeCursor?.pageNum !== _lastEdgeCursor.pageNum || _rightEdgeCursor?.itemIndex !== _lastEdgeCursor.itemIndex) {
        pageInfo.hasNextPage = true
      }
    }

    edges = edges.filter((edge, edgeIndex) => {
      if ('first' in params) {
        return edgeIndex < params.first
      }
      if ('last' in params) {
        return (edges.length - 1 - edgeIndex) < params.last
      }
    })

    const firstEdge = edges[0] as Edge<T> | undefined
    const lastEdge = edges.length > 0 ? edges[edges.length - 1] : undefined
    const _firstEdgeCursor = firstEdge && cursor.decode(firstEdge.cursor)

    if (_firstEdgeCursor && (_firstEdgeCursor?.pageNum > 1 || _firstEdgeCursor?.itemIndex > 0)) {
      pageInfo.hasPreviousPage = true
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
