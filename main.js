const { default: myPrs } = await import("./data/myPullRequests.json", {
    assert: { type: "json" },
});
const { default: latestPrs } = await import("./data/latestPullRequests.json", {
    assert: { type: "json" },
});

const MINE = "mine";
const DURATION = "duration";
const LABELS = "labels";

let showMine = document.getElementById(MINE).checked;
let showDuration = document.getElementById(DURATION).checked;
let showLabels = document.getElementById(LABELS).checked;

render();

window.addEventListener("change", (evt) => {
    if (evt.target.id === MINE) {
        showMine = true;
        showDuration = false;
        showLabels = false;
    }
    if (evt.target.id === DURATION) {
        showDuration = true;
        showMine = false;
        showLabels = false;
    }
    if (evt.target.id === LABELS) {
        showDuration = false;
        showMine = false;
        showLabels = true;
    }

    render();
});

function render() {
    const chartNode = document.getElementById("chart");
    chartNode.innerHTML = "";

    if (showMine) {
        console.log(MINE);
        const chart = renderTimeline(myPrStats(), chartNode);
        chart.render();
    }

    if (showDuration) {
        console.log(DURATION);
        const chart = renderDistribution(durationAndReviewerStats(), chartNode);
        chart.render();
    }

    if (showLabels) {
        console.log(LABELS);
        const chart = renderLabelGroups(mergedByLabel(), chartNode);
        chart.render();
    }
}

// https://apexcharts.com/javascript-chart-demos/timeline-charts
function renderTimeline(data, chartNode) {
    const dates = [];
    const chartData = data
        .reverse()
        .filter((pull) => pull.url.indexOf("Accurx") > -1)
        .map((pull, idx) => {
            dates.push(pull.startTime);
            dates.push(pull.endTime);

            return {
                x: pull.url,
                y: [pull.startTime, pull.endTime || new Date().getTime()],
                fillColor:
                    pull.state === "merged"
                        ? "#9933FF"
                        : pull.state === "closed"
                        ? "#FF3333"
                        : "#00CC00",
            };
        });

    const scale = Array.from(new Set(dates.filter(Boolean)));
    scale.sort((a, b) => a - b);
    const day = 1000 * 60 * 60 * 24;
    const start = scale[0] - 3 * day;
    const end = new Date().getTime() + 3 * day;

    const options = {
        series: [
            {
                name: "My pull requests",
                data: chartData,
            },
        ],
        chart: {
            height: 2000,
            type: "rangeBar",
            toolbar: {
                show: false,
            },
        },
        plotOptions: {
            bar: {
                horizontal: true,
                rangeBarOverlap: false,
                barHeight: "100%",
            },
        },
        dataLabels: {
            enabled: true,
            formatter: function (val, opts) {
                var label = opts.w.globals.labels[opts.dataPointIndex];
                var diff = Math.ceil((val[1] - val[0]) / (1000 * 3600 * 24));
                return diff + (diff > 1 ? " days" : " day");
            },
            offsetY: 1,
            style: {
                fontSize: "8px",
                fontFamily: "Helvetica, Arial, sans-serif",
                fontWeight: "medium",
                colors: ["#f3f4f5", "#fff"],
            },
        },
        xaxis: {
            type: "datetime",
            min: start,
            max: end,
        },
        yaxis: {
            show: false,
        },
        grid: {
            row: {
                colors: ["#f3f4f5", "#fff"],
                opacity: 1,
                height: "150px",
            },
        },
    };
    return new ApexCharts(chartNode, options);
}

function renderDistribution(data, chartNode) {
    const xaxis = [];
    const allSeries = [];

    for (let i = 0; i < data.size; i++) {
        const series = {
            name: `reviewers=${i}`,
            data: [],
        };

        const group = data.get(i);
        for (let [duration, count] of Object.entries(group)) {
            xaxis.push(Number(duration));
            series.data.push(count);
        }

        allSeries.push(series);
    }

    const scale = Array.from(new Set(xaxis));
    scale.sort((a, b) => a - b);

    const options = {
        series: allSeries,
        chart: {
            height: 600,
            type: "area",
            toolbar: {
                show: false,
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: "smooth",
        },
        xaxis: {
            type: "number",
            categories: scale,
            labels: {
                rotate: -90,
            },
            title: {
                text: "days open",
                offsetY: -8,
            },
        },
    };

    return new ApexCharts(chartNode, options);
}

function renderLabelGroups(data, chartNode) {
    const xaxis = Array.from(data.keys());
    xaxis.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    xaxis.reverse();

    const seriesNames = Array.from(
        new Set(Array.from(data.values()).flatMap((obj) => Object.keys(obj)))
    );

    const allSeries = [];

    for (let i = 0; i < seriesNames.length; i++) {
        const series = {
            name: seriesNames[i],
            data: [],
        };

        for (const [key, value] of data) {
            series.data.push(value[seriesNames[i]] || 0);
        }

        allSeries.push(series);
    }

    console.log(allSeries.length);

    const options = {
        series: allSeries,
        colors: [
            "#CD4A4A",
            "#5D76CB",
            "#FAA76C",
            "#30BA8F",
            "#FF9BAA",
            "#FCD975",
            "#FF1DCE",
            "#FF7F49",
            "#1F75FE",
        ],
        chart: {
            type: "bar",
            height: 650,
            stacked: true,
            toolbar: {
                show: false,
            },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                dataLabels: {
                    total: {
                        enabled: true,
                    },
                },
            },
        },
        xaxis: {
            categories: xaxis,
        },
        legend: {
            position: "top",
            horizontalAlign: "center",
            offsetY: 16,
        },
    };

    return new ApexCharts(chartNode, options);
}

