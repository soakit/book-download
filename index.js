const fs = require('fs')
const path = require('path')
const config = require('./config')
const Crawler = require("crawler")
const _ = require('lodash')
const request = require('request');
const cheerio = require('cheerio')

const novelObj = {
	title: '',
	desc: ''
}

const c = new Crawler({
	rateLimit: 2000, // 两个任务之间的最小间隔
	maxConnections: 2, // 最大的并发数
});

const dir = './book/'

// 域名
const host = 'http://www.aishutxt.com'
// novel id
const novelId = 556

function getPageAsync(urls) {
	return new Promise((resolve, reject) => {
		const loop = urls.map((url) => {
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
}


function writeFileAsync(fileName, data) {
	return new Promise(function (resolve, reject) {
		fs.writeFile(path.join(dir, fileName), data, 'utf-8', function (err) {
			if (err) reject(err);
			else resolve(data);
		});
	})
}

const novelConfig = config.find(item => item.host === host)
if (novelConfig) {
	const novelHomeConfig = novelConfig.novelHome
	const chapterHomeConfig = novelConfig.ChapterHome

	var compiled1 = _.template(novelHomeConfig.template);
	var compiled2 = _.template(chapterHomeConfig.template);
	const novelHome = host + compiled1({ data: novelId });
	const ChapterHome = host + compiled2({ data: novelId });

	getPageAsync([novelHome, ChapterHome]).then((res) => {
		const novelHomePage = res[0]
		const ChapterHomePage = res[1]

		novelObj.title = novelHomePage(novelHomeConfig.titleSel).text()
		novelObj.desc = novelHomePage(novelHomeConfig.descSel).text()

		const chDom = ChapterHomePage(chapterHomeConfig.chapterSel).children()
		const chapterArr = _.map(_.filter(chDom, el => el.name !== 'h2'), el => {
			const href = el.firstChild.attribs.href
			return {
				href: href.indexOf('http') > -1 ? href : (host + href),
				title: el.firstChild.attribs.title
			}
		})
		const chapterHrefArr = chapterArr.map(item => item.href)
		const titleArr = chapterArr.map(item => item.title)
		getPageAsync(chapterHrefArr.slice(0, 10)).then((result) => {
			_.forEach(result, (item, index) => {
				writeContent(item, index, chapterHrefArr[index], titleArr[index])
			})
		})
	})
}

function writeContent(pageDom, index, url, title) {
	const articleHomeConfig = novelConfig.articleHome
	const { contentSel, hasNextPage } = articleHomeConfig
	const hasNextPageDom = pageDom(hasNextPage).text()
	let content = pageDom(contentSel).html()
	content = `
				<html>
				<head>
					<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
					<link rel="stylesheet" type="text/css" href="css/main.css">
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
		const totalStr = content.match(/\d&#xFF09;&#x9875;\(&#x672C;&#x7AE0;&#x672A;&#x5B8C;&#xFF0C;&#x8BF7;&#x7FFB;&#x9875;\)/)
		// 有页码, 最后一页没有页码
		let total = parseInt(totalStr && totalStr[0])

		writeFileAsync(String(index + 1).padStart(8, '0') + '_' + num + '.html', content)
		writeSinglePage(pageDom, index, url, total, num + 1, contentSel)
	} else {
		writeFileAsync(String(index + 1).padStart(8, '0') + '_0' + '.html', content)
	}
}

function writeSinglePage(pageDom, index, url, total, num, contentSel) {
	const formObj = {
		__EVENTTARGET: 'Page_' + num,
		__EVENTARGUMENT: pageDom('#__EVENTARGUMENT').val(),
		__VIEWSTATE: pageDom('#__VIEWSTATE').val(),
		__VIEWSTATEGENERATOR: pageDom('#__VIEWSTATEGENERATOR').val(),
		__EVENTVALIDATION: pageDom('#__EVENTVALIDATION').val(),
	}

	request.post({
		url: url,
		form: formObj,
	}, function (err, httpResponse, body) {
		const $ = cheerio.load(body)
		const content = $(contentSel).html()
		writeFileAsync(String(index + 1).padStart(8, '0') + '_' + num + '.html', content)
		num++
		if (num > total) {
			return
		}
		writeSinglePage($, index, url, total, num, contentSel)
	})
}
