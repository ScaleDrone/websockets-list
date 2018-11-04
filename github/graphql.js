module.exports = function(repos) {
  const reposQuery = repos.map(
    ({owner, name}, i) => createRepositoryQuery(i, owner, name)
  ).join('\n');
  return `
    query {
      ${reposQuery}
    }
  `;
};

function createRepositoryQuery(index, owner, name) {
  return `
    i${index}: repository(owner:"${owner}", name:"${name}") {
      name
      owner {
        login
        avatarUrl
        url
      }
      createdAt
      url
      description
    	object(expression: "master:README.md") {
        ... on Blob {
          text
        }
      }
      ref(qualifiedName: "master") {
        target {
          ... on Commit {
            history(first: 1) {
              edges {
                node {
                  date: committedDate
                }
              }
            }
          }
        }
      }
      stars: stargazers {
        totalCount
      }
      closedIssues: issues(states: [CLOSED]) {
        totalCount
      }
      openIssues: issues(states: [OPEN]) {
        totalCount
      }
    },
  `;
}
