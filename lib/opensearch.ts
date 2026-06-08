// OpenSearch description document so browsers can offer "search PromptingHub"
// from the address bar. Pure; the route layer serves it with the right MIME.
export function buildOpenSearch(baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>PromptingHub</ShortName>
  <Description>Search AI prompts on PromptingHub</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/x-icon">${base}/favicon.ico</Image>
  <Url type="text/html" method="get" template="${base}/browse?q={searchTerms}"/>
  <moz:SearchForm xmlns:moz="http://www.mozilla.org/2006/browser/search/">${base}/browse</moz:SearchForm>
</OpenSearchDescription>
`;
}
