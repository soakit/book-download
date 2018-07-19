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
            chapterSel: '.NovelChapter .Chapter:last-child'
        },
        articleHome: {
            contentSel: '#Content',
            hasNextPage: '.ChapterName strong+strong'
        }
	}
]
