import defaultEngineGroups from "./defaultEngines.json";
import { resolvePublicAssetUrl } from "@/lib/utils/assetUrl";

const logo = (fileName: string) =>
  resolvePublicAssetUrl(`logos/${fileName}`);

export const faviconMap: Record<string, string> = {
  AdobeFonts: logo("AdobeFonts.jpg"),
  AppleMusic: logo("AppleMusic.jpg"),
  Baidu: logo("Baidu.jpg"),
  Bensound: logo("Bensound.jpg"),
  Bilibili: logo("Bilibili.jpg"),
  Bing: logo("Bing.jpg"),
  Douyin: logo("Douyin.jpg"),
  DuckDuckGo: logo("DuckDuckGo.jpg"),
  Flaticon: logo("Flaticon.jpg"),
  FontAwesome: logo("FontAwesome.jpg"),
  FontSquirrel: logo("FontSquirrel.jpg"),
  Fontshare: logo("Fontshare.jpg"),
  Freepik: logo("Freepik.jpg"),
  Google: logo("Google.jpg"),
  GoogleFonts: logo("GoogleFonts.jpg"),
  Huaban: logo("Huaban.jpg"),
  Iconfont: logo("Iconfont.jpg"),
  KugouMusic: logo("KugouMusic.jpg"),
  Lucide: logo("Lucide.jpg"),
  Mixkit: logo("Mixkit.jpg"),
  Naver: logo("Naver.jpg"),
  NeteaseMusic: logo("NeteaseMusic.jpg"),
  Perplexity: logo("Perplexity.jpg"),
  Pexels: logo("Pexels.jpg"),
  PhosphorIcons: logo("PhosphorIcons.jpg"),
  Pinterest: logo("Pinterest.jpg"),
  QQMusic: logo("QQMusic.jpg"),
  Qihu360: logo("360.jpg"),
  Sougou: logo("Sougou.jpg"),
  Spotify: logo("Spotify.jpg"),
  Unsplash: logo("Unsplash.jpg"),
  Uppbeat: logo("Uppbeat.jpg"),
  Vimeo: logo("Vimeo.jpg"),
  Yahoo: logo("Yahoo.jpg"),
  Yandex: logo("Yandex.jpg"),
  YouTube: logo("YouTube.jpg"),
  YouTubeMusic: logo("YouTubeMusic.jpg"),
};

const builtInIconsByHostname = new Map(
  defaultEngineGroups.flatMap((group) => group.engines.map((engine) => [
    new URL(engine.engineUrl.replace("%s", "search")).hostname,
    faviconMap[engine.faviconKey],
  ] as const)),
);

export function getBuiltInEngineIcon(engineUrl?: string): string {
  try {
    return builtInIconsByHostname.get(new URL((engineUrl ?? "").replace("%s", "search")).hostname) ?? "";
  } catch {
    return "";
  }
}

// Ignore legacy Google service URLs, including those restored from backups.
export function withoutGoogleFavicon(src?: string): string {
  if (!src) return "";
  try {
    const url = new URL(src);
    if ((url.hostname === "www.google.com" || url.hostname === "google.com") &&
        /^\/s2\/favicons\/?$/.test(url.pathname)) return "";
  } catch {
    // Preserve other existing icon sources.
  }
  return src;
}
