import rawContent from "@/content/first-video.json";
import { videoContentSchema } from "./schema";

export const firstVideo = videoContentSchema.parse(rawContent);
