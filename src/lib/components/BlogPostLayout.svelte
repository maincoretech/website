<script>
  let { children } = $props();
</script>

<div id="toc-body">
  <div class="grad-bar grad-bar--toc sec-header">
    <div class="title">Blog</div>
    <div class="subtitle">思考 · 记录 · 分享</div>
  </div>

  <div class="article-section">
    <div class="section-body">
      {@render children()}
    </div>
  </div>
</div>
