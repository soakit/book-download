const config = require('./config')

const maxConnections = 3
const rateLimit = 1000
const dir = './book/'

// 域名 novel id
const host = 'http://www.aishutxt.com'
const novelId = 556
const staticId = undefined

// 域名 novel id
// const host = 'http://m.ixiaos.com'
// const novelId = 3185
// const staticId = 'touxiang'

const fd = require('./fileDownload')

const novelConfig = config.find(item => item.host === host)
if (novelConfig) {
	fd(novelConfig, { maxConnections, rateLimit, dir, host, novelId, staticId }).init()
} else {
	console.error('请先在config.js中配置您的书籍信息~')
}
