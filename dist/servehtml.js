//right now this serves a single file, but could be extended to cover other .htm files or images, etc.
//normally I wouldn't pass in parameters but there were issues with importing libraries, which require investigation
var execute = function (app, fs) {
    app.get("/*.html", (req, res) => {
        res.writeHead(200, { 'content-type': 'text/html' });
        fs.createReadStream('src/index.html').pipe(res);
    });
};
//# sourceMappingURL=servehtml.js.map