const fetch = require('node-fetch');
const log = require('tracer').colorConsole();
const graphql = require('./graphql');
const rawRepos = require('./repos.json');
const _ = require('lodash');
const ago = require('s-ago').default;
const async = require('async');
const {GITHUB_ACCESS_TOKEN} = require('../config');

module.exports = function(cb) {
  const repos = _.chain(rawRepos)
    .map(r => r.repos)
    .concat()
    .flatten()
    .map(r => {
      const [owner, name] = r.split('/');
      return {owner, name};
    })
    .value();

  const chunks = _.chunk(repos, 20);
  async.mapSeries(chunks, (chunk, cb) => {
    fetch('https://api.github.com/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: graphql(chunk),
      }),
      headers: {
        'Authorization': `Bearer ${GITHUB_ACCESS_TOKEN}`,
      },
    }).then(res => res.json())
      .then(body => cb(null, body.data))
      .catch(error => log.error(error));
  }, (error, replies) => {
    if (error) {
      return log.error(error);
    }
    const values = _.flatten(
      _.map(replies, r => _.values(r))
    );
    cb(parseReplies(values));
  });
};

function parseReplies(replies) {
  const r = _.chain(replies)
    .map(r => ({
      name: r.name,
      description: r.description,
      owner: r.owner,
      createdAt: ago(new Date(r.createdAt)),
      stars: r.stars.totalCount,
      language: findLanguage(r.url),
      lastCommit: ago(new Date(r.ref.target.history.edges[0].node.date)),
      closedIssues: r.closedIssues.totalCount,
      openIssues: r.openIssues.totalCount,
      url: r.url,
      readme: _.get(r, 'object.text', ''),
    }))
    .orderBy(['stars'], ['desc'])
    .value();
  return r;
}

function findLanguage(url) {
  const parts = url.split('/');
  const name =
    (parts[parts.length - 2] + '/' + parts[parts.length - 1]).toLowerCase();
  return _.find(
    rawRepos, r => !!_.find(r.repos, r => r.toLowerCase() === name)
  ).language;
}