// my prs
function myPrStats() {
    // console.clear();

    const mine = myPrs.data.map((pr) => {
        const end =
            pr.status === "open"
                ? new Date(Date.now() + 1000 * 3600 * 24)
                : new Date(pr.closed_at);
        const duration = end - new Date(pr.created_at);
        const days_open =
            Math.round((duration / (1000 * 60 * 60 * 24)) * 100) / 100;

        pr.startTime = new Date(pr.created_at).getTime();
        pr.endTime = end.getTime();
        pr.days_open = days_open;

        return pr;
    });

    return mine;
}

function durationAndReviewerStats() {
    const mergedPRs = latestPrs.data.map((pr) => {
        const created = pr.created_at;
        const merged = pr.merged_at;

        const duration = new Date(merged) - new Date(created);
        const days = Math.round((duration / (1000 * 60 * 60 * 24)) * 100) / 100;

        return {
            merged: true,
            user: pr.user,
            requested_reviewers: pr.requested_reviewers.length,
            closed_in_days: days,
        };
    });

    const distribution = new Map();

    mergedPRs.forEach((pr) => {
        const reviewers = pr.requested_reviewers;
        const duration = Math.ceil(pr.closed_in_days);

        if (distribution.has(reviewers) === false) {
            distribution.set(reviewers, { [duration]: 1 });
        } else {
            const group = distribution.get(reviewers);

            if (!group[duration]) {
                group[duration] = 1;
            } else {
                group[duration] += 1;
            }

            distribution.set(reviewers, group);
        }
    });

    return distribution;
}

function mergedByLabel() {
    const mergedPRs = latestPrs.data.map((pr) => {
        const endDate = pr.merged_at;

        return {
            url: pr.url,
            labels: pr.labels,
            endDate: new Date(endDate),
        };
    });

    const groupByLabel = (acc, item) => ({
        [item.name]: acc[item.name] ? acc[item.name] + 1 : 1,
    });

    const dailyByLabel = new Map();
    const numberOfDays = 10;
    const today = new Date();

    for (
        let d = today;
        d > new Date().setDate(-numberOfDays);
        d.setDate(d.getDate() - 1)
    ) {
        const dateString = d.toLocaleDateString("en-GB");

        const thisDaysPRs = mergedPRs.filter(
            (pr) => dateString === pr.endDate.toLocaleDateString("en-GB")
        );

        if (thisDaysPRs.length === 0) {
            dailyByLabel.set(dateString, {});
        }

        thisDaysPRs.forEach((pr) => {
            const labels = pr.labels;
            if (dailyByLabel.has(dateString) === false) {
                const byLabel = labels.length
                    ? labels.reduce(groupByLabel, {})
                    : { none: 1 };

                dailyByLabel.set(dateString, byLabel);
            } else {
                const daily = dailyByLabel.get(dateString);
                const byLabel = labels.length
                    ? labels.reduce(groupByLabel, daily)
                    : (daily["none"] += 1);

                dailyByLabel.set(
                    dateString,
                    Object.assign({ ...daily, ...byLabel })
                );
            }
        });
    }

    return dailyByLabel;
}

// latest prs
// function latestPrStats() {
//     console.clear();

//     const mergedPRs = latestPrs.data.map((pr) => {
//         const created = pr.created_at;
//         const merged = pr.merged_at;

//         const duration = new Date(merged) - new Date(created);
//         const hours = Math.round((duration / (1000 * 60 * 60)) * 100) / 100;

//         return {
//             merged: true,
//             user: pr.user,
//             requested_reviewers: pr.requested_reviewers.length,
//             closed_in_hours: hours,
//         };
//     });

//     // all the filtering, grouping, counting is done here
//     topAuthorsByRequestedReviewerCount(mergedPRs);

//     function topAuthorsByRequestedReviewerCount(pullRequests, showTopN = 10) {
//         const distributionByAuthor = {};

//         console.log("Top authors of PRs merged without review requested");
//         console.log(`(analyzing ${pullRequests.length} merged PRs...)`);

//         pullRequests.forEach((pr) => {
//             if (distributionByAuthor[pr.user.login] === undefined) {
//                 distributionByAuthor[pr.user.login] = {
//                     no_reviewer: 0,
//                     reviewed: 0,
//                 };
//             }

//             if (pr.requested_reviewers === 0) {
//                 distributionByAuthor[pr.user.login].no_reviewer += 1;
//             } else {
//                 distributionByAuthor[pr.user.login].reviewed += 1;
//             }
//         });

//         const entries = Object.entries(distributionByAuthor);

//         entries.sort((a, b) => {
//             const [user1, counts1] = a;
//             const [user2, counts2] = b;

//             if (counts1.no_reviewer > counts2.no_reviewer) return -1;
//             if (counts2.no_reviewer > counts1.no_reviewer) return 1;
//             return 0;
//         });

//         const reviewedVsNotReviewed = entries
//             .slice(0, showTopN)
//             .map(([author, counts]) => ({
//                 author,
//                 no_reviewer: counts.no_reviewer,
//                 reviewed: counts.reviewed,
//             }));

//         console.table(reviewedVsNotReviewed);
//         return reviewedVsNotReviewed;
//     }
// }
