module.exports = [
	// http://www.aishutxt.com
	{
		host: 'http://www.aishutxt.com',
		novelHome: {
            template: '/Novel/<%= data %>/',
            titleSel: 'h1',
            descSel: '.NovelContent'
        },
        ChapterHome: {
            template: '/Novel/<%= data %>/Chapter.html',
            chapterSel: '.Chapter +.Chapter div'
        },
        articleHome: {
            contentSel: '#Content',
            hasNextPage: '.ChapterName strong+strong'
        }
    },
    // http://m.ixiaos.com
	{
		host: 'http://m.ixiaos.com',
		novelHome: {
            template: '/wap.php?action=list&id=<%= data %>',
            titleSel: 'h2',
            descSel: '.mod.book-intro .bd'
        },
        ChapterHome: {
            template: '/wap.php?action=article&id=<%= data %>&uid=',
            templateOfAll: 'http://www.ixiaos.com/touxiang/',
            chapterSel: '.list_box li'
        },
        articleHome: {
            contentSel: '.page-content.font-large >*:nth-child(5)',
            hasNextPage: ''
        }
	}
]
