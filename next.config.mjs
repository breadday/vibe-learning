import createMDX from "@next/mdx";

const withMDX = createMDX();

export default withMDX({
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
});
