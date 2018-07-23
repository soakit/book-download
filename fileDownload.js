const fs = require('fs')
const path = require('path')
const Crawler = require("crawler")
const _ = require('lodash')

const fileDownload = ({ novelHome:novelHomeConfig, ChapterHome:chapterHomeConfig, articleHome:articleHomeConfig, css }, {
	maxConnections,
	rateLimit,
	dir,
	host,
	novelId,
	staticId
}) => {
	const novelObj = {
		title: '',
		desc: ''
	}
	const c = new Crawler({
		rateLimit, // 两个任务之间的最小间隔
		maxConnections // 最大的并发数
	});
	return {
		getPageAsync(urls) {
			return new Promise((resolve, reject) => {
				const loop = urls.filter(item => !!item).map((url) => {
					return new Promise((resolve, reject) => {
						c.queue([{
							uri: url,
							/* userAgent: userAgent,
							referer: referer, */
							callback: async function (err, res, done) {
								if (err || res.statusCode !== 200) {
									reject('err')
									throw new Error(err)
								}
								const $ = res.$;
								resolve($)
								done();
							}
						}]);
					})
				});
				c.once('error', (error) => reject(error));
				c.once('drain', () => {
					Promise.all(loop).then(results => {
						resolve(results)
					})
				})
			});
		},

		writeFileAsync(fileName, data) {
			return new Promise(function (resolve, reject) {
				fs.writeFile(path.join(dir, fileName), data, 'utf-8', function (err) {
					if (err) reject(err);
					else resolve(data);
				});
			})
		},

		async writeContent(pageDom, index, url, title) {
			console.log(`fetching url:${url}`)
			const { contentSel, hasNextPage, totalReg, writeSinglePage } = articleHomeConfig
			const hasNextPageDom = pageDom(hasNextPage).text()
			let content = pageDom(contentSel).html()
			content = `
                        <html>
                        <head>
                            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                            ${css ? `<link rel="stylesheet" type="text/css" href="${css}">` : ''} 
                            <title>${novelObj.title}</title>
                        </head>
                            <body>
                                <h1>${title}</h1>
                                <br><br>
                                ${content}
                            </body>
                        </html>
                    `

			if (hasNextPageDom.trim()) { // 有当前页数
				const matchArr = hasNextPageDom.match(/\d/)
				const num = parseInt(matchArr && matchArr[0]) // title内的当前页数
				const totalStr = content.match(totalReg)
				// 有页码, 最后一页没有页码
				let total = parseInt(totalStr && totalStr[0])

                await this.writeFileAsync(String(index + 1).padStart(8, '0') + '_' + num + '.html', content)
                
                writeSinglePage(pageDom, index, url, total, num + 1, contentSel, async (fileName, data) => {
                    await this.writeFileAsync(fileName, data)
                })
                // FIXME:有可能还有其他情况
			} else {
				await this.writeFileAsync(String(index + 1).padStart(8, '0') + '_0' + '.html', content)
			}
		},

		init() {
			var compiled1 = _.template(novelHomeConfig.template)({ data: novelId });
			var compiled2 = _.template(chapterHomeConfig.templateOfAll || chapterHomeConfig.template)({ data: staticId || novelId })
			let novelHome = compiled1.indexOf('http') > -1 ? compiled1 : (host + compiled1)
			let ChapterHome = compiled2.indexOf('http') > -1 ? compiled2 : (host + compiled2)
			console.log('\n书籍首页:', novelHome)
			console.log('章节首页:', ChapterHome, '\n')
			this.getPageAsync([novelHome, ChapterHome]).then(async res => {
				const novelHomePage = res[0]
				const ChapterHomePage = res[1]

				novelObj.title = novelHomePage(novelHomeConfig.titleSel).text()
				novelObj.desc = novelHomePage(novelHomeConfig.descSel).text()

				const chDom = ChapterHomePage(chapterHomeConfig.chapterSel).children()
				let chapterArr = _.map(chDom, (el, index) => {
					const item = el
					let href = item.attribs.href

					if (chapterHomeConfig.templateOfAll) {
						const id = href.match(/\d+/)
						href = host + _.template(chapterHomeConfig.template)({ data: id })
					}
					return {
						href: href.indexOf('http') > -1 ? href : (host + href),
						title: item.attribs.title,
						index
					}
				})
                // console.log(chapterArr)
				const urls = chapterArr.map(item => item.href)
				for (let j = 0; j < urls.length;) {
					const arr = []
					for (let m = j; m < urls.length && m < j + maxConnections; m++) {
						arr.push(urls[m])
					}
					await this.getPageAsync(arr).then(async (result) => {
						for (let i = 0; i < result.length; i++) {
							const item = result[i]
							console.log(chapterArr[j + i].index, chapterArr[j + i].href, chapterArr[j + i].title)
							await this.writeContent(item, chapterArr[j + i].index, chapterArr[j + i].href, chapterArr[j + i].title)
						}
					})
					j += maxConnections
				}
			})
		}

	}
}

module.exports = fileDownload
