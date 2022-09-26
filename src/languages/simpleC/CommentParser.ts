// From: https://doc.esdoc.org/github.com/esdoc/esdoc/file/src/Parser/CommentParser.js.html

export class DocComment {
  public desc: string;
  public params: string[];
  public returns: string;

  constructor(mycomment: string) {
    this.desc = "";
    this.params = [];
    this.returns = "";
    this.fromDocCommentString(mycomment);
  }

  fromDocCommentString(mycomment: string) {
    let comment = mycomment;

    // TODO: refactor
    comment = comment.replace(/\r\n/gm, "\n"); // for windows
    comment = comment.replace(/\/\*\*/, ""); // remove /**
    comment = comment.replace(/^[\t \n]*/gm, ""); // remove line head space
    comment = comment.replace(/^\*[\t ]?/, ""); // remove first '*'
    comment = comment.replace(/[\t ]$/, ""); // remove last space
    comment = comment.replace(/^\*[\t ]?/gm, ""); // remove line head '*'
    if (comment.charAt(0) !== "@") comment = `@desc ${comment}`; // auto insert @desc
    comment = comment.replace(/[\t ]*$/, ""); // remove tail space.
    comment = comment.replace(/```[\s\S]*?```/g, (match) => match.replace(/@/g, "\\ESCAPED_AT\\")); // escape code in descriptions
    comment = comment.replace(/^[\t ]*(@\w+)$/gm, "$1 \\TRUE"); // auto insert tag text to non-text tag (e.g. @interface)
    comment = comment.replace(/^[\t ]*(@\w+)[\t ](.*)/gm, "\\Z$1\\Z$2"); // insert separator (\\Z@tag\\Ztext)

    const lines = comment.split("\\Z");

    let tagName = "";
    let tagValue = "";
    const tags = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.charAt(0) === "@") {
        tagName = line;
        const nextLine = lines[i + 1];
        if (nextLine.charAt(0) === "@") {
          tagValue = "";
        } else {
          tagValue = nextLine;
          i++;
        }
        tagValue = tagValue
          .replace("\\TRUE", "")
          .replace(/\\ESCAPED_AT\\/g, "@")
          .replace(/^\n/, "")
          .replace(/\n*$/, "");
        tags.push({ tagName, tagValue });
      }
    }

    this.desc = tags.find((t) => t.tagName == "@desc")?.tagValue || "No description";
    this.params = tags.filter((t) => t.tagName == "@param")?.map((t) => t.tagValue) || [];
    this.returns = tags.find((t) => t.tagName == "@returns")?.tagValue || "void";
  }

  toSuggestionString(): string {
    console.log(this);
    return `${this.desc}\n\n${this.params.map((p) => p + "\n")}returns ${this.returns}`;
  }
}
