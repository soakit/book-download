const program = require('commander')
const config = require('./config')
const fd = require('./fileDownload')

program
	// 需要配置
	.option('-o, --host [value]', 'host') // 可模糊匹配
	.option('-n, --novelId [value]', '书籍章节链接针对ID动态的')
	.option('-s, --staticId [value]', '书籍章节链接针对ID静态的')
	// 一般无需配置
	.option('-c, --maxConnections <n>', '最大的并发数', parseInt)
	.option('-l, --rateLimit <n>', '两个任务之间的最小间隔', parseInt)
	.option('-d, --dir [value]', '书籍存放目录')
	.parse(process.argv);

const {
	host,
	novelId,
	staticId,
	maxConnections = 3,
	rateLimit = 1000,
	dir = './book/'
} = program

const novelConfig = config.find(item => item.host.indexOf(host) > -1)
if (novelConfig) {
	fd(novelConfig, { maxConnections, rateLimit, dir, host: novelConfig.host, novelId, staticId }).init()
} else {
	console.error('请先在config.js中配置您的书籍信息~')
}
