const express = require('express');
const app = express();
const log = require('tracer').colorConsole();
const github = require('./github');
const compression = require('compression');
const showdown = require('showdown');
const converter = new showdown.Converter();
converter.setFlavor('github');
converter.setOption('simpleLineBreaks', false);
const _ = require('lodash');
const fs = require('fs');
const {PORT} = require('./config');
const postcssMiddleware = require('postcss-middleware');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const path = require('path');

app.set('view engine', 'pug');
app.use(express.static('public'));
app.use(compression());
app.use('/css', postcssMiddleware({
  src: req => path.join(__dirname, 'public', req.path),
  plugins: [autoprefixer(), cssnano()],
}));

let repos = [];
github(r => {
  repos = r;
  fs.writeFile("cache.json", JSON.stringify(r), error => {
    if (error) {
      return log.error(error);
    }
    log.info("Cache has been saved");
  });
});
try {
  repos = require('./cache.json');
} catch (e) {
  log.debug('No cache set, waiting for requests to finish');
}

app.get('/', function(req, res) {
  const data = _.chain(repos)
    .groupBy('language')
    .mapValues(repos => _.orderBy(repos, ['stars'], ['desc']))
    .value();
  res.render('index', {data});
});

app.get('/:owner/:name', function(req, res) {
  const owner = req.params.owner.toLowerCase();
  const name = req.params.name.toLowerCase();
  for (const repo of repos) {
    if (
      repo.name.toLowerCase() === name &&
      repo.owner.login.toLowerCase() === owner
    ) {
      return res.render('repository', {
        repo,
        readme: converter.makeHtml(repo.readme)
      });
    }
  }
  res.status(404).send();
});

app.get('/:language', function(req, res) {
  const language = req.params.language;
  const languageRepos = [];
  for (const repo of repos) {
    if (repo.language.toLowerCase() === language.toLowerCase()) {
      languageRepos.push(repo);
    }
  }
  if (languageRepos.length > 0) {
    return res.render('language', {
      repos: languageRepos, language: languageRepos[0].language
    });
  }
  res.status(404).send();
});

app.listen(PORT);
log.info(`Server is running on port ${PORT}. Visit http://localhost:${PORT}`);
