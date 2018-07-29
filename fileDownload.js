const fs = require('fs')
const path = require('path')
const Crawler = require("crawler")

function template(strings, ...keys) {
	return (function (...values) {
		var dict = values[values.length - 1] || {};
		var result = [strings[0]];
		keys.forEach(function (key, i) {
			var value = Number.isInteger(key) ? values[key] : dict[key];
			result.push(value, strings[i + 1]);
		});
		return result.join('');
	});
}

const fileDownload = ({ novelHome: novelHomeConfig, ChapterHome: chapterHomeConfig, articleHome: articleHomeConfig, css }, {
	maxConnections,
	rateLimit,
	dir,
	host,
	novelId,
	staticId,
	mod
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

				await this.writeFileAsync(
					`${mod === 'index' ? (String(index + 1).padStart(8, '0')) : title}_${num}.html`
					, content
				)

				writeSinglePage(pageDom, index, url, total, num + 1, contentSel, title, async (indexName, titleName, data) => {
					await this.writeFileAsync(mod === 'index' ? indexName : titleName, data)
				})
				// FIXME:有可能还有其他情况
			} else {
				await this.writeFileAsync(
					`${mod === 'index' ? (String(index + 1).padStart(8, '0') + '_0') : title}.html`
					, content
				)
			}
		},

		async getAllChapters(chapterArr) {
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
		},

		getAll() {
			const str = 'data'
			var compiled1 = template(novelHomeConfig.template.split(str), str)({ data: novelId });
			const t = chapterHomeConfig.templateOfAll || chapterHomeConfig.template
			var compiled2 = template(t.split(str), str)({ data: staticId || novelId })
			let novelHome = compiled1.indexOf('http') > -1 ? compiled1 : (host + compiled1)
			let ChapterHome = compiled2.indexOf('http') > -1 ? compiled2 : (host + compiled2)
			console.log('\n书籍首页:', novelHome)
			console.log('章节首页:', ChapterHome, '\n')
			this.getPageAsync([novelHome, ChapterHome]).then(res => {
				const [novelHomePage, $] = res

				novelObj.title = novelHomePage(novelHomeConfig.titleSel).text()
				novelObj.desc = novelHomePage(novelHomeConfig.descSel).text()

				const chDom = $(chapterHomeConfig.chapterSel)
				
				let chapterArr = Array.from(chDom).map(function(el, index) {
					const item = $(el)
					let href = item.attr('href')

					if (chapterHomeConfig.templateOfAll) {
						const id = href.match(/\d+/)
						href = host + template(chapterHomeConfig.template.split(str), str)({ data: id })
					}
					return {
						href: href.indexOf('http') > -1 ? href : (host + href),
						title: item.text(),
						index
					}
				})
				// console.log(chapterArr)
				this.getAllChapters(chapterArr)
			})
		}

	}
}

module.exports = fileDownload
