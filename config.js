const request = require('request')
const cheerio = require('cheerio')

/**
 * 自定义的写入方法
 * 用于章节中同一ID下的多页
 */
function writeSinglePage(pageDom, index, url, total, num, contentSel, fn) {
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
        await fn(String(index + 1).padStart(8, '0') + '_' + num + '.html', content)
        num++
        if (num > total) {
            return
        }
        writeSinglePage($, index, url, total, num, contentSel, fn)
    })
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
			chapterSel: '.Chapter +.Chapter div'
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
			chapterSel: '.list_box li' // 章节
		},
		articleHome: { // 正文
			contentSel: '.page-content.font-large >*:nth-child(5)', // 内容区域
			hasNextPage: '' // 下页内容
		}
	}
]
