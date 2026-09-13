export function getSearchUrlParameters(source: string) {
  const url = new URL(source);
  const options = [...url.searchParams.entries()].map(([name, value], index) => ({
    label: `${name} = ${value}`,
    value: String(index),
    sel: false,
  }));
  const lastSegment = url.pathname.split("/").filter(Boolean).at(-1);
  if (lastSegment) options.push({ label: `/${lastSegment} → %s`, value: "path", sel: false });
  return options;
}

export function replaceSearchUrlParameter(source: string, selection: string) {
  if (selection === "path") {
    const url = new URL(source);
    const path = url.pathname;
    if (!path.split("/").some(Boolean)) throw new Error("Search URL has no path segment");
    url.pathname = path.replace(/[^/]+(\/*)$/, "%s$1");
    return url.href;
  }
  const index = Number(selection);
  const hashStart = source.indexOf("#");
  const beforeHash = hashStart === -1 ? source : source.slice(0, hashStart);
  const hash = hashStart === -1 ? "" : source.slice(hashStart);
  const queryStart = beforeHash.indexOf("?");
  if (queryStart === -1) throw new Error("Search URL has no query parameters");
  let parameterIndex = 0;
  let replaced = false;
  const query = beforeHash.slice(queryStart + 1).split("&").map((part) => {
    if (!part) return part;
    if (parameterIndex++ !== index) return part;
    replaced = true;
    const equals = part.indexOf("=");
    const name = equals === -1 ? part : part.slice(0, equals);
    return `${name}=%s`;
  }).join("&");
  if (!replaced) throw new Error("Search URL parameter does not exist");
  return `${beforeHash.slice(0, queryStart + 1)}${query}${hash}`;
}
