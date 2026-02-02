import { addFavicon, getFavicon, updateFavicon } from "../lib/DB/DB";
import type { Favicon } from "../lib/DB/DB";
import { onMessage } from "webext-bridge/background";

export default defineBackground(() => {
  onMessage("saveFavicon", onFavicon);
});


async function onFavicon({ data }: { data: any }) {
  const getLoaclFavicon = await getFavicon(data.domain)
  const blob: Blob = await urlToBlob(data.faviconUrl)
  const newFavicon: Favicon = {
    domain: data.domain,
    faviconUrl: data.faviconUrl,
    blob: blob,
    lastUpdated: Date.now()
  }

  if (getLoaclFavicon) {
   await updateFavicon(getLoaclFavicon.domain, newFavicon)
  } else {
    await addFavicon(newFavicon)
  }
}


async function urlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const blob = await response.blob();
  return blob;
}






