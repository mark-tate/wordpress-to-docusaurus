#!/usr/bin/env node

const transformAndWriteToFile = require("json-to-frontmatter-markdown").default;
const axios = require("axios");
const { Observable, from, range } = require("rxjs");
const { concatMap, switchMap } = require("rxjs/operators");

const endpoint = "/endpoint" + "";

function createPost(post, path = "./src/posts") {
  transformAndWriteToFile({
    frontmatterMarkdown: {
      frontmatter: [
        { title: post.title.rendered },
        { date: post.date.split(" ")[0] },
        {
          permalink: `article/${post.slug}/index.html`,
        },
      ],
      body: post.content.rendered,
    },
    path,
    fileName: `${post.slug}.md`,
  });
}

function copyPosts(endpoint, outdir) {
  const posts = from(axios.get(endpoint))
    .pipe(
      switchMap(({ headers }) => range(1, Number(headers["x-wp-totalpages"])))
    )
    .pipe(
      concatMap((page) =>
        axios.get(endpoint, {
          params: {
            page,
          },
        })
      )
    );

  const posts$ = posts.subscribe(
    ({ data }) => {
      Object.keys(data).forEach((p, i) => {
        const post = data[p];
        createPost(post, outdir);
      });
    },
    (err) => console.error("Oh no, an error!", err),
    () => console.log("completed copy")
  );

  return posts$;
}

require("yargs")
  .scriptName("wordpress-to-docusaurus")
  .usage("$0 <cmd> <args>")
  .command(
    "posts [endpoint] [outdir]",
    "copy Wordpress posts to Docusaurus directory",
    (yargs) => {
      yargs.positional("endpoint", {
        describe: "Wordpress blog post endpoint",
        nargs: 1,
        demand: true,
        demand: "endpoint is required",
      });
      yargs.positional("outdir", {
        describe: "docusaurus blog output directory",
        default: ".",
      });
    },
    function (argv) {
      copyPosts(argv.endpoint, argv.outdir);
    }
  )
  .help().argv;
