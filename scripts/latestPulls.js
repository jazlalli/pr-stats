import fs from "fs";
import { Octokit } from "octokit";
import { config as dotEnvConfig } from "dotenv";

dotEnvConfig();

const args = process.argv.slice(2);
const OUTFILE = "data/latestPullRequests.json";

if (args.includes("--refresh") || fs.existsSync(OUTFILE) === false) {
    if (fs.existsSync(OUTFILE)) {
        fs.rmSync(OUTFILE);
    }

    const octokit = new Octokit({
        auth: process.env.PERSONAL_ACCESS_TOKEN,
    });

    let results = [];
    let pageNumber = 1;

    while (results.length < 1000) {
        console.log(`fetching page ${pageNumber}...`);

        let page = await octokit.rest.pulls.list({
            owner: "accurx",
            repo: "rosemary",
            state: "all",
            per_page: 100,
            page: pageNumber,
        });

        results = results.concat(page.data);
        pageNumber += 1;
    }

    const latestPrs = results
        .map((pull) => ({
            url: pull.html_url,
            repo: pull.head.repo.full_name,
            number: pull.number,
            title: pull.title,
            user: pull.user.login,
            avatar: pull.user.avatar_url,
            state: pull.state,
            draft: pull.draft,
            created_at: pull.created_at,
            closed_at: pull.closed_at,
            merged_at: pull.merged_at,
            requested_reviewers: pull.requested_reviewers.map((rr) => ({
                user: rr.login,
                url: rr.html_url,
            })),
            labels: pull.labels.map((l) => ({ name: l.name, color: l.color })),
        }))
        .filter((pull) => pull.state === "closed" && pull.merged_at !== null);

    fs.writeFileSync(OUTFILE, JSON.stringify({ data: latestPrs }, null, 4));
}

process.exit(0);
