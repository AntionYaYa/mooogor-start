<script lang="ts">
 async function requestSitePermission() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const siteUrl = tabs[0]?.url;
  if (!siteUrl) {
    console.log('无法获取当前标签页的URL');
    return;
  }

  const granted = await browser.permissions.request({
    origins: [siteUrl] // 可以是 "https://www.github.com/*"
  });
  
  if (granted) {
    console.log(`已获得 ${siteUrl} 权限`);
    // 使用 WXT API 动态注入 content script
    // if (tabs[0]?.id && typeof injectContentScript === "function") {
    //   await injectContentScript({
    //     tabId: tabs[0].id,
    //     // 可根据需要指定 entrypoint，默认即可
    //     // entrypoint: "content",
    //   });
    // } else if (typeof injectContentScript !== "function") {
    //   console.warn("injectContentScript 未定义，请确保已正确引入 WXT API。");
    // }
  } else {
    console.log(`用户拒绝 ${siteUrl} 权限`);
  }
}
</script>


<main>
  <p class="read-the-docs">
    Click on the WXT and Svelte logos to learn more
  </p>
  <button onclick={()=>requestSitePermission()}>quanx </button>
</main>
