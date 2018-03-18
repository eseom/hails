import * as Joi from 'joi'
import * as assert from 'assert'
import * as Hapi from 'hapi'

const makeQuery = (obj: any) => {
  const str = []
  for (let p in obj)
    if (obj.hasOwnProperty(p))
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]))
  return str.join("&")
}

const parseQuery = (queryString: string) => {
  const query: any = {}
  const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&')
  for (let i = 0; i < pairs.length; i++) {
    let pair = pairs[i].split('=')
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '')
  }
  return query
}

const pagination = (page: number, rowsperpage: number, count: number, blockSize: number, path: string) => {
  assert(blockSize % 2 === 1)
  const totalPage = Math.ceil(count / rowsperpage)
  const margin = Math.floor(blockSize / 2)
  const leftMargin = 0 // Math.max(0, page + margin - totalPage)
  const minPage = page - leftMargin - (page - Math.max(1, page - margin))
  const maxPage = Math.min(page + margin, totalPage)
  const blocks = Array.apply(null, { length: maxPage - minPage + 1 })
    .map((v: any, i: number) => i + minPage)
  return {
    blocks,
    page,
    minPage,
    maxPage,
    totalPage,
    margin,
    makePath(page: number) {
      const path1 = path.split('?')
      const query = path1[1] ? parseQuery(path1[1]) : {}
      query.page = page
      return [path1[0], '?', makeQuery(query)].join('')
    }
  }
}

export default {
  register(server: Hapi.Server, as: any[]) {
    const menus = as.map((a): any => ({
      url: a.model.name.toLowerCase(),
      name: a.name,
    }))
    as.forEach((a) => {
      server.route({
        path: `/admin/${a.model.name.toLowerCase()}`,
        options: {
          validate: {
            query: {
              page: Joi.number().integer()
            },
          }
        },
        method: 'get',
        async handler(request, h) {
          const where = {}
          const rowsperpage = 15
          const page = request.query.page || 1
          const result = await a.model.findAndCountAll({ where: {}, limit: rowsperpage, offset: rowsperpage * (page - 1) })
          // pagination
          return h.view('admin/list', {
            menus,
            ...a,
            ...result,
            pagination: pagination(page, rowsperpage, result.count, 5, request.url.path)
          })
        },
      })
    })
  }
}