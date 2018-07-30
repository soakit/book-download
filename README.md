# book-download

0. `npm install`

1. `config.js` to write your book setting

2. `node index.js`
```
    -o, --host [value]          host
    -n, --novelId [value]       书籍章节链接针对ID动态的
    -s, --staticId [value]      书籍章节链接针对ID静态的
    -c, --maxConnections <n>    最大的并发数
    -l, --rateLimit <n>         两个任务之间的最小间隔
    -d, --dir [value]           书籍存放目录
    -m, --mod [value]           文件名命名方式(index: 以索引为文件名, title: 以标题为文件名)
```
3. `npm run epub`

### Test Command
>node index.js -o ixiaos -n 3185 -s touxiang -c 3 -l 1000 -d ./book/ -m title

or

> node index.js -o aishutxt -n 556 -c 3 -l 1000 -d ./book/ -m index

or

> node index.js -o jianshu -n 9185393 -c 3 -l 1000 -d ./book/ -m title