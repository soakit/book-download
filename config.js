const request = require('request')
const cheerio = require('cheerio')

/**
 * 自定义的写入方法
 * 用于章节中同一ID下的多页
 */
function writeSinglePage(pageDom, index, url, total, num, contentSel, title, fn) {
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
	}, async function (err, httpResponse, body) {
		const $ = cheerio.load(body)
		const content = $(contentSel).html()
		const indexFileName = `${String(index + 1).padStart(8, '0')}_${num}.html`
		const titleFileName = `${title}_${num}.html`
		await fn(indexFileName, titleFileName, content)
		num++
		if (num > total) {
			return
		}
		writeSinglePage($, index, url, total, num, contentSel, title, fn)
	})
}

function getJianShuConfig() {
	const host = 'https://www.jianshu.com'
	const pageSize = 9
	const chapterSel = '.note-list .title'
	function getPageUrl($) {
		return $('.note-list').attr('infinite-scroll-url')
	}
	async function getArticleUrls($, index, articleUrls, getPageAsync) {
		const titles = $(chapterSel)
		titles.each(function (i) {
			const articleUrlAttri = 'href' // 文章链接
			const _this = $(this)
			const href = _this.attr(articleUrlAttri)
			articleUrls.push({
				title: _this.text(),
				index: pageSize * (index - 1) + i,
				href: href.indexOf('http') > -1 ? href : (host + href),
			});
		})
		const scrollUrl = getPageUrl($)
		if (scrollUrl && titles.length > 0 && articleUrls.length === index * pageSize) {
			const pageIndex = index + 1
			const [res] = await getPageAsync(`${host}${scrollUrl}&page=${pageIndex}`)
			await getArticleUrls(res, pageIndex, articleUrls, getPageAsync)
		}
		return articleUrls
	}
	return {
		host,
		chapterSel,
		pageSize,
		getPageUrl,
		getArticleUrls
	}
}


module.exports = [
	// http://www.aishutxt.com
	{
		host: 'http://www.aishutxt.com',
		css: 'css/main.css', // 相对于book的子目录
		novelHome: {
			template: `/Novel/${'data'}/`,
			titleSel: 'h1',
			descSel: '.NovelContent'
		},
		ChapterHome: {
			template: `/Novel/${'data'}/Chapter.html`,
			chapterSel: '.Chapter +.Chapter div a'
		},
		articleHome: {
			contentSel: '#Content',
			hasNextPage: '.ChapterName strong+strong',
			totalReg: /\d&#xFF09;&#x9875;\(&#x672C;&#x7AE0;&#x672A;&#x5B8C;&#xFF0C;&#x8BF7;&#x7FFB;&#x9875;\)/,
			writeSinglePage
		}
	},
	// http://m.ixiaos.com
	{
		host: 'http://m.ixiaos.com',
		novelHome: { // 书籍主页
			template: `/wap.php?action=list&id=${'data'}`, // 书籍首页的链接
			titleSel: 'h2', // 书籍标题
			descSel: '.mod.book-intro .bd' // 书籍描述
		},
		ChapterHome: { // 章节
			template: `/wap.php?action=article&id=${'data'}&uid=`, // 章节首页的链接-->针对动态变化的
			templateOfAll: `http://www.ixiaos.com/${'data'}/`, // 章节页的链接-->针对静态写死的
			chapterSel: '.list_box li a' // 章节
		},
		articleHome: { // 正文
			contentSel: '.page-content.font-large >*:nth-child(5)', // 内容区域
			hasNextPage: false // 下页内容
		}
	},
	// https://www.jianshu.com/
	{
		host: 'https://www.jianshu.com',
		css: 'css/entry.css', // 相对于book的子目录
		contentClassName: ['note', 'post', 'article', 'show-content'],
		novelHome: { // 书籍主页
			template: `/nb/${'data'}`, // 书籍首页的链接
			titleSel: '.main-top .title .name', // 书籍标题
			descSel: '.main-top .info' // 书籍描述
		},
		ChapterHome: { // 章节
			template: `/nb/${'data'}`,
			...getJianShuConfig()
		},
		articleHome: { // 正文
			contentSel: '.article .show-content', // 内容区域
			hasNextPage: false // 下页内容
		}
	},
]
