import fs from "fs";
import { Octokit } from "octokit";
import { config as dotEnvConfig } from "dotenv";

dotEnvConfig();

const args = process.argv.slice(2);
const OUTFILE = "data/myPullRequests.json";

if (args.includes("--refresh") || fs.existsSync(OUTFILE) === false) {
  if (fs.existsSync(OUTFILE)) {
    fs.rmSync(OUTFILE);
  }

  const octokit = new Octokit({
    auth: process.env.PERSONAL_ACCESS_TOKEN,
  });

  let total = 0;
  let results = [];
  let pageNumber = 1;

  while (total === 0 || results.length < total) {
    const page = await octokit.request("GET /search/issues", {
      owner: "accurx",
      repo: "rosemary",
      state: "merged",
      per_page: 100,
      page: pageNumber,
      q: "is:pull-request author:jazlalli",
    });

    total = page.data.total_count;
    results = results.concat(page.data.items);
    pageNumber += 1;
  }

  const myPullRequests = results.map((pull) => {
    let state = "unknown";
    if (pull.pull_request.merged_at === null && pull.closed_at === null) {
      state = "open";
    }
    if (pull.pull_request.merged_at === null && pull.closed_at !== null) {
      state = "closed";
    }
    if (pull.pull_request.merged_at !== null) {
      state = "merged";
    }

    return {
      id: pull.id,
      number: pull.number,
      author: pull.user.login,
      user: pull.user.html_url,
      avatar: pull.user.avatar_url,
      url: pull.pull_request.html_url,
      title: pull.title,
      state: state,
      state_reason: pull.state_reason,
      comments: pull.comments,
      labels: pull.labels.map((l) => ({ name: l.name, color: l.color })),
      draft: pull.draft,
      merged_at: pull.pull_request.merged_at,
      created_at: pull.created_at,
      closed_at: pull.closed_at,
    };
  });

  fs.writeFileSync(OUTFILE, JSON.stringify({ data: myPullRequests }, null, 4));
}

process.exit(0);
