import { resolvePublicAssetUrl } from "@/lib/utils/assetUrl";

const logo = (fileName: string) =>
  resolvePublicAssetUrl(`logos/${fileName}`);

export const websiteLogoMap: Record<string, string> = {
  "chat.deepseek.com": logo("DeepSeek.jpg"),
  "chatgpt.com": logo("ChatGPT.jpg"),
  "discord.com": logo("Discord.jpg"),
  "docs.qq.com": logo("TencentDocs.jpg"),
  "github.com": logo("GitHub.jpg"),
  "line.me": logo("LINE.jpg"),
  "mail.google.com": logo("Gmail.jpg"),
  "open.spotify.com": logo("Spotify.jpg"),
  "pan.baidu.com": logo("BaiduNetdisk.jpg"),
  "shopee.tw": logo("Shopee.jpg"),
  "term.ptt.cc": logo("PTT.jpg"),
  "tw.yahoo.com": logo("Yahoo.jpg"),
  "weibo.com": logo("Weibo.jpg"),
  "www.amazon.com": logo("Amazon.jpg"),
  "www.bilibili.com": logo("Bilibili.jpg"),
  "www.dcard.tw": logo("Dcard.jpg"),
  "www.douban.com": logo("Douban.jpg"),
  "www.douyin.com": logo("Douyin.jpg"),
  "www.gamer.com.tw": logo("Bahamut.jpg"),
  "www.instagram.com": logo("Instagram.jpg"),
  "www.jd.com": logo("JD.jpg"),
  "www.linkedin.com": logo("LinkedIn.jpg"),
  "www.mobile01.com": logo("Mobile01.jpg"),
  "www.momoshop.com.tw": logo("momo.jpg"),
  "www.netflix.com": logo("Netflix.jpg"),
  "www.reddit.com": logo("Reddit.jpg"),
  "www.taobao.com": logo("Taobao.jpg"),
  "www.temu.com": logo("Temu.jpg"),
  "www.tiktok.com": logo("TikTok.jpg"),
  "www.xiaohongshu.com": logo("Xiaohongshu.jpg"),
  "www.youtube.com": logo("YouTube.jpg"),
  "www.zhihu.com": logo("Zhihu.jpg"),
  "x.com": logo("X.jpg"),
};

export function getBuiltInWebsiteLogo(domain: string): string | undefined {
  return websiteLogoMap[domain.toLowerCase()];
}
