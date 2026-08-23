import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => <h2 className="section-title" {...props} />,
    p: (props) => <p className="body-copy" {...props} />,
    ul: (props) => <ul className="summary-list" {...props} />,
    ...components,
  };
}
